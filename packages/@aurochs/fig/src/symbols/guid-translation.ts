/**
 * @file GUID namespace translation for INSTANCE override resolution
 *
 * Figma INSTANCE nodes carry override data (derivedSymbolData, symbolOverrides)
 * that reference children using INSTANCE-scoped GUIDs. These GUIDs live in
 * different sessions/namespaces than the SYMBOL's children GUIDs.
 *
 * This module translates override GUIDs to match SYMBOL descendant GUIDs so
 * that applyOverrides() and isDerivedDataApplicable() can match them.
 */

import type { FigNode, FigComponentPropAssignment, FigDerivedTextData } from "@aurochs/fig/types";
import { getNodeType, guidToString, safeChildren, type FigGuid } from "@aurochs/fig/parser";
import type { FigKiwiSymbolOverride } from "@aurochs/fig/types";

/**
 * Extract the final "characters" for a CPA assignment, if any.
 * CPA values come in several shapes (text/boolean/guid) — this narrows
 * to the text-value case where characters are present.
 */
function cpaCharacters(a: FigComponentPropAssignment): string | undefined {
  const tv = a.value?.textValue;
  return typeof tv?.characters === "string" ? tv.characters : undefined;
}

/**
 * Determine a TEXT descendant's final displayed character count.
 *
 * A TEXT node's `componentPropRefs` may bind it to a CPA defID via the
 * TEXT_DATA field. When the parent instance assigned a value to that defID,
 * the final characters come from CPA. Otherwise, fall back to the node's
 * own `characters` or `textData.characters`.
 *
 * Codepoint count (not UTF-16 unit count) is returned because glyph arrays
 * in derivedTextData are keyed by codepoint, and SF Symbols / emoji occupy
 * one codepoint but two UTF-16 units.
 */
function resolveExpectedCharCount(
  node: FigNode,
  defToChars: ReadonlyMap<string, string>,
  countCP: (s: string) => number,
): number | undefined {
  if (getNodeType(node) === "TEXT" && defToChars.size > 0) {
    const propRefs = node.componentPropRefs;
    if (propRefs) {
      for (const ref of propRefs) {
        if (ref.componentPropNodeField?.name !== "TEXT_DATA") continue;
        if (!ref.defID) continue;
        const chars = defToChars.get(guidToString(ref.defID));
        if (typeof chars === "string") {
          return countCP(chars);
        }
      }
    }
  }
  const ownChars = node.characters ?? node.textData?.characters;
  return typeof ownChars === "string" ? countCP(ownChars) : undefined;
}

// =============================================================================
// Types
// =============================================================================

/** Override GUID string → SYMBOL descendant GUID string */
export type GuidTranslationMap = ReadonlyMap<string, string>;

