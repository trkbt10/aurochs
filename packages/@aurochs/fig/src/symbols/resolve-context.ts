/**
 * @file FigResolveContext — scoped SoT for derived state during one
 * fig-load → domain-document conversion.
 *
 * Why this exists
 * ---------------
 * Converting a real-world .fig file (e.g. apple-ios26.fig: 16k nodes,
 * 5k INSTANCEs, 2.5k SYMBOLs, 47k override entries) walks the same
 * SYMBOL subtrees and stringifies the same GUIDs many times — once per
 * INSTANCE that targets a SYMBOL, plus again at every nested level of
 * an override path. Without memoisation the conversion does
 * O(INSTANCEs × SYMBOL_size) redundant work.
 *
 * The naive remedy — module-level WeakMaps — has wrong scope: those
 * caches outlive the operation, leak across unrelated `loadFigFile`
 * calls, accumulate in long-running processes, and hide their lifetime
 * from readers. The right shape is an *instance* of derived state,
 * created once per conversion and consumed by every helper.
 *
 * `FigResolveContext` is that instance. `treeToDocument` calls
 * `createFigResolveContext()` at entry, threads it through the
 * conversion helpers, and lets it go when the conversion returns.
 * Every cache here is keyed on the input objects (nodes, GUIDs) and
 * dies with the context — no cross-call leakage.
 *
 * What goes in the context
 * ------------------------
 * Anything that:
 *  - is a *function of inputs already known at conversion time*
 *    (e.g. `safeChildren(node)` is a function of `node.children`);
 *  - is queried more than once per conversion;
 *  - has the same answer every time it is queried within the
 *    conversion.
 *
 * Things that mutate during conversion (e.g. the partial output
 * document) MUST NOT live here.
 */

import type { FigNode, FigPaint } from "../types";
import { getNodeType, guidToString, safeChildren, type FigGuid } from "../parser";
import { getEffectiveSymbolID } from "./effective-symbol-id";
import { resolveSymbolGuidStr } from "./symbol-map-lookup";

/**
 * SYMBOL-only descendant bundle.
 *
 * Every field here is a function of the SYMBOL subtree alone — none
 * depend on the INSTANCE that triggered the lookup. Because every
 * INSTANCE that points to the same SYMBOL queries the same answers,
 * we compute the bundle once per SYMBOL and share the result via
 * `ctx.symbolDescendants(symbolRoot)`. Caching here is what keeps
 * `buildGuidTranslationMap` from re-doing one DFS walk + four fresh
 * Map/Set allocations per INSTANCE call.
 *
 * The CPA-dependent `expectedCharCount` is **not** here — it varies
 * per INSTANCE and is computed at the use site against this bundle.
 */
export type SymbolDescendant = {
  readonly node: FigNode;
  readonly guid: FigGuid;
  readonly guidStr: string;
  readonly overrideKey?: FigGuid;
  readonly overrideKeyStr?: string;
  readonly nodeType: string;
  readonly visible: boolean;
  readonly size?: { x: number; y: number };
  readonly hasImageFill?: boolean;
  readonly hasCornerRadius?: boolean;
  /**
   * `expectedCharCount` derived from the descendant's own characters
   * field (no CPA overlay). Callers that need the CPA-aware value
   * should consult their per-INSTANCE CPA map first.
   */
  readonly ownCharCount?: number;
};

export type SymbolDescendantBundle = {
  /** All descendants of `symbolRoot`, BFS order. */
  readonly descendants: readonly SymbolDescendant[];
  /** GUID-string set of every descendant — for "does this guid live in the SYMBOL?" checks. */
  readonly guidSet: ReadonlySet<string>;
  /**
   * GUID-string → descendant entry. Single SoT for "find a descendant
   * by GUID" — every reach/exists check at the SYMBOL layer in
   * `tree-to-document` (`findInKiwiTree`, `guidReachableInSymbol`)
   * and `guid-translation` should consult this Map for an O(1)
   * lookup instead of doing a per-call DFS over the SYMBOL.
   */
  readonly guidToDesc: ReadonlyMap<string, SymbolDescendant>;
  /** `overrideKey` (SYMBOL-side stable slot id) → descendant GUID-string. */
  readonly directOverrideKeyMap: ReadonlyMap<string, string>;
  /** Descendant `localID` → descendant GUID-string. */
  readonly localIdToDescendant: ReadonlyMap<number, string>;
  /** Descendant `localID` → SymbolDescendant for type-tiebreaker lookups. */
  readonly localIdToDescInfo: ReadonlyMap<number, SymbolDescendant>;
};

