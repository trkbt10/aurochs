/**
 * @file Shape grouping operations
 *
 * Functions for grouping and ungrouping shapes.
 */

import type { Shape, GrpShape, GroupTransform, Transform } from "@oxen/pptx/domain";
import type { Bounds, ShapeId } from "@oxen/pptx/domain/types";
import { px, deg } from "@oxen/ooxml/domain/units";
import { getShapeTransform } from "@oxen/pptx-render/svg";
import { getCombinedBounds } from "./bounds";
import { generateShapeId } from "./mutation";
import { hasShapeId } from "./identity";

// =============================================================================
// Coordinate Transform Utilities
// =============================================================================

/**
 * Calculate scale factor, returning 1 for zero extent (avoids division by zero)
 */
export function getScaleFactor(extent: number, target: number): number {
  if (extent === 0) {
    return 1;
  }
  return target / extent;
}

/**
 * Get child transform from shape, returns undefined if not available
 */
function getChildTransform(child: Shape): Transform | undefined {
  if (!("properties" in child)) {
    return undefined;
  }
  if (child.properties && "transform" in child.properties) {
    return child.properties.transform;
  }
  return undefined;
}

/**
 * Transform child coordinates from group-relative to slide-absolute
 */
export function transformChildToSlideCoords(
  childTransform: Transform,
  groupTransform: GroupTransform
): Transform {
  // Child coordinates are relative to group's child extents
  const childExtX = groupTransform.childExtentWidth ?? groupTransform.width;
  const childExtY = groupTransform.childExtentHeight ?? groupTransform.height;
  const childOffX = groupTransform.childOffsetX ?? px(0);
  const childOffY = groupTransform.childOffsetY ?? px(0);

  // Scale factor from child coordinate space to group bounds
  const scaleX = getScaleFactor(childExtX as number, groupTransform.width as number);
  const scaleY = getScaleFactor(childExtY as number, groupTransform.height as number);

  // Transform child position to slide coordinates
  const newX =
    (groupTransform.x as number) +
    ((childTransform.x as number) - (childOffX as number)) * scaleX;
  const newY =
    (groupTransform.y as number) +
    ((childTransform.y as number) - (childOffY as number)) * scaleY;
  const newWidth = (childTransform.width as number) * scaleX;
  const newHeight = (childTransform.height as number) * scaleY;

  return {
    ...childTransform,
    x: px(newX),
    y: px(newY),
    width: px(newWidth),
    height: px(newHeight),
  };
}

/**
 * Transform child coordinates from slide-absolute to group-relative
 */
export function transformSlideToChildCoords(
  slideTransform: Transform,
  groupTransform: GroupTransform
): Transform {
  const childExtX = groupTransform.childExtentWidth ?? groupTransform.width;
  const childExtY = groupTransform.childExtentHeight ?? groupTransform.height;
  const childOffX = groupTransform.childOffsetX ?? px(0);
  const childOffY = groupTransform.childOffsetY ?? px(0);

  const scaleX = getScaleFactor(childExtX as number, groupTransform.width as number);
  const scaleY = getScaleFactor(childExtY as number, groupTransform.height as number);

  const newX =
    (childOffX as number) + ((slideTransform.x as number) - (groupTransform.x as number)) / scaleX;
  const newY =
    (childOffY as number) + ((slideTransform.y as number) - (groupTransform.y as number)) / scaleY;
  const newWidth = (slideTransform.width as number) / scaleX;
  const newHeight = (slideTransform.height as number) / scaleY;

  return {
    ...slideTransform,
    x: px(newX),
    y: px(newY),
    width: px(newWidth),
    height: px(newHeight),
  };
}

/**
 * Transform group coordinates from parent group-relative to slide-absolute
 */