type DescendantInfo = {
  guid: FigGuid;
  guidStr: string;
  nodeType: string;
  visible: boolean;
  size?: { x: number; y: number };
  /** Expected character count for TEXT nodes (after CPA resolution, if applicable) */
  expectedCharCount?: number;
  /** Descendant carries these property signals (used for better override matching) */
  hasImageFill?: boolean;
  hasCornerRadius?: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Collect all descendant GUIDs + types from a list of nodes via DFS walk.
 *
 * Walks the full subtree because Figma DSD entries' first-level GUIDs
 * can target nodes at any depth (not just direct children).
 * The majority-vote offset and size-group matching phases use this data
 * to find the best mapping.
 */
function collectDescendantInfo(nodes: readonly FigNode[]): DescendantInfo[] {
  return collectDescendantInfoWithCPA(nodes, undefined);
}

function collectDescendantInfoWithCPA(
  nodes: readonly FigNode[],
  componentPropAssignments: readonly FigComponentPropAssignment[] | undefined,
): DescendantInfo[] {
  // Build defID → characters map
  const defToChars = new Map<string, string>();
  if (componentPropAssignments) {
    for (const a of componentPropAssignments) {
      const chars = cpaCharacters(a);
      if (a.defID && typeof chars === "string") {
        defToChars.set(guidToString(a.defID), chars);
      }
    }
  }

  const result: DescendantInfo[] = [];

  function walk(node: FigNode): void {
    const guid = node.guid;
    if (guid) {
      const size = node.size;
      const fillPaints = node.fillPaints;
      const hasImageFill = Array.isArray(fillPaints)
        && fillPaints.some((p) => {
          const t = typeof p.type === "string" ? p.type : p.type?.name;
          return t === "IMAGE";
        });
      const hasCornerRadius =
        (typeof node.cornerRadius === "number" && node.cornerRadius > 0) ||
        Array.isArray(node.rectangleCornerRadii) ||
        typeof node.rectangleTopLeftCornerRadius === "number";

      // Expected character count (codepoints): if this TEXT has a
      // componentPropRef whose defID matches a CPA assignment, use that
      // CPA's character codepoint count. Otherwise fall back to the node's
      // own characters.
      const countCP = (s: string): number => [...s].length;
      const expectedCharCount = resolveExpectedCharCount(node, defToChars, countCP);

      result.push({
        guid,
        guidStr: guidToString(guid),
        nodeType: getNodeType(node),
        visible: node.visible !== false,
        size: size ? { x: size.x, y: size.y } : undefined,
        expectedCharCount,
        hasImageFill,
        hasCornerRadius,
      });
    }
    for (const child of safeChildren(node)) {
      walk(child);
    }
  }

  for (const node of nodes) {
    walk(node);
  }
  return result;
}

/**
 * Collect all unique first-level GUIDs from override entries.
 * "First-level" = the first GUID in each guidPath.guids array.
 */
function collectOverrideGuids(...overrideSets: (readonly FigKiwiSymbolOverride[] | undefined)[]): Map<string, FigGuid> {
  const map = new Map<string, FigGuid>();
  for (const overrides of overrideSets) {
    if (!overrides) {continue;}
    for (const entry of overrides) {
      const firstGuid = entry.guidPath?.guids?.[0];
      if (firstGuid) {
        const key = guidToString(firstGuid);
        if (!map.has(key)) {
          map.set(key, firstGuid);
        }
      }
    }
  }
  return map;
}

/**
 * Detect type hints for override GUIDs based on override entry properties.
 *
 * - `derivedTextData` at depth 1 → TEXT
 * - `componentPropAssignments` in any entry → INSTANCE
 * - Has depth-2+ entries → CONTAINER (FRAME/INSTANCE with children)
 */
function detectTypeHints(...overrideSets: (readonly FigKiwiSymbolOverride[] | undefined)[]): Map<string, string> {
  // Per GUID: track depth-1 keys and whether it has depth-2+ entries
  const guidInfo = new Map<string, { depth1Keys: Set<string>; hasChildren: boolean }>();

  for (const overrides of overrideSets) {
    if (!overrides) {continue;}
    for (const entry of overrides) {
      const firstGuid = entry.guidPath?.guids?.[0];
      if (!firstGuid) {continue;}
      const key = guidToString(firstGuid);
      const infoRef = { value: guidInfo.get(key) };
      if (!infoRef.value) {
        infoRef.value = { depth1Keys: new Set(), hasChildren: false };
        guidInfo.set(key, infoRef.value);
      }
      const depth = entry.guidPath.guids.length;
      if (depth === 1) {
        for (const k of Object.keys(entry)) {
          if (k !== "guidPath") {infoRef.value.depth1Keys.add(k);}
        }
      }
      if (depth > 1) {
        infoRef.value.hasChildren = true;
      }
    }
  }

  // Properties unique to shape-like nodes (FRAME / RECTANGLE / ROUNDED_RECTANGLE
  // / ELLIPSE / VECTOR / LINE / STAR / REGULAR_POLYGON). If any of these appear
  // at depth-1 without children, the override targets a shape node.
  const SHAPE_ONLY_PROPS = [
    "fillGeometry",
    "strokeGeometry",
    "cornerRadius",
    "rectangleCornerRadii",
    "rectangleTopLeftCornerRadius",
    "rectangleTopRightCornerRadius",
    "rectangleBottomLeftCornerRadius",
    "rectangleBottomRightCornerRadius",
    "rectangleCornerRadiiIndependent",
    "borderTopWeight",
    "borderRightWeight",
    "borderBottomWeight",
    "borderLeftWeight",
    "borderStrokeWeightsIndependent",
    "arcData",
    "vectorPaths",
    "vectorData",
  ];
  const PAINT_PROPS = ["fillPaints", "strokePaints", "strokeWeight", "effects"];

  const hints = new Map<string, string>();
  for (const [guidStr, info] of guidInfo) {
    if (info.depth1Keys.has("derivedTextData") && !info.hasChildren) {
      hints.set(guidStr, "TEXT");
    } else if (info.depth1Keys.has("componentPropAssignments")) {
      hints.set(guidStr, "INSTANCE");
    } else if (info.hasChildren) {
      hints.set(guidStr, "CONTAINER");
    } else if (SHAPE_ONLY_PROPS.some((p) => info.depth1Keys.has(p))) {
      // Shape-specific property present without nested children → leaf shape
      hints.set(guidStr, "SHAPE");
    } else if (PAINT_PROPS.some((p) => info.depth1Keys.has(p))) {
      // Only paint-like properties — could be any shape/container leaf
      hints.set(guidStr, "SHAPE");
    }
  }
  return hints;
}

/** Node types that match the "SHAPE" type hint */
const SHAPE_NODE_TYPES = new Set([
  "FRAME",
  "RECTANGLE",
  "ROUNDED_RECTANGLE",
  "ELLIPSE",
  "VECTOR",
  "LINE",
  "STAR",
  "REGULAR_POLYGON",
  "GROUP",
  "BOOLEAN_OPERATION",
]);

function matchesTypeHint(hint: string | undefined, nodeType: string): boolean {
  if (!hint) return false;
  if (hint === "TEXT") return nodeType === "TEXT";
  if (hint === "INSTANCE") return nodeType === "INSTANCE";
  if (hint === "CONTAINER") return nodeType === "FRAME" || nodeType === "INSTANCE";
  if (hint === "SHAPE") return SHAPE_NODE_TYPES.has(nodeType);
  return false;
}

/**
 * Extract richer signals from depth-1 overrides for SHAPE matching.
 * Signals indicate which kind of shape the override targets.
 */
type ShapeSignal = {
  hasImageFill: boolean;
  hasCornerRadius: boolean;
};

function extractShapeSignals(
  ...overrideSets: (readonly FigKiwiSymbolOverride[] | undefined)[]
): Map<string, ShapeSignal> {
  const signals = new Map<string, ShapeSignal>();
  for (const overrides of overrideSets) {
    if (!overrides) continue;
    for (const entry of overrides) {
      const guids = entry.guidPath?.guids;
      if (!guids || guids.length !== 1) continue;
      const key = guidToString(guids[0]);
      const existing = signals.get(key) ?? { hasImageFill: false, hasCornerRadius: false };

      // fillPaints is now correctly typed via FigKiwiSymbolOverride ⊃ Partial<FigNode>.
      const fp = entry.fillPaints;
      if (Array.isArray(fp)) {
        for (const p of fp) {
          const t = typeof p.type === "string" ? p.type : p.type?.name;
          if (t === "IMAGE") {
            existing.hasImageFill = true;
            break;
          }
        }
      }
      if (
        (typeof entry.cornerRadius === "number" && entry.cornerRadius > 0) ||
        Array.isArray(entry.rectangleCornerRadii) ||
        typeof entry.rectangleTopLeftCornerRadius === "number" ||
        entry.rectangleCornerRadiiIndependent === true
      ) {
        existing.hasCornerRadius = true;
      }
      signals.set(key, existing);
    }
  }
  return signals;
}

/**
 * Score a descendant for compatibility with a SHAPE-hinted override.
 * Higher score = better match.
 */
function scoreShapeMatch(desc: DescendantInfo, signal: ShapeSignal | undefined): number {
  if (!signal) return 0;
  let score = 0;
  if (signal.hasImageFill && desc.hasImageFill) score += 10;
  if (signal.hasCornerRadius && desc.hasCornerRadius) score += 5;
  return score;
}

/**
 * Glyph summary for a derivedTextData-bearing override entry.
 *
 * `glyphCount` is the number of glyph/codepoint slots in the derived data.
 * `isTruncated` is true when the entry's `truncationStartIndex >= 0`, meaning
 * the glyphs represent a truncated ("…" at end) rendering of a longer source
 * string. In that case, matching the glyph count against a CPA-assigned
 * character count is meaningless — the CPA string IS the source text and
 * Figma's pre-rendered glyphs are the correct truncated output for it.
 */
type GlyphSummary = {
  readonly glyphCount: number;
  readonly isTruncated: boolean;
};

/**
 * Extract glyph summaries from depth-1 override entries carrying derivedTextData.
 * Keyed by first GUID string. Used to disambiguate TEXT descendants when
 * multiple override GUIDs could map to the same set of TEXT nodes.
 */
function extractOverrideGlyphSummaries(
  ...overrideSets: (readonly FigKiwiSymbolOverride[] | undefined)[]
): Map<string, GlyphSummary> {
  const summaries = new Map<string, GlyphSummary>();
  for (const overrides of overrideSets) {
    if (!overrides) continue;
    for (const entry of overrides) {
      const guids = entry.guidPath?.guids;
      if (!guids || guids.length !== 1) continue;
      const dtd: FigDerivedTextData | undefined = entry.derivedTextData;
      if (!dtd) continue;
      const key = guidToString(guids[0]);
      if (summaries.has(key)) continue;

      const isTruncated = typeof dtd.truncationStartIndex === "number" && dtd.truncationStartIndex >= 0;

      // Prefer counting by derivedLines.characters (handles multi-line / unicode better)
      if (Array.isArray(dtd.derivedLines)) {
        const total = dtd.derivedLines.reduce<number>(
          (acc, l) => acc + (l.characters?.length ?? 0),
          0,
        );
        if (total > 0) {
          summaries.set(key, { glyphCount: total, isTruncated });
          continue;
        }
      }
      if (Array.isArray(dtd.glyphs)) {
        summaries.set(key, { glyphCount: dtd.glyphs.length, isTruncated });
      }
    }
  }
  return summaries;
}

/**
 * Backward-compat shim — glyph count only (drops truncation flag). Used by
 * legacy callers that predate `extractOverrideGlyphSummaries`.
 */
function extractOverrideGlyphCounts(
  ...overrideSets: (readonly FigKiwiSymbolOverride[] | undefined)[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [k, s] of extractOverrideGlyphSummaries(...overrideSets)) {
    counts.set(k, s.glyphCount);
  }
  return counts;
}

/**
 * Extract a "content signature" for each first-level override GUID by
 * gathering the glyph counts of its depth-2 derivedTextData entries.
 *
 * When a DSD routes through `A / B / ...glyphs...`, A is a container GUID
 * whose children carry identifying text. The set of {glyphCount} values
 * across A's depth-2 entries is a fingerprint: matching A's fingerprint
 * against a local descendant's CPA-derived character counts lets us
 * identify A semantically rather than by brittle localID offset.
 *
 * We return the MAXIMUM glyph count — typically the Title text, which is
 * the longest and most distinctive. (Icon TEXTs are always 1 glyph.)
 */
function extractContainerContentSignature(
  ...overrideSets: (readonly FigKiwiSymbolOverride[] | undefined)[]
): Map<string, number> {
  const maxGlyph = new Map<string, number>();
  for (const overrides of overrideSets) {
    if (!overrides) continue;
    for (const entry of overrides) {
      const guids = entry.guidPath?.guids;
      if (!guids || guids.length < 2) continue;
      const dtd = entry.derivedTextData;
      if (!dtd) continue;
      let glyphs = 0;
      if (Array.isArray(dtd.derivedLines)) {
        glyphs = dtd.derivedLines.reduce<number>((acc, l) => acc + (l.characters?.length ?? 0), 0);
      }
      if (glyphs === 0 && Array.isArray(dtd.glyphs)) glyphs = dtd.glyphs.length;
      if (glyphs <= 1) continue; // skip single-glyph icon TEXTs
      const firstKey = guidToString(guids[0]);
      const prev = maxGlyph.get(firstKey) ?? 0;
      if (glyphs > prev) maxGlyph.set(firstKey, glyphs);
    }
  }
  return maxGlyph;
}

/**
 * Extract CPA character counts keyed by defID.
 * Used to compute a local descendant's expected Title character count.
 */
function extractCpaCharCounts(
  assignments: readonly FigComponentPropAssignment[] | undefined,
): Map<string, number> {
  const counts = new Map<string, number>();
  if (!assignments) return counts;
  for (const a of assignments) {
    if (!a.defID) continue;
    const chars = a.value?.textValue?.characters;
    if (typeof chars === "string") {
      counts.set(guidToString(a.defID), [...chars].length);
    }
  }
  return counts;
}

/**
 * Compute each local INSTANCE descendant's max-characters signature based on
 * its own CPA assignments. For each local INSTANCE that carries CPAs,
 * determine the largest character-count value among its text assignments.
 * Matching this against the source content signature identifies which
 * source slot maps to this local descendant.
 */
function computeLocalInstanceSignatures(
  symbolDescendants: readonly FigNode[],
): Map<string, number> {
  const sigs = new Map<string, number>();
  function walk(node: FigNode): void {
    const guid = node.guid;
    if (guid && getNodeType(node) === "INSTANCE") {
      const cpa = node.componentPropAssignments;
      if (cpa && cpa.length > 0) {
        let maxChars = 0;
        for (const a of cpa) {
          const chars = a.value?.textValue?.characters;
          if (typeof chars === "string") {
            const c = [...chars].length;
            if (c > maxChars) maxChars = c;
          }
        }
        if (maxChars > 1) sigs.set(guidToString(guid), maxChars);
      }
    }
    for (const c of safeChildren(node)) walk(c);
  }
  for (const n of symbolDescendants) walk(n);
  return sigs;
}

/**
 * Extract depth-1 DSD entry sizes, keyed by first GUID string.
 *
 * When a DSD entry has `guidPath.guids.length === 1` and carries a `size`,
 * we record that size. This tells us what size the override is setting
 * on the target node, which often matches the node's original size
 * (especially when the INSTANCE hasn't been resized).
 */
function extractOverrideSizes(
  ...overrideSets: (readonly FigKiwiSymbolOverride[] | undefined)[]
): Map<string, { x: number; y: number }> {
  const sizes = new Map<string, { x: number; y: number }>();
  for (const overrides of overrideSets) {
    if (!overrides) {continue;}
    for (const entry of overrides) {
      const guids = entry.guidPath?.guids;
      if (!guids || guids.length !== 1) {continue;}
      const size = entry.size;
      if (!size) {continue;}
      const key = guidToString(guids[0]);
      if (!sizes.has(key)) {
        sizes.set(key, { x: size.x, y: size.y });
      }
    }
  }
  return sizes;
}

/**
 * Parse "sessionID:localID" string back to FigGuid.
 */
function parseGuidString(guidStr: string): FigGuid {
  const idx = guidStr.indexOf(":");
  return {
    sessionID: Number(guidStr.slice(0, idx)),
    localID: Number(guidStr.slice(idx + 1)),
  };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Build a translation map from override GUIDs to SYMBOL descendant GUIDs.
 *
 * Two-phase algorithm:
 * 1. Sessions with 3+ GUIDs: majority-vote localID offset (high confidence)
 * 2. Remaining GUIDs: type-based matching using override property hints
 *    (derivedTextData → TEXT, componentPropAssignments → INSTANCE, etc.)
 *
 * @param symbolDescendants  Direct children of the SYMBOL node (walked recursively)
 * @param derivedSymbolData  Pre-computed layout overrides from INSTANCE
 * @param symbolOverrides    Property overrides from INSTANCE
 * @param componentPropAssignments  Instance CPA (used to disambiguate TEXT
 *        descendants by expected character count — when a TEXT node has a
 *        componentPropRef linking it to a CPA defID, we can predict its
 *        final character count and match DSD entries by glyph count).
 * @returns Map from override GUID string to SYMBOL descendant GUID string
 */
export function buildGuidTranslationMap(
  symbolDescendants: readonly FigNode[],
  derivedSymbolData: readonly FigKiwiSymbolOverride[] | undefined,
  symbolOverrides: readonly FigKiwiSymbolOverride[] | undefined,
  componentPropAssignments?: readonly FigComponentPropAssignment[],
  /**
   * Optional SYMBOL lookup: INSTANCE descendants reference external SYMBOLs
   * via `symbolData.symbolID`. When resolving Phase 0 (heavyweight container
   * priority), we need to know how "heavy" each local INSTANCE really is —
   * its own direct children don't exist pre-resolution, but its SYMBOL does.
   * Passing nodeMap lets Phase 0 count the resolved-descendant weight.
   */
  symbolMap?: ReadonlyMap<string, FigNode>,
): GuidTranslationMap {
  const descendants = collectDescendantInfoWithCPA(symbolDescendants, componentPropAssignments);
  if (descendants.length === 0) {return new Map();}

  const overrideGuids = collectOverrideGuids(derivedSymbolData, symbolOverrides);
  if (overrideGuids.size === 0) {return new Map();}

  // Check if override GUIDs already match descendants — no translation needed
  const descendantSet = new Set(descendants.map((d) => d.guidStr));
  const allMatch = [...overrideGuids.keys()].every((key) => descendantSet.has(key));
  if (allMatch) {return new Map();}

  // Build localID lookup: localID → descendant GUID string
  const localIdToDescendant = new Map<number, string>();
  for (const d of descendants) {
    if (!localIdToDescendant.has(d.guid.localID)) {
      localIdToDescendant.set(d.guid.localID, d.guidStr);
    }
  }

  // Group override GUIDs by sessionID
  const bySession = new Map<number, FigGuid[]>();
  for (const guid of overrideGuids.values()) {
    const arrRef4 = { value: bySession.get(guid.sessionID) };
    if (!arrRef4.value) {
      arrRef4.value = [];
      bySession.set(guid.sessionID, arrRef4.value);
    }
    arrRef4.value.push(guid);
  }

  const result = new Map<string, string>();

  const typeHints = detectTypeHints(derivedSymbolData, symbolOverrides);

  // ── Phase 0: Heavyweight CONTAINER priority ──
  //
  // When an override GUID carries many DSD entries with deep paths (a routing
  // container that threads content through dozens of descendants), it deserves
  // first pick at a matching INSTANCE descendant. Without this, later phases'
  // majority-vote offset matching from other sessions can steal the
  // highest-content INSTANCE, leaving the heavyweight GUID to claim an empty
  // leaf INSTANCE (e.g. Home Indicator) and stranding its 100+ entries.
  //
  // Entry count is our proxy for content weight. We claim uniquely for
  // GUIDs with >= 20 entries AND CONTAINER hint (has children at depth-2+),
  // when there is a single uncontested INSTANCE candidate — or pick the
  // INSTANCE with the most direct/grand children as a heuristic.
  {
    const entryCount = new Map<string, number>();
    for (const overrides of [derivedSymbolData, symbolOverrides]) {
      if (!overrides) continue;
      for (const entry of overrides) {
        const first = entry.guidPath?.guids?.[0];
        if (!first) continue;
        const key = guidToString(first);
        entryCount.set(key, (entryCount.get(key) ?? 0) + 1);
      }
    }
    // Sort by descending entry count — the heaviest first.
    const rankedOverrides = [...overrideGuids.entries()]
      .filter(([k]) => {
        const hint = typeHints.get(k);
        if (hint !== "CONTAINER") return false;
        return (entryCount.get(k) ?? 0) >= 20;
      })
      .sort((a, b) => (entryCount.get(b[0]) ?? 0) - (entryCount.get(a[0]) ?? 0));

    if (rankedOverrides.length > 0) {
      // Count descendants under each top-level INSTANCE/FRAME.
      // An INSTANCE's direct children are typically empty in the stored tree
      // (the SYMBOL is inlined only on demand). When we have nodeMap, resolve
      // the referenced SYMBOL recursively so INSTANCE weights reflect real
      // content size — Activity View - iPhone's direct target has just 2
      // INSTANCE children, but recursing through those exposes the full tree.
      const topLevelWeight = new Map<string, number>();
      const getEffectiveNode = (n: FigNode): FigNode => {
        if (getNodeType(n) !== "INSTANCE" || !symbolMap) return n;
        const sid = n.symbolData?.symbolID ?? n.overriddenSymbolID;
        if (!sid) return n;
        const key = guidToString(sid);
        const sym = symbolMap.get(key);
        if (sym) return sym;
        const suffix = `:${sid.localID}`;
        for (const [k, v] of symbolMap) {
          if (k.endsWith(suffix)) return v;
        }
        return n;
      };
      const countRecursive = (n: FigNode, depth: number, seen: Set<string>): number => {
        if (depth > 6) return 1;
        const effective = getEffectiveNode(n);
        const guid = effective.guid;
        if (guid) {
          const key = guidToString(guid);
          if (seen.has(key)) return 0;
          seen.add(key);
        }
        let total = 1;
        for (const c of safeChildren(effective)) {
          total += countRecursive(c, depth + 1, seen);
        }
        return total;
      };
      for (const top of symbolDescendants) {
        const topGuid = top.guid;
        if (!topGuid) continue;
        topLevelWeight.set(guidToString(topGuid), countRecursive(top, 0, new Set()));
      }
      const claimed = new Set<string>();
      for (const [overGuidStr] of rankedOverrides) {
        // Find the heaviest unclaimed top-level FRAME/INSTANCE descendant.
        let bestKey: string | undefined;
        let bestWeight = -1;
        for (const [k, w] of topLevelWeight) {
          if (claimed.has(k)) continue;
          // Must be container-like (FRAME/INSTANCE).
          const topDesc = descendants.find((d) => d.guidStr === k);
          if (!topDesc) continue;
          if (topDesc.nodeType !== "FRAME" && topDesc.nodeType !== "INSTANCE") continue;
          if (w > bestWeight) {
            bestWeight = w;
            bestKey = k;
          }
        }
        if (bestKey && bestWeight >= 3) {
          result.set(overGuidStr, bestKey);
          claimed.add(bestKey);
        }
      }
    }
  }

  // ── Phase 1: Sessions with 3+ GUIDs — majority-vote offset ──

  // Build descendant lookup by localID → DescendantInfo
  const localIdToDescInfo = new Map<number, DescendantInfo>();
  for (const d of descendants) {
    if (!localIdToDescInfo.has(d.guid.localID)) {
      localIdToDescInfo.set(d.guid.localID, d);
    }
  }

  for (const [, guids] of bySession) {
    if (guids.length < 3) {continue;}

    const offsetCounts = new Map<number, number>();
    for (const overrideGuid of guids) {
      for (const descendant of descendants) {
        const offset = overrideGuid.localID - descendant.guid.localID;
        offsetCounts.set(offset, (offsetCounts.get(offset) ?? 0) + 1);
      }
    }

    // Collect all offsets with the highest count
    const bestCountRef = { value: 0 };
    for (const count of offsetCounts.values()) {
      if (count > bestCountRef.value) {bestCountRef.value = count;}
    }

    const tiedOffsets: number[] = [];
    for (const [offset, count] of offsetCounts) {
      if (count === bestCountRef.value) {tiedOffsets.push(offset);}
    }

    // If tied, use type-compatibility tiebreaker
    const bestOffsetRef = { value: tiedOffsets[0] };
    if (tiedOffsets.length > 1) {
      const bestTypeScoreRef = { value: -1 };
      for (const offset of tiedOffsets) {
        const typeScoreRef = { value: 0 };
        for (const overrideGuid of guids) {
          const targetLocalID = overrideGuid.localID - offset;
          const descInfo = localIdToDescInfo.get(targetLocalID);
          if (!descInfo) {continue;}
          const hint = typeHints.get(guidToString(overrideGuid));
          if (hint === "TEXT" && descInfo.nodeType === "TEXT") {typeScoreRef.value++;}
          else if (hint === "INSTANCE" && descInfo.nodeType === "INSTANCE") {typeScoreRef.value++;}
          else if (hint === "CONTAINER" && (descInfo.nodeType === "FRAME" || descInfo.nodeType === "INSTANCE"))
            {typeScoreRef.value++;}
        }
        if (typeScoreRef.value > bestTypeScoreRef.value) {
          bestTypeScoreRef.value = typeScoreRef.value;
          bestOffsetRef.value = offset;
        }
      }
    }

    // Don't overwrite Phase 0 claims (heavyweight CONTAINER priority).
    const phase0Claimed = new Set<string>(result.values());
    for (const overrideGuid of guids) {
      const targetLocalID = overrideGuid.localID - bestOffsetRef.value;
      const descendantGuidStr = localIdToDescendant.get(targetLocalID);
      if (descendantGuidStr && !phase0Claimed.has(descendantGuidStr)) {
        result.set(guidToString(overrideGuid), descendantGuidStr);
      }
    }
  }

  // ── Phase 1 validation: Remove size-mismatched mappings ──
  // When override GUIDs from a session target nodes at different depths,
  // the majority-vote offset maps some GUIDs to wrong descendants.
  // Detect and remove mappings where the DSD entry size grossly mismatches
  // the target descendant's original size, freeing them for better matching
  // in subsequent phases.
  {
    const overrideSizes = extractOverrideSizes(derivedSymbolData, symbolOverrides);
    const descByGuidStr = new Map<string, DescendantInfo>();
    for (const d of descendants) {
      descByGuidStr.set(d.guidStr, d);
    }

    const toRemove: string[] = [];
    for (const [overrideGuidStr, descGuidStr] of result) {
      const dsdSize = overrideSizes.get(overrideGuidStr);
      if (!dsdSize) {continue;}

      const desc = descByGuidStr.get(descGuidStr);
      if (!desc?.size) {continue;}

      // Check if sizes grossly mismatch (more than 50% difference on either axis)
      const widthRatio = Math.max(dsdSize.x, desc.size.x) / Math.max(1, Math.min(dsdSize.x, desc.size.x));
      const heightRatio = Math.max(dsdSize.y, desc.size.y) / Math.max(1, Math.min(dsdSize.y, desc.size.y));
      if (widthRatio > 1.5 || heightRatio > 1.5) {
        toRemove.push(overrideGuidStr);
      }
    }

    for (const key of toRemove) {
      result.delete(key);
    }
  }

  // ── Phase 1.3: Content-signature reconciliation ──
  //
  // When a source-tree CONTAINER GUID routes depth-2 DSD entries with
  // distinctive glyph counts (e.g. "Add to Home Screen" = 18 chars), and a
  // local INSTANCE descendant carries a CPA assigning matching-length
  // characters, use that fingerprint to pair them.
  //
  // This corrects for a key structural pathology: when the source tree has
  // a flat layout (6 Actions under one container) but the local tree is
  // nested (2 sub-FRAMEs each holding a subset), Phase 1's majority-vote
  // offset cannot produce correct mappings across both subranges. The
  // content signature sidesteps localID arithmetic entirely — it uses
  // semantic data that is invariant across source/local topology.
  //
  // Only reassigns existing mappings when the new mapping has a strictly
  // better signature match; does not evict mappings with no candidate.
  {
    const sourceContentSig = extractContainerContentSignature(derivedSymbolData, symbolOverrides);
    if (sourceContentSig.size > 0) {
      const localSigs = computeLocalInstanceSignatures(symbolDescendants);
      if (localSigs.size > 0) {
        // Step 1: Evict type-mismatched Phase 1 mappings. When Phase 1's
        // offset-vote puts a sig-X source onto a sig-Y local (X ≠ Y), that
        // mapping is structurally wrong — the offset conflated two branches
        // (e.g. source flat 6 actions vs local nested 2×(4+2) actions).
        const toEvict: string[] = [];
        for (const [src, loc] of result) {
          const srcSig = sourceContentSig.get(src);
          const locSig = localSigs.get(loc);
          if (srcSig !== undefined && locSig !== undefined && srcSig !== locSig) {
            toEvict.push(src);
          }
        }
        for (const k of toEvict) result.delete(k);

        // Step 2: Greedy assignment by matching signatures.
        // For each source GUID with a signature, pick the unclaimed local
        // whose signature matches, preferring the locals in sorted localID
        // order. Sources processed in localID order too.
        const claimedLocals = new Set<string>(result.values());
        const localBySig = new Map<number, string[]>();
        for (const [k, sig] of localSigs) {
          const arr = localBySig.get(sig) ?? [];
          arr.push(k);
          localBySig.set(sig, arr);
        }
        for (const arr of localBySig.values()) {
          arr.sort((a, b) => {
            const pa = parseGuidString(a), pb = parseGuidString(b);
            return pa.localID - pb.localID;
          });
        }

        const sortedSources = [...sourceContentSig.keys()].sort((a, b) => {
          const pa = parseGuidString(a), pb = parseGuidString(b);
          if (pa.sessionID !== pb.sessionID) return pa.sessionID - pb.sessionID;
          return pa.localID - pb.localID;
        });
        for (const src of sortedSources) {
          if (result.has(src)) continue;
          const sig = sourceContentSig.get(src)!;
          const candidates = localBySig.get(sig);
          if (!candidates) continue;
          const loc = candidates.find((c) => !claimedLocals.has(c));
          if (!loc) continue;
          result.set(src, loc);
          claimedLocals.add(loc);
        }
      }
    }
  }

  // ── Phase 1.5: Typed matching for remaining unmapped GUIDs ──
  // When Phase 1 only partially maps a session (non-contiguous localIDs),
  // map remaining typed GUIDs to unclaimed descendants of the same type.
  //
  // - TEXT/INSTANCE: simple sorted-localID positional matching
  // - SHAPE: property-based scoring (image-fill / corner-radius hints) with
  //   tiebreaker by sorted localID
  //
  // Order: TEXT → INSTANCE first, then SHAPE. SHAPE is deferred until
  // Phase 1.75 has a chance to consume size-matched overrides (separator
  // lines, etc.) whose size uniquely identifies their descendant target.
  const shapeSignals = extractShapeSignals(derivedSymbolData, symbolOverrides);
  for (const [, guids] of bySession) {
    if (guids.length < 3) {continue;}
    const unmapped = guids.filter((g) => !result.has(guidToString(g)));
    if (unmapped.length === 0) {continue;}

    const phase1Targets = new Set(result.values());

    for (const targetType of ["TEXT", "INSTANCE"] as const) {
      const typedUnmapped = unmapped.filter((g) => typeHints.get(guidToString(g)) === targetType);
      if (typedUnmapped.length === 0) {continue;}

      const typedDescendants = descendants.filter((d) => matchesTypeHint(targetType, d.nodeType));
      const unclaimed = typedDescendants.filter((d) => !phase1Targets.has(d.guidStr));

      const sortedUnmapped = [...typedUnmapped].sort((a, b) => a.localID - b.localID);
      const sortedUnclaimed = [...unclaimed].sort((a, b) => a.guid.localID - b.guid.localID);
      for (let i = 0; i < sortedUnmapped.length && i < sortedUnclaimed.length; i++) {
        const key = guidToString(sortedUnmapped[i]);
        const value = sortedUnclaimed[i].guidStr;
        result.set(key, value);
        phase1Targets.add(value);
      }
    }
  }

  // ── Phase 1.75: Size-group matching for remaining unmapped GUIDs ──
  // When override GUIDs from a session target nodes at DIFFERENT depths
  // in the SYMBOL hierarchy, the majority-vote offset can't map all of them.
  // This phase uses DSD entry sizes to match unmapped GUIDs to descendants
  // with matching original sizes.
  {
    const overrideSizes = extractOverrideSizes(derivedSymbolData, symbolOverrides);
    const claimed = new Set(result.values());

    // Collect ALL unmapped override GUIDs that have a depth-1 size
    const unmappedWithSize: { guid: FigGuid; guidStr: string; size: { x: number; y: number } }[] = [];
    for (const [guidStr, guid] of overrideGuids) {
      if (result.has(guidStr)) {continue;}
      const size = overrideSizes.get(guidStr);
      if (size) {
        unmappedWithSize.push({ guid, guidStr, size });
      }
    }

    if (unmappedWithSize.length > 0) {
      // Group unmapped GUIDs by size (using rounded dimensions as key)
      const bySizeKey = new Map<string, typeof unmappedWithSize>();
      for (const entry of unmappedWithSize) {
        const key = `${Math.round(entry.size.x)}x${Math.round(entry.size.y)}`;
        const arrRef3 = { value: bySizeKey.get(key) };
        if (!arrRef3.value) {
          arrRef3.value = [];
          bySizeKey.set(key, arrRef3.value);
        }
        arrRef3.value.push(entry);
      }

      // For each size group, find unclaimed descendants with matching original size
      for (const [sizeKey, group] of bySizeKey) {
        const matchingDescs = descendants.filter((d) => {
          if (claimed.has(d.guidStr)) {return false;}
          if (!d.size) {return false;}
          const descKey = `${Math.round(d.size.x)}x${Math.round(d.size.y)}`;
          return descKey === sizeKey;
        });

        if (matchingDescs.length === 0) {continue;}

        // Match by sorted localID order within the size group
        const sortedGroup = [...group].sort((a, b) => a.guid.localID - b.guid.localID);
        const sortedDescs = [...matchingDescs].sort((a, b) => a.guid.localID - b.guid.localID);

        for (let i = 0; i < sortedGroup.length && i < sortedDescs.length; i++) {
          result.set(sortedGroup[i].guidStr, sortedDescs[i].guidStr);
          claimed.add(sortedDescs[i].guidStr);
        }
      }
    }
  }

  // ── Phase 1.85: SHAPE matching with property scoring ──
  // After size-group matching has claimed size-unique descendants (like
  // separator lines), map remaining SHAPE-hinted overrides to unclaimed
  // SHAPE descendants using property compatibility (image-fill, corner
  // radius). This runs for all sessions (not just 3+) so it's effective
  // even when a specific property hint exists.
  {
    const claimedAfter175 = new Set(result.values());
    for (const [, guids] of bySession) {
      const unmapped = guids.filter((g) => !result.has(guidToString(g)));
      const shapeUnmapped = unmapped.filter((g) => typeHints.get(guidToString(g)) === "SHAPE");
      if (shapeUnmapped.length === 0) continue;

      const candidates = descendants.filter(
        (d) => SHAPE_NODE_TYPES.has(d.nodeType) && !claimedAfter175.has(d.guidStr),
      );
      if (candidates.length === 0) continue;

      const remaining = new Set(candidates.map((d) => d.guidStr));
      const orderedUnmapped = [...shapeUnmapped].sort((a, b) => a.localID - b.localID);
      for (const ov of orderedUnmapped) {
        const ovKey = guidToString(ov);
        const signal = shapeSignals.get(ovKey);
        let best: DescendantInfo | undefined;
        let bestScore = -1;
        for (const d of candidates) {
          if (!remaining.has(d.guidStr)) continue;
          const score = scoreShapeMatch(d, signal);
          if (score > bestScore || (score === bestScore && best && d.guid.localID < best.guid.localID)) {
            bestScore = score;
            best = d;
          }
        }
        if (best) {
          result.set(ovKey, best.guidStr);
          claimedAfter175.add(best.guidStr);
          remaining.delete(best.guidStr);
        }
      }
    }
  }

  // ── Phase 2: Sessions with 1-2 GUIDs — type-based matching ──

  // (typeHints already computed above for Phase 1 tiebreaker)

  // Descendants already targeted by earlier phases
  const phase1Targets = new Set(result.values());

  // Group descendants by type
  const descendantsByType = new Map<string, DescendantInfo[]>();
  for (const d of descendants) {
    const arrRef2 = { value: descendantsByType.get(d.nodeType) };
    if (!arrRef2.value) {
      arrRef2.value = [];
      descendantsByType.set(d.nodeType, arrRef2.value);
    }
    arrRef2.value.push(d);
  }

  for (const [, guids] of bySession) {
    if (guids.length >= 3) {continue;}

    // Group this session's GUIDs by type hint
    const byHint = new Map<string, FigGuid[]>();
    for (const guid of guids) {
      const guidStr = guidToString(guid);
      if (result.has(guidStr)) {continue;} // already mapped
      const hint = typeHints.get(guidStr) ?? "UNKNOWN";
      const arrRef = { value: byHint.get(hint) };
      if (!arrRef.value) {
        arrRef.value = [];
        byHint.set(hint, arrRef.value);
      }
      arrRef.value.push(guid);
    }

    for (const [hint, hintGuids] of byHint) {
      // Get candidate descendants matching the type hint
      const allCandidatesRef = { value: undefined as DescendantInfo[] | undefined };
      if (hint === "TEXT") {
        allCandidatesRef.value = descendantsByType.get("TEXT") ?? [];
      } else if (hint === "INSTANCE") {
        allCandidatesRef.value = descendantsByType.get("INSTANCE") ?? [];
      } else if (hint === "CONTAINER") {
        allCandidatesRef.value = [...(descendantsByType.get("FRAME") ?? []), ...(descendantsByType.get("INSTANCE") ?? [])];
      } else if (hint === "SHAPE") {
        allCandidatesRef.value = descendants.filter((d) => SHAPE_NODE_TYPES.has(d.nodeType));
      } else {
        allCandidatesRef.value = descendants;
      }

      if (allCandidatesRef.value.length === 0) {continue;}

      // Prefer descendants NOT already claimed by Phase 1
      const unclaimed = allCandidatesRef.value.filter((c) => !phase1Targets.has(c.guidStr));
      const candidates = unclaimed.length >= hintGuids.length ? unclaimed : allCandidatesRef.value;

      if (hint === "SHAPE") {
        // Score-based match using shape signals
        const remaining = new Set(candidates.map((d) => d.guidStr));
        const sortedGuids = [...hintGuids].sort((a, b) => a.localID - b.localID);
        for (const ov of sortedGuids) {
          const ovKey = guidToString(ov);
          const signal = shapeSignals.get(ovKey);
          let best: DescendantInfo | undefined;
          let bestScore = -1;
          for (const d of candidates) {
            if (!remaining.has(d.guidStr)) continue;
            const score = scoreShapeMatch(d, signal);
            if (score > bestScore || (score === bestScore && best && d.guid.localID < best.guid.localID)) {
              bestScore = score;
              best = d;
            }
          }
          if (best) {
            result.set(ovKey, best.guidStr);
            remaining.delete(best.guidStr);
            phase1Targets.add(best.guidStr);
          }
        }
      } else {
        // Sort both override GUIDs and candidates by localID, match positionally
        const sortedGuids = [...hintGuids].sort((a, b) => a.localID - b.localID);
        const sortedCandidates = [...candidates].sort((a, b) => a.guid.localID - b.guid.localID);

        for (let i = 0; i < sortedGuids.length; i++) {
          if (i < sortedCandidates.length) {
            result.set(guidToString(sortedGuids[i]), sortedCandidates[i].guidStr);
          }
        }
      }
    }
  }

  // ── Phase 3: Fix adjacent sibling swaps ──
  // Disabled: correct mapping increases diff because variant SYMBOL rendering
  // is not yet accurate enough. Re-enable when variant rendering improves.
  // fixAdjacentSiblingSwaps(result, descendants, localIdToDescInfo, symbolOverrides);

  // ── Phase 4: TEXT glyph-count fixup ──
  //
  // When the instance's CPA dictates the final character count of a TEXT node
  // (via componentPropRef), and the override's derivedTextData carries a glyph
  // count, we can verify the mapping: glyph count should equal expected char
  // count. If a pair of TEXT mappings within the same session are swapped
  // (i.e. swapping them restores consistency), swap them.
  {
    const glyphCounts = extractOverrideGlyphCounts(derivedSymbolData, symbolOverrides);
    if (glyphCounts.size > 0) {
      const descByGuid = new Map<string, DescendantInfo>();
      for (const d of descendants) descByGuid.set(d.guidStr, d);

      // For each override GUID mapped to a TEXT descendant with an expected
      // char count, check mismatch.
      type Mismatch = { ovKey: string; currentDst: string; expected: number; glyphs: number };
      const mismatches: Mismatch[] = [];
      for (const [ovKey, dstGuidStr] of result) {
        const glyphs = glyphCounts.get(ovKey);
        if (glyphs === undefined) continue;
        const desc = descByGuid.get(dstGuidStr);
        if (!desc || desc.nodeType !== "TEXT") continue;
        const expected = desc.expectedCharCount;
        if (typeof expected !== "number") continue;
        if (expected !== glyphs) {
          mismatches.push({ ovKey, currentDst: dstGuidStr, expected, glyphs });
        }
      }

      // Pair-wise swap: for every pair of mismatched entries, check whether
      // swapping their destinations resolves both.
      const fixed = new Set<string>();
      for (let i = 0; i < mismatches.length; i++) {
        const a = mismatches[i];
        if (fixed.has(a.ovKey)) continue;
        for (let j = i + 1; j < mismatches.length; j++) {
          const b = mismatches[j];
          if (fixed.has(b.ovKey)) continue;
          const descA = descByGuid.get(a.currentDst);
          const descB = descByGuid.get(b.currentDst);
          if (!descA || !descB) continue;
          if (a.glyphs === descB.expectedCharCount && b.glyphs === descA.expectedCharCount) {
            result.set(a.ovKey, b.currentDst);
            result.set(b.ovKey, a.currentDst);
            fixed.add(a.ovKey);
            fixed.add(b.ovKey);
            break;
          }
        }
      }

      // Single-mismatch reroute: for each remaining mismatch, look for a
      // TEXT descendant whose expectedCharCount matches the override's
      // glyph count. Prefer unclaimed targets; if all matching targets are
      // claimed, drop the mapping entirely so the mismatched override
      // doesn't corrupt an unrelated TEXT node (cloneSymbolChildren will
      // simply skip the untranslated path, leaving the target's original
      // derivedTextData intact).
      const claimed = new Set(result.values());
      for (const m of mismatches) {
        if (fixed.has(m.ovKey)) continue;
        let unclaimed: DescendantInfo | undefined;
        let anyMatch: DescendantInfo | undefined;
        for (const d of descendants) {
          if (d.nodeType !== "TEXT") continue;
          if (d.expectedCharCount !== m.glyphs) continue;
          if (!anyMatch) anyMatch = d;
          if (!claimed.has(d.guidStr) || d.guidStr === m.currentDst) {
            unclaimed = d;
            break;
          }
        }
        if (unclaimed && unclaimed.guidStr !== m.currentDst) {
          result.set(m.ovKey, unclaimed.guidStr);
          claimed.add(unclaimed.guidStr);
          fixed.add(m.ovKey);
        } else if (!unclaimed && anyMatch) {
          // A correct target exists but is claimed by another (likely
          // duplicate) override. Drop this mismatched mapping so it
          // doesn't apply stale glyphs to the wrong TEXT node.
          result.delete(m.ovKey);
          fixed.add(m.ovKey);
        }
      }
    }
  }

  return result;
}

/**
 * Detect override GUIDs that have `overriddenSymbolID` set at depth-1.
 */
function collectOverriddenSymbolIDGuids(overrides: readonly FigKiwiSymbolOverride[] | undefined): Set<string> {
  const guids = new Set<string>();
  if (!overrides) {return guids;}
  for (const entry of overrides) {
    const firstGuid = entry.guidPath?.guids?.[0];
    if (!firstGuid) {continue;}
    if (entry.overriddenSymbolID !== undefined) {
      guids.add(guidToString(firstGuid));
    }
  }
  return guids;
}

/**
 * Fix adjacent sibling swaps in the translation map.
 *
 * When two INSTANCE descendants have adjacent localIDs but their order in
 * the tree differs from the override GUID allocation order, the offset
 * algorithm swaps them. This function detects such swaps using semantic
 * evidence (overriddenSymbolID targets should be visible) and corrects them.
 */
function _fixAdjacentSiblingSwaps(
  { result, descendants, localIdToDescInfo, symbolOverrides }: { result: Map<string, string>; descendants: DescendantInfo[]; localIdToDescInfo: Map<number, DescendantInfo>; symbolOverrides: readonly FigKiwiSymbolOverride[] | undefined; }
): void {
  const overriddenGuids = collectOverriddenSymbolIDGuids(symbolOverrides);
  if (overriddenGuids.size === 0) {return;}

  // Build descendant guidStr → DescendantInfo lookup
  const descByGuidStr = new Map<string, DescendantInfo>();
  for (const d of descendants) {
    descByGuidStr.set(d.guidStr, d);
  }

  // Build reverse map: descendant guidStr → override guidStr
  const reverseMap = new Map<string, string>();
  for (const [overGuidStr, descGuidStr] of result) {
    reverseMap.set(descGuidStr, overGuidStr);
  }

  for (const overGuidStr of overriddenGuids) {
    const descGuidStr = result.get(overGuidStr);
    if (!descGuidStr) {continue;}

    const descInfo = descByGuidStr.get(descGuidStr);
    if (!descInfo || descInfo.visible !== false) {continue;}

    // This variant-switching override targets a hidden descendant — likely wrong.
    // Look for an adjacent descendant (±1 localID) that is visible + same type.
    for (const delta of [-1, 1]) {
      const adjLocalID = descInfo.guid.localID + delta;
      const adjDescInfo = localIdToDescInfo.get(adjLocalID);
      if (!adjDescInfo) {continue;}
      if (adjDescInfo.nodeType !== descInfo.nodeType) {continue;}
      if (adjDescInfo.visible === false) {continue;}

      // Found a visible adjacent sibling — swap the mappings.
      const adjOverGuidStr = reverseMap.get(adjDescInfo.guidStr);
      if (adjOverGuidStr) {
        result.set(overGuidStr, adjDescInfo.guidStr);
        result.set(adjOverGuidStr, descGuidStr);
        reverseMap.set(adjDescInfo.guidStr, overGuidStr);
        reverseMap.set(descGuidStr, adjOverGuidStr);
      } else {
        result.set(overGuidStr, adjDescInfo.guidStr);
      }
      break;
    }
  }
}

/**
 * Translate override entries' first-level GUIDs using a translation map.
 *
 * Only translates the first GUID in each guidPath. Multi-level paths keep
 * remaining GUIDs unchanged (they target nested SYMBOL descendants and
 * will be translated when those nested INSTANCEs are resolved).
 *
 * Entries whose first GUID has no translation are kept unchanged.
 */
export function translateOverrides(
  overrides: readonly FigKiwiSymbolOverride[],
  translationMap: GuidTranslationMap,
): readonly FigKiwiSymbolOverride[] {
  if (translationMap.size === 0) {return overrides;}

  return overrides.map((entry) => {
    const guids = entry.guidPath?.guids;
    if (!guids || guids.length === 0) {return entry;}

    const firstGuidStr = guidToString(guids[0]);
    const mapped = translationMap.get(firstGuidStr);
    if (!mapped) {return entry;}

    const mappedGuid = parseGuidString(mapped);
    return {
      ...entry,
      guidPath: {
        guids: [mappedGuid, ...guids.slice(1)],
      },
    };
  });
}
