/**
 * @file Symbol resolution for INSTANCE nodes
 */

import type { FigNode, MutableFigNode, FigKiwiSymbolData, FigKiwiSymbolOverride, FigGuidPath, FigComponentPropAssignment, FigDerivedTextData } from "@aurochs/fig/types";
import { guidToString, getNodeType, safeChildren, type FigGuid } from "@aurochs/fig/parser";
import { extractSymbolIDPair } from "@aurochs/fig/symbols";
import { buildGuidTranslationMap, translateOverrides } from "./guid-translation";
import { resolveInstanceLayout } from "./constraints";
import type { FigStyleRegistry } from "../domain/document";
import { resolveStyleIdOnMutableNode } from "./style-registry";

// =============================================================================
// Types
// =============================================================================

/**
 * Derived symbol data: array of FigKiwiSymbolOverride entries
 * that carry computed transforms for INSTANCE child nodes.
 */
export type FigDerivedSymbolData = readonly FigKiwiSymbolOverride[];

// =============================================================================
// Symbol Override Extraction
// =============================================================================

/**
 * Extract symbolOverrides from an INSTANCE node.
 *
 * Handles both formats:
 * - `symbolData.symbolOverrides` (real Figma exports)
 * - `symbolOverrides` at node's top level (builder-generated files)
 */
export function getInstanceSymbolOverrides(
  nodeData: FigNode,
): readonly FigKiwiSymbolOverride[] | undefined {
  if (nodeData.symbolData?.symbolOverrides) {
    return nodeData.symbolData.symbolOverrides;
  }
  return nodeData.symbolOverrides;
}

// =============================================================================
// Symbol Resolution
// =============================================================================

/**
 * Resolve a GUID string from symbolMap, with localID fallback.
 * Returns both the resolved node and the actual key in the map.
 */
export function resolveSymbolGuidStr(
  symbolID: FigGuid,
  symbolMap: ReadonlyMap<string, FigNode>,
): { node: FigNode; guidStr: string } | undefined {
  const exactKey = guidToString(symbolID);
  const exact = symbolMap.get(exactKey);
  if (exact) {return { node: exact, guidStr: exactKey };}

  const localIdSuffix = `:${symbolID.localID}`;
  for (const [key, node] of symbolMap) {
    if (key.endsWith(localIdSuffix)) {
      return { node, guidStr: key };
    }
  }
  return undefined;
}

// =============================================================================
// INSTANCE reference resolution — Single Source of Truth
//
// Every consumer that needs "which SYMBOL does this INSTANCE point to?"
// MUST go through resolveInstanceReferences(). This is used by both
// the pre-resolver (dependency graph + clone expansion) and the
// renderer (resolveInstance).
// =============================================================================

/**
 * Resolved INSTANCE references.
 *
 * - `effectiveSymbol`: the SYMBOL that this INSTANCE should actually render
 *   (overriddenSymbolID takes precedence over symbolID).
 * - `allDependencyGuids`: all SYMBOL GUIDs this INSTANCE depends on
 *   (includes both symbolID and overriddenSymbolID for correct dep ordering).
 */
export type InstanceResolution = {
  readonly effectiveSymbol: { readonly node: FigNode; readonly guidStr: string } | undefined;
  readonly allDependencyGuids: readonly string[];
};

/**
 * Resolve an INSTANCE node's SYMBOL references.
 *
 * This is the single source of truth for "INSTANCE → SYMBOL" resolution.
 * Both dependency graph building, clone expansion, and rendering use this.
 */
export function resolveInstanceReferences(
  node: FigNode,
  symbolMap: ReadonlyMap<string, FigNode>,
): InstanceResolution {
  const pair = extractSymbolIDPair(node);
  if (!pair) { return { effectiveSymbol: undefined, allDependencyGuids: [] }; }

  const allDeps: string[] = [];

  const primaryResolved = resolveSymbolGuidStr(pair.symbolID, symbolMap);
  if (primaryResolved) { allDeps.push(primaryResolved.guidStr); }

  const resolveOverride = () => resolveSymbolGuidStr(pair.overriddenSymbolID!, symbolMap) ?? undefined;
  const overrideResolved = pair.overriddenSymbolID ? resolveOverride() : undefined;
  if (overrideResolved) { allDeps.push(overrideResolved.guidStr); }

  return {
    effectiveSymbol: overrideResolved ?? primaryResolved,
    allDependencyGuids: allDeps,
  };
}

