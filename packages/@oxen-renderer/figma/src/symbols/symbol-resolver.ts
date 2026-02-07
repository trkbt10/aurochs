/**
 * @file Symbol resolution for INSTANCE nodes
 */

import type { FigNode } from "@oxen/fig/types";
import { guidToString, getNodeType, type FigGuid } from "@oxen/fig/parser";

// =============================================================================
// Types
// =============================================================================

/**
 * Symbol data structure from INSTANCE nodes
 */
export type FigSymbolData = {
  readonly symbolID: FigGuid;
  readonly symbolOverrides?: readonly FigSymbolOverride[];
};

/**
 * Derived symbol data structure for transform overrides
 * This contains computed transforms for INSTANCE child nodes
 */
export type FigDerivedSymbolData = readonly FigSymbolOverride[];

/**
 * Symbol override entry
 */
export type FigSymbolOverride = {
  readonly guidPath: FigGuidPath;
  readonly [key: string]: unknown;
};

/**
 * GUID path for targeting nested nodes
 */
export type FigGuidPath = {
  readonly guids: readonly FigGuid[];
};

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
export function getInstanceSymbolOverrides(nodeData: Record<string, unknown>): readonly FigSymbolOverride[] | undefined {
  const symbolData = nodeData.symbolData as FigSymbolData | undefined;
  if (symbolData?.symbolOverrides) {
    return symbolData.symbolOverrides;
  }
  return nodeData.symbolOverrides as readonly FigSymbolOverride[] | undefined;
}

// =============================================================================
// Symbol Resolution
// =============================================================================

/**
 * Resolve SYMBOL node from INSTANCE's symbolData
 *
 * @param symbolData - The symbolData from an INSTANCE node
 * @param symbolMap - Map of GUID string to FigNode
 * @returns The referenced SYMBOL node, or undefined if not found
 */
export function resolveSymbol(
  symbolData: FigSymbolData,
  symbolMap: ReadonlyMap<string, FigNode>
): FigNode | undefined {
  const symbolGuidStr = guidToString(symbolData.symbolID);
  return symbolMap.get(symbolGuidStr);
}

/**
 * Look up a node in symbolMap by GUID, with localID fallback.
 *
 * Builder-generated .fig files may have sessionID mismatches between
 * the SYMBOL node's guid and the INSTANCE's symbolID reference.
 * When exact match fails, searches by localID suffix (`:localID`).
 */
export function resolveSymbolByGuid(
  symbolID: FigGuid,
  symbolMap: ReadonlyMap<string, FigNode>,
): FigNode | undefined {
  const exactKey = guidToString(symbolID);
  const exact = symbolMap.get(exactKey);
  if (exact) return exact;

  // Fallback: search by localID suffix
  const localIdSuffix = `:${symbolID.localID}`;
  for (const [key, node] of symbolMap) {
    if (key.endsWith(localIdSuffix)) {
      return node;
    }
  }
  return undefined;
}

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
  if (exact) return { node: exact, guidStr: exactKey };

  const localIdSuffix = `:${symbolID.localID}`;
  for (const [key, node] of symbolMap) {
    if (key.endsWith(localIdSuffix)) {
      return { node, guidStr: key };
    }
  }
  return undefined;
}

// =============================================================================
// Node Cloning
// =============================================================================

/**
 * Deep clone a FigNode and its children
 */
function deepCloneNode(node: FigNode): FigNode {
  const children = node.children;
  if (!children || children.length === 0) {
    return { ...node };
  }
  return {
    ...node,
    children: children.map((child) => deepCloneNode(child)),
  };
}

/**
 * A single component property assignment (defID → value)
 */
type ComponentPropAssignment = {
  readonly defID: FigGuid;
  readonly value: {
    readonly textValue?: {
      readonly characters: string;
      readonly lines?: readonly unknown[];
    };
    readonly [key: string]: unknown;
  };
};

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
  readonly symbolOverrides?: readonly FigSymbolOverride[];
  readonly derivedSymbolData?: FigDerivedSymbolData;
  /** Component property assignments from the INSTANCE node and its overrides */
  readonly componentPropAssignments?: readonly ComponentPropAssignment[];
};

/**
 * Clone SYMBOL children for INSTANCE rendering
 *
 * @param symbolNode - The SYMBOL node to clone children from
 * @param options - Optional overrides and derived data to apply
 * @returns Cloned children with overrides applied
 */
