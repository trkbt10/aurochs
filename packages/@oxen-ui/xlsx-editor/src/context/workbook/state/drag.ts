/**
 * @file Drag state management for XLSX editor
 *
 * State types and utilities for drag operations in spreadsheets:
 * - Range selection (click and drag to select cells)
 * - Fill handle (auto-fill cells)
 * - Row/Column resize
 */

import type { XlsxDragState } from "../editor/types";
import { createIdleDragState } from "../editor/types";
import type { CellAddress, CellRange } from "@oxen/xlsx/domain/cell/address";
import type { ColIndex, RowIndex } from "@oxen/xlsx/domain/types";

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if drag state is idle
 */
export function isDragIdle(
  drag: XlsxDragState,
): drag is { readonly type: "idle" } {
  return drag.type === "idle";
}

/**
 * Check if drag state is range selection
 */
export function isDragRangeSelect(
  drag: XlsxDragState,
): drag is {
  readonly type: "rangeSelect";
  readonly startCell: CellAddress;
  readonly currentCell: CellAddress;
} {
  return drag.type === "rangeSelect";
}

/**
 * Check if drag state is fill
 */
export function isDragFill(
  drag: XlsxDragState,
): drag is {
  readonly type: "fill";
  readonly sourceRange: CellRange;
  readonly targetRange: CellRange;
} {
  return drag.type === "fill";
}

/**
 * Check if drag state is row resize
 */
export function isDragRowResize(
  drag: XlsxDragState,
): drag is {
  readonly type: "rowResize";
  readonly rowIndex: RowIndex;
  readonly startY: number;
  readonly originalHeight: number;
} {
  return drag.type === "rowResize";
}

/**
 * Check if drag state is column resize
 */
export function isDragColumnResize(
  drag: XlsxDragState,
): drag is {
  readonly type: "columnResize";
  readonly colIndex: ColIndex;
  readonly startX: number;
  readonly originalWidth: number;
} {
  return drag.type === "columnResize";
}

// =============================================================================
// Drag State Factories
// =============================================================================

/**
 * Start range selection drag
 */
export function startRangeSelectDrag(startCell: CellAddress): XlsxDragState {
  return {
    type: "rangeSelect",
    startCell,
    currentCell: startCell,
  };
}

/**
 * Update range selection drag with new cell position
 */
export function updateRangeSelectDrag(
  drag: XlsxDragState,
  currentCell: CellAddress,
): XlsxDragState {
  if (drag.type !== "rangeSelect") {
    return drag;
  }
  return {
    ...drag,
    currentCell,
  };
}

/**
 * Get the selected range from range select drag state
 */
export function getRangeSelectRange(drag: XlsxDragState): CellRange | undefined {
  if (drag.type !== "rangeSelect") {
    return undefined;
  }
  return {
    start: drag.startCell,
    end: drag.currentCell,
  };
}

/**
 * Start fill drag
 */
export function startFillDrag(sourceRange: CellRange): XlsxDragState {
  return {
    type: "fill",
    sourceRange,
    targetRange: sourceRange,
  };
}

/**
 * Update fill drag with new target range
 */
export function updateFillDrag(
  drag: XlsxDragState,
  targetRange: CellRange,
): XlsxDragState {
  if (drag.type !== "fill") {
    return drag;
  }
  return {
    ...drag,
    targetRange,
  };
}

/**
 * Start row resize drag
 */
export function startRowResizeDrag(
  rowIndex: RowIndex,
  startY: number,
  originalHeight: number,
): XlsxDragState {
  return {
    type: "rowResize",
    rowIndex,
    startY,
    originalHeight,
  };
}

/**
 * Calculate new height from row resize drag
 */
export function calculateRowResizeHeight(
  drag: XlsxDragState,
  currentY: number,
  minHeight = 0,
): number {
  if (drag.type !== "rowResize") {
    return 0;
  }
  const delta = currentY - drag.startY;
  return Math.max(minHeight, drag.originalHeight + delta);
}

/**
 * Start column resize drag
 */
export function startColumnResizeDrag(
  colIndex: ColIndex,
  startX: number,
  originalWidth: number,
): XlsxDragState {
  return {
    type: "columnResize",
    colIndex,
    startX,
    originalWidth,
  };
}

/**
 * Calculate new width from column resize drag
 */
export function calculateColumnResizeWidth(
  drag: XlsxDragState,
  currentX: number,
  minWidth = 0,
): number {
  if (drag.type !== "columnResize") {
    return 0;
  }
  const delta = currentX - drag.startX;
  return Math.max(minWidth, drag.originalWidth + delta);
}

/**
 * End any drag operation (return to idle)
 */
export function endDrag(): XlsxDragState {
  return createIdleDragState();
}

/**
 * Check if any drag operation is in progress
 */
export function isDragging(drag: XlsxDragState): boolean {
  return drag.type !== "idle";
}
