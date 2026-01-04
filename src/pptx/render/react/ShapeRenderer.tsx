/**
 * @file Shape Renderer
 *
 * Main shape dispatch component that renders shapes based on their type.
 * Handles the mapping from Shape domain objects to React components.
 */

import type { Shape, Transform } from "../../domain";
import type { ShapeId } from "../../domain/types";
import { SpShapeRenderer } from "./shapes/SpShape";
import { PicShapeRenderer } from "./shapes/PicShape";
import { CxnShapeRenderer } from "./shapes/CxnShape";
import { GrpShapeRenderer } from "./shapes/GrpShape";
import { GraphicFrameRenderer } from "./shapes/GraphicFrame";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for ShapeRenderer
 */
export type ShapeRendererProps = {
  /** Shape to render */
  readonly shape: Shape;
  /** ID of shape currently being edited (its text will be hidden) */
  readonly editingShapeId?: ShapeId;
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get transform from a shape (polymorphic accessor)
 */
function getShapeTransform(shape: Shape): Transform | undefined {
  switch (shape.type) {
    case "sp":
    case "pic":
    case "cxnSp":
      return shape.properties.transform;
    case "grpSp":
      return shape.properties.transform as Transform | undefined;
    case "graphicFrame":
      return shape.transform;
  }
}

/**
 * Check if shape is hidden
 */
function isShapeHidden(shape: Shape): boolean {
  if ("nonVisual" in shape) {
    return shape.nonVisual?.hidden === true;
  }
  return false;
}

/**
 * Get shape ID from a shape
 */
function getShapeId(shape: Shape): ShapeId | undefined {
  if ("nonVisual" in shape) {
    return shape.nonVisual?.id;
  }
  return undefined;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders a shape based on its type.
 *
 * This is the main dispatch component that determines which
 * specific renderer to use for each shape type.
 */
export function ShapeRenderer({ shape, editingShapeId }: ShapeRendererProps) {
  // Skip hidden shapes
  if (isShapeHidden(shape)) {
    return null;
  }

  const transform = getShapeTransform(shape);
  const width = transform !== undefined ? (transform.width as number) : 0;
  const height = transform !== undefined ? (transform.height as number) : 0;
  const shapeId = getShapeId(shape);
  const isEditing = shapeId !== undefined && shapeId === editingShapeId;

  switch (shape.type) {
    case "sp":
      return (
        <SpShapeRenderer
          shape={shape}
          width={width}
          height={height}
          hideText={isEditing}
          shapeId={shapeId}
        />
      );

    case "pic":
      return (
        <PicShapeRenderer
          shape={shape}
          width={width}
          height={height}
          shapeId={shapeId}
        />
      );

    case "cxnSp":
      return (
        <CxnShapeRenderer
          shape={shape}
          width={width}
          height={height}
          shapeId={shapeId}
        />
      );

    case "grpSp":
      return (
        <GrpShapeRenderer
          shape={shape}
          editingShapeId={editingShapeId}
          shapeId={shapeId}
        />
      );

    case "graphicFrame":
      return (
        <GraphicFrameRenderer
          shape={shape}
          width={width}
          height={height}
          shapeId={shapeId}
        />
      );

    default:
      return null;
  }
}