export type FigResolveContext = {
  /** Stringify a GUID once per `FigGuid` instance in the conversion. */
  guidString(guid: FigGuid | undefined): string;
  /** Resolve a node's non-null children, interned per node instance. */
  safeChildren(node: FigNode): readonly FigNode[];
  /**
   * Compute (and cache) the SYMBOL-only descendant bundle for
   * `symbolRoot`. Every INSTANCE that targets the same SYMBOL gets
   * the same bundle reference back.
   */
  symbolDescendants(symbolRoot: FigNode): SymbolDescendantBundle;
  /**
   * For `symbolRoot`'s direct children, return a Map of
   * `topGuidStr → expanded-descendant weight` (descendant count
   * including INSTANCE → SYMBOL recursion through `symbolMap`).
   *
   * Used by `buildGuidTranslationMap`'s Phase 0 (heavyweight
   * CONTAINER priority) to rank top-level slots by content weight.
   * Cached per `symbolRoot` for the conversion's lifetime — every
   * INSTANCE that targets the same SYMBOL shares the same answer
   * instead of re-recursing the expanded subtree.
   *
   * Caller invariant: pass the same `symbolMap` for the conversion's
   * lifetime. Mixing maps against the same ctx will return stale
   * cache hits.
   */
  symbolTopLevelWeights(
    symbolRoot: FigNode,
    symbolMap: ReadonlyMap<string, FigNode>,
  ): ReadonlyMap<string, number>;
};

/**
 * Create a fresh resolve context. Lifetime: one conversion. The caller
 * is the single owner; do not stash the returned object in module
 * scope.
 *
 * Implementation note: this module is **caching only**. The actual
 * "what does safeChildren / guidToString return" is owned by the
 * parser primitives (`safeChildren`, `guidToString` in
 * `@aurochs/fig/parser`); we delegate to them on cache miss. That
 * keeps the SoT for those operations in one place — change the
 * primitive and every caller (cached or not) sees the new behaviour.
 */
export function createFigResolveContext(): FigResolveContext {
  const guidStrings = new WeakMap<FigGuid, string>();
  const childCache = new WeakMap<FigNode, readonly FigNode[]>();
  const symbolBundleCache = new WeakMap<FigNode, SymbolDescendantBundle>();
  const topLevelWeightsCache = new WeakMap<FigNode, ReadonlyMap<string, number>>();

  function guidString(guid: FigGuid | undefined): string {
    if (!guid) { return guidToString(guid); }
    const hit = guidStrings.get(guid);
    if (hit !== undefined) { return hit; }
    const out = guidToString(guid);
    guidStrings.set(guid, out);
    return out;
  }

  function safeChildrenCached(node: FigNode): readonly FigNode[] {
    const hit = childCache.get(node);
    if (hit !== undefined) { return hit; }
    const out = safeChildren(node);
    childCache.set(node, out);
    return out;
  }

  function symbolDescendantsCached(symbolRoot: FigNode): SymbolDescendantBundle {
    const hit = symbolBundleCache.get(symbolRoot);
    if (hit !== undefined) { return hit; }
    const bundle = buildSymbolDescendantBundle(symbolRoot, guidString, safeChildrenCached);
    symbolBundleCache.set(symbolRoot, bundle);
    return bundle;
  }

  function symbolTopLevelWeightsCached(
    symbolRoot: FigNode,
    symbolMap: ReadonlyMap<string, FigNode>,
  ): ReadonlyMap<string, number> {
    const hit = topLevelWeightsCache.get(symbolRoot);
    if (hit !== undefined) { return hit; }
    const result = computeSymbolTopLevelWeights(symbolRoot, symbolMap, guidString, safeChildrenCached);
    topLevelWeightsCache.set(symbolRoot, result);
    return result;
  }

  return {
    guidString,
    safeChildren: safeChildrenCached,
    symbolDescendants: symbolDescendantsCached,
    symbolTopLevelWeights: symbolTopLevelWeightsCached,
  };
}

/**
 * Per-SYMBOL top-level weights — the SoT for "if you expand each
 * direct child of `symbolRoot` (recursively following INSTANCE →
 * SYMBOL via `symbolMap`), how many descendants does each contain?".
 *
 * Used by Phase 0 of `buildGuidTranslationMap` to rank candidate
 * containers by content weight. Centralised here so every INSTANCE
 * that targets the same SYMBOL shares the same Map reference instead
 * of re-recursing the expanded subtree per call. Heuristic state
 * (depth cap, per-top `seen` set) lives inside this function — not
 * memoised inter-call, but the per-top entries that come out are
 * deterministic for a given (symbolRoot, symbolMap), so the OUTER
 * Map is safe to cache.
 */
