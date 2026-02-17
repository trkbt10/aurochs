/**
 * @file Row mutation operations
 *
 * Operations for inserting, deleting, resizing, and hiding rows.
 */

import type { XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import { rowIdx, type RowIndex } from "@aurochs-office/xlsx/domain/types";
import {
  assertPositiveInteger,
  assertValidRowIndex,
  assertFiniteNumber,
  toRowNumber,
  shiftRowNumbers,
  updateRowCollection,
  shiftCellRangeRowsInsert,
  shiftCellRangeRowsDelete,
  mapDefined,
  mapOptional,
} from "./cell-range-utils";

/**
 * Insert rows at the specified position
 */
export function insertRows(worksheet: XlsxWorksheet, startRow: RowIndex, count: number): XlsxWorksheet {
  assertValidRowIndex(startRow, "startRow");
  assertPositiveInteger(count, "count");

  return {
    ...worksheet,
    rows: shiftRowNumbers(worksheet.rows, startRow, count),
    mergeCells: mapDefined(worksheet.mergeCells, (range) => shiftCellRangeRowsInsert(range, startRow, count)),
    dimension: mapOptional(worksheet.dimension, (dimension) => shiftCellRangeRowsInsert(dimension, startRow, count)),
  };
}

/**
 * Delete rows at the specified position
 */
export function deleteRows(worksheet: XlsxWorksheet, startRow: RowIndex, count: number): XlsxWorksheet {
  assertValidRowIndex(startRow, "startRow");
  assertPositiveInteger(count, "count");

  const delStart = toRowNumber(startRow);
  const delEnd = delStart + count - 1;

  const remaining = worksheet.rows.filter((row) => {
    const n = toRowNumber(row.rowNumber);
    return n < delStart || n > delEnd;
  });

  const rows = shiftRowNumbers(remaining, rowIdx(delEnd + 1), -count);

  return {
    ...worksheet,
    rows,
    mergeCells: mapDefined(worksheet.mergeCells, (range) => shiftCellRangeRowsDelete(range, startRow, count)),
    dimension: mapOptional(worksheet.dimension, (dimension) => shiftCellRangeRowsDelete(dimension, startRow, count)),
  };
}

/**
 * Set the height of a row
 */
export function setRowHeight(worksheet: XlsxWorksheet, rowIndex: RowIndex, height: number): XlsxWorksheet {
  assertValidRowIndex(rowIndex, "rowIndex");
  assertFiniteNumber(height, "height");
  if (height < 0) {
    throw new Error(`height must be >= 0: ${height}`);
  }

  const rows = updateRowCollection(worksheet.rows, rowIndex, (row) => ({
    ...(row ?? { rowNumber: rowIndex, cells: [] }),
    height,
    customHeight: true,
  }));

  return { ...worksheet, rows };
}

/**
 * Hide rows at the specified position
 */
export function hideRows(worksheet: XlsxWorksheet, startRow: RowIndex, count: number): XlsxWorksheet {
  assertValidRowIndex(startRow, "startRow");
  assertPositiveInteger(count, "count");

  const start = toRowNumber(startRow);
  const indices = Array.from({ length: count }, (_, i) => rowIdx(start + i));
  const rows = indices.reduce(
    (acc, rowIndex) =>
      updateRowCollection(acc, rowIndex, (row) => ({
        ...(row ?? { rowNumber: rowIndex, cells: [] }),
        hidden: true,
      })),
    worksheet.rows,
  );

  return { ...worksheet, rows };
}

/**
 * Unhide rows at the specified position
 */
export function unhideRows(worksheet: XlsxWorksheet, startRow: RowIndex, count: number): XlsxWorksheet {
  assertValidRowIndex(startRow, "startRow");
  assertPositiveInteger(count, "count");

  const start = toRowNumber(startRow);
  const indices = Array.from({ length: count }, (_, i) => rowIdx(start + i));
  const rows = indices.reduce(
    (acc, rowIndex) =>
      updateRowCollection(acc, rowIndex, (row) => ({
        ...(row ?? { rowNumber: rowIndex, cells: [] }),
        hidden: undefined,
      })),
    worksheet.rows,
  );

  return { ...worksheet, rows };
}

/**
 * Set the outline level for a row
 *
 * @param worksheet - The worksheet to modify
 * @param rowIndex - The row index (0-based)
 * @param outlineLevel - The outline level (0-7, 0 means no grouping)
 */
export function setRowOutlineLevel(worksheet: XlsxWorksheet, rowIndex: RowIndex, outlineLevel: number): XlsxWorksheet {
  assertValidRowIndex(rowIndex, "rowIndex");
  if (outlineLevel < 0 || outlineLevel > 7) {
    throw new Error(`outlineLevel must be 0-7: ${outlineLevel}`);
  }

  const rows = updateRowCollection(worksheet.rows, rowIndex, (row) => ({
    ...(row ?? { rowNumber: rowIndex, cells: [] }),
    outlineLevel: outlineLevel === 0 ? undefined : outlineLevel,
  }));

  return { ...worksheet, rows };
}

/**
 * Group rows by increasing their outline level
 *
 * @param worksheet - The worksheet to modify
 * @param startRow - The starting row index (0-based)
 * @param count - Number of rows to group
 */
export function groupRows(worksheet: XlsxWorksheet, startRow: RowIndex, count: number): XlsxWorksheet {
  assertValidRowIndex(startRow, "startRow");
  assertPositiveInteger(count, "count");

  const start = toRowNumber(startRow);
  const indices = Array.from({ length: count }, (_, i) => rowIdx(start + i));
  const rows = indices.reduce(
    (acc, rowIndex) =>
      updateRowCollection(acc, rowIndex, (row) => {
        const currentLevel = (row ?? { rowNumber: rowIndex, cells: [] }).outlineLevel ?? 0;
        const newLevel = Math.min(currentLevel + 1, 7);
        return {
          ...(row ?? { rowNumber: rowIndex, cells: [] }),
          outlineLevel: newLevel,
        };
      }),
    worksheet.rows,
  );

  return { ...worksheet, rows };
}

/**
 * Ungroup rows by decreasing their outline level
 *
 * @param worksheet - The worksheet to modify
 * @param startRow - The starting row index (0-based)
 * @param count - Number of rows to ungroup
 */
export function ungroupRows(worksheet: XlsxWorksheet, startRow: RowIndex, count: number): XlsxWorksheet {
  assertValidRowIndex(startRow, "startRow");
  assertPositiveInteger(count, "count");

  const start = toRowNumber(startRow);
  const indices = Array.from({ length: count }, (_, i) => rowIdx(start + i));
  const rows = indices.reduce(
    (acc, rowIndex) =>
      updateRowCollection(acc, rowIndex, (row) => {
        const currentLevel = (row ?? { rowNumber: rowIndex, cells: [] }).outlineLevel ?? 0;
        const newLevel = Math.max(currentLevel - 1, 0);
        return {
          ...(row ?? { rowNumber: rowIndex, cells: [] }),
          outlineLevel: newLevel === 0 ? undefined : newLevel,
        };
      }),
    worksheet.rows,
  );

  return { ...worksheet, rows };
}

/**
 * Collapse or expand a row group
 *
 * @param worksheet - The worksheet to modify
 * @param rowIndex - The row index that acts as the group header
 * @param collapsed - Whether to collapse (true) or expand (false)
 */
export function setRowCollapsed(worksheet: XlsxWorksheet, rowIndex: RowIndex, collapsed: boolean): XlsxWorksheet {
  assertValidRowIndex(rowIndex, "rowIndex");

  const rows = updateRowCollection(worksheet.rows, rowIndex, (row) => ({
    ...(row ?? { rowNumber: rowIndex, cells: [] }),
    collapsed: collapsed ? true : undefined,
  }));

  return { ...worksheet, rows };
}
