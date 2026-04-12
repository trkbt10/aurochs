/**
 * @file Shared reducer helpers
 *
 * Utility functions used by multiple handler files.
 */

import type { FigDesignNode, FigNodeId, FigPageId, FigDesignDocument, FigPage } from "@aurochs-builder/fig/types";
import type { SimpleBounds } from "@aurochs-ui/editor-core/geometry";
import { findNodeById as findInTree } from "@aurochs-builder/fig/node-ops";

/**
 * Get bounds from a FigDesignNode (position from transform, size from node).
 *
 * The transform m02/m12 represent the translation (position).
 * The size.x/y represent the dimensions.
 */
export function getNodeBounds(node: FigDesignNode): SimpleBounds & { readonly rotation: number } {
  const rotation = extractRotation(node.transform);
  return {
    x: node.transform.m02,
    y: node.transform.m12,
    width: node.size.x,
    height: node.size.y,
    rotation,
  };
}

/**
 * Extract rotation angle in degrees from a FigMatrix.
 */
function extractRotation(transform: { readonly m00: number; readonly m10: number }): number {
  return Math.atan2(transform.m10, transform.m00) * (180 / Math.PI);
}

/**
 * Find the active page from the document.
 */
export function getActivePage(
  doc: FigDesignDocument,
  activePageId: FigPageId | undefined,
): FigPage | undefined {
  if (!activePageId) {
    return undefined;
  }
  return doc.pages.find((p) => p.id === activePageId);
}

/**
 * Find nodes by IDs within a page.
 */
export function findNodesByIds(
  page: FigPage,
  ids: readonly FigNodeId[],
): readonly FigDesignNode[] {
  const result: FigDesignNode[] = [];
  for (const id of ids) {
    const node = findInTree(page.children, id);
    if (node) {
      result.push(node);
    }
  }
  return result;
}
