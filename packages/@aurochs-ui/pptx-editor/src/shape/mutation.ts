/**
 * @file Shape mutation
 *
 * Update and modification operations for shapes.
 * Delegates to generic implementation in editor-controls.
 */

import type { Shape } from "@aurochs-office/pptx/domain";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import {
  updateShapeById as genericUpdateShapeById,
  deleteShapesById as genericDeleteShapesById,
  reorderShape as genericReorderShape,
  moveShapeToIndex as genericMoveShapeToIndex,
  generateShapeId as genericGenerateShapeId,
} from "@aurochs-ui/editor-controls/shape-editor";

/**
 * Update shape by ID (supports nested groups)
 */
export function updateShapeById(
  shapes: readonly Shape[],
  id: ShapeId,
  updater: (shape: Shape) => Shape,
): readonly Shape[] {
  return genericUpdateShapeById(shapes, id, updater) as readonly Shape[];
}

/**
 * Delete shapes by IDs
 */
export function deleteShapesById(shapes: readonly Shape[], ids: readonly ShapeId[]): readonly Shape[] {
  return genericDeleteShapesById(shapes, ids) as readonly Shape[];
}

/**
 * Reorder shape (bring to front, send to back, etc.)
 */
export function reorderShape(
  shapes: readonly Shape[],
  id: ShapeId,
  direction: "front" | "back" | "forward" | "backward",
): readonly Shape[] {
  return genericReorderShape(shapes, id, direction) as readonly Shape[];
}

/**
 * Move shape to specific index
 */
export function moveShapeToIndex(shapes: readonly Shape[], id: ShapeId, newIndex: number): readonly Shape[] {
  return genericMoveShapeToIndex(shapes, id, newIndex) as readonly Shape[];
}

/** Generate a unique shape ID based on existing shapes */
export function generateShapeId(shapes: readonly Shape[]): ShapeId {
  return genericGenerateShapeId(shapes) as ShapeId;
}