export function cloneSymbolChildren(
  symbolNode: FigNode,
  options?: CloneSymbolChildrenOptions
): readonly FigNode[] {
  const children = symbolNode.children ?? [];
  if (children.length === 0) {
    return [];
  }

  // Deep clone children
  const cloned = children.map((child) => deepCloneNode(child));

  // Apply symbol overrides (property overrides)
  if (options?.symbolOverrides && options.symbolOverrides.length > 0) {
    applyOverrides(cloned, options.symbolOverrides);
  }

  // Resolve component property assignments (text overrides — deletes stale derivedTextData)
  const textOverrideGuids = new Set<string>();
  if (options?.componentPropAssignments && options.componentPropAssignments.length > 0) {
    applyComponentPropAssignments(cloned, options.componentPropAssignments, textOverrideGuids);
  }

  // Apply derived symbol data LAST (provides fresh sizes, transforms, AND derivedTextData
  // with correct glyph paths for overridden text)
  if (options?.derivedSymbolData && options.derivedSymbolData.length > 0) {
    applyOverrides(cloned, options.derivedSymbolData);
  }

  // Clean up stale derivedTextData that may have been re-added by derivedSymbolData.
  // When CPA overrides text content (deleting derivedTextData), the subsequent
  // applyOverrides with derivedSymbolData blindly re-applies all properties including
  // stale derivedTextData with glyph paths for the ORIGINAL text.
  if (textOverrideGuids.size > 0) {
    cleanupStaleDerivedTextData(cloned, textOverrideGuids);
  }

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
  instanceData: Record<string, unknown>,
): readonly ComponentPropAssignment[] {
  const result: ComponentPropAssignment[] = [];

  // Instance-level assignments
  const instanceAssign = instanceData.componentPropAssignments as readonly ComponentPropAssignment[] | undefined;
  if (instanceAssign) {
    result.push(...instanceAssign);
  }

  // Assignments from symbolOverrides
  const overrides = getInstanceSymbolOverrides(instanceData);
  if (overrides) {
    for (const ov of overrides) {
      const ovAssign = (ov as Record<string, unknown>).componentPropAssignments as
        readonly ComponentPropAssignment[] | undefined;
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
  nodes: FigNode[],
  assignments: readonly ComponentPropAssignment[],
  textOverrideGuids?: Set<string>,
): void {
  if (assignments.length === 0) return;

  // Build defID → assignment map
  const assignMap = new Map<string, ComponentPropAssignment>();
  for (const a of assignments) {
    assignMap.set(guidToString(a.defID), a);
  }

  function walk(node: FigNode): void {
    const nodeData = node as Record<string, unknown>;
    const propRefs = nodeData.componentPropRefs as readonly ComponentPropRef[] | undefined;

    if (propRefs) {
      for (const ref of propRefs) {
        const defKey = guidToString(ref.defID);
        const assignment = assignMap.get(defKey);

        // Apply based on field type
        if (ref.componentPropNodeField?.name === "TEXT_DATA") {
          if (assignment?.value.textValue) {
            const tv = assignment.value.textValue;
            // Update textData with overridden characters
            const existingTextData = nodeData.textData as Record<string, unknown> | undefined;
            nodeData.textData = {
              ...(existingTextData ?? {}),
              characters: tv.characters,
              lines: tv.lines ?? existingTextData?.lines,
            };
            // Also set top-level characters for renderers that check it
            nodeData.characters = tv.characters;
            // Clear derivedTextData — its glyph paths correspond to the
            // original text, not the overridden content.  Removing it forces
            // the renderer to fall back to <text> element rendering.
            // NOTE: derivedSymbolData applied later may re-add stale derivedTextData;
            // cleanupStaleDerivedTextData() handles that in cloneSymbolChildren.
            delete nodeData.derivedTextData;
            // Track this node so we can re-delete stale derivedTextData
            // if it gets re-added by derivedSymbolData application.
            const guid = nodeData.guid as FigGuid | undefined;
            if (textOverrideGuids && guid) {
              textOverrideGuids.add(guidToString(guid));
            }
          }
        } else if (ref.componentPropNodeField?.name === "VISIBLE") {
          if (assignment) {
            // Explicit CPA value
            const boolVal = assignment.value.boolValue;
            if (boolVal !== undefined) {
              nodeData.visible = boolVal;
            }
          }
        }
      }
    }

    // Recurse
    for (const child of node.children ?? []) {
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
function cleanupStaleDerivedTextData(nodes: FigNode[], cpaGuids: Set<string>): void {
  function walk(node: FigNode): void {
    const nd = node as Record<string, unknown>;
    const guid = nd.guid as FigGuid | undefined;
    if (guid && cpaGuids.has(guidToString(guid)) && nd.derivedTextData) {
      delete nd.derivedTextData;
    }
    for (const child of node.children ?? []) {
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
function expandContainersToFitChildren(nodes: FigNode[]): void {
  for (const node of nodes) {
    const children = node.children as FigNode[] | undefined;
    if (!children?.length) continue;

    // Skip INSTANCE nodes: their children come from pre-resolution and
    // haven't been properly sized yet. Nested INSTANCE resolution during
    // rendering (resolveInstance) will handle the correct sizing.
    if (getNodeType(node) === "INSTANCE") continue;

    // Recurse first (bottom-up)
    expandContainersToFitChildren(children);

    const nd = node as Record<string, unknown>;
    const nodeSize = nd.size as { x: number; y: number } | undefined;
    if (!nodeSize) continue;

    let maxChildWidth = 0;
    let maxChildHeight = 0;
    for (const child of children) {
      const cd = child as Record<string, unknown>;
      const childSize = cd.size as { x: number; y: number } | undefined;
      if (childSize) {
        maxChildWidth = Math.max(maxChildWidth, childSize.x);
        maxChildHeight = Math.max(maxChildHeight, childSize.y);
      }
    }

    if (maxChildWidth > nodeSize.x || maxChildHeight > nodeSize.y) {
      nd.size = {
        x: Math.max(nodeSize.x, maxChildWidth),
        y: Math.max(nodeSize.y, maxChildHeight),
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
  nodes: FigNode[],
  overrides: readonly FigSymbolOverride[]
): void {
  // Separate direct (depth-1) and nested (depth-N>1) overrides
  // Direct overrides are MERGED: multiple entries for the same GUID combine their properties
  const directMap = new Map<string, FigSymbolOverride>();
  const nestedMap = new Map<string, FigSymbolOverride[]>();

  for (const override of overrides) {
    const guids = override.guidPath?.guids;
    if (!guids || guids.length === 0) continue;

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
      const shortened: FigSymbolOverride = {
        ...override,
        guidPath: { guids: guids.slice(1) },
      };
      let arr = nestedMap.get(firstKey);
      if (!arr) {
        arr = [];
        nestedMap.set(firstKey, arr);
      }
      arr.push(shortened);
    }
  }

  function applyToNode(node: FigNode): void {
    const nodeData = node as Record<string, unknown>;
    const guid = nodeData.guid as FigGuid | undefined;

    if (guid) {
      const guidStr = guidToString(guid);

      // Apply direct override
      const direct = directMap.get(guidStr);
      if (direct) {
        for (const [key, value] of Object.entries(direct)) {
          if (key === "guidPath") continue;
          if (key === "componentPropAssignments") {
            // Merge CPA arrays: existing entries + override entries.
            // Override entries with the same defID take precedence.
            const existing = nodeData.componentPropAssignments as ComponentPropAssignment[] | undefined;
            const incoming = value as ComponentPropAssignment[];
            if (existing && existing.length > 0) {
              const incomingKeys = new Set(incoming.map(a => guidToString(a.defID)));
              const merged = existing.filter(a => !incomingKeys.has(guidToString(a.defID)));
              merged.push(...incoming);
              nodeData[key] = merged;
            } else {
              nodeData[key] = value;
            }
          } else {
            nodeData[key] = value;
          }
        }
      }

      // Propagate nested overrides
      const nested = nestedMap.get(guidStr);
      if (nested && nested.length > 0) {
        const nodeType = getNodeType(node);
        if (nodeType === "INSTANCE") {
          // INSTANCE: store as derivedSymbolData for resolveInstance() to consume
          const existing = nodeData.derivedSymbolData as FigSymbolOverride[] | undefined;
          nodeData.derivedSymbolData = [...(existing ?? []), ...nested];
        } else {
          // Non-INSTANCE container (FRAME, GROUP, etc.): apply recursively
          // to children immediately, since these nodes don't go through
          // resolveInstance() and derivedSymbolData would be lost.
          const children = node.children as FigNode[] | undefined;
          if (children && children.length > 0) {
            applyOverrides(children, nested);
          }
        }
      }
    }

    // Recurse to children
    const children = node.children as FigNode[] | undefined;
    if (children) {
      for (const child of children) {
        applyToNode(child);
      }
    }
  }

  for (const node of nodes) {
    applyToNode(node);
  }
}
