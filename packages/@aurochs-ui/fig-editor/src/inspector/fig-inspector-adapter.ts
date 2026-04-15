/**
 * @file Adapter functions to convert FigNode trees into format-agnostic
 * InspectorBoxInfo[] and InspectorTreeNode for the inspector components.
 */

import type { FigNode } from "@aurochs/fig/types";
import type { FigMatrix } from "@aurochs/fig/types";
import type { FigDesignNode } from "@aurochs/fig/domain";
import { guidToString, getNodeType } from "@aurochs/fig/parser";
import { IDENTITY_MATRIX, multiplyMatrices, createTranslationMatrix } from "@aurochs/fig/matrix";
import type { AffineTransform, InspectorBoxInfo, InspectorTreeNode } from "@aurochs-ui/editor-core/inspector-types";

// =============================================================================
// FigMatrix → AffineTransform conversion
// =============================================================================

/**
 * Convert a FigMatrix to an AffineTransform (6-element array).
 *
 * FigMatrix layout: | m00 m01 m02 |  = | a  c  tx |
 *                   | m10 m11 m12 |    | b  d  ty |
 *
 * AffineTransform:  [a, b, c, d, tx, ty]
 */
function figMatrixToAffine(m: FigMatrix): AffineTransform {
  return [m.m00, m.m10, m.m01, m.m11, m.m02, m.m12];
}

// =============================================================================
// Bounding box collection
// =============================================================================

/**
 * Compute a normalization transform that moves the root frame's canvas
 * position to (0,0), matching the SVG renderer's normalizeRootTransform.
 */
export function getRootNormalizationTransform(frameNode: FigNode): FigMatrix {
  const nodeData = frameNode as Record<string, unknown>;
  const transform = nodeData.transform as FigMatrix | undefined;
  if (!transform) return IDENTITY_MATRIX;
  const offsetX = transform.m02 ?? 0;
  const offsetY = transform.m12 ?? 0;
  if (offsetX === 0 && offsetY === 0) return IDENTITY_MATRIX;
  return createTranslationMatrix(-offsetX, -offsetY);
}

/**
 * Resolve effective transform by combining parent and node transforms.
 */
function resolveTransform(nodeData: Record<string, unknown>, parentTransform: FigMatrix): FigMatrix {
  if (nodeData.transform) {
    return multiplyMatrices(parentTransform, nodeData.transform as FigMatrix);
  }
  return parentTransform;
}

/**
 * Recursively collect bounding box info for all nodes in a FigNode tree.
 * Returns InspectorBoxInfo[] suitable for BoundingBoxOverlay.
 */
export function collectFigBoxes(
  node: FigNode,
  parentTransform: FigMatrix,
  showHiddenNodes: boolean,
): InspectorBoxInfo[] {
  if (!showHiddenNodes && node.visible === false) {
    return [];
  }

  const nodeType = getNodeType(node);
  const nodeData = node as Record<string, unknown>;
  const transform = resolveTransform(nodeData, parentTransform);

  const size = nodeData.size as { x?: number; y?: number } | undefined;
  const boxes: InspectorBoxInfo[] = [];

  if (size && (size.x ?? 0) > 0 && (size.y ?? 0) > 0) {
    boxes.push({
      nodeId: guidToString(node.guid),
      nodeType,
      nodeName: node.name ?? "(unnamed)",
      transform: figMatrixToAffine(transform),
      width: size.x ?? 0,
      height: size.y ?? 0,
    });
  }

  for (const child of node.children ?? []) {
    boxes.push(...collectFigBoxes(child, transform, showHiddenNodes));
  }

  return boxes;
}

// =============================================================================
// Tree node conversion
// =============================================================================

/**
 * Convert a low-level FigNode tree to an InspectorTreeNode tree.
 *
 * Use this with ParsedFigFile data (renderer debug, raw node trees).
 */
export function figNodeToInspectorTree(node: FigNode): InspectorTreeNode {
  const nodeData = node as Record<string, unknown>;
  const size = nodeData.size as { x?: number; y?: number } | undefined;

  return {
    id: guidToString(node.guid),
    name: node.name ?? "(unnamed)",
    nodeType: getNodeType(node),
    width: size?.x ?? 0,
    height: size?.y ?? 0,
    opacity: node.opacity ?? 1,
    visible: node.visible !== false,
    children: (node.children ?? []).map(figNodeToInspectorTree),
  };
}

/**
 * Convert a high-level FigDesignNode tree to an InspectorTreeNode tree.
 *
 * Use this with FigDesignDocument data (FigEditor context).
 */
export function designNodeToInspectorTree(node: FigDesignNode): InspectorTreeNode {
  return {
    id: node.id,
    name: node.name,
    nodeType: node.type,
    width: node.size.x,
    height: node.size.y,
    opacity: node.opacity,
    visible: node.visible,
    children: (node.children ?? []).map(designNodeToInspectorTree),
  };
}