// =============================================================================
// Node Cloning
// =============================================================================

/**
 * Deep clone a FigNode and its children
 */
function deepCloneNode(node: FigNode): MutableFigNode {
  const children = safeChildren(node);
  if (children.length === 0) {
    return { ...node };
  }
  return {
    ...node,
    children: children.map((child) => deepCloneNode(child)),
  };
}


/**
 * A component property reference on a node (e.g., TEXT_DATA)
 */
type ComponentPropRef = {
  readonly defID: FigGuid;
  readonly componentPropNodeField: { readonly value: number; readonly name: string };
};

/**
 * Options for cloning symbol children
 */
export type CloneSymbolChildrenOptions = {
  readonly symbolOverrides?: readonly FigKiwiSymbolOverride[];
  readonly derivedSymbolData?: FigDerivedSymbolData;
  /** Component property assignments from the INSTANCE node and its overrides */
  readonly componentPropAssignments?: readonly FigComponentPropAssignment[];
  /** Style registry for resolving styleIdForFill overrides to fillPaints */
  readonly styleRegistry?: FigStyleRegistry;
  /** SYMBOL lookup for deeper weight-based GUID translation */
  readonly symbolMap?: ReadonlyMap<string, FigNode>;
};

/**
 * Clone SYMBOL children for INSTANCE rendering
 *
 * @param symbolNode - The SYMBOL node to clone children from
 * @param options - Optional overrides and derived data to apply
 * @returns Cloned children with overrides applied
 */
export function cloneSymbolChildren(symbolNode: FigNode, options?: CloneSymbolChildrenOptions): readonly FigNode[] {
  const children = safeChildren(symbolNode);
  if (children.length === 0) {
    return [];
  }

  // Deep clone children
  const cloned = children.map((child) => deepCloneNode(child));

  const registry = options?.styleRegistry;

  const symbolMap = options?.symbolMap;

  // Apply symbol overrides (property overrides)
  if (options?.symbolOverrides && options.symbolOverrides.length > 0) {
    applyOverrides(cloned, options.symbolOverrides, registry, symbolMap);
  }

  // Resolve component property assignments (text overrides — deletes stale derivedTextData)
  const textOverrideGuids = new Set<string>();
  if (options?.componentPropAssignments && options.componentPropAssignments.length > 0) {
    applyComponentPropAssignments(cloned, options.componentPropAssignments, textOverrideGuids);
  }

  // Apply derived symbol data LAST (provides fresh sizes, transforms, AND derivedTextData
  // with correct glyph paths for overridden text).
  //
  // Figma bakes the overridden text's glyph paths into derivedSymbolData at
  // export time — so the derivedTextData here corresponds to the CPA-overridden
  // characters, not the SYMBOL's default text. After CPA clears the SYMBOL's
  // stale derivedTextData, the DSD re-adds the correct pre-rasterized glyphs.
  if (options?.derivedSymbolData && options.derivedSymbolData.length > 0) {
    applyOverrides(cloned, options.derivedSymbolData, registry, symbolMap);
  }

  // Clean up stale derivedTextData:
  //  1. CPA-overridden TEXT nodes whose glyphs weren't re-supplied by DSD.
  //  2. Any TEXT node whose derivedTextData glyph count grossly mismatches
  //     its final characters — this catches cases where GUID translation
  //     paired an override's derivedTextData with the wrong TEXT sibling.
  cleanupStaleDerivedTextData(cloned, textOverrideGuids, options?.derivedSymbolData);

  // Post-process: expand containers to fit their children.
  // When override GUIDs partially apply (e.g., child sizes updated but parent size
  // left at SYMBOL default), containers may be too small for their content.
  expandContainersToFitChildren(cloned);

  return cloned;
}

