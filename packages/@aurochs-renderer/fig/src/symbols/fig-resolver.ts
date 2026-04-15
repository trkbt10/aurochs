/**
 * @file FigResolver — INSTANCE → SYMBOL 解決のドメインオブジェクト
 *
 * symbolMap（GUID→SYMBOLノード）を保持し、INSTANCE解決に必要な
 * 全操作をメソッドとして提供する。
 *
 * createFigResolver() で生成。class ではなく関数ベースのオブジェクトを返す。
 * クロージャで状態を閉じ込め、prototype チェーンや this バインディングを排除する。
 */

import type { FigNode, MutableFigNode } from "@aurochs/fig/types";
import { guidToString, getNodeType, safeChildren, type FigGuid } from "@aurochs/fig/parser";
import { extractSymbolIDPair } from "@aurochs/fig/symbols";
import { buildGuidTranslationMap, translateOverrides } from "../../../../@aurochs/fig/src/symbols/guid-translation";
import { resolveInstanceLayout } from "../../../../@aurochs/fig/src/symbols/constraints";
import {
  getInstanceSymbolOverrides,
  collectComponentPropAssignments,
  cloneSymbolChildren,
  applySelfOverridesToMergedNode,
  type FigSymbolOverride,
  type FigDerivedSymbolData,
} from "../../../../@aurochs/fig/src/symbols/symbol-resolver";
import {
  buildFigStyleRegistry,
  resolveStyleIdOnMutableNode,
  type FigStyleRegistry,
} from "../../../../@aurochs/fig/src/symbols/style-registry";

// =============================================================================
// Public types
// =============================================================================

/**
 * Resolved INSTANCE references.
 */
export type InstanceResolution = {
  readonly effectiveSymbol: { readonly node: FigNode; readonly guidStr: string } | undefined;
  readonly allDependencyGuids: readonly string[];
};

/**
 * Result of resolving an INSTANCE node into renderable content.
 */
export type ResolvedInstanceNode = {
  readonly node: FigNode;
  readonly children: readonly FigNode[];
};

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

const SELF_OVERRIDE_PROPERTIES = new Set([
  "fillPaints", "strokePaints", "strokeWeight", "strokeJoin", "strokeCap",
  "effects", "opacity", "visible", "cornerRadius", "rectangleCornerRadii",
  "blendMode", "clipsContent", "frameMaskDisabled", "mask", "cornerSmoothing",
  "backgroundColor", "backgroundEnabled", "backgroundOpacity",
  "styleIdForFill", "styleIdForStrokeFill",
]);

