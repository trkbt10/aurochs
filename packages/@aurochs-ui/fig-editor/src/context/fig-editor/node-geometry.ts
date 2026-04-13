/**
 * @file Shared reducer helpers
 *
 * Utility functions used by multiple handler files.
 */

import type { FigDesignNode, FigNodeId, FigPageId, FigDesignDocument, FigPage } from "@aurochs/fig/domain";
import type { FigMatrix } from "@aurochs/fig/types";
import type { SimpleBounds } from "@aurochs-ui/editor-core/geometry";
import { findNodeById as findInTree } from "@aurochs-builder/fig/node-ops";

/**
 * Get local bounds from a FigDesignNode (position from transform, size from node).
 *
 * The transform m02/m12 represent the translation relative to parent.
 * For top-level nodes this is page-space; for nested nodes this is
 * parent-local coordinates.
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

// =============================================================================
// Absolute bounds (for nested nodes)
// =============================================================================

const IDENTITY_MATRIX: FigMatrix = {
  m00: 1, m01: 0, m02: 0,
  m10: 0, m11: 1, m12: 0,
};

function composeTransforms(parent: FigMatrix, child: FigMatrix): FigMatrix {
  return {
    m00: parent.m00 * child.m00 + parent.m01 * child.m10,
    m01: parent.m00 * child.m01 + parent.m01 * child.m11,
    m02: parent.m00 * child.m02 + parent.m01 * child.m12 + parent.m02,
    m10: parent.m10 * child.m00 + parent.m11 * child.m10,
    m11: parent.m10 * child.m01 + parent.m11 * child.m11,
    m12: parent.m10 * child.m02 + parent.m11 * child.m12 + parent.m12,
  };
}

/**
 * Compute absolute (page-space) bounds for a node at any depth in the tree.
 *
 * Walks the tree composing ancestor transforms to derive the node's absolute
 * position, which is what EditorCanvas uses for hit areas and selection boxes.
 *
 * This is critical for drag/resize/rotate preview calculations: the
 * initialBounds stored in DragState must match the coordinate space of the
 * itemBounds passed to EditorCanvas (absolute page coordinates). Otherwise,
 * applyDragPreview produces incorrect positions during drag.
 */
export function getAbsoluteNodeBounds(
  pageChildren: readonly FigDesignNode[],
  nodeId: FigNodeId,
): (SimpleBounds & { readonly rotation: number }) | undefined {
  return findAbsoluteBounds(pageChildren, nodeId, IDENTITY_MATRIX);
}

function findAbsoluteBounds(
  nodes: readonly FigDesignNode[],
  targetId: FigNodeId,
  parentTransform: FigMatrix,
): (SimpleBounds & { readonly rotation: number }) | undefined {
  for (const node of nodes) {
    const absTransform = composeTransforms(parentTransform, node.transform);
    if (node.id === targetId) {
      return {
        x: absTransform.m02,
        y: absTransform.m12,
        width: node.size.x,
        height: node.size.y,
        rotation: extractRotation(absTransform),
      };
    }
    if (node.children) {
      const found = findAbsoluteBounds(node.children, targetId, absTransform);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
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