/**
 * Collect all componentPropAssignments from an INSTANCE node and its overrides.
 *
 * Sources (merged in order):
 * 1. INSTANCE node's own `componentPropAssignments`
 * 2. `componentPropAssignments` found inside `symbolOverrides` entries
 */
export function collectComponentPropAssignments(
  instanceData: FigNode,
): readonly FigComponentPropAssignment[] {
  const result: FigComponentPropAssignment[] = [];

  // Instance-level assignments
  const instanceAssign = instanceData.componentPropAssignments as readonly FigComponentPropAssignment[] | undefined;
  if (instanceAssign) {
    result.push(...instanceAssign);
  }

  // Assignments from symbolOverrides
  const overrides = getInstanceSymbolOverrides(instanceData);
  if (overrides) {
    for (const ov of overrides) {
      // FigKiwiSymbolOverride carries arbitrary node properties via index signature
      const ovAssign = ov.componentPropAssignments as
        | readonly FigComponentPropAssignment[]
        | undefined;
      if (ovAssign) {
        result.push(...ovAssign);
      }
    }
  }

  return result;
}

/**
 * Apply component property assignments to cloned children.
 *
 * Walks the tree looking for nodes with `componentPropRefs` that reference
 * a matching `defID`. When found, applies the assignment value:
 * - TEXT_DATA: sets `textData` and `characters` on the TEXT node
 *
 * @param textOverrideGuids - When provided, collects GUID strings of nodes
 *   whose text was overridden (derivedTextData deleted). Used by
 *   cleanupStaleDerivedTextData() to re-delete stale data after
 *   derivedSymbolData application.
 */
function applyComponentPropAssignments(
  nodes: MutableFigNode[],
  assignments: readonly FigComponentPropAssignment[],
  textOverrideGuids?: Set<string>,
): void {
  if (assignments.length === 0) {return;}

  // Build defID → assignment map
  const assignMap = new Map<string, FigComponentPropAssignment>();
  for (const a of assignments) {
    assignMap.set(guidToString(a.defID), a);
  }

  function walk(node: MutableFigNode): void {
    const propRefs = node.componentPropRefs as readonly ComponentPropRef[] | undefined;

    if (propRefs) {
      for (const ref of propRefs) {
        const defKey = guidToString(ref.defID);
        const assignment = assignMap.get(defKey);

        // Apply based on field type
        if (ref.componentPropNodeField?.name === "TEXT_DATA") {
          if (assignment?.value.textValue) {
            const tv = assignment.value.textValue;
            // No-op detection: when CPA characters equal the node's existing
            // characters, the override is redundant. Keep derivedTextData so
            // its pre-rasterized glyph paths survive (used by the renderer to
            // avoid font fallback for private-use codepoints like SF Symbols).
            const existingTextData = node.textData;
            const existingChars = existingTextData?.characters ?? node.characters ?? "";
            const isNoOp = existingChars === tv.characters;

            // Update textData with overridden characters
            node.textData = {
              ...(existingTextData ?? { characters: "" }),
              characters: tv.characters,
              lines: tv.lines ?? existingTextData?.lines,
            };
            // Also set top-level characters for renderers that check it
            node.characters = tv.characters;

            if (!isNoOp) {
              // Clear derivedTextData — its glyph paths correspond to the
              // original text, not the overridden content. Removing it forces
              // the renderer to fall back to <text> element rendering.
              // NOTE: derivedSymbolData applied later may re-add stale
              // derivedTextData; cleanupStaleDerivedTextData() handles that
              // in cloneSymbolChildren.
              delete node.derivedTextData;
              // Track this node so we can re-delete stale derivedTextData
              // if it gets re-added by derivedSymbolData application.
              if (textOverrideGuids && node.guid) {
                textOverrideGuids.add(guidToString(node.guid));
              }
            }
          }
        } else if (ref.componentPropNodeField?.name === "VISIBLE") {
          if (assignment) {
            // Explicit CPA value
            const boolVal = assignment.value.boolValue;
            if (typeof boolVal === "boolean") {
              node.visible = boolVal;
            }
          }
        } else if (ref.componentPropNodeField?.name === "OVERRIDDEN_SYMBOL_ID") {
          // Instance swap via component property: the CPA value specifies
          // which SYMBOL/COMPONENT this nested INSTANCE should resolve to.
          // Set overriddenSymbolID so that resolveInstance() → getEffectiveSymbolID()
          // picks up the swapped component during lazy rendering resolution.
          if (assignment) {
            const guidVal = assignment.value.guidValue as FigGuid | undefined;
            if (guidVal) {
              node.overriddenSymbolID = guidVal;
            }
          }
        }
      }
    }

    // Recurse
    for (const child of safeChildren(node) as MutableFigNode[]) {
      walk(child);
    }
  }

  for (const node of nodes) {
    walk(node);
  }
}

