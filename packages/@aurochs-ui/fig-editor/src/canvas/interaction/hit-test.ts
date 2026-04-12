/**
 * @file Hit testing for fig design nodes
 *
 * Determines which node (if any) is at a given point on the canvas.
 * Walks the node list in reverse z-order (last painted = first hit).
 */

import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";

/**
 * Test if a point (in page coordinates) hits a node.
 *
 * Uses the node's axis-aligned bounding box (transform translation + size).
 * For rotated nodes, this is approximate (uses the unrotated bounding box
 * at the translated position). A more precise implementation would
 * inverse-transform the point into the node's local coordinate space.
 */
function isPointInNode(
  px: number,
  py: number,
  node: FigDesignNode,
): boolean {
  const nx = node.transform.m02;
  const ny = node.transform.m12;
  const nw = node.size.x;
  const nh = node.size.y;

  // Check if the node has rotation
  const hasRotation = Math.abs(node.transform.m10) > 0.001 || Math.abs(node.transform.m01) > 0.001;

  if (!hasRotation) {
    // Simple AABB test
    return px >= nx && px <= nx + nw && py >= ny && py <= ny + nh;
  }

  // For rotated nodes: inverse-transform the point into local space
  const m00 = node.transform.m00;
  const m01 = node.transform.m01;
  const m10 = node.transform.m10;
  const m11 = node.transform.m11;

  // Translate point relative to node origin
  const dx = px - nx;
  const dy = py - ny;

  // Inverse of 2x2 rotation part: [m00 m01; m10 m11]
  const det = m00 * m11 - m01 * m10;
  if (Math.abs(det) < 1e-10) {
    return false; // Degenerate transform
  }

  const localX = (m11 * dx - m01 * dy) / det;
  const localY = (-m10 * dx + m00 * dy) / det;

  return localX >= 0 && localX <= nw && localY >= 0 && localY <= nh;
}

/**
 * Find the topmost node at a given point.
 *
 * Searches in reverse order (top of visual stack first).
 * Only searches visible nodes.
 *
 * @param nodes - Page's children (in z-order, bottom first)
 * @param px - X coordinate in page space
 * @param py - Y coordinate in page space
 * @returns The topmost hit node's ID, or undefined if no hit
 */
export function hitTestNodes(
  nodes: readonly FigDesignNode[],
  px: number,
  py: number,
): FigNodeId | undefined {
  // Walk in reverse (top of stack first)
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (!node.visible) {
      continue;
    }

    // Check children first (they're on top of the parent)
    if (node.children && node.children.length > 0) {
      const childHit = hitTestNodes(node.children, px, py);
      if (childHit) {
        return childHit;
      }
    }

    if (isPointInNode(px, py, node)) {
      return node.id;
    }
  }

  return undefined;
}
