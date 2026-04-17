/**
 * @file FigResolver — INSTANCE → SYMBOL 解決のドメインオブジェクト
 *
 * 責務:
 *  1. SYMBOL依存関係をトポロジカルソートし、INSTANCEを事前展開したキャッシュを保持
 *  2. style registry の保持
 *  3. 解決ロジック本体は @aurochs/fig/symbols の `resolveInstanceNode`
 *     (SSoT) に完全委譲する。このラッパは「symbolMap と resolvedCache と
 *     styleRegistry を毎回渡すのを省略する」ためだけに存在する。
 *
 * DRY方針:
 *  resolveInstance / resolveReferences / resolveSymbol は全て
 *  @aurochs/fig/symbols 側の関数を呼び出すだけ。ここで独自ロジックを
 *  書いてはいけない。
 */

import type { FigNode } from "@aurochs/fig/types";
import { getNodeType, safeChildren, type FigGuid } from "@aurochs/fig/parser";
import {
  resolveInstanceNode,
  resolveInstanceReferences,
  resolveSymbolGuidStr,
  buildFigStyleRegistry,
  type ResolvedInstanceNode,
  type InstanceResolution,
} from "@aurochs/fig/symbols";

// =============================================================================
// Public types
// =============================================================================

export type { ResolvedInstanceNode, InstanceResolution } from "@aurochs/fig/symbols";

/**
 * INSTANCE → SYMBOL 解決のドメインオブジェクト。
 */
export type FigResolver = {
  /** INSTANCE ノードを解決済みの node + children に変換する */
  readonly resolveInstance: (node: FigNode) => ResolvedInstanceNode;
  /** GUID から SYMBOL ノードを検索（localID フォールバック付き） */
  readonly resolveSymbol: (guid: FigGuid) => { node: FigNode; guidStr: string } | undefined;
  /** INSTANCE の参照先 SYMBOL を解決（effective + all deps） */
  readonly resolveReferences: (node: FigNode) => InstanceResolution;
  /** 生成時の警告（循環依存等） */
  readonly warnings: readonly string[];
};

// =============================================================================
// Internal constants
// =============================================================================

const SYMBOL_NODE_TYPES = new Set(["SYMBOL", "COMPONENT", "COMPONENT_SET"]);

// =============================================================================
// Pre-resolution: clone SYMBOL trees with nested INSTANCE children expanded
// so lookups don't pay the cost of cloning on every call.
// =============================================================================

function cloneAndExpand(
  node: FigNode,
  symbolMap: ReadonlyMap<string, FigNode>,
  cache: Map<string, FigNode>,
  expanding: Set<string>,
): FigNode {
  const nodeType = getNodeType(node);

  if (nodeType === "INSTANCE") {
    const resolution = resolveInstanceReferences(node, symbolMap);
    if (resolution.effectiveSymbol) {
      const { guidStr: symGuid, node: symNodeDirect } = resolution.effectiveSymbol;
      if (!expanding.has(symGuid)) {
        const sym = cache.get(symGuid) ?? symNodeDirect;
        expanding.add(symGuid);
        const expanded: FigNode = {
          ...node,
          children: safeChildren(sym).map((c) => cloneAndExpand(c, symbolMap, cache, expanding)),
        };
        expanding.delete(symGuid);
        return expanded;
      }
    }
  }

  const children = safeChildren(node);
  if (children.length === 0) {
    return { ...node };
  }
  return {
    ...node,
    children: children.map((c) => cloneAndExpand(c, symbolMap, cache, expanding)),
  };
}

function walkTree(node: FigNode, visitor: (n: FigNode) => void): void {
  visitor(node);
  for (const child of safeChildren(node)) {
    walkTree(child, visitor);
  }
}

function buildDependencyGraph(
  symbolMap: ReadonlyMap<string, FigNode>,
): { resolveOrder: string[]; circularWarnings: string[] } {
  const dependencies = new Map<string, Set<string>>();
  const allSymbolIds = new Set<string>();

  for (const [guidStr, node] of symbolMap) {
    if (!SYMBOL_NODE_TYPES.has(getNodeType(node))) { continue; }
    allSymbolIds.add(guidStr);

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

    const validDeps = new Set<string>();
    for (const dep of deps) {
      const depNode = symbolMap.get(dep);
      if (depNode && SYMBOL_NODE_TYPES.has(getNodeType(depNode))) {
        validDeps.add(dep);
      }
    }
    validDeps.delete(guidStr);
    dependencies.set(guidStr, validDeps);
  }

  const depCount = new Map<string, number>();
  for (const id of allSymbolIds) {
    depCount.set(id, (dependencies.get(id) ?? new Set()).size);
  }

  const queue: string[] = [];
  for (const [id, count] of depCount) {
    if (count === 0) { queue.push(id); }
  }

  const resolveOrder: string[] = [];
  const circularWarnings: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    resolveOrder.push(current);
    for (const [id, deps] of dependencies) {
      if (deps.has(current) && depCount.has(id)) {
        const newCount = (depCount.get(id) ?? 0) - 1;
        depCount.set(id, newCount);
        if (newCount === 0) { queue.push(id); }
      }
    }
  }

  for (const id of allSymbolIds) {
    if (!resolveOrder.includes(id)) {
      const node = symbolMap.get(id);
      circularWarnings.push(`Circular dependency detected for SYMBOL "${node?.name ?? id}" (${id})`);
      resolveOrder.push(id);
    }
  }

  return { resolveOrder, circularWarnings };
}

function preResolve(
  symbolMap: ReadonlyMap<string, FigNode>,
  warnings: string[],
): ReadonlyMap<string, FigNode> {
  const { resolveOrder, circularWarnings } = buildDependencyGraph(symbolMap);
  for (const w of circularWarnings) { warnings.push(w); }

  const cache = new Map<string, FigNode>();
  const expanding = new Set<string>();

  for (const symbolId of resolveOrder) {
    const originalSymbol = symbolMap.get(symbolId);
    if (!originalSymbol) { continue; }
    cache.set(symbolId, cloneAndExpand(originalSymbol, symbolMap, cache, expanding));
  }

  return cache;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * INSTANCE → SYMBOL 解決のドメインオブジェクトを生成する。
 *
 * 生成時にSYMBOLの依存関係をトポロジカルソートし、
 * ネストされたINSTANCEをボトムアップで事前展開する（overrideは未適用）。
 *
 * 利用側は `resolver.resolveInstance(node)` のみ呼ぶ。
 */
export function createFigResolver(
  symbolMap: ReadonlyMap<string, FigNode>,
): FigResolver {
  const warnings: string[] = [];
  const styleRegistry = buildFigStyleRegistry(symbolMap);
  const resolvedSymbolCache = preResolve(symbolMap, warnings);

  // Full INSTANCE resolution delegates to the SSoT in @aurochs/fig/symbols.
  // We only pre-bind the context (symbolMap + cache + styleRegistry).
  function resolveInstance(node: FigNode): ResolvedInstanceNode {
    return resolveInstanceNode(node, { symbolMap, resolvedSymbolCache, styleRegistry });
  }

  function resolveSymbol(guid: FigGuid): { node: FigNode; guidStr: string } | undefined {
    return resolveSymbolGuidStr(guid, symbolMap);
  }

  function resolveReferences(node: FigNode): InstanceResolution {
    return resolveInstanceReferences(node, symbolMap);
  }

  return {
    resolveInstance,
    resolveSymbol,
    resolveReferences,
    warnings,
  };
}
