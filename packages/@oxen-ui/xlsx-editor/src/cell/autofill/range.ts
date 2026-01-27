/**
 * @file Autofill range helpers
 *
 * Normalization and direction detection for fill-handle operations.
 */

import type { CellRange } from "@oxen/xlsx/domain/cell/address";
import { colIdx, rowIdx } from "@oxen/xlsx/domain/types";
import type { FillDirection, RangeBounds } from "./types";

/**
 * Convert a `CellRange` into numeric bounds (1-based rows/cols) with min/max normalization.
 */
export function getRangeBounds(range: CellRange): RangeBounds {
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

/**
 * Normalize a range so `start` is the top-left and `end` is the bottom-right.
 */
export function normalizeRange(range: CellRange): CellRange {
  const bounds = getRangeBounds(range);
  return {
    start: { col: colIdx(bounds.minCol), row: rowIdx(bounds.minRow), colAbsolute: false, rowAbsolute: false },
    end: { col: colIdx(bounds.maxCol), row: rowIdx(bounds.maxRow), colAbsolute: false, rowAbsolute: false },
  };
}

/**
 * Determine the fill direction implied by extending `base` to reach `target`.
 *
 * This mirrors typical spreadsheet behavior: if both row/col expand, the dominant delta decides.
 */
export function computeDirection(base: RangeBounds, target: RangeBounds): FillDirection {
  const sameCols = base.minCol === target.minCol && base.maxCol === target.maxCol;
  const sameRows = base.minRow === target.minRow && base.maxRow === target.maxRow;
  if (sameCols && !sameRows) {
    if (target.maxRow > base.maxRow) {
      return "down";
    }
    return "up";
  }
  if (sameRows && !sameCols) {
    if (target.maxCol > base.maxCol) {
      return "right";
    }
    return "left";
  }

  const deltaDown = target.maxRow - base.maxRow;
  const deltaUp = base.minRow - target.minRow;
  const deltaRight = target.maxCol - base.maxCol;
  const deltaLeft = base.minCol - target.minCol;

  const maxDelta = Math.max(deltaDown, deltaUp, deltaRight, deltaLeft);

  if (maxDelta === deltaDown) {
    return "down";
  }
  if (maxDelta === deltaUp) {
    return "up";
  }
  if (maxDelta === deltaRight) {
    return "right";
  }
  return "left";
}

/**
 * Get how many rows need to be filled based on direction and bounds.
 */
export function getFillRowCount(direction: FillDirection, baseBounds: RangeBounds, targetBounds: RangeBounds): number {
  if (direction === "down") {
    return targetBounds.maxRow - baseBounds.maxRow;
  }
  if (direction === "up") {
    return baseBounds.minRow - targetBounds.minRow;
  }
  return 0;
}

/**
 * Get how many columns need to be filled based on direction and bounds.
 */
export function getFillColCount(direction: FillDirection, baseBounds: RangeBounds, targetBounds: RangeBounds): number {
  if (direction === "right") {
    return targetBounds.maxCol - baseBounds.maxCol;
  }
  if (direction === "left") {
    return baseBounds.minCol - targetBounds.minCol;
  }
  return 0;
}
