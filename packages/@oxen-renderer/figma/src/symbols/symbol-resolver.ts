/**
 * @file Symbol resolution for INSTANCE nodes
 */

import type { FigNode } from "@oxen/fig/types";
import { guidToString, type FigGuid } from "@oxen/fig/parser";

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
// Symbol ID Extraction
// =============================================================================

/**
 * Extract symbolID from an INSTANCE node.
 *
 * Handles two storage formats:
 * - Real Figma exports: `symbolData.symbolID` (nested inside symbolData message)
 * - Builder-generated files: `symbolID` at the node's top level
 *
 * @returns The symbolID GUID, or undefined if not present
 */
export function getInstanceSymbolID(nodeData: Record<string, unknown>): FigGuid | undefined {
  // 1. Check symbolData.symbolID (real Figma exports)
  const symbolData = nodeData.symbolData as FigSymbolData | undefined;
  if (symbolData?.symbolID) {
    return symbolData.symbolID;
  }

  // 2. Check top-level symbolID (builder-generated files)
  const topLevelSymbolID = nodeData.symbolID as FigGuid | undefined;
  if (topLevelSymbolID && typeof topLevelSymbolID === "object" && "sessionID" in topLevelSymbolID) {
    return topLevelSymbolID;
  }

  return undefined;
}

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
 * Options for cloning symbol children
 */
export type CloneSymbolChildrenOptions = {
  readonly symbolOverrides?: readonly FigSymbolOverride[];
  readonly derivedSymbolData?: FigDerivedSymbolData;
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

  // Apply derived symbol data (transform overrides from INSTANCE sizing)
  if (options?.derivedSymbolData && options.derivedSymbolData.length > 0) {
    applyOverrides(cloned, options.derivedSymbolData);
  }

  return cloned;
}

// =============================================================================
// Override Application
// =============================================================================

/**
 * Apply symbol overrides to cloned nodes
 */
function applyOverrides(
  nodes: FigNode[],
  overrides: readonly FigSymbolOverride[]
): void {
  // Build override map keyed by last GUID in path (target node)
  const overrideMap = new Map<string, FigSymbolOverride>();
  for (const override of overrides) {
    const guids = override.guidPath.guids;
    if (guids.length > 0) {
      // Use the last GUID as the target
      const targetGuid = guids[guids.length - 1];
      const targetKey = guidToString(targetGuid);
      overrideMap.set(targetKey, override);
    }
  }

  // Apply overrides recursively
  function applyToNode(node: FigNode): void {
    const nodeData = node as Record<string, unknown>;
    const guid = nodeData.guid as FigGuid | undefined;

    if (guid) {
      const guidStr = guidToString(guid);
      const override = overrideMap.get(guidStr);

      if (override) {
        // Apply override properties (except guidPath)
        for (const [key, value] of Object.entries(override)) {
          if (key !== "guidPath") {
            (nodeData as Record<string, unknown>)[key] = value;
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
