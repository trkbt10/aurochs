/**
 * @file Generic shape identity operations
 *
 * ID-related operations for shapes, independent of PPTX types.
 */

import type { ShapeNode } from "./types";
import { isIdentifiable } from "./types";

export { isIdentifiable as hasShapeId };

/**
 * Get shape ID.
 * Returns undefined for shapes without nonVisual.
 */
export function getShapeId(shape: ShapeNode): string | undefined {
  if (isIdentifiable(shape)) {
    return shape.nonVisual.id;
  }
  return undefined;
}
