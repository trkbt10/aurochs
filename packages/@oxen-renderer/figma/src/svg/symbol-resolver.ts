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
