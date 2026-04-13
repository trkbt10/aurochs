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
import { getNodeType, safeChildren } from "@aurochs/fig/parser";
import { resolveInstanceReferences } from "./symbol-resolver";

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
// Tree walking
// =============================================================================

/**
 * Walk a node tree, calling `visitor` on every node (depth-first).
 */
function walkTree(
  node: FigNode,
  visitor: (n: FigNode) => void,
): void {
  visitor(node);
  for (const child of safeChildren(node)) {
    walkTree(child, visitor);
  }
}

// =============================================================================
// Clone with expansion — Single implementation
//
// One recursive function handles both INSTANCE expansion and plain cloning.
// There is no separate "clonePlain" — the else-branch is inline.
// =============================================================================

type CloneContext = {
  readonly cache: Map<string, FigNode>;
  readonly symbolMap: ReadonlyMap<string, FigNode>;
  readonly expanding: Set<string>;
};

/**
 * Deep clone a FigNode tree, expanding INSTANCE children from the cache.
 *
 * For each INSTANCE descendant that references a SYMBOL already in `cache`,
 * the clone gets the cached SYMBOL's children set as its own children
 * (without overrides — those are applied per-instance at render time).
 *
 * `ctx.expanding` tracks SYMBOL GUIDs currently being expanded in the
 * call stack to prevent infinite recursion from circular dependencies.
 */
function cloneAndExpand(node: FigNode, ctx: CloneContext): FigNode {
  const nodeType = getNodeType(node);

  // INSTANCE expansion: replace children with those from the resolved SYMBOL
  if (nodeType === "INSTANCE") {
    const resolution = resolveInstanceReferences(node, ctx.symbolMap);
    if (resolution.effectiveSymbol) {
      const { guidStr: symGuid, node: symNodeDirect } = resolution.effectiveSymbol;
      if (!ctx.expanding.has(symGuid)) {
        const sym = ctx.cache.get(symGuid) ?? symNodeDirect;
        ctx.expanding.add(symGuid);
        const expanded: FigNode = {
          ...node,
          children: safeChildren(sym).map((c) => cloneAndExpand(c, ctx)),
        };
        ctx.expanding.delete(symGuid);
        return expanded;
      }
    }
  }

  // Plain clone: shallow-copy this node, recurse into children
  const children = safeChildren(node);
  if (children.length === 0) {
    return { ...node };
  }
  return {
    ...node,
    children: children.map((c) => cloneAndExpand(c, ctx)),
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
    if (nodeType !== "SYMBOL" && nodeType !== "COMPONENT" && nodeType !== "COMPONENT_SET") { continue; }
    allSymbolIds.add(guidStr);

    // Walk the subtree and collect INSTANCE dependencies via the shared resolution
    const deps = new Set<string>();
    for (const child of safeChildren(node)) {
      walkTree(child, (n) => {
        if (getNodeType(n) !== "INSTANCE") { return; }
        const resolution = resolveInstanceReferences(n, symbolMap);
        for (const depGuid of resolution.allDependencyGuids) {
          deps.add(depGuid);
        }
      });
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

  // 2. Modified Kahn's algorithm for topological sort (leaf-first)
  // depCount[X] = number of SYMBOLs that X depends on
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
    if (!originalSymbol) { continue; }

    // Deep clone the SYMBOL, expanding nested INSTANCEs from already-resolved cache
    const resolved = cloneAndExpand(originalSymbol, { cache, symbolMap, expanding: new Set() });
    cache.set(symbolId, resolved);
  }

  return cache;
}
