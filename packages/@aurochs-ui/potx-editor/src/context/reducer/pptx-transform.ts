/**
 * @file PPTX transform resolver for potx-editor
 *
 * Provides transform access callbacks for PPTX Shape types,
 * used with editor-controls generic shape utilities.
 */

import type { Shape, Transform, GrpShape, GroupTransform } from "@aurochs-office/pptx/domain";
import type { ShapeNode } from "@aurochs-ui/editor-controls/shape-editor";
import type { ShapeTransform } from "@aurochs-ui/editor-controls/shape-editor";

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
 * Resolve PPTX Transform to generic ShapeTransform.
 */
export function pptxGetTransform(shape: ShapeNode): ShapeTransform | undefined {
  const t = getShapeTransformInternal(shape as Shape);
  if (!t) return undefined;
  return {
    x: t.x as number,
    y: t.y as number,
    width: t.width as number,
    height: t.height as number,
    rotation: t.rotation as number,
  };
}

/**
 * Apply a partial transform update to a PPTX shape.
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
