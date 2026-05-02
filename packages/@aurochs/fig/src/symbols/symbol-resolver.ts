/**
 * @file Symbol resolution for INSTANCE nodes
 */

import type { FigNode, MutableFigNode, FigKiwiSymbolData, FigKiwiSymbolOverride, FigGuidPath, FigComponentPropAssignment, FigDerivedTextData } from "@aurochs/fig/types";
import { guidToString, getNodeType, safeChildren, type FigGuid, type FigBlob } from "@aurochs/fig/parser";
import { walkTree } from "@aurochs/fig/tree";
import { extractSymbolIDPair } from "@aurochs/fig/symbols";
import { buildGuidTranslationMap, translateOverrides } from "./guid-translation";
import { resolveInstanceLayout } from "./constraints";
import type { FigStyleRegistry } from "../domain/document";
import { resolveStyleIdOnMutableNode } from "./style-registry";
import { resolveVariantOverride } from "./variable-resolution";

// =============================================================================
// Types
// =============================================================================

/**
 * Derived symbol data: array of FigKiwiSymbolOverride entries
 * that carry computed transforms for INSTANCE child nodes.
 */
export type FigDerivedSymbolData = readonly FigKiwiSymbolOverride[];

// =============================================================================
// Self-override classification
// =============================================================================

/**
 * Field-name set that an authored INSTANCE may override on its own
 * SYMBOL root (the "self" slot).
 *
 * These are the only fields Figma's authoring UI lets you set
 * directly on an INSTANCE without descending into a SYMBOL
 * descendant: the INSTANCE's display name, its outer size, and the
 * variable / parameter bindings that drive component-property
 * resolution for the SYMBOL it points at. Any override entry whose
 * defined field-set is a subset of this list addresses the INSTANCE
 * itself, not a descendant of its SYMBOL.
 */
export const INSTANCE_SELF_OVERRIDE_FIELDS: ReadonlySet<keyof FigKiwiSymbolOverride> = new Set([
  "name",
  "size",
  "variableConsumptionMap",
  "parameterConsumptionMap",
]);

/**
 * Iterate the override-payload keys that are actually defined on a
 * given entry. Yields keys typed as `keyof FigKiwiSymbolOverride`,
 * so callers consume them with the same type-safety as a struct
 * traversal — no `Record<string, unknown>` widening or `as any`.
 *
 * `guidPath` and `overriddenSymbolID` are routing fields (the entry's
 * "where to" / "instance-swap target") and never carry a slot-payload
 * meaning; they are excluded from the iteration so a self-override
 * detector doesn't have to special-case them at the call site.
 */
export function* kiwiOverridePayloadKeys(
  entry: FigKiwiSymbolOverride,
): Generator<keyof FigKiwiSymbolOverride> {
  const ROUTING_KEYS: ReadonlySet<keyof FigKiwiSymbolOverride> = new Set([
    "guidPath",
    "overriddenSymbolID",
  ]);
  // Object.keys gives us the runtime field set the parser actually emitted.
  // The cast narrows the loop variable from `string` to the legal
  // payload-key type — sound because the parser only emits keys
  // declared on `FigKiwiSymbolOverridePayload`.
  for (const key of Object.keys(entry) as (keyof FigKiwiSymbolOverride)[]) {
    if (ROUTING_KEYS.has(key)) continue;
    if (entry[key] === undefined) continue;
    yield key;
  }
}

/**
 * `true` when the override addresses the INSTANCE itself (single-guid
 * path with only INSTANCE-self fields). Used by both the raw and
 * domain resolver layers to re-route self-overrides onto the SYMBOL
 * root before the GUID translation primitive runs, so the
 * majority-vote heuristic doesn't pull them onto a sibling
 * descendant.
 */