export function transformGroupToSlideCoords(
  childGroupTransform: GroupTransform,
  parentGroupTransform: GroupTransform
): GroupTransform {
  const converted = transformChildToSlideCoords(
    childGroupTransform as Transform,
    parentGroupTransform
  );

  const hasChildCoords =
    childGroupTransform.childOffsetX !== undefined ||
    childGroupTransform.childOffsetY !== undefined ||
    childGroupTransform.childExtentWidth !== undefined ||
    childGroupTransform.childExtentHeight !== undefined;

  if (!hasChildCoords) {
    return {
      ...childGroupTransform,
      x: converted.x,
      y: converted.y,
      width: converted.width,
      height: converted.height,
    };
  }

  const offsetTransform: Transform = {
    x: childGroupTransform.childOffsetX ?? px(0),
    y: childGroupTransform.childOffsetY ?? px(0),
    width: childGroupTransform.childExtentWidth ?? childGroupTransform.width,
    height: childGroupTransform.childExtentHeight ?? childGroupTransform.height,
    rotation: deg(0),
    flipH: false,
    flipV: false,
  };
  const convertedOffset = transformChildToSlideCoords(offsetTransform, parentGroupTransform);

  return {
    ...childGroupTransform,
    x: converted.x,
    y: converted.y,
    width: converted.width,
    height: converted.height,
    childOffsetX: convertedOffset.x,
    childOffsetY: convertedOffset.y,
    childExtentWidth: convertedOffset.width,
    childExtentHeight: convertedOffset.height,
  };
}

/**
 * Transform group coordinates from slide-absolute to parent group-relative
 */
export function transformGroupToChildCoords(
  childGroupTransform: GroupTransform,
  parentGroupTransform: GroupTransform
): GroupTransform {
  const converted = transformSlideToChildCoords(
    childGroupTransform as Transform,
    parentGroupTransform
  );

  const hasChildCoords =
    childGroupTransform.childOffsetX !== undefined ||
    childGroupTransform.childOffsetY !== undefined ||
    childGroupTransform.childExtentWidth !== undefined ||
    childGroupTransform.childExtentHeight !== undefined;

  if (!hasChildCoords) {
    return {
      ...childGroupTransform,
      x: converted.x,
      y: converted.y,
      width: converted.width,
      height: converted.height,
    };
  }

  const offsetTransform: Transform = {
    x: childGroupTransform.childOffsetX ?? px(0),
    y: childGroupTransform.childOffsetY ?? px(0),
    width: childGroupTransform.childExtentWidth ?? childGroupTransform.width,
    height: childGroupTransform.childExtentHeight ?? childGroupTransform.height,
    rotation: deg(0),
    flipH: false,
    flipV: false,
  };
  const convertedOffset = transformSlideToChildCoords(offsetTransform, parentGroupTransform);

  return {
    ...childGroupTransform,
    x: converted.x,
    y: converted.y,
    width: converted.width,
    height: converted.height,
    childOffsetX: convertedOffset.x,
    childOffsetY: convertedOffset.y,
    childExtentWidth: convertedOffset.width,
    childExtentHeight: convertedOffset.height,
  };
}

// =============================================================================
// Ungroup Operations
// =============================================================================

/**
 * Find group shape by ID at top level
 */
export function findGroupById(
  shapes: readonly Shape[],
  groupId: ShapeId
): { group: GrpShape; index: number } | undefined {
  const index = shapes.findIndex(
    (s) => s.type === "grpSp" && s.nonVisual.id === groupId
  );
  if (index === -1) {
    return undefined;
  }
  const group = shapes[index];
  if (group.type !== "grpSp") {
    return undefined;
  }
  return { group, index };
}

/**
 * Get children with transforms converted to slide coordinates
 */
export function getTransformedChildren(group: GrpShape): Shape[] {
  const groupTransform = group.properties.transform;

  return group.children.map((child) => {
    // Skip shapes without properties
    if (!("properties" in child)) {
      return child;
    }

    const childTransform = getChildTransform(child);
    if (!childTransform || !groupTransform) {
      return child;
    }

    const newTransform = transformChildToSlideCoords(childTransform, groupTransform);

    return {
      ...child,
      properties: {
        ...child.properties,
        transform: newTransform,
      },
    } as Shape;
  });
}

