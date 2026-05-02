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

import type { FigNode, FigComponentPropAssignment } from "@aurochs/fig/types";
import { getNodeType, parseGuidString, decodePathCommands, type FigGuid, type FigBlob, type PathCommand } from "@aurochs/fig/parser";
import type { FigKiwiSymbolOverride } from "@aurochs/fig/types";
import { createFigResolveContext, type FigResolveContext, type SymbolDescendant } from "./resolve-context";
import { walkTree } from "@aurochs/fig/tree";
import { defensiveMark } from "../diagnostics/defensive";

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
 * Build a `defID → codepoint count` map from an INSTANCE's CPA. The
 * map is the per-INSTANCE input that lets `expectedCharCountOf`
 * resolve a TEXT descendant's CPA-bound length. Codepoint counts
 * (not UTF-16 unit counts) because `derivedTextData` glyph arrays
 * are keyed by codepoint — SF Symbols / emoji occupy one codepoint
 * but two UTF-16 units, and a count mismatch would mis-route the
 * override.
 */
function buildCpaCharCounts(
  ctx: FigResolveContext,
  componentPropAssignments: readonly FigComponentPropAssignment[] | undefined,
): ReadonlyMap<string, number> {
  if (!componentPropAssignments || componentPropAssignments.length === 0) {
    return EMPTY_CPA_CHAR_COUNTS;
  }
  const out = new Map<string, number>();
  for (const a of componentPropAssignments) {
    const chars = cpaCharacters(a);
    if (a.defID && typeof chars === "string") {
      out.set(ctx.guidString(a.defID), [...chars].length);
    }
  }
  return out.size > 0 ? out : EMPTY_CPA_CHAR_COUNTS;
}
const EMPTY_CPA_CHAR_COUNTS: ReadonlyMap<string, number> = new Map();

/**
 * SoT for "what is this descendant's expected codepoint count?".
 *
 * Resolves at the use site (no precomputed parallel descendant
 * array). For a TEXT descendant whose `componentPropRefs` bind it to
 * a CPA defID via `TEXT_DATA`, the final glyph count comes from CPA.
 * Otherwise the descendant's own `ownCharCount` (computed once from
 * the SYMBOL's own characters and cached on the bundle) is the
 * answer. Returns `undefined` when neither is available.
 */
function expectedCharCountOf(
  ctx: FigResolveContext,
  desc: SymbolDescendant,
  cpaCharCounts: ReadonlyMap<string, number>,
): number | undefined {
  if (cpaCharCounts.size > 0 && desc.nodeType === "TEXT") {
    const propRefs = desc.node.componentPropRefs;
    if (propRefs) {
      for (const ref of propRefs) {
        if (ref.componentPropNodeField?.name !== "TEXT_DATA") continue;
        if (!ref.defID) continue;
        const cnt = cpaCharCounts.get(ctx.guidString(ref.defID));
        if (typeof cnt === "number") { return cnt; }
      }
    }
  }
  return desc.ownCharCount;
}

// =============================================================================
// Types
// =============================================================================

/** Override GUID string → SYMBOL descendant GUID string */
export type GuidTranslationMap = ReadonlyMap<string, string>;

/**
 * SYMBOL descendant signal used by every phase below — `SymbolDescendant`
 * from `./resolve-context`. Reused as the SoT shape; we no longer
 * carry a parallel "enriched" type (the previous `SymbolDescendant` /
 * `enrichDescendantsWithCpa` pair created two representations of the
 * same fact, which is a SoT violation: any change to descendant
 * shape would have to be made in both places). CPA-aware expected
 * char counts are now resolved at the use site via
 * `expectedCharCountOf(desc, cpaCharCounts)`, so there is exactly
 * one descendant struct shared by SYMBOL-side caching and INSTANCE-
 * side phases.
 */

// =============================================================================
// Helpers
// =============================================================================

// Descendant info comes from `ctx.symbolDescendants(symbolRoot)`
// (`SymbolDescendant[]`). No "enriched" parallel array — CPA-aware
// expected character counts are queried lazily via
// `expectedCharCountOf(...)` at the use site, so we keep one
// canonical descendant struct.

/**
 * Single SoT walk of overrideSets — produces every aggregate phase
 * downstream consumes.
 *
 * Five distinct helpers used to walk the same `overrideSets` array
 * independently — `collectOverrideGuids` / `detectTypeHints` /
 * `extractShapeSignals` / `extractContainerContentSignature` /
 * `extractOverrideGlyphSummaries`. Same iteration, same key
 * derivation, five fresh Maps. This is a textbook SoT violation:
 * each helper "owned" a different facet of the same data, so adding
 * a new facet meant adding a sixth walk.
 *
 * `analyzeOverrideSets` does it once. Each entry is dispatched by
 * depth and field once, accumulating into the relevant per-key
 * sub-map. New facets get a new field on `OverrideAnalysis` and a
 * branch inside this loop — never a fresh walk.
 */
export type OverrideAnalysis = {
  readonly firstGuids: ReadonlyMap<string, FigGuid>;
  readonly entryCount: ReadonlyMap<string, number>;
  readonly typeHints: ReadonlyMap<string, string>;
  readonly shapeSignals: ReadonlyMap<string, ShapeSignal>;
  readonly glyphSummaries: ReadonlyMap<string, GlyphSummary>;
  readonly containerContentSig: ReadonlyMap<string, number>;
  /**
   * `firstGuids` partitioned by Kiwi session ID. Phase 1's
   * majority-vote loop iterates these groups; previously the grouping
   * was rebuilt inline at the top of `buildGuidTranslationMap` from
   * `overrideGuids.values()`, which was a redundant re-derivation of
   * data this analyzer already produces.
   */
  readonly firstGuidsBySession: ReadonlyMap<number, readonly FigGuid[]>;
  /**
   * Single-guid override entries that carry an `overriddenSymbolID` —
   * `rawFirstGuidStr → variantSymbolGuidStr`. These announce a
   * variant-switch on the slot at the (untranslated) first-guid.
   * Consumers translate the key through the resolved level map at
   * the use site; the raw mapping itself is a function of the
   * entries alone, so it lives on the analysis bundle instead of
   * being rebuilt by a separate walk in `resolveEntryPaths`.
   */
  readonly singleGuidVariantOverrides: ReadonlyMap<string, string>;
};

