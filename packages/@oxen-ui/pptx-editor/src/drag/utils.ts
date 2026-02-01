/**
 * @file Drag utility functions
 */

import { DRAG_THRESHOLD_PX } from "./constants";

/**
 * Check if the pointer has moved beyond the drag threshold.
 * Used to distinguish between a click (selection) and a drag operation.
 *
 * @param startX - Starting X coordinate (client pixels)
 * @param startY - Starting Y coordinate (client pixels)
 * @param currentX - Current X coordinate (client pixels)
 * @param currentY - Current Y coordinate (client pixels)
 * @returns true if the movement exceeds the threshold in either direction
 */
export function isDragThresholdExceeded(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number
): boolean {
  const dx = Math.abs(currentX - startX);
  const dy = Math.abs(currentY - startY);
  return dx > DRAG_THRESHOLD_PX || dy > DRAG_THRESHOLD_PX;
}
