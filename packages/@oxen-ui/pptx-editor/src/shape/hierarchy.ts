/**
 * @file Shape hierarchy movement
 *
 * Moves shapes between groups and top-level while preserving visual position.
 */

import type { Shape, GrpShape, Transform, GroupTransform } from "@oxen/pptx/domain";
import type { ShapeId } from "@oxen/pptx/domain/types";
import { findShapeByIdWithParents, findShapeById } from "./query";
import { hasShapeId } from "./identity";
import { updateShapeById } from "./mutation";
import {
  transformChildToSlideCoords,
  transformSlideToChildCoords,
  transformGroupToSlideCoords,
  transformGroupToChildCoords,
} from "./group";

export type ShapeHierarchyTarget = {
  readonly parentId: ShapeId | null;
  readonly index: number;
};

type RemoveResult = {
  readonly shapes: readonly Shape[];
  readonly removed: Shape | undefined;
};

function removeShapeById(shapes: readonly Shape[], id: ShapeId): RemoveResult {
  let removed: Shape | undefined;

  const nextShapes: Shape[] = [];
  for (const shape of shapes) {
    if (hasShapeId(shape) && shape.nonVisual.id === id) {
      removed = shape;
      continue;
    }

    if (shape.type === "grpSp") {
      const childResult = removeShapeById(shape.children, id);
      if (childResult.removed) {
        removed = childResult.removed;
        nextShapes.push({
          ...shape,
          children: childResult.shapes,
        });
        continue;
      }
    }

    nextShapes.push(shape);
  }

  return { shapes: nextShapes, removed };
}

function getDisplayIndex(length: number, internalIndex: number): number {
  return length - 1 - internalIndex;
}

function insertAtDisplayIndex(
  shapes: readonly Shape[],
  shape: Shape,
  displayIndex: number
): readonly Shape[] {
  const ordered = [...shapes].reverse();
  const clampedIndex = Math.max(0, Math.min(displayIndex, ordered.length));
  const result = [...ordered];
  result.splice(clampedIndex, 0, shape);
  return result.reverse();
}

function getParentGroup(parents: readonly GrpShape[]): GrpShape | undefined {
  return parents.length > 0 ? parents[parents.length - 1] : undefined;
}

function getGroupTransform(group: GrpShape | undefined): GroupTransform | undefined {
  if (!group) {
    return undefined;
  }
  return group.properties.transform;
}

function updateShapeTransform(
  shape: Shape,
  transform: Transform
): Shape {
  switch (shape.type) {
    case "sp":
    case "pic":
    case "cxnSp":
      return {
        ...shape,
        properties: {
          ...shape.properties,
          transform,
        },
      };
    case "graphicFrame":
      return {
        ...shape,
        transform,
      };
    default:
      return shape;
  }
}

function updateGroupTransform(
  shape: GrpShape,
  transform: GroupTransform
): GrpShape {
  return {
    ...shape,
    properties: {
      ...shape.properties,
      transform,
    },
  };
}

function mapShapeToSlideCoords(shape: Shape, parentTransform?: GroupTransform): Shape {
  if (parentTransform === undefined) {
    return shape;
  }

  if (shape.type === "grpSp") {
    const groupTransform = shape.properties.transform;
    if (!groupTransform) {
      return shape;
    }
    const converted = transformGroupToSlideCoords(groupTransform, parentTransform);
    return updateGroupTransform(shape, converted);
  }

  if (shape.type === "contentPart") {
    return shape;
  }

  const shapeTransform = shape.type === "graphicFrame"
    ? shape.transform
    : shape.properties.transform;

  if (!shapeTransform) {
    return shape;
  }

  const converted = transformChildToSlideCoords(shapeTransform, parentTransform);
  return updateShapeTransform(shape, converted);
}

