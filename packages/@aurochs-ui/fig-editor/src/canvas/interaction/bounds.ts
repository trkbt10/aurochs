/**
 * @file Node bounds calculation
 *
 * Extracts position, size, and rotation from FigDesignNode transform + size.
 * Used for hit testing and selection overlay positioning.
 */

import type { FigDesignNode } from "@aurochs-builder/fig/types";

/**
 * Bounds representation for editor canvas items.
 */
export type NodeBounds = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
};

/**
 * Extract rotation angle in degrees from a 2x3 affine matrix.
 *
 * The rotation is encoded in the m00 (cos) and m10 (sin) components.
 */
function extractRotationDeg(m00: number, m10: number): number {
  return Math.atan2(m10, m00) * (180 / Math.PI);
}

/**
 * Calculate bounds for a single design node.
 *
 * Position comes from the transform's translation (m02, m12).
 * Size comes from the node's size vector.
 * Rotation is extracted from the transform matrix.
 */
export function getNodeBoundsForCanvas(node: FigDesignNode): NodeBounds {
  return {
    id: node.id,
    x: node.transform.m02,
    y: node.transform.m12,
    width: node.size.x,
    height: node.size.y,
    rotation: extractRotationDeg(node.transform.m00, node.transform.m10),
  };
}

/**
 * Calculate bounds for all top-level nodes in a page.
 *
 * Returns a flat array of bounds for EditorCanvas's itemBounds prop.
 * Only includes direct children (not deeply nested nodes) since
 * the canvas hit testing operates on the top-level shape list.
 */
export function getPageNodeBounds(nodes: readonly FigDesignNode[]): readonly NodeBounds[] {
  return nodes.map(getNodeBoundsForCanvas);
}