// =============================================================================
// Stale derivedTextData Cleanup
// =============================================================================

/**
 * Remove stale derivedTextData from nodes whose text was overridden by CPA.
 *
 * After applyComponentPropAssignments deletes derivedTextData (because the
 * glyph paths match the ORIGINAL text, not the CPA-overridden text),
 * applyOverrides with derivedSymbolData may blindly re-add stale
 * derivedTextData. This function walks the tree and re-deletes
 * derivedTextData on any node whose GUID was recorded as text-overridden.
 */
function cleanupStaleDerivedTextData(
  nodes: MutableFigNode[],
  cpaGuids: Set<string>,
  derivedSymbolData: readonly FigKiwiSymbolOverride[] | undefined,
): void {
  // Collect depth-1 override GUIDs that set `derivedTextData` — these are
  // the overrides that carry fresh, post-CPA glyph paths. Any CPA-targeted
  // node whose GUID is ALSO in this set should keep its derivedTextData.
  const freshDerivedGuids = new Set<string>();
  if (derivedSymbolData) {
    for (const entry of derivedSymbolData) {
      const guids = entry.guidPath?.guids;
      if (!guids || guids.length !== 1) continue;
      if (entry.derivedTextData !== undefined) {
        freshDerivedGuids.add(guidToString(guids[0]));
      }
    }
  }

  function countCodePoints(s: string): number {
    // Spread iterates by Unicode codepoints (not UTF-16 units), so emoji and
    // SF Symbols (surrogate pair codepoints) count as 1 each.
    return [...s].length;
  }

  function derivedMatchesCharacters(
    dtd: FigDerivedTextData | undefined,
    characters: string | undefined,
  ): boolean {
    if (!dtd || typeof characters !== "string") return false;
    const cpCount = countCodePoints(characters);
    const lines = dtd.derivedLines;
    if (Array.isArray(lines)) {
      const sum = lines.reduce(
        (acc, l) => acc + (typeof l.characters === "string" ? countCodePoints(l.characters) : 0),
        0,
      );
      if (sum === cpCount) return true;
    }
    const glyphs = dtd.glyphs;
    if (Array.isArray(glyphs) && glyphs.length === cpCount) return true;
    return false;
  }

  /**
   * Whether Figma's derivedTextData indicates runtime truncation was applied.
   * When truncated, glyph count != source character count is EXPECTED —
   * keeping derivedTextData lets the renderer draw Figma's exact truncated
   * output instead of re-laying out the full (overflowing) characters.
   */
  function isTruncated(dtd: FigDerivedTextData | undefined): boolean {
    return typeof dtd?.truncationStartIndex === "number" && dtd.truncationStartIndex >= 0;
  }

  // Detect text that requires Figma's pre-rasterized glyphs because the
  // codepoints live in the Unicode Private-Use Area (e.g. Apple SF Symbols).
  // For such text, the `characters` string cannot be rendered from a normal
  // font — we must preserve derivedTextData.
  function containsPrivateUseCodepoint(s: string): boolean {
    for (const ch of s) {
      const cp = ch.codePointAt(0) ?? 0;
      // BMP PUA: U+E000–U+F8FF
      // Supplementary PUA-A: U+F0000–U+FFFFD
      // Supplementary PUA-B: U+100000–U+10FFFD
      if ((cp >= 0xE000 && cp <= 0xF8FF) || (cp >= 0xF0000 && cp <= 0x10FFFD)) {
        return true;
      }
    }
    return false;
  }

  function walk(node: MutableFigNode): void {
    if (node.guid && node.derivedTextData) {
      const key = guidToString(node.guid);
      const cpaTarget = cpaGuids.has(key);
      const chars = node.characters ?? node.textData?.characters;
      const matches = derivedMatchesCharacters(node.derivedTextData, chars);
      const hasPUA = typeof chars === "string" && containsPrivateUseCodepoint(chars);
      const truncated = isTruncated(node.derivedTextData);

      // Drop derivedTextData when:
      //  1. The glyph data grossly mismatches the final characters (codepoint
      //     count differs) AND Figma did not mark the text as runtime-
      //     truncated. A truncation mismatch is expected — Figma's glyphs
      //     represent the cut-and-ellipsized output, not the source string.
      //  2. CPA overrode the text and the text does NOT contain private-use
      //     codepoints. Even if glyph count matches, Figma's pre-computed
      //     glyphs may correspond to a wrong sibling (e.g. same-length name).
      //     Fall back to text rendering which re-layouts with the final
      //     characters. Private-use codepoints (SF Symbols) and truncated
      //     text must keep the derivedTextData since no font can reconstruct
      //     them (PUA) or reproduce the exact truncation (ellipsis).
      const mismatchByLength = typeof chars === "string" && !matches && !truncated;
      const riskyCpaKeep = cpaTarget && matches && !hasPUA && !truncated;
      if (mismatchByLength || riskyCpaKeep) {
        delete node.derivedTextData;
      }
    }
    for (const child of safeChildren(node) as MutableFigNode[]) {
      walk(child);
    }
  }
  for (const node of nodes) {
    walk(node);
  }
}