function mapShapeToChildCoords(shape: Shape, parentTransform?: GroupTransform): Shape {
  if (parentTransform === undefined) {
    return shape;
  }

  if (shape.type === "grpSp") {
    const groupTransform = shape.properties.transform;
    if (!groupTransform) {
      return shape;
    }
    const converted = transformGroupToChildCoords(groupTransform, parentTransform);
    return updateGroupTransform(shape, converted);
  }

  if (shape.type === "contentPart") {
    return shape;
  }

  const shapeTransform = shape.type === "graphicFrame"
    ? shape.transform
    : shape.properties.transform;

  if (!shapeTransform) {
    return shape;
  }

  const converted = transformSlideToChildCoords(shapeTransform, parentTransform);
  return updateShapeTransform(shape, converted);
}

function adjustShapeTransformForMove(
  shape: Shape,
  sourceParent: GrpShape | undefined,
  targetParent: GrpShape | undefined
): Shape {
  if (sourceParent?.nonVisual.id === targetParent?.nonVisual.id) {
    return shape;
  }

  const sourceTransform = getGroupTransform(sourceParent);
  const targetTransform = getGroupTransform(targetParent);
  const toSlide = mapShapeToSlideCoords(shape, sourceTransform);
  return mapShapeToChildCoords(toSlide, targetTransform);
}

function isInvalidDropTarget(
  shapes: readonly Shape[],
  shapeId: ShapeId,
  targetParentId: ShapeId | null
): boolean {
  if (!targetParentId) {
    return false;
  }
  if (targetParentId === shapeId) {
    return true;
  }

  const targetInfo = findShapeByIdWithParents(shapes, targetParentId);
  if (!targetInfo) {
    return true;
  }

  return targetInfo.parentGroups.some((group) => group.nonVisual.id === shapeId);
}

function getTargetGroup(
  shapes: readonly Shape[],
  targetParentId: ShapeId | null
): GrpShape | undefined {
  if (!targetParentId) {
    return undefined;
  }
  const target = findShapeById(shapes, targetParentId);
  if (target?.type === "grpSp") {
    return target;
  }
  return undefined;
}






export function moveShapeInHierarchy(
  shapes: readonly Shape[],
  shapeId: ShapeId,
  target: ShapeHierarchyTarget
): readonly Shape[] | undefined {
  if (isInvalidDropTarget(shapes, shapeId, target.parentId)) {
    return undefined;
  }

  const sourceInfo = findShapeByIdWithParents(shapes, shapeId);
  if (!sourceInfo) {
    return undefined;
  }

  const sourceParent = getParentGroup(sourceInfo.parentGroups);
  const sourceSiblings = sourceParent ? sourceParent.children : shapes;
  const sourceIndex = sourceSiblings.findIndex(
    (shape) => hasShapeId(shape) && shape.nonVisual.id === shapeId
  );
  if (sourceIndex === -1) {
    return undefined;
  }

  const sourceDisplayIndex = getDisplayIndex(sourceSiblings.length, sourceIndex);

  const removedResult = removeShapeById(shapes, shapeId);
  if (!removedResult.removed) {
    return undefined;
  }

  const targetParent = getTargetGroup(removedResult.shapes, target.parentId);
  const targetSiblings = targetParent ? targetParent.children : removedResult.shapes;
  const targetLength = targetSiblings.length;

  let targetIndex = target.index;
  if (sourceParent?.nonVisual.id === targetParent?.nonVisual.id) {
    if (targetIndex > sourceDisplayIndex) {
      targetIndex -= 1;
    }
    if (targetIndex === sourceDisplayIndex) {
      return shapes;
    }
  }

  const nextShape = adjustShapeTransformForMove(
    removedResult.removed,
    sourceParent,
    targetParent
  );

  if (!targetParent) {
    return insertAtDisplayIndex(removedResult.shapes, nextShape, targetIndex);
  }

  return updateShapeById(removedResult.shapes, targetParent.nonVisual.id, (shape) => {
    if (shape.type !== "grpSp") {
      return shape;
    }
    const nextChildren = insertAtDisplayIndex(shape.children, nextShape, targetIndex);
    return {
      ...shape,
      children: nextChildren,
    };
  });
}
