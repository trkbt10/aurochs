/**
 * @file SYMBOL pre-resolution engine
 *
 * Builds a dependency graph of SYMBOLs, topologically sorts them,
 * and resolves nested INSTANCE children bottom-up. The result is a
 * cache of SYMBOL nodes whose descendant INSTANCEs already have
 * their SYMBOL children expanded (without overrides — those are
 * instance-specific and applied at render time).
 */

import type { FigNode } from "@aurochs/fig/types";
import { guidToString, getNodeType } from "@aurochs/fig/parser";
import { extractSymbolIDPair, getEffectiveSymbolID } from "@aurochs/fig/symbols";
import { resolveSymbolGuidStr } from "./symbol-resolver";

// =============================================================================
// Public types
// =============================================================================

export type SymbolDependencyGraph = {
  /** symbolGuidStr -> set of symbolGuidStr that it depends on (via nested INSTANCEs) */
  readonly dependencies: ReadonlyMap<string, ReadonlySet<string>>;
  /** Topological order (leaf SYMBOLs first) */
  readonly resolveOrder: readonly string[];
  /** Warnings about circular dependencies */
  readonly circularWarnings: readonly string[];
};

export type ResolvedSymbolCache = ReadonlyMap<string, FigNode>;

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Collect all SYMBOL GUIDs referenced by INSTANCE nodes in a subtree.
 * Uses resolveSymbolGuidStr to handle sessionID mismatches.
 */
function collectInstanceDependencies(node: FigNode, deps: Set<string>, symbolMap: ReadonlyMap<string, FigNode>): void {
  if (getNodeType(node) === "INSTANCE") {
    const pair = extractSymbolIDPair(node as Record<string, unknown>);
    if (pair) {
      // Track both symbolID and overriddenSymbolID as dependencies
      const resolved = resolveSymbolGuidStr(pair.symbolID, symbolMap);
      if (resolved) {
        deps.add(resolved.guidStr);
      }
      if (pair.overriddenSymbolID) {
        const overResolved = resolveSymbolGuidStr(pair.overriddenSymbolID, symbolMap);
        if (overResolved) {
          deps.add(overResolved.guidStr);
        }
      }
    }
  }
  for (const child of node.children ?? []) {
    collectInstanceDependencies(child, deps, symbolMap);
  }
}

/**
 * Deep clone a FigNode tree, expanding INSTANCE children from the cache.
 *
 * For each INSTANCE descendant that references a SYMBOL already in `cache`,
 * the clone gets the cached SYMBOL's children set as its own children
 * (without overrides — those are applied per-instance at render time).
 *
 * `expanding` tracks SYMBOL GUIDs currently being expanded in the call stack
 * to prevent infinite recursion from circular dependencies.
 */
function deepCloneWithExpansion(
  node: FigNode,
  cache: Map<string, FigNode>,
  symbolMap: ReadonlyMap<string, FigNode>,
  expanding: Set<string>,
): FigNode {
  const nodeType = getNodeType(node);

  if (nodeType === "INSTANCE") {
    const effectiveID = getEffectiveSymbolID(node as Record<string, unknown>);
    if (effectiveID) {
      // Resolve with localID fallback (handles sessionID mismatch)
      const resolved = resolveSymbolGuidStr(effectiveID, symbolMap);
      const symGuid = resolved?.guidStr ?? guidToString(effectiveID);
      // Skip expansion if this SYMBOL is already being expanded (circular dep)
      if (!expanding.has(symGuid)) {
        const sym = cache.get(symGuid) ?? resolved?.node;
        if (sym) {
          expanding.add(symGuid);
          const symChildren = sym.children ?? [];
          const expanded: FigNode = {
            ...node,
            children: symChildren.map((c) => deepCloneWithExpansion(c, cache, symbolMap, expanding)),
          };
          expanding.delete(symGuid);
          return expanded;
        }
      }
    }
    // No resolvable SYMBOL or circular — clone as-is
    return clonePlain(node, cache, symbolMap, expanding);
  }

  return clonePlain(node, cache, symbolMap, expanding);
}