// =============================================================================
// Container Size Propagation
// =============================================================================

/**
 * Expand container nodes (FRAME etc.) to fit their children.
 *
 * When GUID mapping partially applies overrides (e.g., child sizes are updated
 * but the parent container's size is left at its SYMBOL default), containers
 * may be too small. This bottom-up pass ensures containers are at least as
 * large as their largest child on each axis.
 */
function expandContainersToFitChildren(nodes: MutableFigNode[]): void {
  for (const node of nodes) {
    const children = safeChildren(node) as MutableFigNode[];
    if (children.length === 0) {continue;}

    // Skip INSTANCE nodes: their children come from pre-resolution and
    // haven't been properly sized yet. Nested INSTANCE resolution during
    // rendering (resolveInstance) will handle the correct sizing.
    if (getNodeType(node) === "INSTANCE") {continue;}

    // Recurse first (bottom-up)
    expandContainersToFitChildren(children);

    const nodeSize = node.size;
    if (!nodeSize) {continue;}

    const maxChildWidthRef = { value: 0 };
    const maxChildHeightRef = { value: 0 };
    for (const child of children) {
      if (child.size) {
        maxChildWidthRef.value = Math.max(maxChildWidthRef.value, child.size.x);
        maxChildHeightRef.value = Math.max(maxChildHeightRef.value, child.size.y);
      }
    }

    if (maxChildWidthRef.value > nodeSize.x || maxChildHeightRef.value > nodeSize.y) {
      node.size = {
        x: Math.max(nodeSize.x, maxChildWidthRef.value),
        y: Math.max(nodeSize.y, maxChildHeightRef.value),
      };
    }
  }
}

// =============================================================================
// Override Application
// =============================================================================

/**
 * Apply symbol overrides to cloned nodes.
 *
 * Handles both single-level and multi-level guidPaths:
 * - Single-level (guids.length === 1): Applied directly to matching node
 * - Multi-level (guids.length > 1): First GUID targets an intermediate node;
 *   remaining path is propagated as `derivedSymbolData` on that node so the
 *   override is applied when the nested instance is resolved later.
 */
