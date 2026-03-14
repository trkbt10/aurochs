/**
 * @file Drag utilities and constants
 */

import {
  isDragThresholdExceeded as coreIsDragThresholdExceeded,
} from "@aurochs-ui/editor-core/drag-utils";

/**
 * Minimum distance in pixels before a pointer down + move is considered a drag operation.
 */
export const DRAG_THRESHOLD_PX = 2;

/**
 * Check if the pointer has moved beyond the drag threshold.
 */
export function isDragThresholdExceeded(args: {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}): boolean {
  return coreIsDragThresholdExceeded(args);
}
