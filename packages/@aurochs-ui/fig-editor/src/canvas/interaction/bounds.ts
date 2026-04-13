/**
 * @file Node bounds calculation
 *
 * Extracts position, size, and rotation from FigDesignNode transform + size.
 * Used for hit testing and selection overlay positioning.
 *
 * Figma uses 2x3 affine transform matrices. A child node's transform is
 * relative to its parent, so to get absolute (page-space) bounds we must
 * compose the parent chain: M_abs = M_parent * M_child.
 *
 * The composition is standard 2x3 affine matrix multiplication:
 *   [a' b' tx']   [a1 b1 tx1]   [a2 b2 tx2]
 *   [c' d' ty'] = [c1 d1 ty1] * [c2 d2 ty2]
 *   [0  0   1 ]   [ 0  0   1]   [ 0  0   1]
 */

import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import type { FigMatrix } from "@aurochs/fig/types";
import { extractRotationDeg as extractRotationDegSoT, computePreRotationTopLeft } from "../../context/fig-editor/rotation";

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
 * Identity matrix — no transformation.
 */
const IDENTITY_MATRIX: FigMatrix = {
  m00: 1, m01: 0, m02: 0,
  m10: 0, m11: 1, m12: 0,
};

/**
 * Compose two 2x3 affine transform matrices.
 *
 * Returns M_parent * M_child, which represents the child's transform
 * in the parent's coordinate space.
 */
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
 * Calculate bounds for a single design node using an absolute transform.
 *
 * Uses the rotation SoT to derive the "pre-rotation top-left" position.
 * See rotation.ts for why (x, y) cannot simply be (m02, m12).
 */
function getNodeBoundsWithAbsoluteTransform(node: FigDesignNode, absoluteTransform: FigMatrix): NodeBounds {
  const { x, y } = computePreRotationTopLeft(absoluteTransform, node.size.x, node.size.y);
  return {
    id: node.id,
    x,
    y,
    width: node.size.x,
    height: node.size.y,
    rotation: extractRotationDegSoT(absoluteTransform),
  };
}

/**
 * Calculate bounds for a single design node (top-level, no parent transform).
 *
 * Position comes from the transform's translation (m02, m12).
 * Size comes from the node's size vector.
 * Rotation is extracted from the transform matrix.
 */
export function getNodeBoundsForCanvas(node: FigDesignNode): NodeBounds {
  return getNodeBoundsWithAbsoluteTransform(node, node.transform);
}

/**
 * Calculate bounds for all top-level nodes in a page.
 *
 * Returns a flat array of bounds for EditorCanvas's itemBounds prop.
 * Only includes direct children (not deeply nested nodes).
 */
export function getPageNodeBounds(nodes: readonly FigDesignNode[]): readonly NodeBounds[] {
  return nodes.map(getNodeBoundsForCanvas);
}

/**
 * Recursively flatten all nodes in the tree into a flat array of
 * absolute-coordinate bounds.
 *
 * The traversal is pre-order (parent before children). Since EditorCanvas
 * renders hit-area rects in array order, children's hit areas overlap and
 * sit above their parents in the SVG z-stack. This means clicking at a
 * position occupied by a leaf node will hit the leaf — not the ancestor
 * frame — matching Figma's "click-through to deepest element" behavior.
 *
 * Every visible node gets a hit area, including containers (frames,
 * groups). When the user needs to select a frame itself (rather than a
 * child inside it), the frame's hit area still exists beneath its
 * children's hit areas. Clicking an empty region inside the frame (where
 * no child covers) will therefore select the frame.
 *
 * @param nodes - Page's direct children (root of the design tree)
 * @returns Flat array of NodeBounds in pre-order, with absolute coordinates
 */
export function flattenAllNodeBounds(
  nodes: readonly FigDesignNode[],
): readonly NodeBounds[] {
  const result: NodeBounds[] = [];
  flattenRecursive(nodes, IDENTITY_MATRIX, result);
  return result;
}

function flattenRecursive(
  nodes: readonly FigDesignNode[],
  parentTransform: FigMatrix,
  out: NodeBounds[],
): void {
  for (const node of nodes) {
    if (!node.visible) {
      continue;
    }
    const absTransform = composeTransforms(parentTransform, node.transform);
    out.push(getNodeBoundsWithAbsoluteTransform(node, absTransform));
    if (node.children && node.children.length > 0) {
      flattenRecursive(node.children, absTransform, out);
    }
  }
}

/**
 * Compute the absolute transform for a node identified by its ID.
 *
 * Walks the tree from root, composing transforms along the path.
 * Returns undefined if the node is not found.
 */
export function computeAbsoluteTransform(
  nodes: readonly FigDesignNode[],
  targetId: FigNodeId,
  parentTransform: FigMatrix = IDENTITY_MATRIX,
): FigMatrix | undefined {
  for (const node of nodes) {
    const nodeAbsTransform = composeTransforms(parentTransform, node.transform);
    if (node.id === targetId) {
      return nodeAbsTransform;
    }
    if (node.children) {
      const found = computeAbsoluteTransform(node.children, targetId, nodeAbsTransform);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

/**
 * Compute absolute bounds for a node anywhere in the tree.
 *
 * This is used when a node is selected from the layer panel (which can
 * select any node regardless of drill-down scope). The bounds are
 * computed by walking the tree to find the node, composing ancestor
 * transforms along the path, and then applying the node's own size.
 *
 * Returns undefined if the node is not found.
 */
export function computeAbsoluteNodeBounds(
  nodes: readonly FigDesignNode[],
  targetId: FigNodeId,
): NodeBounds | undefined {
  return computeAbsoluteNodeBoundsInner(nodes, targetId, IDENTITY_MATRIX);
}

function computeAbsoluteNodeBoundsInner(
  nodes: readonly FigDesignNode[],
  targetId: FigNodeId,
  parentTransform: FigMatrix,
): NodeBounds | undefined {
  for (const node of nodes) {
    const nodeAbsTransform = composeTransforms(parentTransform, node.transform);
    if (node.id === targetId) {
      return getNodeBoundsWithAbsoluteTransform(node, nodeAbsTransform);
    }
    if (node.children) {
      const found = computeAbsoluteNodeBoundsInner(node.children, targetId, nodeAbsTransform);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

/**
 * Find the direct parent of a node in the tree.
 *
 * Returns the parent node's ID, or undefined if the target is a top-level
 * node or not found.
 */
export function findParentId(
  nodes: readonly FigDesignNode[],
  targetId: FigNodeId,
): FigNodeId | undefined {
  for (const node of nodes) {
    if (node.children) {
      for (const child of node.children) {
        if (child.id === targetId) {
          return node.id as FigNodeId;
        }
      }
      const found = findParentId(node.children, targetId);
      if (found !== undefined) {
        return found;
      }
    }
  }
  return undefined;
}