function applyOverrides(
  nodes: MutableFigNode[],
  overrides: readonly FigKiwiSymbolOverride[],
  styleRegistry?: FigStyleRegistry,
  symbolMap?: ReadonlyMap<string, FigNode>,
): void {
  // Separate direct (depth-1) and nested (depth-N>1) overrides
  // Direct overrides are MERGED: multiple entries for the same GUID combine their properties
  const directMap = new Map<string, FigKiwiSymbolOverride>();
  const nestedMap = new Map<string, FigKiwiSymbolOverride[]>();

  for (const override of overrides) {
    const guids = override.guidPath?.guids;
    if (!guids || guids.length === 0) {continue;}

    if (guids.length === 1) {
      const key = guidToString(guids[0]);
      const existing = directMap.get(key);
      if (existing) {
        // Merge: later entries' properties override earlier ones
        directMap.set(key, { ...existing, ...override });
      } else {
        directMap.set(key, override);
      }
    } else {
      // Multi-level: key by first GUID, strip it from the path
      const firstKey = guidToString(guids[0]);
      const shortened: FigKiwiSymbolOverride = {
        ...override,
        guidPath: { guids: guids.slice(1) },
      };
      const arrRef = { value: nestedMap.get(firstKey) };
      if (!arrRef.value) {
        arrRef.value = [];
        nestedMap.set(firstKey, arrRef.value);
      }
      arrRef.value.push(shortened);
    }
  }

  function applyToNode(node: MutableFigNode): void {
    const guid = node.guid;

    if (guid) {
      const guidStr = guidToString(guid);

      // Apply direct override
      const direct = directMap.get(guidStr);
      if (direct) {
        for (const [key, value] of Object.entries(direct)) {
          if (key === "guidPath") {continue;}
          if (key === "componentPropAssignments") {
            // Merge CPA arrays: existing entries + override entries.
            // Override entries with the same defID take precedence.
            const existing = node[key] as FigComponentPropAssignment[] | undefined;
            const incoming = value as FigComponentPropAssignment[];
            if (existing && existing.length > 0) {
              const incomingKeys = new Set(incoming.map((a) => guidToString(a.defID)));
              const merged = existing.filter((a) => !incomingKeys.has(guidToString(a.defID)));
              merged.push(...incoming);
              node[key] = merged;
            } else {
              node[key] = value as FigComponentPropAssignment[];
            }
          } else {
            node[key] = value;
          }
        }

        // If the override set styleIdForFill or styleIdForStrokeFill,
        // resolve them to actual fillPaints/strokePaints now.
        if (styleRegistry && (direct.styleIdForFill !== undefined || direct.styleIdForStrokeFill !== undefined)) {
          resolveStyleIdOnMutableNode(node, styleRegistry);
        }
      }

      // Propagate nested overrides
      const nested = nestedMap.get(guidStr);
      if (nested && nested.length > 0) {
        const nodeType = getNodeType(node);
        if (nodeType === "INSTANCE") {
          // INSTANCE: store as derivedSymbolData for resolveInstance() to consume
          const existing = node.derivedSymbolData as FigKiwiSymbolOverride[] | undefined;
          node.derivedSymbolData = [...(existing ?? []), ...nested];
        } else {
          // Non-INSTANCE container (FRAME, GROUP, etc.): apply recursively
          // to children immediately, since these nodes don't go through
          // resolveInstance() and derivedSymbolData would be lost.
          //
          // The propagated `nested` entries still use source-namespace GUIDs
          // at their first level. Rebuild a translation map against this
          // container's descendants so depth-1 DSD entries can find their
          // local targets. Without this, source GUIDs like `3176:15094`
          // never match local Action INSTANCEs, and depth-N entries routed
          // through them don't reach the right Action.
          const containerChildren = safeChildren(node) as MutableFigNode[];
          if (containerChildren.length > 0) {
            const subTranslation = buildGuidTranslationMap(containerChildren, nested, undefined, undefined, symbolMap);
            const translatedNested = subTranslation.size > 0
              ? translateOverrides(nested, subTranslation)
              : nested;
            applyOverrides(containerChildren, translatedNested, styleRegistry, symbolMap);
          }
        }
      }
    }

    // Recurse to children
    for (const child of safeChildren(node) as MutableFigNode[]) {
      applyToNode(child);
    }
  }

  for (const node of nodes) {
    applyToNode(node);
  }
}

