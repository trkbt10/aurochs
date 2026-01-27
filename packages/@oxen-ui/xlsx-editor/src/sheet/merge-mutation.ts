/**
 * @file Merge cell mutation operations
 *
 * Operations for adding/removing worksheet merge cell ranges (`<mergeCells>`).
 *
 * NOTE: In OOXML, merge regions are stored at the worksheet level as `<mergeCell ref="A1:B2"/>`.
 */

import type { Cell } from "@oxen/xlsx/domain/cell/types";
import type { CellAddress, CellRange } from "@oxen/xlsx/domain/cell/address";
import type { XlsxRow, XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import { colIdx, rowIdx } from "@oxen/xlsx/domain/types";
import { toColNumber, toRowNumber } from "../row-col/cell-range-utils";

function normalizeRangeBounds(range: CellRange): {
  readonly minRow: number;
  readonly maxRow: number;
  readonly minCol: number;
  readonly maxCol: number;
} {
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

function normalizeRange(range: CellRange): CellRange {
  const { minRow, maxRow, minCol, maxCol } = normalizeRangeBounds(range);
  return {
    start: { col: colIdx(minCol), row: rowIdx(minRow), colAbsolute: false, rowAbsolute: false },
    end: { col: colIdx(maxCol), row: rowIdx(maxRow), colAbsolute: false, rowAbsolute: false },
  };
}

function rangesIntersect(a: CellRange, b: CellRange): boolean {
  const aa = normalizeRangeBounds(a);
  const bb = normalizeRangeBounds(b);
  return aa.minCol <= bb.maxCol && aa.maxCol >= bb.minCol && aa.minRow <= bb.maxRow && aa.maxRow >= bb.minRow;
}

function isSameCell(a: CellAddress, b: CellAddress): boolean {
  return (a.col as number) === (b.col as number) && (a.row as number) === (b.row as number);
}

function clearNonOriginCellContentsInMerge(
  row: XlsxRow,
  merge: { readonly minRow: number; readonly maxRow: number; readonly minCol: number; readonly maxCol: number; readonly origin: CellAddress },
): { readonly row: XlsxRow; readonly changed: boolean } {
  const rowNumber = toRowNumber(row.rowNumber);
  if (rowNumber < merge.minRow || rowNumber > merge.maxRow) {
    return { row, changed: false };
  }

  const state = { changed: false };
  const cells = row.cells.map((cell): Cell => {
    const colNumber = toColNumber(cell.address.col);
    if (colNumber < merge.minCol || colNumber > merge.maxCol) {
      return cell;
    }
    if (isSameCell(cell.address, merge.origin)) {
      return cell;
    }

    const hasNonEmptyValue = cell.value.type !== "empty";
    const hasFormula = cell.formula !== undefined;
    if (!hasNonEmptyValue && !hasFormula) {
      return cell;
    }

    state.changed = true;
    const { formula: removedFormula, ...withoutFormula } = cell;
    void removedFormula;
    return { ...withoutFormula, value: { type: "empty" } };
  });

  if (!state.changed) {
    return { row, changed: false };
  }
  return { row: { ...row, cells }, changed: true };
}

/**
 * Merge a cell range on the worksheet.
 *
 * - Removes any existing merge regions that intersect the given range.
 * - Adds the normalized merge range.
 * - Clears value/formula for non-origin cells inside the merge.
 */
export function mergeCells(worksheet: XlsxWorksheet, range: CellRange): XlsxWorksheet {
  const normalized = normalizeRange(range);
  const { minRow, maxRow, minCol, maxCol } = normalizeRangeBounds(normalized);

  const isSingleCell = minRow === maxRow && minCol === maxCol;
  if (isSingleCell) {
    return worksheet;
  }

  const origin: CellAddress = normalized.start;

  const existing = worksheet.mergeCells ?? [];
  const withoutOverlaps = existing.filter((m) => !rangesIntersect(m, normalized));
  const nextMergeCells = [...withoutOverlaps, normalized];

  const cleared = worksheet.rows.reduce<{
    readonly rows: readonly XlsxRow[];
    readonly changed: boolean;
  }>(
    (acc, row) => {
      const processed = clearNonOriginCellContentsInMerge(row, { minRow, maxRow, minCol, maxCol, origin });
      return {
        rows: [...acc.rows, processed.row],
        changed: acc.changed || processed.changed,
      };
    },
    { rows: [], changed: false },
  );

  const changedMerge =
    nextMergeCells.length !== existing.length ||
    nextMergeCells.some((m, i) => m !== existing[i]);

  if (!changedMerge && !cleared.changed) {
    return worksheet;
  }

  return {
    ...worksheet,
    mergeCells: nextMergeCells,
    rows: cleared.changed ? cleared.rows : worksheet.rows,
  };
}

/**
 * Unmerge any merge regions that intersect the given range.
 */
export function unmergeCells(worksheet: XlsxWorksheet, range: CellRange): XlsxWorksheet {
  const existing = worksheet.mergeCells;
  if (!existing || existing.length === 0) {
    return worksheet;
  }

  const normalized = normalizeRange(range);
  const next = existing.filter((m) => !rangesIntersect(m, normalized));
  if (next.length === existing.length) {
    return worksheet;
  }

  return { ...worksheet, mergeCells: next.length > 0 ? next : undefined };
}