export function isInstanceSelfOverride(entry: FigKiwiSymbolOverride): boolean {
  const guids = entry.guidPath?.guids;
  if (!guids || guids.length !== 1) return false;
  let hasField = false;
  for (const key of kiwiOverridePayloadKeys(entry)) {
    if (!INSTANCE_SELF_OVERRIDE_FIELDS.has(key)) return false;
    hasField = true;
  }
  return hasField;
}

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
 * Re-exported from `./symbol-map-lookup` — that's the SoT module.
 * (Kept as a re-export here so external consumers that imported it
 * from `symbol-resolver`/`@aurochs/fig/symbols` don't break.)
 */
import { resolveSymbolGuidStr, type SymbolMapResolution } from "./symbol-map-lookup";
export { resolveSymbolGuidStr, type SymbolMapResolution };

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
 *
 * Resolution order:
 *   1. `overriddenSymbolID` (explicit author-set variant override).
 *   2. `symbolID` + RESOLVE_VARIANT (variable-driven variant selection
 *      via `variableConsumptionMap`).
 *   3. `symbolID` (the static reference).
 *
 * `RESOLVE_VARIANT` only fires when the INSTANCE has no
 * `overriddenSymbolID` AND its `symbolID`'s parent is a variant
 * container (COMPONENT_SET or sibling-FRAME pattern). Most fixtures
 * have all properties resolving to library-only aliases, in which
 * case the evaluator bails and we fall through to step 3 — this is
 * the same behaviour the renderer had before this evaluator landed.
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

  // Variant resolution via RESOLVE_VARIANT: only when no explicit
  // `overriddenSymbolID` was authored. We need the resolved primary
  // SYMBOL to walk to its variant container.
  let variantResolved: { node: FigNode; guidStr: string } | undefined;
  if (!overrideResolved && primaryResolved) {
    const variantOutcome = resolveVariantOverride(node, primaryResolved.node, symbolMap);
    if (variantOutcome.resolvedSymbolID) {
      const resolved = resolveSymbolGuidStr(variantOutcome.resolvedSymbolID, symbolMap);
      if (resolved) {
        variantResolved = resolved;
        allDeps.push(resolved.guidStr);
      }
    }
  }

  return {
    effectiveSymbol: overrideResolved ?? variantResolved ?? primaryResolved,
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

  // Walk via the SoT primitive (`@aurochs/fig/tree:walkTree`) — the
  // visitor below carries the per-node CPA application logic. The
  // recursion shape is shared with every other "visit every fig
  // node" caller in the codebase.
  walkTree(nodes, (node) => {
    const propRefs = node.componentPropRefs as readonly ComponentPropRef[] | undefined;
    if (!propRefs) { return; }
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
  }, { getChildren: mutableChildren });
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

  walkTree(nodes, (node) => {
    if (!node.guid || !node.derivedTextData) { return; }
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
  }, { getChildren: mutableChildren });
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
    const children = mutableChildren(node);
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
 * View a mutable FigNode's children as `MutableFigNode[]`.
 *
 * `MutableFigNode = -readonly { … }` lifts the outer per-property
 * `readonly` modifier but the array element type stays
 * `readonly FigNode[]`. The clones we work with were produced by
 * `deepCloneNode` and are safe to mutate; this helper centralises the
 * single structural assertion required to view them as such, so
 * `applyOverrides` and friends don't sprinkle `as MutableFigNode[]`
 * casts at every recursion site.
 */
function mutableChildren(node: MutableFigNode): MutableFigNode[] {
  const cs = node.children;
  if (!cs) {
    return [];
  }
  // The runtime invariant — these `cs` entries were deep-cloned by
  // `deepCloneNode` and are mutable in practice — is enforced by the
  // pipeline's caller-side discipline, not the type system. The cast
  // is the single bridge from "outer-mutable but element-readonly" to
  // "fully mutable element-array" that the resolver loop actually
  // needs to write through.
  return cs as MutableFigNode[];
}

/**
 * Apply a single Kiwi-shape override's payload onto a mutable FigNode.
 *
 * Iterates the override's payload keys via `kiwiOverridePayloadKeys`
 * (the SSoT helper for "which Kiwi fields are present and not routing
 * fields"). The two field-application patterns are:
 *
 *   - `componentPropAssignments`: merge by `defID` (incoming wins per
 *     defID, otherwise existing entries are preserved).
 *   - every other key: overwrite the node's slot wholesale.
 *
 * Each `node[key] = override[key]` assignment is statically typed
 * because both sides resolve through `keyof FigKiwiSymbolOverride`,
 * which `keyof MutableFigNode` is a superset of (the override's payload
 * keys are exactly the FigNode fields that overrides may target).
 */
function applyKiwiOverrideToNode(node: MutableFigNode, override: FigKiwiSymbolOverride): void {
  // The kiwi→FigNode field-name correspondence: `FigKiwiSymbolOverridePayload`
  // is a strict subset of FigNode's override-eligible fields, so every
  // payload key from `kiwiOverridePayloadKeys` (which already filters
  // out routing fields and undefined values) names a slot on the node
  // with an assignment-compatible value type. TypeScript cannot prove
  // that generically, so the single Record-of-unknown assertion below
  // is the SSoT for that structural correspondence.
  const nodeRecord = node as Record<string, unknown>;
  for (const key of kiwiOverridePayloadKeys(override)) {
    if (key === "componentPropAssignments") {
      const incoming = override.componentPropAssignments;
      if (!incoming) {
        continue;
      }
      const existing = node.componentPropAssignments;
      if (existing && existing.length > 0) {
        const incomingKeys = new Set(incoming.map((a) => guidToString(a.defID)));
        const merged = existing.filter((a) => !incomingKeys.has(guidToString(a.defID)));
        node.componentPropAssignments = [...merged, ...incoming];
      } else {
        node.componentPropAssignments = incoming;
      }
      continue;
    }
    nodeRecord[key] = override[key];
  }
}

/**
 * Apply symbol overrides to cloned nodes.
 *
 * Each override carries a `guidPath` that names a slot relative to the
 * cloned tree's root. The algorithm walks the path one guid at a time:
 *
 *   1. If the path has length 1, the matching descendant is the target
 *      and the override's payload is applied via
 *      `applyKiwiOverrideToNode`. Direct entries with the same target
 *      merge (later entries overwrite earlier ones per field).
 *
 *   2. If the path is longer, the walker descends into the child
 *      identified by `guidPath[0]`:
 *       - When that child is an INSTANCE, the path-tail is appended to
 *         its `derivedSymbolData` slot; the inner `resolveInstance`
 *         pass picks it up later and re-runs the same walker against
 *         the instance's own SYMBOL descendants.
 *       - When that child is a non-INSTANCE container (FRAME, GROUP,
 *         …), the walker recurses into its `children` with the
 *         path-tail still untouched; descendant lookups happen step by
 *         step against the local children's own GUIDs, so no runtime
 *         path re-translation is needed.
 *
 * This is the same forwarding pattern as the renderer-side
 * `forwardOverrideToDescendantInstance`. The two pipelines share the
 * single SSoT semantic: "carry a payload to the INSTANCE that owns
 * the final slot". The renderer-side helper takes one penultimate-walk
 * because the renderer's design-tree path is already in the local
 * namespace; the kiwi-side walker takes the same step-wise descent
 * because the kiwi tree's per-step guids are also in the local
 * children's namespace. Neither side performs runtime path
 * re-translation.
 */
function applyOverrides(
  nodes: MutableFigNode[],
  overrides: readonly FigKiwiSymbolOverride[],
  styleRegistry?: FigStyleRegistry,
  symbolMap?: ReadonlyMap<string, FigNode>,
): void {
  for (const override of overrides) {
    applyOverrideAtPath(nodes, override, styleRegistry, symbolMap);
  }
}

/**
 * Walk `override.guidPath` through `nodes`, applying the override at
 * its target slot. See `applyOverrides` for the full algorithm.
 *
 * Returns silently when any step fails to find its target — a
 * misaddressed override is a soft no-op (mirrors the renderer-side
 * helper's "target unreachable" branch).
 */
function applyOverrideAtPath(
  nodes: readonly MutableFigNode[],
  override: FigKiwiSymbolOverride,
  styleRegistry?: FigStyleRegistry,
  symbolMap?: ReadonlyMap<string, FigNode>,
): void {
  const guids = override.guidPath?.guids;
  if (!guids || guids.length === 0) {
    return;
  }
  // Locate the descendant whose guid equals `guids[0]` anywhere in
  // the subtree. Kiwi-side overrides may address slots at any depth,
  // not just depth 1. Subsequent guids descend into that
  // descendant's immediate children one step at a time.
  const headStr = guidToString(guids[0]);
  const child = findDescendantByGuid(nodes, headStr);
  if (!child) {
    return;
  }
  if (guids.length === 1) {
    applyDirectOverride(child, override, styleRegistry);
    return;
  }
  // Multi-guid: forward the tail to the INSTANCE that owns it.
  const tail: FigKiwiSymbolOverride = {
    ...override,
    guidPath: { guids: guids.slice(1) },
  };
  if (getNodeType(child) === "INSTANCE") {
    // INSTANCE boundary: the inner `resolveInstance` will run this
    // walker again against its own SYMBOL descendants. Append the
    // tail onto its DSD so the inner pass picks it up.
    child.derivedSymbolData = [...(child.derivedSymbolData ?? []), tail];
    return;
  }
  // Non-INSTANCE container: descend with the tail untouched.
  applyOverrideAtPath(mutableChildren(child), tail, styleRegistry, symbolMap);
}

/**
 * Apply a depth-1 override's payload to its target node, and resolve
 * any styleId references it set into concrete paint arrays.
 */
function applyDirectOverride(
  node: MutableFigNode,
  override: FigKiwiSymbolOverride,
  styleRegistry: FigStyleRegistry | undefined,
): void {
  applyKiwiOverrideToNode(node, override);
  if (styleRegistry && (override.styleIdForFill !== undefined || override.styleIdForStrokeFill !== undefined)) {
    resolveStyleIdOnMutableNode(node, styleRegistry);
  }
}

/**
 * Find a descendant whose `guid` (as `sessionID:localID` string)
 * equals `guidStr`, searching the whole subtree of `nodes`.
 *
 * Kiwi-side overrides may address slots authored anywhere in the
 * SYMBOL's descendant tree, not just at depth 1. The applier's
 * walk semantically matches the renderer-side `findInDesignTree`
 * (which itself is a DFS through `dfsById`).
 *
 * After the matched node is returned, subsequent path steps
 * descend into ITS immediate children — so the walk is actually
 * "deep DFS for path[0], then stepwise descent for path[1..]".
 * The result is the same shape as the renderer-side helper while
 * keeping kiwi-side concerns (no design-namespace pre-resolution)
 * intact.
 */
function findDescendantByGuid(
  nodes: readonly MutableFigNode[],
  guidStr: string,
): MutableFigNode | undefined {
  for (const node of nodes) {
    if (node.guid && guidToString(node.guid) === guidStr) {
      return node;
    }
    const found = findDescendantByGuid(mutableChildren(node), guidStr);
    if (found) {
      return found;
    }
  }
  return undefined;
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
  readonly blobs?: readonly FigBlob[];
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
  const rawSymbolOverridesUntouched = getInstanceSymbolOverrides(node);
  // Re-route self-override entries (single-guid path carrying only
  // INSTANCE-only fields like name/size/variableConsumptionMap/
  // parameterConsumptionMap) onto the SYMBOL root before the
  // translation primitive runs. Otherwise the majority-vote heuristic
  // can pull a self-override onto a sibling descendant — e.g. Contact
  // INSTANCE 15:958's [127:58424] name="Contact" would land on Names
  // FRAME 15:837 and rename it to "Contact", corrupting downstream
  // walks that match by `node.name === "Contact"` (Activity View
  // diagnose-script). Mirrors the same fix in domain-side
  // resolveOverridePaths (`@aurochs-builder/fig:tree-to-document.ts`).
  const symRootGuid = symNode.guid;
  const rerouteSelfOverrides = <T extends FigKiwiSymbolOverride>(entries: readonly T[] | undefined): readonly T[] | undefined => {
    if (!entries || !symRootGuid) return entries;
    let changed = false;
    const out: T[] = [];
    for (const e of entries) {
      if (isInstanceSelfOverride(e)) {
        out.push({ ...e, guidPath: { guids: [symRootGuid] } } as T);
        changed = true;
      } else {
        out.push(e);
      }
    }
    return changed ? out : entries;
  };
  const rawSymbolOverrides = rerouteSelfOverrides(rawSymbolOverridesUntouched);
  const rawDerivedSymbolData = rerouteSelfOverrides(node.derivedSymbolData as FigDerivedSymbolData | undefined);
  // Strip self-override entries (path = SYMBOL root) BEFORE translation
  // and BEFORE building the translation map — `buildGuidTranslationMap`'s
  // majority-vote heuristic treats every override guid as a descendant
  // candidate, so a SYMBOL-root entry forces a `root → child` mapping
  // (Contact 15:910's rerouted self-override `[15:844]` → 15:849 Icon
  // slot) which then re-routes *other* entries onto the wrong slot when
  // translated. Self-overrides apply only to the INSTANCE's merged node
  // (handled directly by `applySelfOverridesToMergedNode` using the
  // *un-translated* rerouted path).
  const symRootGuidStr = guidToString(symRootGuid);
  const isSelfOverrideTargetingRoot = (e: FigKiwiSymbolOverride): boolean => {
    const guids = e.guidPath?.guids;
    if (!guids || guids.length !== 1) return false;
    return guidToString(guids[0]) === symRootGuidStr;
  };
  const partition = <T extends FigKiwiSymbolOverride>(entries: readonly T[] | undefined): { selves: readonly T[]; rest: readonly T[] } => {
    const selves: T[] = [];
    const rest: T[] = [];
    for (const e of entries ?? []) {
      if (isSelfOverrideTargetingRoot(e)) selves.push(e);
      else rest.push(e);
    }
    return { selves, rest };
  };
  // Self-overrides bypass translation entirely; the rest go through
  // the primitive so descendant guids land in SYMBOL namespace.
  const ovPart = partition(rawSymbolOverrides);
  const dsdPart = partition(rawDerivedSymbolData);
  // Re-build translation map *without* the self-overrides — they
  // shouldn't influence the heuristic at all.
  const translationMapNoSelf = buildGuidTranslationMap(
    originalSymNode,
    dsdPart.rest as FigDerivedSymbolData,
    ovPart.rest,
    componentPropAssignments.length > 0 ? componentPropAssignments : undefined,
    ctx.symbolMap,
    ctx.blobs,
  );
  const symbolOverrides = translateOverridesIfNeeded(translationMapNoSelf, ovPart.rest);
  const derivedSymbolData = translateOverridesIfNeeded(translationMapNoSelf, dsdPart.rest);
  // Self-overrides keep their `[SYMBOL root]` path for
  // applySelfOverridesToMergedNode below.
  const symbolSelfOverrides = ovPart.selves;

  // 4. Apply self-referencing overrides — only the entries we
  // partitioned out above (path = SYMBOL root). They never went
  // through the translation primitive so they keep their authored
  // INSTANCE-only fields intact.
  if (symbolSelfOverrides.length > 0) {
    applySelfOverridesToMergedNode(mergedNode, symbolSelfOverrides, guidToString(symNode.guid), ctx.styleRegistry);
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