// =============================================================================
// Instance node resolution — Full pipeline
//
// This is the SoT for "INSTANCE → renderable (node + children)".
// The renderer calls this; it does NOT implement resolution logic itself.
// =============================================================================

/**
 * Result of resolving an INSTANCE node into renderable content.
 */
export type ResolvedInstanceNode = {
  /** The node to render (may have SYMBOL properties merged in) */
  readonly node: FigNode;
  /** Resolved children (cloned from SYMBOL with overrides applied) */
  readonly children: readonly FigNode[];
};

/**
 * Context required for full INSTANCE resolution.
 */
export type InstanceResolveContext = {
  readonly symbolMap: ReadonlyMap<string, FigNode>;
  readonly resolvedSymbolCache?: ReadonlyMap<string, FigNode>;
  readonly styleRegistry?: FigStyleRegistry;
  /**
   * Optional blob array for GUID translation size fallback. When an
   * INSTANCE override targets a descendant with only fillGeometry (no
   * explicit size), decoding the blob yields the node's authored
   * dimensions — required to disambiguate sibling descendants of
   * different sizes (e.g. multi-avatar Contact variant).
   */
  readonly blobs?: readonly import("@aurochs/fig/parser").FigBlob[];
};

/**
 * Merge SYMBOL style properties into INSTANCE node.
 *
 * SYMBOL properties always take precedence for visual/style attributes.
 * In Figma's .fig format, INSTANCE nodes inherit all visual properties
 * from their referenced SYMBOL — direct property overrides on the
 * INSTANCE node itself (e.g. fillPaints, size) are ignored.
 * Instance-specific overrides go through symbolOverrides/derivedSymbolData,
 * which are applied separately via cloneSymbolChildren.
 */
export function mergeSymbolProperties(instanceNode: FigNode, symbolNode: FigNode): MutableFigNode {
  const merged: MutableFigNode = { ...instanceNode };

  // SYMBOL's visual properties always override INSTANCE-level values.
  if (symbolNode.fillPaints) { merged.fillPaints = symbolNode.fillPaints; }
  if (symbolNode.strokePaints) { merged.strokePaints = symbolNode.strokePaints; }
  if (symbolNode.strokeWeight !== undefined) { merged.strokeWeight = symbolNode.strokeWeight; }
  if (symbolNode.cornerRadius !== undefined) { merged.cornerRadius = symbolNode.cornerRadius; }
  if (symbolNode.rectangleCornerRadii) { merged.rectangleCornerRadii = symbolNode.rectangleCornerRadii; }

  // fillGeometry / strokeGeometry: only copy from SYMBOL if sizes match.
  const instSize = instanceNode.size;
  const symSize = symbolNode.size;
  const sameSize = instSize && symSize && instSize.x === symSize.x && instSize.y === symSize.y;
  if (symbolNode.fillGeometry && sameSize) { merged.fillGeometry = symbolNode.fillGeometry; }
  if (symbolNode.strokeGeometry && sameSize) { merged.strokeGeometry = symbolNode.strokeGeometry; }

  // clipsContent / frameMaskDisabled
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
  merged.opacity = symbolNode.opacity;

  return merged;
}

/**
 * Properties that can be overridden on the INSTANCE frame itself via
 * self-referencing symbolOverrides (guidPath targeting the SYMBOL's own GUID).
 */
const SELF_OVERRIDE_PROPERTIES = new Set([
  "fillPaints", "strokePaints", "strokeWeight", "strokeJoin", "strokeCap",
  "effects", "opacity", "visible", "cornerRadius", "rectangleCornerRadii",
  "blendMode", "clipsContent", "frameMaskDisabled", "mask", "cornerSmoothing",
  "backgroundColor", "backgroundEnabled", "backgroundOpacity",
  "styleIdForFill", "styleIdForStrokeFill",
]);

