/**
 * @file Shape Renderer
 *
 * Main shape dispatch component that renders shapes based on their type.
 * Handles the mapping from Shape domain objects to React components.
 */

import { memo } from "react";
import type { Shape, Transform } from "@oxen-office/pptx/domain";
import type { ShapeId } from "@oxen-office/pptx/domain/types";
import {
  SpShapeRenderer,
  PicShapeRenderer,
  CxnShapeRenderer,
  GrpShapeRenderer,
  GraphicFrameRenderer,
} from "./shapes";

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
export const ShapeRenderer = memo(function ShapeRenderer({
  shape,
  editingShapeId,
}: ShapeRendererProps) {
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
}, areShapeRendererPropsEqual);

// =============================================================================
// Memo Comparison
// =============================================================================

/**
 * Check if a shape or its descendants match the target ID.
 */
function shapeContainsId(shape: Shape, targetId?: ShapeId): boolean {
  if (targetId === undefined) {
    return false;
  }
  const shapeId = getShapeId(shape);
  if (shapeId !== undefined && shapeId === targetId) {
    return true;
  }
  if (shape.type === "grpSp") {
    return shape.children.some((child) => shapeContainsId(child, targetId));
  }
  return false;
}

/**
 * Skip rerender unless the current shape is affected by edit target changes.
 */
function areShapeRendererPropsEqual(
  prev: ShapeRendererProps,
  next: ShapeRendererProps,
): boolean {
  if (prev.shape !== next.shape) {
    return false;
  }
  if (prev.editingShapeId === next.editingShapeId) {
    return true;
  }
  const prevId = prev.editingShapeId;
  const nextId = next.editingShapeId;
  const affectsShape =
    shapeContainsId(prev.shape, prevId) || shapeContainsId(prev.shape, nextId);
  return !affectsShape;
}