/** Properties unique to shape-like nodes (FRAME / RECTANGLE / etc.). */
const SHAPE_ONLY_PROPS: readonly string[] = [
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
/** Paint-only properties — leaf shape/container heuristic. */
const PAINT_PROPS: readonly string[] = ["fillPaints", "strokePaints", "strokeWeight", "effects"];

export function analyzeOverrideSets(
  ctx: FigResolveContext,
  ...overrideSets: (readonly FigKiwiSymbolOverride[] | undefined)[]
): OverrideAnalysis {
  const firstGuids = new Map<string, FigGuid>();
  const entryCount = new Map<string, number>();
  // Type-hints accumulator: depth-1 keys + has-children flag per first-guid.
  const guidTypeInfo = new Map<string, { depth1Keys: Set<string>; hasChildren: boolean }>();
  const shapeSignals = new Map<string, ShapeSignal>();
  const glyphSummaries = new Map<string, GlyphSummary>();
  const containerContentSig = new Map<string, number>();
  const singleGuidVariantOverrides = new Map<string, string>();

  for (const overrides of overrideSets) {
    if (!overrides) { continue; }
    for (const entry of overrides) {
      const guids = entry.guidPath?.guids;
      if (!guids || guids.length === 0) { continue; }
      const firstGuid = guids[0];
      const key = ctx.guidString(firstGuid);
      const depth = guids.length;

      if (!firstGuids.has(key)) { firstGuids.set(key, firstGuid); }
      entryCount.set(key, (entryCount.get(key) ?? 0) + 1);

      let info = guidTypeInfo.get(key);
      if (!info) { info = { depth1Keys: new Set(), hasChildren: false }; guidTypeInfo.set(key, info); }
      if (depth === 1) {
        for (const k of Object.keys(entry)) {
          if (k !== "guidPath") { info.depth1Keys.add(k); }
        }
      } else {
        info.hasChildren = true;
      }

      if (depth === 1) {
        // Variant override: single-guid path with `overriddenSymbolID` —
        // record raw first-guid → variant SYMBOL guid string. Caller
        // (resolveEntryPaths in tree-to-document) translates the key
        // through the resolved level map at use site.
        if (entry.overriddenSymbolID) {
          singleGuidVariantOverrides.set(key, ctx.guidString(entry.overriddenSymbolID));
        }

        // Shape signals (paint kind / corner radius).
        let sig = shapeSignals.get(key);
        if (!sig) { sig = { hasImageFill: false, hasCornerRadius: false }; shapeSignals.set(key, sig); }
        const fp = entry.fillPaints;
        if (Array.isArray(fp)) {
          for (const p of fp) {
            const t = typeof p.type === "string" ? p.type : p.type?.name;
            if (t === "IMAGE") { sig.hasImageFill = true; break; }
          }
        }
        if (
          (typeof entry.cornerRadius === "number" && entry.cornerRadius > 0) ||
          Array.isArray(entry.rectangleCornerRadii) ||
          typeof entry.rectangleTopLeftCornerRadius === "number" ||
          entry.rectangleCornerRadiiIndependent === true
        ) {
          sig.hasCornerRadius = true;
        }

        // Glyph summary from depth-1 derivedTextData (first wins).
        const dtd = entry.derivedTextData;
        if (dtd && !glyphSummaries.has(key)) {
          const isTruncated = typeof dtd.truncationStartIndex === "number" && dtd.truncationStartIndex >= 0;
          let total = 0;
          if (Array.isArray(dtd.derivedLines)) {
            total = dtd.derivedLines.reduce<number>((acc, l) => acc + (l.characters?.length ?? 0), 0);
          }
          if (total === 0 && Array.isArray(dtd.glyphs)) { total = dtd.glyphs.length; }
          if (total > 0) { glyphSummaries.set(key, { glyphCount: total, isTruncated }); }
        }
      } else {
        // Container content signature from depth-2+ derivedTextData (max glyph count wins).
        const dtd = entry.derivedTextData;
        if (dtd) {
          let glyphs = 0;
          if (Array.isArray(dtd.derivedLines)) {
            glyphs = dtd.derivedLines.reduce<number>((acc, l) => acc + (l.characters?.length ?? 0), 0);
          }
          if (glyphs === 0 && Array.isArray(dtd.glyphs)) { glyphs = dtd.glyphs.length; }
          if (glyphs > 1) {
            const prev = containerContentSig.get(key) ?? 0;
            if (glyphs > prev) { containerContentSig.set(key, glyphs); }
          }
        }
      }
    }
  }

  // Post-process type hints from accumulated info.
  const typeHints = new Map<string, string>();
  for (const [guidStr, info] of guidTypeInfo) {
    if (info.depth1Keys.has("derivedTextData") && !info.hasChildren) {
      typeHints.set(guidStr, "TEXT");
    } else if (info.depth1Keys.has("componentPropAssignments")) {
      typeHints.set(guidStr, "INSTANCE");
    } else if (info.hasChildren) {
      typeHints.set(guidStr, "CONTAINER");
    } else if (SHAPE_ONLY_PROPS.some((p) => info.depth1Keys.has(p))) {
      typeHints.set(guidStr, "SHAPE");
    } else if (PAINT_PROPS.some((p) => info.depth1Keys.has(p))) {
      typeHints.set(guidStr, "SHAPE");
    }
  }

  // Partition firstGuids by sessionID — derived in the same SoT walk
  // so callers don't re-iterate `overrideGuids.values()` themselves.
  const firstGuidsBySession = new Map<number, FigGuid[]>();
  for (const guid of firstGuids.values()) {
    const bucket = firstGuidsBySession.get(guid.sessionID);
    if (bucket) { bucket.push(guid); }
    else { firstGuidsBySession.set(guid.sessionID, [guid]); }
  }

  return {
    firstGuids,
    entryCount,
    typeHints,
    shapeSignals,
    glyphSummaries,
    containerContentSig,
    firstGuidsBySession,
    singleGuidVariantOverrides,
  };
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

// `extractShapeSignals` was a separate walk producing
// `Map<string, ShapeSignal>`. Now produced as part of
// `analyzeOverrideSets` (`overrideAnalysis.shapeSignals`).

/**
 * Score a descendant for compatibility with a SHAPE-hinted override.
 * Higher score = better match. Negative score disqualifies the
 * descendant as a map target.
 *
 * Dimension compatibility: overrides authored against a specific node
 * carry a `size` that either matches the target's SYMBOL-declared
 * size (no layout reflow) or expresses a constraint-driven rescale
 * that keeps ratios close to the original. Mis-mapped overrides —
 * e.g. a sibling variant's Separator dsd (`299x1`) landing on the
 * current variant's 70×70 icon FRAME — exhibit factor ratios an order
 * of magnitude apart on the two axes. We reject those outright to
 * prevent the mis-mapping from collapsing unrelated nodes.
 */
function scoreShapeMatch(
  desc: SymbolDescendant,
  signal: ShapeSignal | undefined,
  overrideSize?: { readonly x: number; readonly y: number },
): number {
  if (overrideSize && desc.size && desc.size.x > 0 && desc.size.y > 0 && overrideSize.x > 0 && overrideSize.y > 0) {
    const rx = overrideSize.x / desc.size.x;
    const ry = overrideSize.y / desc.size.y;
    // Disqualify "wildly non-uniform" shape mismatches.
    //
    // A legitimate Figma layout reflow either preserves both axes
    // (ratios close to 1) or scales both by a comparable factor
    // (constraint-driven resize typically has rx/ry ratios within
    // an order of magnitude of each other). The "shape-swap"
    // signature of a cross-variant mis-mapping is an override whose
    // one axis grows ≥2× while the other collapses to ≤10% of the
    // target's authored size — e.g. a Separator (299×1) override
    // being mapped to a 129×52 Title (2.32× wide, 0.019× tall) or
    // to a 70×70 icon FRAME (4.27× wide, 0.014× tall). We reject
    // these so the mis-mapping doesn't collapse unrelated nodes.
    //
    // Uniform shrinks/grows (e.g. 0.22×/0.22×) are NOT disqualified
    // because they are the normal product of constraint-driven
    // resizing a SYMBOL to a smaller INSTANCE extent.
    const oneAxisSquashed = (rx >= 2 && ry <= 0.1) || (ry >= 2 && rx <= 0.1);
    if (oneAxisSquashed) return -1;
  }
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

// `extractOverrideGlyphSummaries`, `extractOverrideGlyphCounts`, and
// `extractContainerContentSignature` were separate walks producing the
// glyph-summary, glyph-count, and depth-2 content-signature maps
// respectively. All three are now produced as fields on
// `analyzeOverrideSets`'s output (`glyphSummaries`,
// `containerContentSig`); the glyph-count projection is one
// `Map.set` loop at its single use site.

/**
 * Extract CPA character counts keyed by defID.
 * Used to compute a local descendant's expected Title character count.
 */
function extractCpaCharCounts(
  ctx: FigResolveContext,
  assignments: readonly FigComponentPropAssignment[] | undefined,
): Map<string, number> {
  const counts = new Map<string, number>();
  if (!assignments) return counts;
  for (const a of assignments) {
    if (!a.defID) continue;
    const chars = a.value?.textValue?.characters;
    if (typeof chars === "string") {
      counts.set(ctx.guidString(a.defID), [...chars].length);
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
  ctx: FigResolveContext,
  symbolDescendants: readonly FigNode[],
): Map<string, number> {
  const sigs = new Map<string, number>();
  walkTree(symbolDescendants, (node) => {
    const guid = node.guid;
    if (!guid || getNodeType(node) !== "INSTANCE") { return; }
    const cpa = node.componentPropAssignments;
    if (!cpa || cpa.length === 0) { return; }
    let maxChars = 0;
    for (const a of cpa) {
      const chars = a.value?.textValue?.characters;
      if (typeof chars === "string") {
        const c = [...chars].length;
        if (c > maxChars) { maxChars = c; }
      }
    }
    if (maxChars > 1) { sigs.set(ctx.guidString(guid), maxChars); }
  }, { getChildren: ctx.safeChildren });
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
/**
 * Compute the axis-aligned bounding box of a decoded path.
 *
 * Returns undefined when the path has no on-curve endpoints, matching the
 * "no size signal available" contract of `extractOverrideSizes`.
 */
function pathCommandsExtent(cmds: readonly PathCommand[]): { x: number; y: number } | undefined {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const c of cmds) {
    if (c.type === "M" || c.type === "L") {
      if (c.x < minX) minX = c.x;
      if (c.x > maxX) maxX = c.x;
      if (c.y < minY) minY = c.y;
      if (c.y > maxY) maxY = c.y;
    } else if (c.type === "C") {
      for (const v of [c.x, c.x1, c.x2]) {
        if (v < minX) minX = v;
        if (v > maxX) maxX = v;
      }
      for (const v of [c.y, c.y1, c.y2]) {
        if (v < minY) minY = v;
        if (v > maxY) maxY = v;
      }
    } else if (c.type === "Q") {
      for (const v of [c.x, c.x1]) {
        if (v < minX) minX = v;
        if (v > maxX) maxX = v;
      }
      for (const v of [c.y, c.y1]) {
        if (v < minY) minY = v;
        if (v > maxY) maxY = v;
      }
    }
  }
  if (minX === Infinity) return undefined;
  return { x: maxX - minX, y: maxY - minY };
}

function extractOverrideSizes(
  ctx: FigResolveContext,
  overrideSets: readonly (readonly FigKiwiSymbolOverride[] | undefined)[],
  blobs?: readonly FigBlob[],
): Map<string, { x: number; y: number }> {
  const sizes = new Map<string, { x: number; y: number }>();

  // First pass: collect explicit `size` fields and determine which
  // depth-1 guids carry an IMAGE fill (across any entry for that guid).
  // The image-fill flag gates the blob-size fallback to the Avatar case
  // only — see rationale below.
  const imageFillGuids = new Set<string>();
  for (const overrides of overrideSets) {
    if (!overrides) continue;
    for (const entry of overrides) {
      const guids = entry.guidPath?.guids;
      if (!guids || guids.length !== 1) continue;
      const key = ctx.guidString(guids[0]);
      if (entry.size && !sizes.has(key)) {
        sizes.set(key, { x: entry.size.x, y: entry.size.y });
      }
      if (Array.isArray(entry.fillPaints)) {
        for (const p of entry.fillPaints) {
          const t = typeof p.type === "string" ? p.type : p.type?.name;
          if (t === "IMAGE") { imageFillGuids.add(key); break; }
        }
      }
    }
  }

  // Second pass: fallback to the fillGeometry blob bounding box, but
  // only when the entry's depth-1 guid also carries an IMAGE fill
  // (tracked above). This scopes the blob-size inference to the one
  // case that actually needs it: image-fill overrides routing to
  // sibling descendants of different sizes (Contact "People=2"
  // variant's Avatar 1 ↔ Avatar 2), without perturbing pure-geometry
  // overrides whose blob extent may legitimately differ from the
  // matched descendant's authored size (Toolbar 44×44 buttons nested
  // in Button Groups of varying local sizes).
  //
  // Only trust shape-style blobs (leading byte 0x01 = M). Glyph
  // blobs have the `00 01 ...` header and encode coordinates in
  // glyph-space (~1.5×1.0), which do NOT match the containing
  // TEXT node's pixel size.
  if (!blobs) return sizes;
  for (const overrides of overrideSets) {
    if (!overrides) continue;
    for (const entry of overrides) {
      const guids = entry.guidPath?.guids;
      if (!guids || guids.length !== 1) continue;
      const key = ctx.guidString(guids[0]);
      if (sizes.has(key)) continue;
      if (!imageFillGuids.has(key)) continue;
      const fg = entry.fillGeometry?.[0];
      const blobIdx = fg?.commandsBlob;
      if (typeof blobIdx !== "number" || blobIdx < 0 || blobIdx >= blobs.length) continue;
      const blob = blobs[blobIdx];
      if (!blob || blob.bytes.length === 0) continue;
      if (blob.bytes[0] !== 0x01) continue;
      const extent = pathCommandsExtent(decodePathCommands(blob));
      if (extent && extent.x > 0 && extent.y > 0) {
        sizes.set(key, extent);
      }
    }
  }
  return sizes;
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
 * @param symbolRoot         The SYMBOL frame whose descendants are being mapped
 *        into. Pass the FigNode root (not its children array) so the
 *        function can fetch a cached descendant bundle from the
 *        `FigResolveContext` — sharing one DFS walk + four
 *        Map/Set allocations across every INSTANCE that targets the
 *        same SYMBOL.
 * @param derivedSymbolData  Pre-computed layout overrides from INSTANCE
 * @param symbolOverrides    Property overrides from INSTANCE
 * @param componentPropAssignments  Instance CPA (used to disambiguate TEXT
 *        descendants by expected character count — when a TEXT node has a
 *        componentPropRef linking it to a CPA defID, we can predict its
 *        final character count and match DSD entries by glyph count).
 * @returns Map from override GUID string to SYMBOL descendant GUID string
 */
export function buildGuidTranslationMap(
  symbolRoot: FigNode,
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
  /**
   * Optional blob array from the parsed .fig file. When supplied,
   * overrides that carry a fillGeometry reference but no explicit
   * `size` field can still contribute size information via the path
   * blob's bounding box — essential for disambiguating sibling
   * descendants of different sizes (e.g. two avatars in a multi-avatar
   * Contact variant).
   */
  blobs?: readonly FigBlob[],
  /**
   * Scoped resolve context — owns the GUID-string interner for this
   * conversion. When the caller already has a context (e.g.
   * `treeToDocument` shares one across the whole document), pass it
   * here so cached GUID strings are shared across every INSTANCE that
   * targets the same SYMBOL. Default: a one-shot context covering
   * just this single call.
   */
  ctx: FigResolveContext = createFigResolveContext(),
  /**
   * Pre-computed `analyzeOverrideSets(...)` result. When the caller
   * already has the analysis (e.g. it inspected
   * `singleGuidVariantOverrides` to build a variant map for the same
   * INSTANCE), pass it in to share the single SoT walk and avoid
   * re-walking `derivedSymbolData` / `symbolOverrides` here. When
   * omitted, the function computes the analysis itself.
   */
  precomputedAnalysis?: OverrideAnalysis,
): GuidTranslationMap {
  // SYMBOL-side derived state — fetched once per SYMBOL and shared by
  // every INSTANCE that targets it. Replaces what used to be one DFS
  // walk + four fresh Maps/Sets per call. `descendants` is the SoT
  // descendant array; CPA-aware glyph counts are queried lazily via
  // `expectedCharCountOf(desc, cpaCharCounts)` at the few use sites
  // that need them.
  const bundle = ctx.symbolDescendants(symbolRoot);
  const descendants = bundle.descendants;
  if (descendants.length === 0) { return new Map(); }
  const symbolDescendants = ctx.safeChildren(symbolRoot);
  const cpaCharCounts = buildCpaCharCounts(ctx, componentPropAssignments);

  // SoT walk: every signal `buildGuidTranslationMap` needs from the
  // overrideSets is computed in `analyzeOverrideSets` in one pass.
  // Phases below read from this struct instead of re-walking.
  const overrideAnalysis = precomputedAnalysis ?? analyzeOverrideSets(ctx, derivedSymbolData, symbolOverrides);
  const overrideGuids = overrideAnalysis.firstGuids;
  if (overrideGuids.size === 0) {return new Map();}

  // SoT: derive `overrideSizes` ONCE for this call. The previous code
  // re-derived it inside seven different phase blocks with identical
  // arguments — same input, same output, seven times. Consolidating
  // here lets every phase consult the same Map. (Lazy via the
  // closure so we still skip the work for short-circuited cases like
  // "all GUIDs already match" below.)
  let cachedOverrideSizes: Map<string, { x: number; y: number }> | undefined;
  const getOverrideSizes = (): Map<string, { x: number; y: number }> => {
    if (!cachedOverrideSizes) {
      cachedOverrideSizes = extractOverrideSizes(ctx, [derivedSymbolData, symbolOverrides], blobs);
    }
    return cachedOverrideSizes;
  };

  // Check if override GUIDs already match descendants — no translation needed
  const descendantSet = bundle.guidSet;
  const allMatch = [...overrideGuids.keys()].every((key) => descendantSet.has(key));
  if (allMatch) {return new Map();}

  // Both maps are SYMBOL-pure — read straight from the cached bundle
  // instead of re-deriving them per call. `directOverrideKeyMap` is the
  // overrideKey → descendant GUID lookup the Figma authoring uses for
  // stable cross-INSTANCE addressing; `localIdToDescendant` is the
  // localID-only fallback used by Phase 1's offset heuristics.
  const directOverrideKeyMap = bundle.directOverrideKeyMap;
  const localIdToDescendant = bundle.localIdToDescendant;
  // Single SoT for "descendant by guidStr" — straight off the bundle.
  // Multiple phases below used to rebuild this Map (`descByGuidStr` /
  // `descByGuid`) from `descendants` per call. Same SYMBOL, same Map,
  // five fresh allocations. Reading from `bundle.guidToDesc` keeps the
  // lookup in one place per SYMBOL across every INSTANCE that targets
  // it.
  const descByGuidStr = bundle.guidToDesc;

  // Override GUIDs partitioned by sessionID — straight off the
  // single SoT walk in `analyzeOverrideSets`. The earlier inline
  // grouping derived the same data from `overrideGuids.values()` and
  // duplicated the bucket-allocate-and-push idiom.
  const bySession = overrideAnalysis.firstGuidsBySession;

  const result = new Map<string, string>();

  const typeHints = overrideAnalysis.typeHints;

  // ── Phase Zero: Direct overrideKey resolution ──
  //
  // Override entries authored by Figma carry the SYMBOL-side
  // `overrideKey` of their target slot in `guidPath.guids[0]`. The
  // descendant tree retains the same `overrideKey` on the cloned
  // SYMBOL-descendant slot (its own `guid` is fresh per-clone). When a
  // descendant has a matching `overrideKey`, that pairing is exact —
  // no sibling-pairing or majority-vote heuristic can do better. Lock
  // it before any later phase so heuristics don't steal the slot.
  //
  // The `lockedKeys` set is consulted by Phase 1.3 / 1.5 / 2 / 3 / 4 / 5
  // before evicting or overwriting an entry — Phase Zero pairings are
  // exact and must survive every later heuristic.
  const lockedKeys = new Set<string>();
  for (const [guidStr, _] of overrideGuids) {
    if (result.has(guidStr)) continue;
    const directDescendant = directOverrideKeyMap.get(guidStr);
    if (directDescendant) {
      result.set(guidStr, directDescendant);
      lockedKeys.add(guidStr);
    }
  }

  // Small-descendant short-circuit: when the descendant set is too narrow
  // for heuristics to reliably distinguish targets (typically a FRAME
  // container with 2-3 children), skip the later phases. Heuristic
  // mappings with too few candidates routinely route an override to the
  // wrong sibling — e.g. Toolbar's back-button SYMBOL exposes only 2
  // descendants (BG, Text), and an inner-Mask override path
  // `[5575:75442]` (deep grandchild) gets mistakenly mapped to BG by
  // sibling-pairing heuristics, applying a 196×196 size to BG instead
  // of clipping the actual Mask. With only Phase Zero (direct
  // overrideKey matches), entries that don't map stay untranslated and
  // descend naturally to the deeper INSTANCE that owns them.
  if (descendants.length <= 3) {
    defensiveMark("guid-translation:small-descendant-short-circuit", {
      descendantCount: descendants.length,
      overrideCount: overrideGuids.size,
      phaseZeroResolved: result.size,
    });
    return result;
  }

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
    // SoT: read the per-key counts straight from the single
    // override-analysis bundle. The earlier inline loop was a
    // faithful duplicate — same iteration, same key derivation, same
    // accumulator shape.
    const entryCount = overrideAnalysis.entryCount;
    // Sort by descending entry count — the heaviest first.
    const rankedOverrides = [...overrideGuids.entries()]
      .filter(([k]) => {
        const hint = typeHints.get(k);
        if (hint !== "CONTAINER") return false;
        return (entryCount.get(k) ?? 0) >= 20;
      })
      .sort((a, b) => (entryCount.get(b[0]) ?? 0) - (entryCount.get(a[0]) ?? 0));

    if (rankedOverrides.length > 0 && symbolMap) {
      // Per-SYMBOL top-level weights — fetched from ctx so every
      // INSTANCE that targets the same SYMBOL shares the same Map
      // (and the recursive expansion runs once per SYMBOL, not once
      // per INSTANCE call). The previous inline version recomputed
      // the recursive walk + duplicated `getEffectiveSymbolID` /
      // `resolveSymbolGuidStr` per call.
      const topLevelWeight = ctx.symbolTopLevelWeights(symbolRoot, symbolMap);
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

  // SYMBOL-pure: take the cached lookup straight from the bundle. The
  // type-tiebreaker downstream only reads `nodeType`, which is a
  // SYMBOL-side fact — no INSTANCE / CPA dependence, no need to
  // re-allocate per call.
  const localIdToDescInfo = bundle.localIdToDescInfo;

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
          const hint = typeHints.get(ctx.guidString(overrideGuid));
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
        result.set(ctx.guidString(overrideGuid), descendantGuidStr);
      }
    }
  }

  // ── Phase 1 validation: Remove size-mismatched mappings ──
  // When override GUIDs from a session target nodes at different depths,
  // the majority-vote offset maps some GUIDs to wrong descendants.
  // Detect and remove mappings where the DSD entry size grossly mismatches
  // the target descendant's original size, freeing them for better matching
  // in subsequent phases.
  //
  // Exception (SoT for "trust the session-wide offset"): when at least
  // 3 entries of the same session already agree on a single offset
  // (== Phase 1 actually committed to that offset), spare any entry
  // that aligns with that offset from size-based eviction. The DSD
  // size disagreement is then a legitimate signal that the descendant
  // was resized inside the INSTANCE (e.g. Toolbar - Top's "Trailing"
  // 194×44 → 44×44 because only one child Button Group remains
  // visible). The lower threshold (3) follows Phase 1's own
  // ≥3-entries threshold for committing to an offset.
  {
    const overrideSizes = getOverrideSizes();
    // (Top-level `descByGuidStr` is shared across phases — see header.)

    // Compute per-session consensus offset from current `result`.
    const sessionConsensusOffset = new Map<number, number>();
    {
      const offsetCountsBySession = new Map<number, Map<number, number>>();
      for (const [overrideGuidStr, descGuidStr] of result) {
        const [sidStr, ovLidStr] = overrideGuidStr.split(":");
        const [, descLidStr] = descGuidStr.split(":");
        const sid = Number(sidStr);
        const off = Number(ovLidStr) - Number(descLidStr);
        const counts = offsetCountsBySession.get(sid) ?? new Map<number, number>();
        counts.set(off, (counts.get(off) ?? 0) + 1);
        offsetCountsBySession.set(sid, counts);
      }
      for (const [sid, counts] of offsetCountsBySession) {
        let bestOff = 0;
        let bestCount = 0;
        for (const [off, c] of counts) {
          if (c > bestCount) { bestCount = c; bestOff = off; }
        }
        if (bestCount >= 3) sessionConsensusOffset.set(sid, bestOff);
      }
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
        const [sidStr, ovLidStr] = overrideGuidStr.split(":");
        const [, descLidStr] = descGuidStr.split(":");
        const sid = Number(sidStr);
        const off = Number(ovLidStr) - Number(descLidStr);
        const consensus = sessionConsensusOffset.get(sid);
        if (consensus !== undefined && consensus === off) {continue;}
        if (lockedKeys.has(overrideGuidStr)) continue;
        toRemove.push(overrideGuidStr);
      }
    }

    if (toRemove.length > 0) {
      defensiveMark("guid-translation:phase-1-validation:size-mismatch-evict", {
        evicted: toRemove.length,
      });
      for (const key of toRemove) {
        result.delete(key);
      }
    }
  }

  // ── Phase 1 validation (type compat): remove SHAPE-hinted mappings
  // that landed on a TEXT node via the majority-vote offset.
  //
  // A SHAPE override carries paint-shape data (fillPaints, fillGeometry,
  // corner-radius properties) that only makes sense on a shape node
  // (FRAME / RECTANGLE / ELLIPSE / VECTOR / LINE / STAR / etc.).
  // Applying it to a TEXT node corrupts the text's styling — e.g. an
  // image-fill paint lands on text and makes it invisible.
  //
  // Example: Contact "People=2" variant in edge-cases.fig has
  // session-127 overrides including 127:58425 (hint TEXT → targets the
  // Names TEXT) and 127:58426 (hint SHAPE with image fill → targets an
  // Avatar FRAME). The best-offset tiebreaker maximises the TEXT match,
  // which lands 127:58426 onto the adjacent "Number of People" TEXT.
  // Removing this mismatch frees 127:58426 for Phase 1.85's shape-
  // signal scoring.
  //
  // Scope is narrowed to SHAPE→TEXT only (not every type-mismatch),
  // because TEXT/INSTANCE/CONTAINER→other mismatches are routinely
  // corrected later by Phase 1.3/1.5 content-signature / typed matching
  // and an over-aggressive eviction here breaks multi-level dsd
  // cascades that depend on those later phases' keeping the Phase 1
  // offset-aligned guesses intact (e.g. Activity View - iPhone's
  // intermediate INSTANCE guids threading action-icon glyph overrides
  // through 8+ Action INSTANCEs).
  {
    // (Top-level `descByGuidStr` is shared across phases — see header.)
    const toRemoveType: string[] = [];
    for (const [overrideGuidStr, descGuidStr] of result) {
      if (lockedKeys.has(overrideGuidStr)) continue;
      const hint = typeHints.get(overrideGuidStr);
      if (hint !== "SHAPE") continue;
      const desc = descByGuidStr.get(descGuidStr);
      if (!desc) continue;
      if (desc.nodeType === "TEXT") {
        toRemoveType.push(overrideGuidStr);
      }
    }
    if (toRemoveType.length > 0) {
      defensiveMark("guid-translation:phase-1-validation:shape-on-text-evict", {
        evicted: toRemoveType.length,
      });
      for (const key of toRemoveType) {
        result.delete(key);
      }
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
    const sourceContentSig = overrideAnalysis.containerContentSig;
    if (sourceContentSig.size > 0) {
      const localSigs = computeLocalInstanceSignatures(ctx, symbolDescendants);
      if (localSigs.size > 0) {
        // Step 1: Evict type-mismatched Phase 1 mappings. When Phase 1's
        // offset-vote puts a sig-X source onto a sig-Y local (X ≠ Y), that
        // mapping is structurally wrong — the offset conflated two branches
        // (e.g. source flat 6 actions vs local nested 2×(4+2) actions).
        const toEvict: string[] = [];
        for (const [src, loc] of result) {
          if (lockedKeys.has(src)) continue;
          const srcSig = sourceContentSig.get(src);
          const locSig = localSigs.get(loc);
          if (srcSig !== undefined && locSig !== undefined && srcSig !== locSig) {
            toEvict.push(src);
          }
        }
        if (toEvict.length > 0) {
          defensiveMark("guid-translation:phase-1.3:type-mismatch-evict", {
            evicted: toEvict.length,
          });
          for (const k of toEvict) result.delete(k);
        }

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
  // - TEXT/INSTANCE: size-aware matching when override carries an explicit
  //   `size` field; otherwise sorted-localID positional fallback.
  //   Size-aware matching is the SoT here because Phase 1's offset
  //   heuristic only fits the majority — leftover GUIDs whose offset
  //   doesn't align (e.g. Action 4's [5591:32473] addressing the
  //   App Name TEXT 78×30 instead of the SF Symbol TEXT 70×70 the
  //   positional sort would land on) need a stronger signal.
  // - SHAPE: property-based scoring (image-fill / corner-radius hints) with
  //   tiebreaker by sorted localID
  //
  // Order: TEXT → INSTANCE first, then SHAPE. SHAPE is deferred until
  // Phase 1.75 has a chance to consume size-matched overrides (separator
  // lines, etc.) whose size uniquely identifies their descendant target.
  const shapeSignals = overrideAnalysis.shapeSignals;
  const phase1_5OverrideSizes = getOverrideSizes();
  for (const [, guids] of bySession) {
    if (guids.length < 3) {continue;}
    const unmapped = guids.filter((g) => !result.has(ctx.guidString(g)));
    if (unmapped.length === 0) {continue;}

    const phase1Targets = new Set(result.values());

    for (const targetType of ["TEXT", "INSTANCE"] as const) {
      const typedUnmapped = unmapped.filter((g) => typeHints.get(ctx.guidString(g)) === targetType);
      if (typedUnmapped.length === 0) {continue;}

      const typedDescendants = descendants.filter((d) => matchesTypeHint(targetType, d.nodeType));
      const unclaimed = typedDescendants.filter((d) => !phase1Targets.has(d.guidStr));

      // Greedy size-aware matching: for each unmapped override (sorted
      // by localID for determinism), pick the unclaimed descendant
      // whose size best matches the override's `size` field. When the
      // override carries no explicit size, leave it unmapped — the
      // earlier "positional fallback by localID" branch was a pure
      // guess (no signal to verify the pairing) and produced 90 fires
      // across the corpus, all of which travelled through the
      // downstream `guidReachableInSymbol` filter without independent
      // verification. Per CLAUDE.md "don't guess; resolve correctly
      // or drop", entries without a size signal stay unmapped here
      // and either get rescued by a later signal-bearing phase or
      // are dropped by the entry-reach filter.
      const sortedUnmapped = [...typedUnmapped].sort((a, b) => a.localID - b.localID);
      const remainingDesc = new Set(unclaimed.map((d) => d.guidStr));
      const descByGuidStrLocal = new Map<string, SymbolDescendant>();
      for (const d of unclaimed) descByGuidStrLocal.set(d.guidStr, d);

      for (const ov of sortedUnmapped) {
        const ovKey = ctx.guidString(ov);
        const ovSize = phase1_5OverrideSizes.get(ovKey);
        if (!ovSize) { continue; }
        // Pick the descendant whose size differs least from ovSize.
        let chosen: SymbolDescendant | undefined;
        let bestDiff = Infinity;
        for (const dGuidStr of remainingDesc) {
          const d = descByGuidStrLocal.get(dGuidStr);
          if (!d?.size) continue;
          const diff = Math.abs(d.size.x - ovSize.x) + Math.abs(d.size.y - ovSize.y);
          if (diff < bestDiff) { bestDiff = diff; chosen = d; }
        }
        if (!chosen) continue;
        result.set(ovKey, chosen.guidStr);
        phase1Targets.add(chosen.guidStr);
        remainingDesc.delete(chosen.guidStr);
      }
    }
  }

  // ── Phase 1.75: Size-group matching for remaining unmapped GUIDs ──
  // When override GUIDs from a session target nodes at DIFFERENT depths
  // in the SYMBOL hierarchy, the majority-vote offset can't map all of them.
  // This phase uses DSD entry sizes to match unmapped GUIDs to descendants
  // with matching original sizes.
  {
    const overrideSizes = getOverrideSizes();
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
    const shapeOverrideSizes = getOverrideSizes();
    for (const [, guids] of bySession) {
      const unmapped = guids.filter((g) => !result.has(ctx.guidString(g)));
      const shapeUnmapped = unmapped.filter((g) => typeHints.get(ctx.guidString(g)) === "SHAPE");
      if (shapeUnmapped.length === 0) continue;

      const candidates = descendants.filter(
        (d) => SHAPE_NODE_TYPES.has(d.nodeType) && !claimedAfter175.has(d.guidStr),
      );
      if (candidates.length === 0) continue;

      const remaining = new Set(candidates.map((d) => d.guidStr));
      const orderedUnmapped = [...shapeUnmapped].sort((a, b) => a.localID - b.localID);
      for (const ov of orderedUnmapped) {
        const ovKey = ctx.guidString(ov);
        const signal = shapeSignals.get(ovKey);
        const overrideSize = shapeOverrideSizes.get(ovKey);
        let best: SymbolDescendant | undefined;
        let bestScore = -1;
        for (const d of candidates) {
          if (!remaining.has(d.guidStr)) continue;
          const score = scoreShapeMatch(d, signal, overrideSize);
          // Negative score means "disqualify" — treat as no match.
          if (score < 0) continue;
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
  const descendantsByType = new Map<string, SymbolDescendant[]>();
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
      const guidStr = ctx.guidString(guid);
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
      const allCandidatesRef = { value: undefined as SymbolDescendant[] | undefined };
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
        // Score-based match using shape signals + size compatibility
        const phase2OverrideSizes = getOverrideSizes();
        const remaining = new Set(candidates.map((d) => d.guidStr));
        const sortedGuids = [...hintGuids].sort((a, b) => a.localID - b.localID);
        for (const ov of sortedGuids) {
          const ovKey = ctx.guidString(ov);
          const signal = shapeSignals.get(ovKey);
          const overrideSize = phase2OverrideSizes.get(ovKey);
          let best: SymbolDescendant | undefined;
          let bestScore = -1;
          for (const d of candidates) {
            if (!remaining.has(d.guidStr)) continue;
            const score = scoreShapeMatch(d, signal, overrideSize);
            if (score < 0) continue;
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
        // Size-aware greedy matching for TEXT/INSTANCE/UNKNOWN hints.
        //
        // When the override carries an explicit `size` field, prefer
        // the candidate whose size matches. Multi-level path leaves
        // seeded by `resolveEntryPath` with the original entry's size
        // rely on this branch — without it, a 44×44 Close Button
        // override at depth 4 lands on the next available descendant
        // by localID order (the deeper Message TEXT 199×18) instead
        // of the size-matching INSTANCE.
        //
        // The earlier "positional fallback by localID" branch (used
        // when the override carried no size) was removed for the same
        // reason as Phase 1.5's: 1390 corpus fires with no verifiable
        // signal that the pairing is correct. Entries without size
        // stay unmapped and let the entry-reach filter drop them.
        const phase2Sizes = getOverrideSizes();
        const sortedGuids = [...hintGuids].sort((a, b) => a.localID - b.localID);
        const remaining = new Set(candidates.map((d) => d.guidStr));
        const descByGuidStrLocal = new Map<string, SymbolDescendant>();
        for (const d of candidates) descByGuidStrLocal.set(d.guidStr, d);

        for (const ov of sortedGuids) {
          const ovKey = ctx.guidString(ov);
          const ovSize = phase2Sizes.get(ovKey);
          if (!ovSize) { continue; }
          let chosen: SymbolDescendant | undefined;
          let bestDiff = Infinity;
          for (const dGuidStr of remaining) {
            const d = descByGuidStrLocal.get(dGuidStr);
            if (!d?.size) continue;
            const diff = Math.abs(d.size.x - ovSize.x) + Math.abs(d.size.y - ovSize.y);
            if (diff < bestDiff) { bestDiff = diff; chosen = d; }
          }
          if (!chosen) continue;
          result.set(ovKey, chosen.guidStr);
          remaining.delete(chosen.guidStr);
        }
      }
    }
  }

  // ── Phase 4: TEXT glyph-count fixup ──
  //
  // When the instance's CPA dictates the final character count of a TEXT node
  // (via componentPropRef), and the override's derivedTextData carries a glyph
  // count, we can verify the mapping: glyph count should equal expected char
  // count. If a pair of TEXT mappings within the same session are swapped
  // (i.e. swapping them restores consistency), swap them.
  {
    // Derive plain glyph-count map from the analysis bundle's
    // glyphSummaries (single SoT for "what the overrideSets say
    // about glyph counts"). The legacy `extractOverrideGlyphCounts`
    // helper was a thin wrapper that walked the data a second time
    // — replaced by this projection.
    const glyphCounts = new Map<string, number>();
    for (const [k, s] of overrideAnalysis.glyphSummaries) {
      glyphCounts.set(k, s.glyphCount);
    }
    if (glyphCounts.size > 0) {
      // (Top-level `descByGuidStr` is shared across phases — read directly.)
      const descByGuid = descByGuidStr;

      // For each override GUID mapped to a TEXT descendant with an expected
      // char count, check mismatch.
      type Mismatch = { ovKey: string; currentDst: string; expected: number; glyphs: number };
      const mismatches: Mismatch[] = [];
      for (const [ovKey, dstGuidStr] of result) {
        const glyphs = glyphCounts.get(ovKey);
        if (glyphs === undefined) continue;
        const desc = descByGuid.get(dstGuidStr);
        if (!desc || desc.nodeType !== "TEXT") continue;
        const expected = expectedCharCountOf(ctx, desc, cpaCharCounts);
        if (typeof expected !== "number") continue;
        if (expected !== glyphs) {
          mismatches.push({ ovKey, currentDst: dstGuidStr, expected, glyphs });
        }
      }

      // (Pair-wise swap branch removed — calibration showed 0 fires
      // across both the production fixture corpus and the existing
      // test suite. The hypothesis was "two TEXT mappings within the
      // same session may have been transposed and swapping restores
      // consistency"; in real input the single-mismatch reroute below
      // handles every mismatch primary leaves behind, so the swap
      // branch was dead defensive code.)
      const fixed = new Set<string>();

      // Single-mismatch reroute: for each remaining mismatch, look for a
      // TEXT descendant whose expectedCharCount matches the override's
      // glyph count. Prefer unclaimed targets; if all matching targets are
      // claimed, drop the mapping entirely so the mismatched override
      // doesn't corrupt an unrelated TEXT node (cloneSymbolChildren will
      // simply skip the untranslated path, leaving the target's original
      // derivedTextData intact).
      const claimed = new Set(result.values());
      for (const m of mismatches) {
        if (fixed.has(m.ovKey) || lockedKeys.has(m.ovKey)) continue;
        let unclaimed: SymbolDescendant | undefined;
        let anyMatch: SymbolDescendant | undefined;
        for (const d of descendants) {
          if (d.nodeType !== "TEXT") continue;
          if (expectedCharCountOf(ctx, d, cpaCharCounts) !== m.glyphs) continue;
          if (!anyMatch) anyMatch = d;
          if (!claimed.has(d.guidStr) || d.guidStr === m.currentDst) {
            unclaimed = d;
            break;
          }
        }
        if (unclaimed && unclaimed.guidStr !== m.currentDst) {
          defensiveMark("guid-translation:phase-4:single-mismatch-reroute", {
            ovKey: m.ovKey,
          });
          result.set(m.ovKey, unclaimed.guidStr);
          claimed.add(unclaimed.guidStr);
          fixed.add(m.ovKey);
        } else if (!unclaimed && anyMatch) {
          // A correct target exists but is claimed by another (likely
          // duplicate) override. Drop this mismatched mapping so it
          // doesn't apply stale glyphs to the wrong TEXT node.
          defensiveMark("guid-translation:phase-4:drop-on-claimed", {
            ovKey: m.ovKey,
          });
          result.delete(m.ovKey);
          fixed.add(m.ovKey);
        }
      }
    }
  }

  // ── Phase 5: Exact-size re-route ──
  //
  // Re-route a mapping when an UNCLAIMED descendant matches the
  // override's size exactly while the current target's size is far
  // off. The earlier session-offset heuristic can land a single entry
  // on a wrong-typed sibling (Activity View Header's [5591:68057]
  // 44×44 Close Button override → Message TEXT 199×18 because all 6
  // other session entries shared the same offset). When the truly
  // correct slot — same size, currently unclaimed — exists alongside,
  // moving the mapping is unambiguously right and doesn't disturb
  // the legitimate single-entry resize cases (Toolbar Trailing
  // 194×44 → 44×44 has no co-resident exact-size sibling).
  {
    const phase5Sizes = getOverrideSizes();
    // (Top-level `descByGuidStr` is shared across phases — see header.)
    const claimed = new Set(result.values());

    for (const [overrideGuidStr, descGuidStr] of result) {
      const ovSize = phase5Sizes.get(overrideGuidStr);
      if (!ovSize) continue;
      const desc = descByGuidStr.get(descGuidStr);
      if (!desc?.size) continue;
      const currentDiff = Math.abs(ovSize.x - desc.size.x) + Math.abs(ovSize.y - desc.size.y);
      if (currentDiff <= 4) continue; // already a near-exact match

      // Look for an unclaimed descendant whose size matches the
      // override exactly (diff ≤ 1 px on each axis combined).
      for (const d of descendants) {
        if (claimed.has(d.guidStr)) continue;
        if (!d.size) continue;
        const diff = Math.abs(ovSize.x - d.size.x) + Math.abs(ovSize.y - d.size.y);
        if (diff <= 1 && diff < currentDiff) {
          // Reroute: swap claim
          defensiveMark("guid-translation:phase-5:exact-size-reroute", {
            overrideGuidStr,
            from: descGuidStr,
            to: d.guidStr,
          });
          result.set(overrideGuidStr, d.guidStr);
          claimed.delete(descGuidStr);
          claimed.add(d.guidStr);
          break;
        }
      }
    }
  }


  return result;
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
  ctx: FigResolveContext = createFigResolveContext(),
): readonly FigKiwiSymbolOverride[] {
  if (translationMap.size === 0) {return overrides;}

  return overrides.map((entry) => {
    const guids = entry.guidPath?.guids;
    if (!guids || guids.length === 0) {return entry;}

    const firstGuidStr = ctx.guidString(guids[0]);
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
