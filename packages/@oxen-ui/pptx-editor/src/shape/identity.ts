/**
 * @file Shape identity
 *
 * ID-related operations for shapes.
 */

import type { Shape } from "@oxen/pptx/domain";
import type { ShapeId } from "@oxen/pptx/domain/types";

/**
 * Get shape ID.
 * Returns undefined for shapes without nonVisual (shouldn't happen in valid PPTX).
 */
export function getShapeId(shape: Shape): ShapeId | undefined {
  if ("nonVisual" in shape) {
    return shape.nonVisual.id;
  }
  return undefined;
}

/**
 * Type guard: check if shape has an ID
 */
export function hasShapeId(shape: Shape): shape is Shape & { nonVisual: { id: ShapeId } } {
  return "nonVisual" in shape;
}