function computeSymbolTopLevelWeights(
  symbolRoot: FigNode,
  symbolMap: ReadonlyMap<string, FigNode>,
  gs: (guid: FigGuid | undefined) => string,
  sc: (node: FigNode) => readonly FigNode[],
): ReadonlyMap<string, number> {
  const result = new Map<string, number>();
  const tops = sc(symbolRoot);
  if (tops.length === 0) { return result; }

  const getEffectiveNode = (n: FigNode): FigNode => {
    if (getNodeType(n) !== "INSTANCE") { return n; }
    const sid = getEffectiveSymbolID(n);
    if (!sid) { return n; }
    return resolveSymbolGuidStr(sid, symbolMap)?.node ?? n;
  };
  const countRecursive = (n: FigNode, depth: number, seen: Set<string>): number => {
    if (depth > 6) { return 1; }
    const effective = getEffectiveNode(n);
    const guid = effective.guid;
    if (guid) {
      const key = gs(guid);
      if (seen.has(key)) { return 0; }
      seen.add(key);
    }
    let total = 1;
    for (const c of sc(effective)) {
      total += countRecursive(c, depth + 1, seen);
    }
    return total;
  };
  for (const top of tops) {
    const topGuid = top.guid;
    if (!topGuid) { continue; }
    result.set(gs(topGuid), countRecursive(top, 0, new Set()));
  }
  return result;
}

/**
 * One DFS walk of the SYMBOL subtree producing every derived index a
 * caller might need. The previous code re-did this work per INSTANCE
 * inside `buildGuidTranslationMap` — same SYMBOL, same answers, fresh
 * Maps each time. Centralising here makes the SoT explicit:
 * "everything you can know about a SYMBOL's descendants is computed
 * once, reflected in this bundle, shared by every consumer".
 */
function buildSymbolDescendantBundle(
  symbolRoot: FigNode,
  gs: (guid: FigGuid | undefined) => string,
  sc: (node: FigNode) => readonly FigNode[],
): SymbolDescendantBundle {
  const descendants: SymbolDescendant[] = [];
  const guidSet = new Set<string>();
  const guidToDesc = new Map<string, SymbolDescendant>();
  const directOverrideKeyMap = new Map<string, string>();
  const localIdToDescendant = new Map<number, string>();
  const localIdToDescInfo = new Map<number, SymbolDescendant>();

  // BFS pass — canonical first visit of each descendant. We populate
  // `localIdToDescInfo` / `localIdToDescendant` here so "first wins"
  // semantics on localID collisions are deterministic across runs
  // (DFS pre-order produced a different "first wins" winner when
  // localIDs repeated across sessions).
  const queue: FigNode[] = [...sc(symbolRoot)];
  for (let qi = 0; qi < queue.length; qi++) {
    const node = queue[qi];
    const guid = node.guid;
    if (guid) {
      const guidStr = gs(guid);
      const overrideKey = node.overrideKey;
      const overrideKeyStr = overrideKey ? gs(overrideKey) : undefined;
      const size = node.size;
      const fillPaints = node.fillPaints as readonly FigPaint[] | undefined;
      const hasImageFill = Array.isArray(fillPaints) && fillPaints.some((p) => {
        const t = typeof p.type === "string" ? p.type : p.type?.name;
        return t === "IMAGE";
      });
      const hasCornerRadius =
        (typeof node.cornerRadius === "number" && node.cornerRadius > 0) ||
        Array.isArray(node.rectangleCornerRadii) ||
        typeof node.rectangleTopLeftCornerRadius === "number";
      const ownCharsRaw = node.characters ?? node.textData?.characters;
      const ownCharCount = typeof ownCharsRaw === "string" ? [...ownCharsRaw].length : undefined;

      const desc: SymbolDescendant = {
        node,
        guid,
        guidStr,
        overrideKey,
        overrideKeyStr,
        nodeType: getNodeType(node),
        visible: node.visible !== false,
        size: size ? { x: size.x, y: size.y } : undefined,
        hasImageFill,
        hasCornerRadius,
        ownCharCount,
      };

      descendants.push(desc);
      guidSet.add(guidStr);
      if (!guidToDesc.has(guidStr)) {
        guidToDesc.set(guidStr, desc);
      }
      if (overrideKeyStr && !directOverrideKeyMap.has(overrideKeyStr)) {
        directOverrideKeyMap.set(overrideKeyStr, guidStr);
      }
      if (!localIdToDescendant.has(guid.localID)) {
        localIdToDescendant.set(guid.localID, guidStr);
        localIdToDescInfo.set(guid.localID, desc);
      }
    }
    for (const child of sc(node)) { queue.push(child); }
  }

  return {
    descendants,
    guidSet,
    guidToDesc,
    directOverrideKeyMap,
    localIdToDescendant,
    localIdToDescInfo,
  };
}
