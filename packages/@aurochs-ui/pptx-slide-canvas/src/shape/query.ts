/**
 * @file Shape query
 *
 * Search and traversal operations for shapes.
 * Delegates to generic implementation in editor-controls.
 */

import type { Shape, GrpShape } from "@aurochs-office/pptx/domain";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import {
  findShapeById as genericFindShapeById,
  findShapeByIdWithParents as genericFindShapeByIdWithParents,
  getTopLevelShapeIds as genericGetTopLevelShapeIds,
} from "@aurochs-ui/editor-controls/shape-editor";

/**
 * Find shape by ID (supports nested groups)
 */
export function findShapeById(shapes: readonly Shape[], id: ShapeId): Shape | undefined {
  return genericFindShapeById(shapes, id) as Shape | undefined;
}

/**
 * Find shape by ID and return with parent groups chain.
 */
export function findShapeByIdWithParents(
  shapes: readonly Shape[],
  id: ShapeId,
): { shape: Shape; parentGroups: readonly GrpShape[] } | undefined {
  const result = genericFindShapeByIdWithParents(shapes, id);
  if (!result) {
    return undefined;
  }
  return {
    shape: result.shape as Shape,
    parentGroups: result.parentGroups as readonly GrpShape[],
  };
}

/**
 * Get top-level shape IDs
 */
export function getTopLevelShapeIds(shapes: readonly Shape[]): readonly ShapeId[] {
  return genericGetTopLevelShapeIds(shapes) as readonly ShapeId[];
}