const SYMBOL_NODE_TYPES = new Set(["SYMBOL", "COMPONENT", "COMPONENT_SET"]);

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

  // --- Symbol lookup (with localID fallback) ---

  function resolveSymbol(guid: FigGuid): { node: FigNode; guidStr: string } | undefined {
    const exactKey = guidToString(guid);
    const exact = symbolMap.get(exactKey);
    if (exact) { return { node: exact, guidStr: exactKey }; }

    const localIdSuffix = `:${guid.localID}`;
    for (const [key, node] of symbolMap) {
      if (key.endsWith(localIdSuffix)) {
        return { node, guidStr: key };
      }
    }
    return undefined;
  }

  // --- INSTANCE reference resolution ---

  function resolveReferences(node: FigNode): InstanceResolution {
    const pair = extractSymbolIDPair(node as Record<string, unknown>);
    if (!pair) { return { effectiveSymbol: undefined, allDependencyGuids: [] }; }

    const allDeps: string[] = [];
    const primaryResolved = resolveSymbol(pair.symbolID);
    if (primaryResolved) { allDeps.push(primaryResolved.guidStr); }

    const overrideResolved = pair.overriddenSymbolID ? resolveSymbol(pair.overriddenSymbolID) : undefined;
    if (overrideResolved) { allDeps.push(overrideResolved.guidStr); }

    return {
      effectiveSymbol: overrideResolved ?? primaryResolved,
      allDependencyGuids: allDeps,
    };
  }

  // --- Property merge ---

  function mergeProperties(instanceNode: FigNode, symbolNode: FigNode): MutableFigNode {
    const merged: MutableFigNode = { ...instanceNode };

    if (symbolNode.fillPaints) { merged.fillPaints = symbolNode.fillPaints; }
    if (symbolNode.strokePaints) { merged.strokePaints = symbolNode.strokePaints; }
    if (symbolNode.strokeWeight !== undefined) { merged.strokeWeight = symbolNode.strokeWeight; }
    if (symbolNode.cornerRadius !== undefined) { merged.cornerRadius = symbolNode.cornerRadius; }
    if (symbolNode.rectangleCornerRadii) { merged.rectangleCornerRadii = symbolNode.rectangleCornerRadii; }

    const instSize = instanceNode.size;
    const symSize = symbolNode.size;
    const sameSize = instSize && symSize && instSize.x === symSize.x && instSize.y === symSize.y;
    if (symbolNode.fillGeometry && sameSize) { merged.fillGeometry = symbolNode.fillGeometry; }
    if (symbolNode.strokeGeometry && sameSize) { merged.strokeGeometry = symbolNode.strokeGeometry; }

    const instanceHasOwnClip = instanceNode.frameMaskDisabled !== undefined || instanceNode.clipsContent !== undefined;
    if (!instanceHasOwnClip) {
      if (symbolNode.frameMaskDisabled !== undefined) {
        merged.frameMaskDisabled = symbolNode.frameMaskDisabled;
      } else if (symbolNode.clipsContent !== undefined) {
        merged.clipsContent = symbolNode.clipsContent;
      } else {
        merged.frameMaskDisabled = false;
      }
    }

    if (symbolNode.effects) { merged.effects = symbolNode.effects; }
    if (symbolNode.strokeJoin !== undefined) { merged.strokeJoin = symbolNode.strokeJoin; }
    if (symbolNode.strokeCap !== undefined) { merged.strokeCap = symbolNode.strokeCap; }
    if (symbolNode.blendMode !== undefined) { merged.blendMode = symbolNode.blendMode; }
    if (symbolNode.mask !== undefined) { merged.mask = symbolNode.mask; }
    if (symbolNode.cornerSmoothing !== undefined) { merged.cornerSmoothing = symbolNode.cornerSmoothing; }
    if (symbolNode.size) { merged.size = symbolNode.size; }
    // Inherit SYMBOL opacity only when defined; preserve INSTANCE opacity otherwise.
    // Self-overrides (applySelfOverrides) may later restore the INSTANCE's own opacity.
    if (symbolNode.opacity !== undefined) { merged.opacity = symbolNode.opacity; }

    return merged;
  }

  // --- Self-referencing overrides ---

  function applySelfOverrides(
    mergedNode: MutableFigNode,
    overrides: readonly FigSymbolOverride[],
    symbolGuidStr: string,
  ): void {
    let hasStyleIdOverride = false;
    for (const ov of overrides) {
      const guids = ov.guidPath?.guids;
      if (!guids || guids.length !== 1) { continue; }
      if (guidToString(guids[0]) !== symbolGuidStr) { continue; }
      for (const [key, value] of Object.entries(ov)) {
        if (key === "guidPath") { continue; }
        if (!SELF_OVERRIDE_PROPERTIES.has(key)) { continue; }
        mergedNode[key] = value;
        if (key === "styleIdForFill" || key === "styleIdForStrokeFill") {
          hasStyleIdOverride = true;
        }
      }
    }
    if (hasStyleIdOverride) {
      resolveStyleIdOnMutableNode(mergedNode, styleRegistry);
    }
  }

  // --- Override GUID translation ---

  function translateIfNeeded(
    translationMap: ReadonlyMap<string, string>,
    overrides: readonly FigSymbolOverride[] | undefined,
  ): readonly FigSymbolOverride[] | undefined {
    if (translationMap.size > 0 && overrides) {
      return translateOverrides(overrides, translationMap);
    }
    return overrides;
  }

  // --- Tree walking ---

  function walkTree(node: FigNode, visitor: (n: FigNode) => void): void {
    visitor(node);
    for (const child of safeChildren(node)) {
      walkTree(child, visitor);
    }
  }

  // --- Pre-resolution: clone with INSTANCE expansion ---

  function cloneAndExpand(node: FigNode, cache: Map<string, FigNode>, expanding: Set<string>): FigNode {
    const nodeType = getNodeType(node);

    if (nodeType === "INSTANCE") {
      const resolution = resolveReferences(node);
      if (resolution.effectiveSymbol) {
        const { guidStr: symGuid, node: symNodeDirect } = resolution.effectiveSymbol;
        if (!expanding.has(symGuid)) {
          const sym = cache.get(symGuid) ?? symNodeDirect;
          expanding.add(symGuid);
          const expanded: FigNode = {
            ...node,
            children: safeChildren(sym).map((c) => cloneAndExpand(c, cache, expanding)),
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
      children: children.map((c) => cloneAndExpand(c, cache, expanding)),
    };
  }

  // --- Pre-resolution: dependency graph + topological sort ---

  function buildDependencyGraph(): { resolveOrder: string[]; circularWarnings: string[] } {
    const dependencies = new Map<string, Set<string>>();
    const allSymbolIds = new Set<string>();

    for (const [guidStr, node] of symbolMap) {
      if (!SYMBOL_NODE_TYPES.has(getNodeType(node))) { continue; }
      allSymbolIds.add(guidStr);

      const deps = new Set<string>();
      for (const child of safeChildren(node)) {
        walkTree(child, (n) => {
          if (getNodeType(n) !== "INSTANCE") { return; }
          const resolution = resolveReferences(n);
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

  // --- Pre-resolution: execute ---

  function preResolve(): ReadonlyMap<string, FigNode> {
    const { resolveOrder, circularWarnings } = buildDependencyGraph();
    for (const w of circularWarnings) { warnings.push(w); }

    const cache = new Map<string, FigNode>();
    const expanding = new Set<string>();

    for (const symbolId of resolveOrder) {
      const originalSymbol = symbolMap.get(symbolId);
      if (!originalSymbol) { continue; }
      cache.set(symbolId, cloneAndExpand(originalSymbol, cache, expanding));
    }

    return cache;
  }

  // --- Full INSTANCE resolution pipeline ---

  const resolvedCache = preResolve();

  function resolveInstance(node: FigNode): ResolvedInstanceNode {
    const nodeRecord = node as Record<string, unknown>;

    const resolution = resolveReferences(node);
    if (!resolution.effectiveSymbol) {
      return { node, children: safeChildren(node) };
    }

    const { node: resolvedSymNode, guidStr: resolvedGuidStr } = resolution.effectiveSymbol;
    const symNode = resolvedCache.get(resolvedGuidStr) ?? resolvedSymNode;
    const originalSymNode = resolvedSymNode;

    // Merge SYMBOL properties into INSTANCE
    const mergedNode = mergeProperties(node, symNode);

    // Translate override GUIDs
    const rawSymbolOverrides = getInstanceSymbolOverrides(nodeRecord);
    const rawDerivedSymbolData = nodeRecord.derivedSymbolData as FigDerivedSymbolData | undefined;
    const translationMap = buildGuidTranslationMap(
      safeChildren(originalSymNode),
      rawDerivedSymbolData,
      rawSymbolOverrides,
    );
    const symbolOverrides = translateIfNeeded(translationMap, rawSymbolOverrides);
    const derivedSymbolData = translateIfNeeded(translationMap, rawDerivedSymbolData);

    // Self-referencing overrides
    if (symbolOverrides && symbolOverrides.length > 0) {
      applySelfOverrides(mergedNode, symbolOverrides, guidToString(symNode.guid));
    }

    // Clone children with overrides
    const componentPropAssignments = collectComponentPropAssignments(nodeRecord);
    const children = cloneSymbolChildren(symNode, {
      symbolOverrides,
      derivedSymbolData,
      componentPropAssignments: componentPropAssignments.length > 0 ? componentPropAssignments : undefined,
      styleRegistry,
    });

    // Layout resolution for resized instances
    const instanceSize = node.size;
    const symbolSize = symNode.size;
    const isResized = instanceSize && symbolSize && (instanceSize.x !== symbolSize.x || instanceSize.y !== symbolSize.y);

    if (isResized) {
      const layout = resolveInstanceLayout({ children, symbolSize: symbolSize!, instanceSize: instanceSize!, derivedSymbolData });
      if (layout.sizeApplied) {
        mergedNode.size = instanceSize;
      }
      return { node: mergedNode, children: layout.children };
    }

    return { node: mergedNode, children };
  }

  return {
    resolveInstance,
    resolveSymbol,
    resolveReferences,
    warnings,
  };
}
