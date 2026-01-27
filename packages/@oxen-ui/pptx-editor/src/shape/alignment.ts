/**
 * @file Shape alignment and distribution
 *
 * Pure functions for calculating shape alignment and distribution positions.
 */

import type { Pixels } from "@oxen/ooxml/domain/units";
import type { Bounds, ShapeId } from "@oxen/pptx/domain/types";
import { px } from "@oxen/ooxml/domain/units";

// =============================================================================
// Types
// =============================================================================

/**
 * Shape bounds with ID for alignment operations
 */
export type ShapeBoundsWithId = {
  readonly id: ShapeId;
  readonly bounds: Bounds;
};

/**
 * Result of alignment/distribution calculation
 */
export type AlignmentUpdate = {
  readonly id: ShapeId;
  readonly bounds: {
    readonly x: Pixels;
    readonly y: Pixels;
    readonly width: Pixels;
    readonly height: Pixels;
  };
};

/**
 * Alignment target edge/center
 */
export type HorizontalAlignment = "left" | "center" | "right";
export type VerticalAlignment = "top" | "middle" | "bottom";

// =============================================================================
// Helper Functions
// =============================================================================

function getBoundsValue(b: Bounds, key: "x" | "y" | "width" | "height"): number {
  return b[key] as number;
}

function getLeft(b: Bounds): number {
  return getBoundsValue(b, "x");
}

function getTop(b: Bounds): number {
  return getBoundsValue(b, "y");
}

function getWidth(b: Bounds): number {
  return getBoundsValue(b, "width");
}

function getHeight(b: Bounds): number {
  return getBoundsValue(b, "height");
}

function getRight(b: Bounds): number {
  return getLeft(b) + getWidth(b);
}

function getBottom(b: Bounds): number {
  return getTop(b) + getHeight(b);
}

function getCenterX(b: Bounds): number {
  return getLeft(b) + getWidth(b) / 2;
}

function getCenterY(b: Bounds): number {
  return getTop(b) + getHeight(b) / 2;
}

function createUpdate(
  id: ShapeId,
  x: number,
  y: number,
  width: number,
  height: number
): AlignmentUpdate {
  return {
    id,
    bounds: {
      x: px(x),
      y: px(y),
      width: px(width),
      height: px(height),
    },
  };
}

// =============================================================================
// Alignment Operations
// =============================================================================

/**
 * Calculate positions for horizontal alignment
 */
export function alignHorizontal(
  shapes: readonly ShapeBoundsWithId[],
  alignment: HorizontalAlignment
): readonly AlignmentUpdate[] {
  if (shapes.length < 2) {
    return [];
  }

  switch (alignment) {
    case "left": {
      const minX = Math.min(...shapes.map((s) => getLeft(s.bounds)));
      return shapes.map((s) =>
        createUpdate(
          s.id,
          minX,
          getTop(s.bounds),
          getWidth(s.bounds),
          getHeight(s.bounds)
        )
      );
    }
    case "center": {
      const centers = shapes.map((s) => getCenterX(s.bounds));
      const avgCenter = centers.reduce((a, b) => a + b, 0) / centers.length;
      return shapes.map((s) =>
        createUpdate(
          s.id,
          avgCenter - getWidth(s.bounds) / 2,
          getTop(s.bounds),
          getWidth(s.bounds),
          getHeight(s.bounds)
        )
      );
    }
    case "right": {
      const maxRight = Math.max(...shapes.map((s) => getRight(s.bounds)));
      return shapes.map((s) =>
        createUpdate(
          s.id,
          maxRight - getWidth(s.bounds),
          getTop(s.bounds),
          getWidth(s.bounds),
          getHeight(s.bounds)
        )
      );
    }
  }
}

/**
 * Calculate positions for vertical alignment
 */
export function alignVertical(
  shapes: readonly ShapeBoundsWithId[],
  alignment: VerticalAlignment
): readonly AlignmentUpdate[] {
  if (shapes.length < 2) {
    return [];
  }

  switch (alignment) {
    case "top": {
      const minY = Math.min(...shapes.map((s) => getTop(s.bounds)));
      return shapes.map((s) =>
        createUpdate(
          s.id,
          getLeft(s.bounds),
          minY,
          getWidth(s.bounds),
          getHeight(s.bounds)
        )
      );
    }
    case "middle": {
      const centers = shapes.map((s) => getCenterY(s.bounds));
      const avgCenter = centers.reduce((a, b) => a + b, 0) / centers.length;
      return shapes.map((s) =>
        createUpdate(
          s.id,
          getLeft(s.bounds),
          avgCenter - getHeight(s.bounds) / 2,
          getWidth(s.bounds),
          getHeight(s.bounds)
        )
      );
    }
    case "bottom": {
      const maxBottom = Math.max(...shapes.map((s) => getBottom(s.bounds)));
      return shapes.map((s) =>
        createUpdate(
          s.id,
          getLeft(s.bounds),
          maxBottom - getHeight(s.bounds),
          getWidth(s.bounds),
          getHeight(s.bounds)
        )
      );
    }
  }
}

// =============================================================================
// Distribution Operations
// =============================================================================