/**
 * Apply self-referencing symbolOverrides to the merged INSTANCE node.
 */
export function applySelfOverridesToMergedNode(
  mergedNode: MutableFigNode,
  overrides: readonly FigKiwiSymbolOverride[],
  symbolGuidStr: string,
  styleRegistry?: FigStyleRegistry,
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
  if (hasStyleIdOverride && styleRegistry) {
    resolveStyleIdOnMutableNode(mergedNode, styleRegistry);
  }
}

/**
 * Translate override GUIDs if the translation map is non-empty.
 */
function translateOverridesIfNeeded(
  translationMap: ReadonlyMap<string, string>,
  overrides: readonly FigKiwiSymbolOverride[] | undefined,
): readonly FigKiwiSymbolOverride[] | undefined {
  if (translationMap.size > 0 && overrides) {
    return translateOverrides(overrides, translationMap);
  }
  return overrides;
}

/**
 * Resolve an INSTANCE node into renderable content.
 *
 * This is the single source of truth for the full INSTANCE resolution pipeline:
 * 1. Resolve INSTANCE → SYMBOL reference
 * 2. Merge SYMBOL properties into INSTANCE
 * 3. Translate override GUIDs
 * 4. Apply self-referencing overrides to the merged node
 * 5. Clone SYMBOL children with overrides applied
 * 6. Resolve layout for resized instances
 *
 * The renderer calls this function and renders the result — it does NOT
 * implement any resolution logic itself.
 */
export function resolveInstanceNode(
  node: FigNode,
  ctx: InstanceResolveContext,
): ResolvedInstanceNode {
  // 1. Resolve INSTANCE → SYMBOL
  const resolution = resolveInstanceReferences(node, ctx.symbolMap);
  if (!resolution.effectiveSymbol) {
    return { node, children: safeChildren(node) };
  }

  const { node: resolvedSymNode, guidStr: resolvedGuidStr } = resolution.effectiveSymbol;
  const symNode = ctx.resolvedSymbolCache?.get(resolvedGuidStr) ?? resolvedSymNode;
  const originalSymNode = resolvedSymNode;

  // 2. Merge SYMBOL properties into INSTANCE
  const mergedNode = mergeSymbolProperties(node, symNode);

  // 3. Translate override GUIDs
  // CPA is collected BEFORE translation because Phase 1.3 content-signature
  // reconciliation in buildGuidTranslationMap uses CPA character counts to
  // disambiguate TEXT/INSTANCE descendants that collide under localID offset
  // matching (e.g. 6 flat source action slots vs. 2 nested local groups).
  const componentPropAssignments = collectComponentPropAssignments(node);
  const rawSymbolOverrides = getInstanceSymbolOverrides(node);
  const rawDerivedSymbolData = node.derivedSymbolData as FigDerivedSymbolData | undefined;
  const translationMap = buildGuidTranslationMap(
    safeChildren(originalSymNode),
    rawDerivedSymbolData,
    rawSymbolOverrides,
    componentPropAssignments.length > 0 ? componentPropAssignments : undefined,
    ctx.symbolMap,
    ctx.blobs,
  );
  const symbolOverrides = translateOverridesIfNeeded(translationMap, rawSymbolOverrides);
  const derivedSymbolData = translateOverridesIfNeeded(translationMap, rawDerivedSymbolData);

  // 4. Apply self-referencing overrides
  if (symbolOverrides && symbolOverrides.length > 0) {
    applySelfOverridesToMergedNode(mergedNode, symbolOverrides, guidToString(symNode.guid), ctx.styleRegistry);
  }

  // 5. Clone SYMBOL children with overrides
  const children = cloneSymbolChildren(symNode, {
    symbolOverrides,
    derivedSymbolData,
    componentPropAssignments: componentPropAssignments.length > 0 ? componentPropAssignments : undefined,
    styleRegistry: ctx.styleRegistry,
    symbolMap: ctx.symbolMap,
  });

  // 6. Layout resolution for resized instances
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
