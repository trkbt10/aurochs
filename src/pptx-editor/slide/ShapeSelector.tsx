/**
 * @file Shape selector component
 *
 * Renders selection UI for selected shapes.
 * Supports multi-selection with a combined bounding box.
 */

import { useCallback, useMemo } from "react";
import type { Pixels } from "../../pptx/domain/types";
import { useSlideEditor, findShapeByIdWithParents } from "../context/SlideEditorContext";
import { getAbsoluteBounds, clientToSlideCoords } from "../utils";
import { SelectionBox } from "./components/SelectionBox";
import { MultiSelectionBox } from "./components/MultiSelectionBox";
import type { ResizeHandlePosition, ShapeId } from "./types";

// =============================================================================
// Types
// =============================================================================

export type ShapeSelectorProps = {
  /** Slide width */
  readonly width: Pixels;
  /** Slide height */
  readonly height: Pixels;
};

export type ShapeBounds = {
  readonly id: ShapeId;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
  readonly isPrimary: boolean;
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate the combined bounding box for multiple shapes.
 * Ignores rotation for simplicity - uses axis-aligned bounds.
 */
function calculateCombinedBounds(
  bounds: readonly ShapeBounds[]
): { x: number; y: number; width: number; height: number } | undefined {
  if (bounds.length === 0) return undefined;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const b of bounds) {
    // For rotated shapes, calculate the axis-aligned bounding box
    if (b.rotation !== 0) {
      const corners = getRotatedCorners(b.x, b.y, b.width, b.height, b.rotation);
      for (const corner of corners) {
        minX = Math.min(minX, corner.x);
        minY = Math.min(minY, corner.y);
        maxX = Math.max(maxX, corner.x);
        maxY = Math.max(maxY, corner.y);
      }
    } else {
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    }
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Get the four corners of a rotated rectangle.
 */
function getRotatedCorners(
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number
): Array<{ x: number; y: number }> {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const corners = [
    { x: x, y: y },
    { x: x + width, y: y },
    { x: x + width, y: y + height },
    { x: x, y: y + height },
  ];

  return corners.map((corner) => {
    const dx = corner.x - centerX;
    const dy = corner.y - centerY;
    return {
      x: centerX + dx * cos - dy * sin,
      y: centerY + dx * sin + dy * cos,
    };
  });
}

// =============================================================================
// Component
// =============================================================================

/**
 * Shape selector - renders selection boxes for selected shapes.
 *
 * For single selection: Shows selection box with resize/rotate handles.
 * For multi-selection: Shows individual shape outlines (no handles) and
 * a combined bounding box with resize/rotate handles.
 *
 * This component should be rendered as an overlay on the slide canvas.
 */
export function ShapeSelector({ width, height }: ShapeSelectorProps) {
  const { slide, state, dispatch } = useSlideEditor();
  const { selection } = state;

  // Get bounds for selected shapes using proper group transform handling
  const selectedBounds = useMemo(() => {
    const bounds: ShapeBounds[] = [];

    for (const id of selection.selectedIds) {
      const result = findShapeByIdWithParents(slide.shapes, id);
      if (!result) continue;

      // Use getAbsoluteBounds with parent groups for correct coordinate calculation
      const absoluteBounds = getAbsoluteBounds(result.shape, result.parentGroups);
      if (!absoluteBounds) continue;

      bounds.push({
        id,
        x: absoluteBounds.x,
        y: absoluteBounds.y,
        width: absoluteBounds.width,
        height: absoluteBounds.height,
        rotation: absoluteBounds.rotation,
        isPrimary: id === selection.primaryId,
      });
    }

    return bounds;
  }, [slide.shapes, selection.selectedIds, selection.primaryId]);

  // Calculate combined bounds for multi-selection
  const combinedBounds = useMemo(() => {
    if (selectedBounds.length <= 1) return undefined;
    return calculateCombinedBounds(selectedBounds);
  }, [selectedBounds]);

  const isMultiSelection = selectedBounds.length > 1;

  // Handle resize start using unified coordinate conversion
  const handleResizeStart = useCallback(
    (handle: ResizeHandlePosition, e: React.PointerEvent) => {
      const rect = (e.target as SVGElement).ownerSVGElement?.getBoundingClientRect();
      if (!rect) return;

      const coords = clientToSlideCoords(e.clientX, e.clientY, rect, width as number, height as number);

      dispatch({
        type: "START_RESIZE",
        handle,
        startX: coords.x as Pixels,
        startY: coords.y as Pixels,
        aspectLocked: e.shiftKey,
      });
    },
    [dispatch, width, height]
  );

  // Handle rotate start using unified coordinate conversion
  const handleRotateStart = useCallback(
    (e: React.PointerEvent) => {
      const rect = (e.target as SVGElement).ownerSVGElement?.getBoundingClientRect();
      if (!rect) return;

      const coords = clientToSlideCoords(e.clientX, e.clientY, rect, width as number, height as number);

      dispatch({
        type: "START_ROTATE",
        startX: coords.x as Pixels,
        startY: coords.y as Pixels,
      });
    },
    [dispatch, width, height]
  );

  if (selectedBounds.length === 0) {
    return null;
  }

  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <g style={{ pointerEvents: "auto" }}>
        {/* Individual shape selection boxes */}
        {selectedBounds.map((bounds) => (
          <SelectionBox
            key={bounds.id}
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={bounds.height}
            rotation={bounds.rotation}
            isPrimary={bounds.isPrimary}
            // For multi-selection, don't show handles on individual shapes
            showResizeHandles={!isMultiSelection && bounds.isPrimary}
            showRotateHandle={!isMultiSelection && bounds.isPrimary}
            onResizeStart={handleResizeStart}
            onRotateStart={handleRotateStart}
          />
        ))}

        {/* Combined bounding box for multi-selection */}
        {isMultiSelection && combinedBounds && (
          <MultiSelectionBox
            x={combinedBounds.x}
            y={combinedBounds.y}
            width={combinedBounds.width}
            height={combinedBounds.height}
            onResizeStart={handleResizeStart}
            onRotateStart={handleRotateStart}
          />
        )}
      </g>
    </svg>
  );
}
