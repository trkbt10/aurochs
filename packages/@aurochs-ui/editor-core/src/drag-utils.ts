/**
 * @file Drag utility functions
 *
 * Shared utilities for drag operations.
 */

/**
 * Minimum distance in pixels before a pointer down + move is considered a drag operation.
 * This prevents accidental drags when the user just wants to click/select.
 */
export const DRAG_THRESHOLD_PX = 2;

/**
 * Check if the pointer has moved beyond the drag threshold.
 * Used to distinguish between a click (selection) and a drag operation.
 *
 * @returns true if the movement exceeds the threshold in either direction
 */
export function isDragThresholdExceeded({
  startX,
  startY,
  currentX,
  currentY,
}: {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}): boolean {
  const dx = Math.abs(currentX - startX);
  const dy = Math.abs(currentY - startY);
  return dx > DRAG_THRESHOLD_PX || dy > DRAG_THRESHOLD_PX;
}
