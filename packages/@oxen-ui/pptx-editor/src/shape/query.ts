/**
 * @file Shape query
 *
 * Search and traversal operations for shapes.
 */

import type { Shape, GrpShape } from "@oxen/pptx/domain";
import type { ShapeId } from "@oxen/pptx/domain/types";
import { hasShapeId } from "./identity";

/**
 * Find shape by ID (supports nested groups)
 */
export function findShapeById(shapes: readonly Shape[], id: ShapeId): Shape | undefined {
  for (const shape of shapes) {
    if ("nonVisual" in shape && shape.nonVisual.id === id) {
      return shape;
    }
    if (shape.type === "grpSp") {
      const found = findShapeById(shape.children, id);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

/**
 * Find shape by ID and return with parent groups chain.
 */
export function findShapeByIdWithParents(
  shapes: readonly Shape[],
  id: ShapeId,
  parentGroups: readonly GrpShape[] = []
): { shape: Shape; parentGroups: readonly GrpShape[] } | undefined {
  for (const shape of shapes) {
    if ("nonVisual" in shape && shape.nonVisual.id === id) {
      return { shape, parentGroups };
    }
    if (shape.type === "grpSp") {
      const found = findShapeByIdWithParents(shape.children, id, [...parentGroups, shape]);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

/**
 * Get top-level shape IDs
 */
export function getTopLevelShapeIds(shapes: readonly Shape[]): readonly ShapeId[] {
  return shapes
    .filter(hasShapeId)
    .map((s) => s.nonVisual.id);
}

/**
 * Check if shape ID is at top level
 */
export function isTopLevelShape(shapes: readonly Shape[], id: ShapeId): boolean {
  return shapes.some((s) => hasShapeId(s) && s.nonVisual.id === id);
}