function clonePlain(
  node: FigNode,
  cache: Map<string, FigNode>,
  symbolMap: ReadonlyMap<string, FigNode>,
  expanding: Set<string>,
): FigNode {
  const children = node.children;
  if (!children || children.length === 0) {
    return { ...node };
  }
  return {
    ...node,
    children: children.map((c) => deepCloneWithExpansion(c, cache, symbolMap, expanding)),
  };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Build a dependency graph of SYMBOLs.
 *
 * For each SYMBOL in the map, scan its subtree for INSTANCE nodes,
 * and record which other SYMBOLs it depends on.
 */
export function buildSymbolDependencyGraph(symbolMap: ReadonlyMap<string, FigNode>): SymbolDependencyGraph {
  const dependencies = new Map<string, Set<string>>();
  const allSymbolIds = new Set<string>();

  // 1. Identify all SYMBOLs and collect their dependencies
  for (const [guidStr, node] of symbolMap) {
    const nodeType = getNodeType(node);
    if (nodeType !== "SYMBOL" && nodeType !== "COMPONENT" && nodeType !== "COMPONENT_SET") continue;
    allSymbolIds.add(guidStr);
    const deps = new Set<string>();
    // Only scan children, not the SYMBOL/COMPONENT node itself
    for (const child of node.children ?? []) {
      collectInstanceDependencies(child, deps, symbolMap);
    }
    // Filter to only deps that are actually SYMBOLs/COMPONENTs in the map
    const validDeps = new Set<string>();
    for (const dep of deps) {
      const depNode = symbolMap.get(dep);
      if (depNode) {
        const depType = getNodeType(depNode);
        if (depType === "SYMBOL" || depType === "COMPONENT" || depType === "COMPONENT_SET") {
          validDeps.add(dep);
        }
      }
    }
    // Remove self-dependency
    validDeps.delete(guidStr);
    dependencies.set(guidStr, validDeps);
  }

  // 2. Kahn's algorithm for topological sort (leaf-first)
  const inDegree = new Map<string, number>();
  for (const id of allSymbolIds) {
    inDegree.set(id, 0);
  }
  for (const [, deps] of dependencies) {
    for (const dep of deps) {
      if (inDegree.has(dep)) {
        inDegree.set(dep, (inDegree.get(dep) ?? 0) + 1);
      }
    }
  }

  // Wait — Kahn's algorithm with in-degree tracks "who depends on me".
  // But we want leaf-first (SYMBOLs with no dependencies resolved first).
  // Let's recompute: inDegree[X] = number of SYMBOLs that X depends on.
  const depCount = new Map<string, number>();
  for (const id of allSymbolIds) {
    depCount.set(id, (dependencies.get(id) ?? new Set()).size);
  }

  const queue: string[] = [];
  for (const [id, count] of depCount) {
    if (count === 0) {
      queue.push(id);
    }
  }

  const resolveOrder: string[] = [];
  const circularWarnings: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    resolveOrder.push(current);

    // Find all SYMBOLs that depend on `current` and decrement their count
    for (const [id, deps] of dependencies) {
      if (deps.has(current) && depCount.has(id)) {
        const newCount = (depCount.get(id) ?? 0) - 1;
        depCount.set(id, newCount);
        if (newCount === 0) {
          queue.push(id);
        }
      }
    }
  }

  // Any SYMBOLs not in resolveOrder have circular dependencies
  for (const id of allSymbolIds) {
    if (!resolveOrder.includes(id)) {
      const node = symbolMap.get(id);
      circularWarnings.push(`Circular dependency detected for SYMBOL "${node?.name ?? id}" (${id})`);
      // Still add to resolveOrder so they get processed (with whatever is available)
      resolveOrder.push(id);
    }
  }

  return {
    dependencies: dependencies as ReadonlyMap<string, ReadonlySet<string>>,
    resolveOrder,
    circularWarnings,
  };
}

/**
 * Pre-resolve all SYMBOLs in the symbol map.
 *
 * Returns a cache where each SYMBOL's descendant INSTANCEs have been
 * expanded with their referenced SYMBOL's children. Overrides are NOT
 * applied here (they are instance-specific and applied at render time).
 */
export function preResolveSymbols(
  symbolMap: ReadonlyMap<string, FigNode>,
  options?: { warnings?: string[] },
): ResolvedSymbolCache {
  const graph = buildSymbolDependencyGraph(symbolMap);

  if (options?.warnings) {
    for (const w of graph.circularWarnings) {
      options.warnings.push(w);
    }
  }

  const cache = new Map<string, FigNode>();

  for (const symbolId of graph.resolveOrder) {
    const originalSymbol = symbolMap.get(symbolId);
    if (!originalSymbol) continue;

    // Deep clone the SYMBOL, expanding nested INSTANCEs from already-resolved cache
    const resolved = deepCloneWithExpansion(originalSymbol, cache, symbolMap, new Set());
    cache.set(symbolId, resolved);
  }

  return cache;
}
