/**
 * @file Selection geometry (sheet grid)
 *
 * Converts `CellAddress`/ranges into pixel rectangles in the sheet viewport, and clips them to the
 * current visible area. Used for selection overlays and cell editor positioning.
 */

import type { CellAddress } from "@oxen/xlsx/domain/cell/address";
import { createSheetLayout, toColIndex0, toRowIndex0 } from "../../selectors/sheet-layout";

export type RangeBounds = {
  readonly minRow: number;
  readonly maxRow: number;
  readonly minCol: number;
  readonly maxCol: number;
};

/**
 * Normalize a `start/end` address pair into numeric bounds (min/max row/col).
 */
export function getRangeBounds(range: { readonly start: CellAddress; readonly end: CellAddress }): RangeBounds {
  const startRow = range.start.row as number;
  const endRow = range.end.row as number;
  const startCol = range.start.col as number;
  const endCol = range.end.col as number;

  return {
    minRow: Math.min(startRow, endRow),
    maxRow: Math.max(startRow, endRow),
    minCol: Math.min(startCol, endCol),
    maxCol: Math.max(startCol, endCol),
  };
}

export type CellRect = { readonly left: number; readonly top: number; readonly width: number; readonly height: number };

/**
 * Get the on-screen rectangle for an active cell, relative to the cells viewport origin.
 */
export function getActiveCellRect(
  cell: CellAddress | undefined,
  layout: ReturnType<typeof createSheetLayout>,
  scrollTop: number,
  scrollLeft: number,
): CellRect | null {
  if (!cell) {
    return null;
  }
  const col0 = toColIndex0(cell.col);
  const row0 = toRowIndex0(cell.row);
  const width = layout.cols.getSizePx(col0);
  const height = layout.rows.getSizePx(row0);
  if (width <= 0 || height <= 0) {
    return null;
  }
  return {
    // NOTE: Coordinates are relative to the "cells" viewport (top-left excludes headers).
    left: layout.cols.getOffsetPx(col0) - scrollLeft,
    top: layout.rows.getOffsetPx(row0) - scrollTop,
    width,
    height,
  };
}

/**
 * Get the on-screen rectangle for a selected range, relative to the cells viewport origin.
 */
export function getSelectedRangeRect(
  range: { readonly start: CellAddress; readonly end: CellAddress } | undefined,
  layout: ReturnType<typeof createSheetLayout>,
  scrollTop: number,
  scrollLeft: number,
): CellRect | null {
  if (!range) {
    return null;
  }
  const bounds = getRangeBounds(range);
  const minCol0 = bounds.minCol - 1;
  const maxCol0 = bounds.maxCol - 1;
  const minRow0 = bounds.minRow - 1;
  const maxRow0 = bounds.maxRow - 1;

  const leftPx = layout.cols.getBoundaryOffsetPx(minCol0);
  const rightPx = layout.cols.getBoundaryOffsetPx(maxCol0 + 1);
  const topPx = layout.rows.getBoundaryOffsetPx(minRow0);
  const bottomPx = layout.rows.getBoundaryOffsetPx(maxRow0 + 1);

  const width = Math.max(0, rightPx - leftPx);
  const height = Math.max(0, bottomPx - topPx);
  if (width === 0 || height === 0) {
    return null;
  }

  return {
    // NOTE: Coordinates are relative to the "cells" viewport (top-left excludes headers).
    left: leftPx - scrollLeft,
    top: topPx - scrollTop,
    width,
    height,
  };
}

/**
 * Clip a rectangle to the viewport size. Returns `null` when the result would be empty.
 */
export function clipRectToViewport(
  rect: CellRect | null,
  viewportWidth: number,
  viewportHeight: number,
): CellRect | null {
  if (!rect) {
    return null;
  }
  const left = Math.max(0, rect.left);
  const top = Math.max(0, rect.top);
  const right = Math.min(viewportWidth, rect.left + rect.width);
  const bottom = Math.min(viewportHeight, rect.top + rect.height);
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  if (width <= 0 || height <= 0) {
    return null;
  }
  return { left, top, width, height };
}
