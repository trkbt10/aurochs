/**
 * @file Generic shape mutation operations
 *
 * Update and modification operations for shape trees.
 */

import type { ShapeNode, IdentifiableShape } from "./types";
import { isIdentifiable, isGroupShape } from "./types";
import { hasShapeId } from "./identity";

/**
 * Update shape by ID (supports nested groups).
 * Returns a new array with the matched shape replaced by the updater result.
 */
export function updateShapeById<S extends ShapeNode>(
  shapes: readonly S[],
  id: string,
  updater: (shape: S) => S,
): readonly S[] {
  return shapes.map((shape) => {
    if (isIdentifiable(shape) && shape.nonVisual.id === id) {
      return updater(shape);
    }
    if (isGroupShape(shape) && "children" in shape) {
      const updated = updateShapeById(shape.children as readonly S[], id, updater);
      if (updated !== shape.children) {
        return { ...shape, children: updated } as S;
      }
    }
    return shape;
  });
}

/**
 * Delete shapes by IDs
 */
export function deleteShapesById<S extends ShapeNode>(
  shapes: readonly S[],
  ids: readonly string[],
): readonly S[] {
  const idSet = new Set(ids);
  return shapes
    .filter((shape) => {
      if (isIdentifiable(shape)) {
        return !idSet.has(shape.nonVisual.id);
      }
      return true;
    })
    .map((shape) => {
      if (isGroupShape(shape) && "children" in shape) {
        return {
          ...shape,
          children: deleteShapesById(shape.children as readonly S[], ids),
        } as S;
      }
      return shape;
    });
}

/**
 * Reorder shape (bring to front, send to back, etc.)
 */
export function reorderShape<S extends ShapeNode>(
  shapes: readonly S[],
  id: string,
  direction: "front" | "back" | "forward" | "backward",
): readonly S[] {
  const index = shapes.findIndex((s) => isIdentifiable(s) && (s as IdentifiableShape).nonVisual.id === id);
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
export function moveShapeToIndex<S extends ShapeNode>(
  shapes: readonly S[],
  id: string,
  newIndex: number,
): readonly S[] {
  const currentIndex = shapes.findIndex((s) => isIdentifiable(s) && (s as IdentifiableShape).nonVisual.id === id);
  if (currentIndex === -1 || currentIndex === newIndex) {
    return shapes;
  }

  const newShapes = [...shapes];
  const [shape] = newShapes.splice(currentIndex, 1);
  newShapes.splice(newIndex, 0, shape);
  return newShapes;
}

/** Extract numeric ID from a shape, returning fallback if not numeric */
function extractNumericId(shape: ShapeNode, fallback: number): number {
  if (!isIdentifiable(shape)) {
    return fallback;
  }
  const numId = parseInt(shape.nonVisual.id, 10);
  return isNaN(numId) ? fallback : Math.max(fallback, numId);
}

/**
 * Collect the maximum numeric ID from all shapes (recursively)
 */
function collectMaxId(shapes: readonly ShapeNode[]): number {
  return shapes.reduce((maxId, shape) => {
    const shapeMax = extractNumericId(shape, maxId);

    if (isGroupShape(shape)) {
      return Math.max(shapeMax, collectMaxId(shape.children));
    }
    return shapeMax;
  }, 0);
}

/** Generate a unique shape ID based on existing shapes */
export function generateShapeId(shapes: readonly ShapeNode[]): string {
  const maxId = collectMaxId(shapes);
  return String(maxId + 1);
}