/**
 * Extract child IDs from shapes
 */
export function extractChildIds(children: readonly Shape[]): ShapeId[] {
  return children
    .filter((s) => "nonVisual" in s)
    .map((s) => (s as Shape & { nonVisual: { id: string } }).nonVisual.id);
}

/**
 * Ungroup a group shape, returning the new shapes array and child IDs
 */
export function ungroupShape(
  shapes: readonly Shape[],
  groupId: ShapeId
): { newShapes: Shape[]; childIds: ShapeId[] } | undefined {
  const found = findGroupById(shapes, groupId);
  if (!found) {
    return undefined;
  }

  const { group, index } = found;
  const transformedChildren = getTransformedChildren(group);
  const childIds = extractChildIds(transformedChildren);

  // Replace group with its children at the same position
  const newShapes = [
    ...shapes.slice(0, index),
    ...transformedChildren,
    ...shapes.slice(index + 1),
  ];

  return { newShapes, childIds };
}

// =============================================================================
// Group Operations
// =============================================================================

/**
 * Collect shapes to group from top-level shapes
 */
export function collectShapesToGroup(
  shapes: readonly Shape[],
  shapeIds: readonly ShapeId[]
): { shapes: Shape[]; indices: number[] } {
  const idSet = new Set(shapeIds);
  const result: Shape[] = [];
  const indices: number[] = [];

  for (let i = 0; i < shapes.length; i++) {
    const shape = shapes[i];
    if (hasShapeId(shape) && idSet.has(shape.nonVisual.id)) {
      result.push(shape);
      indices.push(i);
    }
  }

  return { shapes: result, indices };
}

/**
 * Create GroupTransform from bounds
 * Sets childOffset/Extent to match group bounds (1:1 coordinate mapping)
 */
export function createGroupTransform(bounds: Bounds): GroupTransform {
  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    rotation: deg(0),
    flipH: false,
    flipV: false,
    childOffsetX: bounds.x,
    childOffsetY: bounds.y,
    childExtentWidth: bounds.width,
    childExtentHeight: bounds.height,
  };
}

/**
 * Create a GrpShape from components
 */
export function createGroupShape(
  groupId: ShapeId,
  transform: GroupTransform,
  children: readonly Shape[]
): GrpShape {
  return {
    type: "grpSp",
    nonVisual: {
      id: groupId,
      name: `Group ${groupId}`,
    },
    properties: {
      transform,
    },
    children,
  };
}

/**
 * Group multiple shapes into a single group
 * Returns undefined if less than 2 shapes are provided
 */
export function groupShapes(
  shapes: readonly Shape[],
  shapeIds: readonly ShapeId[]
): { newShapes: Shape[]; groupId: ShapeId } | undefined {
  if (shapeIds.length < 2) {
    return undefined;
  }

  const { shapes: shapesToGroup, indices: shapeIndices } = collectShapesToGroup(shapes, shapeIds);
  if (shapesToGroup.length < 2) {
    return undefined;
  }

  // Calculate combined bounding box
  const bounds = getCombinedBounds(shapesToGroup);
  if (!bounds) {
    return undefined;
  }

  // Generate new group ID
  const groupId = generateShapeId(shapes);

  // Create group transform and shape
  const groupTransform = createGroupTransform(bounds);
  const groupShape = createGroupShape(groupId, groupTransform, shapesToGroup);

  // Remove grouped shapes and insert group at first shape's position
  const insertIndex = Math.min(...shapeIndices);
  const idSet = new Set(shapeIds);
  const newShapes = shapes.filter(
    (s) => !hasShapeId(s) || !idSet.has(s.nonVisual.id)
  );

  // Insert at correct position (accounting for removed shapes before insertIndex)
  const removedBefore = shapeIndices.filter((i) => i < insertIndex).length;
  const adjustedIndex = insertIndex - removedBefore;

  const result = [...newShapes];
  result.splice(adjustedIndex, 0, groupShape);

  return { newShapes: result, groupId };
}