/**
 * Calculate positions for horizontal distribution
 * Distributes shapes evenly between leftmost and rightmost shapes.
 */
export function distributeHorizontal(
  shapes: readonly ShapeBoundsWithId[]
): readonly AlignmentUpdate[] {
  if (shapes.length < 3) {
    return [];
  }

  // Sort by X position
  const sorted = [...shapes].sort((a, b) => getLeft(a.bounds) - getLeft(b.bounds));
  const leftmost = sorted[0];
  const rightmost = sorted[sorted.length - 1];

  // Calculate total width of all shapes
  const totalWidth = sorted.reduce((sum, s) => sum + getWidth(s.bounds), 0);

  // Calculate available space for gaps
  const startX = getLeft(leftmost.bounds);
  const endX = getRight(rightmost.bounds);
  const totalSpace = endX - startX;
  const gapSpace = totalSpace - totalWidth;
  const gapSize = gapSpace / (sorted.length - 1);

  // Calculate new positions
  const updates: AlignmentUpdate[] = [];
  let currentX = startX;

  for (const s of sorted) {
    updates.push(
      createUpdate(
        s.id,
        currentX,
        getTop(s.bounds),
        getWidth(s.bounds),
        getHeight(s.bounds)
      )
    );
    currentX += getWidth(s.bounds) + gapSize;
  }

  return updates;
}

/**
 * Calculate positions for vertical distribution
 * Distributes shapes evenly between topmost and bottommost shapes.
 */
export function distributeVertical(
  shapes: readonly ShapeBoundsWithId[]
): readonly AlignmentUpdate[] {
  if (shapes.length < 3) {
    return [];
  }

  // Sort by Y position
  const sorted = [...shapes].sort((a, b) => getTop(a.bounds) - getTop(b.bounds));
  const topmost = sorted[0];
  const bottommost = sorted[sorted.length - 1];

  // Calculate total height of all shapes
  const totalHeight = sorted.reduce((sum, s) => sum + getHeight(s.bounds), 0);

  // Calculate available space for gaps
  const startY = getTop(topmost.bounds);
  const endY = getBottom(bottommost.bounds);
  const totalSpace = endY - startY;
  const gapSpace = totalSpace - totalHeight;
  const gapSize = gapSpace / (sorted.length - 1);

  // Calculate new positions
  const updates: AlignmentUpdate[] = [];
  let currentY = startY;

  for (const s of sorted) {
    updates.push(
      createUpdate(
        s.id,
        getLeft(s.bounds),
        currentY,
        getWidth(s.bounds),
        getHeight(s.bounds)
      )
    );
    currentY += getHeight(s.bounds) + gapSize;
  }

  return updates;
}

// =============================================================================
// Nudge Operations
// =============================================================================

/**
 * Calculate positions after nudging shapes by delta
 */
export function nudgeShapes(
  shapes: readonly ShapeBoundsWithId[],
  dx: number,
  dy: number
): readonly AlignmentUpdate[] {
  return shapes.map((s) =>
    createUpdate(
      s.id,
      getLeft(s.bounds) + dx,
      getTop(s.bounds) + dy,
      getWidth(s.bounds),
      getHeight(s.bounds)
    )
  );
}

// =============================================================================
// High-level API
// =============================================================================

import type { Shape } from "@oxen/pptx/domain";
import { getShapeBounds } from "./bounds";

/**
 * Alignment type for high-level API
 */
export type AlignmentType =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom"
  | "distributeH"
  | "distributeV";

/**
 * Calculate aligned bounds for shapes in an array.
 * This is a convenience wrapper that works with Shape arrays.
 *
 * @param shapes - All shapes in the slide
 * @param selectedIds - IDs of shapes to align
 * @param alignment - Alignment type
 * @returns Map of shape ID to new bounds (only x, y - width/height unchanged)
 */
export function calculateAlignedBounds(
  shapes: readonly Shape[],
  selectedIds: readonly ShapeId[],
  alignment: AlignmentType
): Map<ShapeId, { x: number; y: number }> {
  const result = new Map<ShapeId, { x: number; y: number }>();

  // Collect bounds for selected shapes
  const selectedBounds: ShapeBoundsWithId[] = [];
  for (const id of selectedIds) {
    const shape = shapes.find((s) => "nonVisual" in s && s.nonVisual.id === id);
    if (!shape) {continue;}

    const bounds = getShapeBounds(shape);
    if (!bounds) {continue;}

    selectedBounds.push({ id, bounds });
  }

  if (selectedBounds.length < 2) {
    return result;
  }

  let updates: readonly AlignmentUpdate[] = [];

  switch (alignment) {
    case "left":
    case "center":
    case "right":
      updates = alignHorizontal(selectedBounds, alignment);
      break;
    case "top":
    case "middle":
    case "bottom":
      updates = alignVertical(selectedBounds, alignment);
      break;
    case "distributeH":
      updates = distributeHorizontal(selectedBounds);
      break;
    case "distributeV":
      updates = distributeVertical(selectedBounds);
      break;
  }

  for (const update of updates) {
    result.set(update.id, {
      x: update.bounds.x as number,
      y: update.bounds.y as number,
    });
  }

  return result;
}
