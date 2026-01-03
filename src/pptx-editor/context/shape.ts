/**
 * @file Shape context helpers
 *
 * Shape-related logic for slide editor context.
 * Handles shape ID management, finding, updating, and traversal.
 */

import type { Shape, GrpShape } from "../../pptx/domain";
import type { Bounds } from "../../pptx/domain/types";
import { px } from "../../pptx/domain/types";
import { getShapeTransform } from "../utils";

// =============================================================================
// Types
// =============================================================================

export type ShapeId = string;

// =============================================================================
// ID Accessors
// =============================================================================

/**
 * Get shape ID.
 * Returns undefined for shapes without nonVisual (shouldn't happen in valid PPTX).
 */
export function getShapeId(shape: Shape): string | undefined {
  if ("nonVisual" in shape) {
    return shape.nonVisual.id;
  }
  return undefined;
}

/**
 * Type guard: check if shape has an ID
 */
export function hasShapeId(shape: Shape): shape is Shape & { nonVisual: { id: string } } {
  return "nonVisual" in shape;
}

// =============================================================================
// Finding Shapes
// =============================================================================

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
export function getTopLevelShapeIds(shapes: readonly Shape[]): readonly string[] {
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

// =============================================================================
// Updating Shapes
// =============================================================================

/**
 * Update shape by ID (supports nested groups)
 */
export function updateShapeById(
  shapes: readonly Shape[],
  id: ShapeId,
  updater: (shape: Shape) => Shape
): readonly Shape[] {
  return shapes.map((shape) => {
    if ("nonVisual" in shape && shape.nonVisual.id === id) {
      return updater(shape);
    }
    if (shape.type === "grpSp") {
      return {
        ...shape,
        children: updateShapeById(shape.children, id, updater),
      };
    }
    return shape;
  });
}

/**
 * Delete shapes by IDs
 */
export function deleteShapesById(
  shapes: readonly Shape[],
  ids: readonly ShapeId[]
): readonly Shape[] {
  const idSet = new Set(ids);
  return shapes
    .filter((shape) => {
      if ("nonVisual" in shape) {
        return !idSet.has(shape.nonVisual.id);
      }
      return true;
    })
    .map((shape) => {
      if (shape.type === "grpSp") {
        return {
          ...shape,
          children: deleteShapesById(shape.children, ids),
        };
      }
      return shape;
    });
}

// =============================================================================
// Reordering
// =============================================================================

/**
 * Reorder shape (bring to front, send to back, etc.)
 */
export function reorderShape(
  shapes: readonly Shape[],
  id: ShapeId,
  direction: "front" | "back" | "forward" | "backward"
): readonly Shape[] {
  const index = shapes.findIndex((s) => hasShapeId(s) && s.nonVisual.id === id);
  if (index === -1) {
    return shapes;
  }

  const newShapes = [...shapes];
  const [shape] = newShapes.splice(index, 1);

  switch (direction) {
    case "front":
      newShapes.push(shape);
      break;
    case "back":
      newShapes.unshift(shape);
      break;
    case "forward":
      if (index < shapes.length - 1) {
        newShapes.splice(index + 1, 0, shape);
      } else {
        newShapes.push(shape);
      }
      break;
    case "backward":
      if (index > 0) {
        newShapes.splice(index - 1, 0, shape);
      } else {
        newShapes.unshift(shape);
      }
      break;
  }

  return newShapes;
}

/**
 * Move shape to specific index
 */
export function moveShapeToIndex(
  shapes: readonly Shape[],
  id: ShapeId,
  newIndex: number
): readonly Shape[] {
  const currentIndex = shapes.findIndex((s) => hasShapeId(s) && s.nonVisual.id === id);
  if (currentIndex === -1 || currentIndex === newIndex) {
    return shapes;
  }

  const newShapes = [...shapes];
  const [shape] = newShapes.splice(currentIndex, 1);
  newShapes.splice(newIndex, 0, shape);
  return newShapes;
}

// =============================================================================
// Bounds & Geometry
// =============================================================================

/**
 * Get bounds from shape transform
 */
export function getShapeBounds(shape: Shape): Bounds | undefined {
  const transform = getShapeTransform(shape);
  if (!transform) {
    return undefined;
  }
  return {
    x: transform.x,
    y: transform.y,
    width: transform.width,
    height: transform.height,
  };
}

/**
 * Calculate combined bounding box for multiple shapes
 */
export function getCombinedBounds(shapes: readonly Shape[]): Bounds | undefined {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasAny = false;

  for (const shape of shapes) {
    const bounds = getShapeBounds(shape);
    if (bounds) {
      hasAny = true;
      minX = Math.min(minX, bounds.x as number);
      minY = Math.min(minY, bounds.y as number);
      maxX = Math.max(maxX, (bounds.x as number) + (bounds.width as number));
      maxY = Math.max(maxY, (bounds.y as number) + (bounds.height as number));
    }
  }

  if (!hasAny) {
    return undefined;
  }

  return {
    x: px(minX),
    y: px(minY),
    width: px(maxX - minX),
    height: px(maxY - minY),
  };
}

// =============================================================================
// ID Generation
// =============================================================================

/**
 * Generate unique shape ID
 */
export function generateShapeId(shapes: readonly Shape[]): string {
  let maxId = 0;
  const collectIds = (s: readonly Shape[]) => {
    for (const shape of s) {
      if ("nonVisual" in shape) {
        const numId = parseInt(shape.nonVisual.id, 10);
        if (!isNaN(numId) && numId > maxId) {
          maxId = numId;
        }
      }
      if (shape.type === "grpSp") {
        collectIds(shape.children);
      }
    }
  };
  collectIds(shapes);
  return String(maxId + 1);
}
