/**
 * @file Shape mutation
 *
 * Update and modification operations for shapes.
 */

import type { Shape } from "@oxen/pptx/domain";
import type { ShapeId } from "@oxen/pptx/domain/types";
import { hasShapeId } from "./identity";

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

/**
 * Generate unique shape ID
 */
export function generateShapeId(shapes: readonly Shape[]): ShapeId {
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
