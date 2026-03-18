/**
 * @file Generic shape query operations
 *
 * Search and traversal operations for shape trees.
 */

import type { ShapeNode, IdentifiableShape, GroupShapeNode } from "./types";
import { isIdentifiable, isGroupShape } from "./types";
import { hasShapeId } from "./identity";

/**
 * Find shape by ID (supports nested groups)
 */
export function findShapeById(shapes: readonly ShapeNode[], id: string): ShapeNode | undefined {
  for (const shape of shapes) {
    if (isIdentifiable(shape) && shape.nonVisual.id === id) {
      return shape;
    }
    if (isGroupShape(shape)) {
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
  shapes: readonly ShapeNode[],
  id: string,
  parentGroups: readonly GroupShapeNode[] = [],
): { shape: ShapeNode; parentGroups: readonly GroupShapeNode[] } | undefined {
  for (const shape of shapes) {
    if (isIdentifiable(shape) && shape.nonVisual.id === id) {
      return { shape, parentGroups };
    }
    if (isGroupShape(shape)) {
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
export function getTopLevelShapeIds(shapes: readonly ShapeNode[]): readonly string[] {
  return shapes.filter(hasShapeId).map((s) => (s as IdentifiableShape).nonVisual.id);
}

/**
 * Check if shape ID is at top level
 */
export function isTopLevelShape(shapes: readonly ShapeNode[], id: string): boolean {
  return shapes.some((s) => isIdentifiable(s) && s.nonVisual.id === id);
}
