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

import type { FigNode } from "@aurochs/fig/types";
import { getNodeType, guidToString, type FigGuid } from "@aurochs/fig/parser";
import type { FigSymbolOverride } from "./symbol-resolver";

// =============================================================================
// Types
// =============================================================================

/** Override GUID string → SYMBOL descendant GUID string */
export type GuidTranslationMap = ReadonlyMap<string, string>;

interface DescendantInfo {
  guid: FigGuid;
  guidStr: string;
  nodeType: string;
  visible: boolean;
  size?: { x: number; y: number };
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
  const result: DescendantInfo[] = [];

  function walk(node: FigNode): void {
    const nodeData = node as Record<string, unknown>;
    const guid = nodeData.guid as FigGuid | undefined;
    if (guid) {
      const size = nodeData.size as { x: number; y: number } | undefined;
      result.push({
        guid,
        guidStr: guidToString(guid),
        nodeType: getNodeType(node),
        visible: nodeData.visible !== false,
        size: size ? { x: size.x, y: size.y } : undefined,
      });
    }
    for (const child of node.children ?? []) {
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
function collectOverrideGuids(...overrideSets: (readonly FigSymbolOverride[] | undefined)[]): Map<string, FigGuid> {
  const map = new Map<string, FigGuid>();
  for (const overrides of overrideSets) {
    if (!overrides) continue;
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
function detectTypeHints(...overrideSets: (readonly FigSymbolOverride[] | undefined)[]): Map<string, string> {
  // Per GUID: track depth-1 keys and whether it has depth-2+ entries
  const guidInfo = new Map<string, { depth1Keys: Set<string>; hasChildren: boolean }>();

  for (const overrides of overrideSets) {
    if (!overrides) continue;
    for (const entry of overrides) {
      const firstGuid = entry.guidPath?.guids?.[0];
      if (!firstGuid) continue;
      const key = guidToString(firstGuid);
      let info = guidInfo.get(key);
      if (!info) {
        info = { depth1Keys: new Set(), hasChildren: false };
        guidInfo.set(key, info);
      }
      const depth = entry.guidPath.guids.length;
      if (depth === 1) {
        for (const k of Object.keys(entry)) {
          if (k !== "guidPath") info.depth1Keys.add(k);
        }
      }
      if (depth > 1) {
        info.hasChildren = true;
      }
    }
  }

  const hints = new Map<string, string>();
  for (const [guidStr, info] of guidInfo) {
    if (info.depth1Keys.has("derivedTextData") && !info.hasChildren) {
      hints.set(guidStr, "TEXT");
    } else if (info.depth1Keys.has("componentPropAssignments")) {
      hints.set(guidStr, "INSTANCE");
    } else if (info.hasChildren) {
      hints.set(guidStr, "CONTAINER");
    }
  }
  return hints;
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
  ...overrideSets: (readonly FigSymbolOverride[] | undefined)[]
): Map<string, { x: number; y: number }> {
  const sizes = new Map<string, { x: number; y: number }>();
  for (const overrides of overrideSets) {
    if (!overrides) continue;
    for (const entry of overrides) {
      const guids = entry.guidPath?.guids;
      if (!guids || guids.length !== 1) continue;
      const size = (entry as Record<string, unknown>).size as { x: number; y: number } | undefined;
      if (!size) continue;
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
 * @returns Map from override GUID string to SYMBOL descendant GUID string
 */
export function buildGuidTranslationMap(
  symbolDescendants: readonly FigNode[],
  derivedSymbolData: readonly FigSymbolOverride[] | undefined,
  symbolOverrides: readonly FigSymbolOverride[] | undefined,
): GuidTranslationMap {
  const descendants = collectDescendantInfo(symbolDescendants);
  if (descendants.length === 0) return new Map();

  const overrideGuids = collectOverrideGuids(derivedSymbolData, symbolOverrides);
  if (overrideGuids.size === 0) return new Map();

  // Check if override GUIDs already match descendants — no translation needed
  const descendantSet = new Set(descendants.map((d) => d.guidStr));
  const allMatch = [...overrideGuids.keys()].every((key) => descendantSet.has(key));
  if (allMatch) return new Map();

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
    let arr = bySession.get(guid.sessionID);
    if (!arr) {
      arr = [];
      bySession.set(guid.sessionID, arr);
    }
    arr.push(guid);
  }

  const result = new Map<string, string>();

  // ── Phase 1: Sessions with 3+ GUIDs — majority-vote offset ──

  const typeHints = detectTypeHints(derivedSymbolData, symbolOverrides);

  // Build descendant lookup by localID → DescendantInfo
  const localIdToDescInfo = new Map<number, DescendantInfo>();
  for (const d of descendants) {
    if (!localIdToDescInfo.has(d.guid.localID)) {
      localIdToDescInfo.set(d.guid.localID, d);
    }
  }

  for (const [, guids] of bySession) {
    if (guids.length < 3) continue;

    const offsetCounts = new Map<number, number>();
    for (const overrideGuid of guids) {
      for (const descendant of descendants) {
        const offset = overrideGuid.localID - descendant.guid.localID;
        offsetCounts.set(offset, (offsetCounts.get(offset) ?? 0) + 1);
      }
    }

    // Collect all offsets with the highest count
    let bestCount = 0;
    for (const count of offsetCounts.values()) {
      if (count > bestCount) bestCount = count;
    }

    const tiedOffsets: number[] = [];
    for (const [offset, count] of offsetCounts) {
      if (count === bestCount) tiedOffsets.push(offset);
    }

    // If tied, use type-compatibility tiebreaker
    let bestOffset = tiedOffsets[0];
    if (tiedOffsets.length > 1) {
      let bestTypeScore = -1;
      for (const offset of tiedOffsets) {
        let typeScore = 0;
        for (const overrideGuid of guids) {
          const targetLocalID = overrideGuid.localID - offset;
          const descInfo = localIdToDescInfo.get(targetLocalID);
          if (!descInfo) continue;
          const hint = typeHints.get(guidToString(overrideGuid));
          if (hint === "TEXT" && descInfo.nodeType === "TEXT") typeScore++;
          else if (hint === "INSTANCE" && descInfo.nodeType === "INSTANCE") typeScore++;
          else if (hint === "CONTAINER" && (descInfo.nodeType === "FRAME" || descInfo.nodeType === "INSTANCE"))
            typeScore++;
        }
        if (typeScore > bestTypeScore) {
          bestTypeScore = typeScore;
          bestOffset = offset;
        }
      }
    }

    for (const overrideGuid of guids) {
      const targetLocalID = overrideGuid.localID - bestOffset;
      const descendantGuidStr = localIdToDescendant.get(targetLocalID);
      if (descendantGuidStr) {
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
      if (!dsdSize) continue;

      const desc = descByGuidStr.get(descGuidStr);
      if (!desc?.size) continue;

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

  // ── Phase 1.5: Sorted-order matching for remaining unmapped GUIDs ──
  // When Phase 1 only partially maps a session (non-contiguous localIDs),
  // map remaining typed GUIDs to unclaimed descendants of the same type
  // using sorted localID order.
  for (const [, guids] of bySession) {
    if (guids.length < 3) continue;
    const unmapped = guids.filter((g) => !result.has(guidToString(g)));
    if (unmapped.length === 0) continue;

    // Handle remaining unmapped GUIDs by type (TEXT, INSTANCE)
    const phase1Targets = new Set(result.values());

    for (const targetType of ["TEXT", "INSTANCE"] as const) {
      const typedUnmapped = unmapped.filter((g) => typeHints.get(guidToString(g)) === targetType);
      if (typedUnmapped.length === 0) continue;

      const descendantType = targetType === "TEXT" ? "TEXT" : "INSTANCE";
      const typedDescendants = descendants.filter((d) => d.nodeType === descendantType);
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
      if (result.has(guidStr)) continue;
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
        let arr = bySizeKey.get(key);
        if (!arr) {
          arr = [];
          bySizeKey.set(key, arr);
        }
        arr.push(entry);
      }

      // For each size group, find unclaimed descendants with matching original size
      for (const [sizeKey, group] of bySizeKey) {
        const matchingDescs = descendants.filter((d) => {
          if (claimed.has(d.guidStr)) return false;
          if (!d.size) return false;
          const descKey = `${Math.round(d.size.x)}x${Math.round(d.size.y)}`;
          return descKey === sizeKey;
        });

        if (matchingDescs.length === 0) continue;

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

  // ── Phase 2: Sessions with 1-2 GUIDs — type-based matching ──

  // (typeHints already computed above for Phase 1 tiebreaker)

  // Descendants already targeted by earlier phases
  const phase1Targets = new Set(result.values());

  // Group descendants by type
  const descendantsByType = new Map<string, DescendantInfo[]>();
  for (const d of descendants) {
    let arr = descendantsByType.get(d.nodeType);
    if (!arr) {
      arr = [];
      descendantsByType.set(d.nodeType, arr);
    }
    arr.push(d);
  }

  for (const [, guids] of bySession) {
    if (guids.length >= 3) continue;

    // Group this session's GUIDs by type hint
    const byHint = new Map<string, FigGuid[]>();
    for (const guid of guids) {
      const guidStr = guidToString(guid);
      if (result.has(guidStr)) continue; // already mapped
      const hint = typeHints.get(guidStr) ?? "UNKNOWN";
      let arr = byHint.get(hint);
      if (!arr) {
        arr = [];
        byHint.set(hint, arr);
      }
      arr.push(guid);
    }

    for (const [hint, hintGuids] of byHint) {
      // Get candidate descendants matching the type hint
      let allCandidates: DescendantInfo[];
      if (hint === "TEXT") {
        allCandidates = descendantsByType.get("TEXT") ?? [];
      } else if (hint === "INSTANCE") {
        allCandidates = descendantsByType.get("INSTANCE") ?? [];
      } else if (hint === "CONTAINER") {
        allCandidates = [...(descendantsByType.get("FRAME") ?? []), ...(descendantsByType.get("INSTANCE") ?? [])];
      } else {
        allCandidates = descendants;
      }

      if (allCandidates.length === 0) continue;

      // Prefer descendants NOT already claimed by Phase 1
      const unclaimed = allCandidates.filter((c) => !phase1Targets.has(c.guidStr));
      const candidates = unclaimed.length >= hintGuids.length ? unclaimed : allCandidates;

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

  // ── Phase 3: Fix adjacent sibling swaps ──
  // Disabled: correct mapping increases diff because variant SYMBOL rendering
  // is not yet accurate enough. Re-enable when variant rendering improves.
  // fixAdjacentSiblingSwaps(result, descendants, localIdToDescInfo, symbolOverrides);

  return result;
}

/**
 * Detect override GUIDs that have `overriddenSymbolID` set at depth-1.
 */
function collectOverriddenSymbolIDGuids(overrides: readonly FigSymbolOverride[] | undefined): Set<string> {
  const guids = new Set<string>();
  if (!overrides) return guids;
  for (const entry of overrides) {
    const firstGuid = entry.guidPath?.guids?.[0];
    if (!firstGuid) continue;
    if ((entry as Record<string, unknown>).overriddenSymbolID !== undefined) {
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
function fixAdjacentSiblingSwaps(
  result: Map<string, string>,
  descendants: DescendantInfo[],
  localIdToDescInfo: Map<number, DescendantInfo>,
  symbolOverrides: readonly FigSymbolOverride[] | undefined,
): void {
  const overriddenGuids = collectOverriddenSymbolIDGuids(symbolOverrides);
  if (overriddenGuids.size === 0) return;

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
    if (!descGuidStr) continue;

    const descInfo = descByGuidStr.get(descGuidStr);
    if (!descInfo || descInfo.visible !== false) continue;

    // This variant-switching override targets a hidden descendant — likely wrong.
    // Look for an adjacent descendant (±1 localID) that is visible + same type.
    for (const delta of [-1, 1]) {
      const adjLocalID = descInfo.guid.localID + delta;
      const adjDescInfo = localIdToDescInfo.get(adjLocalID);
      if (!adjDescInfo) continue;
      if (adjDescInfo.nodeType !== descInfo.nodeType) continue;
      if (adjDescInfo.visible === false) continue;

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
  overrides: readonly FigSymbolOverride[],
  translationMap: GuidTranslationMap,
): readonly FigSymbolOverride[] {
  if (translationMap.size === 0) return overrides;

  return overrides.map((entry) => {
    const guids = entry.guidPath?.guids;
    if (!guids || guids.length === 0) return entry;

    const firstGuidStr = guidToString(guids[0]);
    const mapped = translationMap.get(firstGuidStr);
    if (!mapped) return entry;

    const mappedGuid = parseGuidString(mapped);
    return {
      ...entry,
      guidPath: {
        guids: [mappedGuid, ...guids.slice(1)],
      },
    };
  });
}
