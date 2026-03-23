/**
 * @file Merge cell mutation operations
 *
 * Operations for adding and removing cell merge regions.
 *
 * Behavior differences from Excel/LibreOffice UI:
 * - Excel UI warns and unmerges the conflicting region on overlap; this API throws.
 *   Programmatic use benefits from fail-fast over silent data mutation.
 * - Excel UI discards non-top-left cell values on merge; this API does not touch
 *   cell values. The caller is responsible for clearing cells if needed.
 * - Single-cell ranges (e.g. A1:A1) are rejected, matching Excel's save behavior
 *   which silently strips them.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.55 (mergeCells)
 */

import type { CellRange } from "../cell/address";
import { formatRange } from "../cell/address";
import type { XlsxWorksheet } from "../workbook";

/**
 * Check whether a range spans more than one cell.
 */
function isMultiCellRange(range: CellRange): boolean {
  return range.start.row !== range.end.row || range.start.col !== range.end.col;
}

/**
 * Check whether two cell ranges overlap.
 *
 * Two ranges overlap when their row intervals AND column intervals both
 * intersect. This is the standard 2D interval intersection test.
 */
function rangesOverlap(a: CellRange, b: CellRange): boolean {
  return a.start.row <= b.end.row && b.start.row <= a.end.row
    && a.start.col <= b.end.col && b.start.col <= a.end.col;
}

/**
 * Check whether two cell ranges represent the same region.
 */
function rangesEqual(a: CellRange, b: CellRange): boolean {
  return a.start.row === b.start.row
    && a.start.col === b.start.col
    && a.end.row === b.end.row
    && a.end.col === b.end.col;
}

/**
 * Validate merge ranges and collect the ones to add.
 *
 * Shared by addMergeCells and setMergeCells.
 *
 * @throws If any range is a single cell, or if ranges overlap each other
 */
function validateRanges(ranges: readonly CellRange[]): void {
  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];

    if (!isMultiCellRange(range)) {
      throw new Error(
        `Merge range ${formatRange(range)} is a single cell and cannot be merged`,
      );
    }

    for (let j = i + 1; j < ranges.length; j++) {
      if (rangesOverlap(range, ranges[j])) {
        throw new Error(
          `Merge range ${formatRange(range)} overlaps with ${formatRange(ranges[j])}`,
        );
      }
    }
  }
}

/**
 * Add merge cell regions to a worksheet.
 *
 * Each range is validated to ensure:
 * - It spans more than one cell (single-cell merges are rejected)
 * - It does not overlap with existing merge regions
 * - If an identical range already exists, it is silently skipped
 *
 * @param worksheet - The worksheet to modify
 * @param ranges - Merge cell ranges to add
 * @throws If any range is a single cell or overlaps with an existing/other new region
 *
 * @see ECMA-376 Part 4, Section 18.3.1.55 (mergeCells)
 */
export function addMergeCells(worksheet: XlsxWorksheet, ranges: readonly CellRange[]): XlsxWorksheet {
  if (ranges.length === 0) {
    return worksheet;
  }

  validateRanges(ranges);

  const existing = worksheet.mergeCells ?? [];
  const toAdd: CellRange[] = [];

  for (const range of ranges) {
    // Skip if identical to an existing range
    if (existing.some((e) => rangesEqual(range, e))) {
      continue;
    }

    // Check for overlap with existing merge regions
    for (const existingRange of existing) {
      if (rangesOverlap(range, existingRange)) {
        throw new Error(
          `Merge range ${formatRange(range)} overlaps with existing merge region ${formatRange(existingRange)}`,
        );
      }
    }

    toAdd.push(range);
  }

  if (toAdd.length === 0) {
    return worksheet;
  }

  return {
    ...worksheet,
    mergeCells: [...existing, ...toAdd],
  };
}

/**
 * Remove merge cell regions from a worksheet.
 *
 * Each range must exactly match an existing merge region. Non-matching ranges
 * are silently ignored.
 *
 * @param worksheet - The worksheet to modify
 * @param ranges - Merge cell ranges to remove (must match exactly)
 *
 * @see ECMA-376 Part 4, Section 18.3.1.55 (mergeCells)
 */
export function removeMergeCells(worksheet: XlsxWorksheet, ranges: readonly CellRange[]): XlsxWorksheet {
  if (ranges.length === 0 || !worksheet.mergeCells || worksheet.mergeCells.length === 0) {
    return worksheet;
  }

  const remaining = worksheet.mergeCells.filter(
    (existing) => !ranges.some((r) => rangesEqual(r, existing)),
  );

  return {
    ...worksheet,
    mergeCells: remaining.length > 0 ? remaining : undefined,
  };
}

/**
 * Replace all merge cell regions in a worksheet.
 *
 * All ranges are validated for single-cell and mutual overlap before replacing.
 *
 * @param worksheet - The worksheet to modify
 * @param ranges - New merge cell ranges (replaces all existing)
 * @throws If any range is a single cell or overlaps with another range
 *
 * @see ECMA-376 Part 4, Section 18.3.1.55 (mergeCells)
 */
export function setMergeCells(worksheet: XlsxWorksheet, ranges: readonly CellRange[]): XlsxWorksheet {
  if (ranges.length === 0) {
    return {
      ...worksheet,
      mergeCells: undefined,
    };
  }

  validateRanges(ranges);

  return {
    ...worksheet,
    mergeCells: ranges,
  };
}
