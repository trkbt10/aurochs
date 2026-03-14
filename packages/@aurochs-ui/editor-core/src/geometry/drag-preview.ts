/**
 * @file Drag preview calculations
 *
 * Pure functions for calculating shape bounds during drag operations (move, resize, rotate).
 * These are used to show visual preview before the drag is committed to history.
 */

import type { RotatedBoundsInput, ResizeHandlePosition } from "./types";
import { normalizeAngle } from "./rotate";

// =============================================================================
// Types
// =============================================================================

/**
 * Bounds with rotation for drag preview.
 * Same structure as RotatedBoundsInput but mutable for intermediate results.
 */
export type DragPreviewBounds = RotatedBoundsInput;

/**
 * Move drag state subset needed for preview calculation.
 */
export type MoveDragPreviewInput<TId = string> = {
  readonly shapeIds: readonly TId[];
  readonly initialBounds: ReadonlyMap<TId, { readonly x: number; readonly y: number; readonly width: number; readonly height: number }>;
  readonly previewDelta: { readonly dx: number; readonly dy: number };
};

/**
 * Resize drag state subset needed for preview calculation.
 */
export type ResizeDragPreviewInput<TId = string> = {
  readonly handle: ResizeHandlePosition;
  readonly shapeIds: readonly TId[];
  readonly initialBoundsMap: ReadonlyMap<TId, { readonly x: number; readonly y: number; readonly width: number; readonly height: number }>;
  readonly combinedBounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly aspectLocked: boolean;
  readonly previewDelta: { readonly dx: number; readonly dy: number };
};

/**
 * Rotate drag state subset needed for preview calculation.
 */
export type RotateDragPreviewInput<TId = string> = {
  readonly shapeIds: readonly TId[];
  readonly initialRotationsMap: ReadonlyMap<TId, number>;
  readonly previewAngleDelta: number;
};

// =============================================================================
// Internal Helpers
// =============================================================================

type ResizeDimensionsInput = {
  readonly handle: ResizeHandlePosition;
  readonly baseW: number;
  readonly baseH: number;
  readonly baseX: number;
  readonly baseY: number;
  readonly dx: number;
  readonly dy: number;
  readonly aspectLocked: boolean;
};

/**
 * Calculate resized dimensions from a handle drag.
 */
export function calculateResizedDimensions({
  handle,
  baseW,
  baseH,
  baseX,
  baseY,
  dx,
  dy,
  aspectLocked,
}: ResizeDimensionsInput): { newWidth: number; newHeight: number; newX: number; newY: number } {
  const widthDelta = handle.includes("e") ? dx : handle.includes("w") ? -dx : 0;
  const heightDelta = handle.includes("s") ? dy : handle.includes("n") ? -dy : 0;
  const xDelta = handle.includes("w") ? dx : 0;
  const yDelta = handle.includes("n") ? dy : 0;

  const rawWidth = Math.max(10, baseW + widthDelta);
  const rawHeight = Math.max(10, baseH + heightDelta);

  if (!aspectLocked || baseW <= 0 || baseH <= 0) {
    return {
      newWidth: rawWidth,
      newHeight: rawHeight,
      newX: baseX + xDelta,
      newY: baseY + yDelta,
    };
  }

  const aspect = baseW / baseH;
  const isVerticalOnly = handle === "n" || handle === "s";
  const isHorizontalOnly = handle === "e" || handle === "w";

  const finalWidth = isVerticalOnly ? rawHeight * aspect : rawWidth;
  const finalHeight = isHorizontalOnly ? rawWidth / aspect : rawWidth / aspect;

  return {
    newWidth: finalWidth,
    newHeight: finalHeight,
    newX: baseX + xDelta,
    newY: baseY + yDelta,
  };
}

// =============================================================================
// Preview Functions
// =============================================================================

/**
 * Apply move preview delta to shape bounds.
 * Returns updated bounds with position offset, or original bounds if shape is not being moved.
 */
export function applyMovePreview<TId>(
  id: TId,
  baseBounds: DragPreviewBounds,
  drag: MoveDragPreviewInput<TId>,
): DragPreviewBounds {
  if (!drag.shapeIds.includes(id)) {
    return baseBounds;
  }
  const { dx, dy } = drag.previewDelta;
  const initial = drag.initialBounds.get(id);
  if (!initial) {
    return baseBounds;
  }
  return {
    ...baseBounds,
    x: initial.x + dx,
    y: initial.y + dy,
  };
}

/**
 * Apply resize preview delta to shape bounds.
 * Handles multi-selection proportional scaling.
 */
export function applyResizePreview<TId>(
  id: TId,
  baseBounds: DragPreviewBounds,
  drag: ResizeDragPreviewInput<TId>,
): DragPreviewBounds {
  if (!drag.shapeIds.includes(id)) {
    return baseBounds;
  }

  const { dx, dy } = drag.previewDelta;
  const { handle, combinedBounds: cb, initialBoundsMap, aspectLocked } = drag;
  const initial = initialBoundsMap.get(id);

  if (!initial || !cb) {
    return baseBounds;
  }

  const baseX = cb.x;
  const baseY = cb.y;
  const baseW = cb.width;
  const baseH = cb.height;

  const { newWidth, newHeight, newX, newY } = calculateResizedDimensions({
    handle,
    baseW,
    baseH,
    baseX,
    baseY,
    dx,
    dy,
    aspectLocked,
  });

  const scaleX = baseW > 0 ? newWidth / baseW : 1;
  const scaleY = baseH > 0 ? newHeight / baseH : 1;

  const relX = initial.x - baseX;
  const relY = initial.y - baseY;

  return {
    x: newX + relX * scaleX,
    y: newY + relY * scaleY,
    width: initial.width * scaleX,
    height: initial.height * scaleY,
    rotation: baseBounds.rotation,
  };
}

/**
 * Apply rotate preview delta to shape bounds.
 */
export function applyRotatePreview<TId>(
  id: TId,
  baseBounds: DragPreviewBounds,
  drag: RotateDragPreviewInput<TId>,
): DragPreviewBounds {
  if (!drag.shapeIds.includes(id)) {
    return baseBounds;
  }

  const angleDelta = drag.previewAngleDelta;
  const initialRotation = drag.initialRotationsMap.get(id);

  if (initialRotation === undefined) {
    return baseBounds;
  }

  return {
    ...baseBounds,
    rotation: normalizeAngle(initialRotation + angleDelta),
  };
}

/**
 * Dispatch to the appropriate preview function based on drag type.
 */
export function applyDragPreview<TId>(
  id: TId,
  baseBounds: DragPreviewBounds,
  drag: { readonly type: string } & (
    | MoveDragPreviewInput<TId>
    | ResizeDragPreviewInput<TId>
    | RotateDragPreviewInput<TId>
    | { readonly type: string }
  ),
): DragPreviewBounds {
  switch (drag.type) {
    case "move":
      return applyMovePreview(id, baseBounds, drag as MoveDragPreviewInput<TId>);
    case "resize":
      return applyResizePreview(id, baseBounds, drag as ResizeDragPreviewInput<TId>);
    case "rotate":
      return applyRotatePreview(id, baseBounds, drag as RotateDragPreviewInput<TId>);
    default:
      return baseBounds;
  }
}
