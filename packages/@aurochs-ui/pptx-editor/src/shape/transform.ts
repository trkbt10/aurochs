/**
 * @file Shape transform utilities
 *
 * PPTX-specific transform operations.
 * Group coordinate calculations delegate to editor-controls generic implementation.
 */

import type { Shape, Transform, GrpShape, GroupTransform } from "@aurochs-office/pptx/domain";
import type { TransformResolver } from "@aurochs-ui/editor-controls/shape-editor";
import { getAbsoluteBounds as genericGetAbsoluteBounds } from "@aurochs-ui/editor-controls/shape-editor";

// =============================================================================
// Re-export generic type
// =============================================================================

export type { AbsoluteBounds } from "@aurochs-ui/editor-controls/shape-editor";

// =============================================================================
// PPTX Transform Resolver
// =============================================================================

/**
 * Get transform from a PPTX shape.
 */
function getShapeTransformInternal(shape: Shape): Transform | undefined {
  switch (shape.type) {
    case "sp":
    case "pic":
    case "cxnSp":
      return shape.properties.transform;
    case "grpSp":
      return shape.properties.transform as Transform | undefined;
    case "graphicFrame":
      return shape.transform;
    case "contentPart":
      return undefined;
  }
}

/**
 * Convert PPTX Transform to generic ShapeTransform (number-based).
 */
function toShapeTransform(t: Transform): { x: number; y: number; width: number; height: number; rotation: number } {
  return {
    x: t.x as number,
    y: t.y as number,
    width: t.width as number,
    height: t.height as number,
    rotation: t.rotation as number,
  };
}

/**
 * PPTX-specific transform resolver for use with generic shape-editor utilities.
 */
export const pptxTransformResolver: TransformResolver = {
  getTransform(shape) {
    const t = getShapeTransformInternal(shape as Shape);
    return t ? toShapeTransform(t) : undefined;
  },
  getGroupTransform(group) {
    const grp = group as unknown as GrpShape;
    const t = grp.properties.transform;
    if (!t) return undefined;
    return {
      x: t.x as number,
      y: t.y as number,
      width: t.width as number,
      height: t.height as number,
      rotation: t.rotation as number,
      childOffsetX: (t as GroupTransform).childOffsetX as number | undefined,
      childOffsetY: (t as GroupTransform).childOffsetY as number | undefined,
      childExtentWidth: (t as GroupTransform).childExtentWidth as number | undefined,
      childExtentHeight: (t as GroupTransform).childExtentHeight as number | undefined,
    };
  },
};

// =============================================================================
// PPTX-typed Functions
// =============================================================================

/**
 * Calculate the absolute bounds of a shape in slide coordinate space.
 */
export function getAbsoluteBounds(shape: Shape, parentGroups: readonly GrpShape[] = []) {
  return genericGetAbsoluteBounds(shape, parentGroups, pptxTransformResolver);
}

/**
 * Apply a partial transform update to a shape, returning a new shape.
 */
export function withUpdatedTransform(shape: Shape, update: Partial<Transform>): Shape {
  switch (shape.type) {
    case "sp":
    case "pic":
    case "cxnSp": {
      const currentTransform = shape.properties.transform;
      if (!currentTransform) return shape;
      return {
        ...shape,
        properties: {
          ...shape.properties,
          transform: { ...currentTransform, ...update },
        },
      };
    }

    case "grpSp": {
      const currentTransform = shape.properties.transform;
      if (!currentTransform) return shape;
      return {
        ...shape,
        properties: {
          ...shape.properties,
          transform: { ...currentTransform, ...update },
        },
      };
    }

    case "graphicFrame":
      return {
        ...shape,
        transform: { ...shape.transform, ...update },
      };

    case "contentPart":
      return shape;
  }
}

/**
 * Check if a shape has a transform that can be modified.
 */
export function hasEditableTransform(shape: Shape): boolean {
  switch (shape.type) {
    case "sp":
    case "pic":
    case "cxnSp":
      return shape.properties.transform !== undefined;
    case "grpSp":
      return shape.properties.transform !== undefined;
    case "graphicFrame":
      return true;
    case "contentPart":
      return false;
  }
}
