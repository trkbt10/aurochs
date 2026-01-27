/**
 * @file Row mutation operations
 *
 * Operations for inserting, deleting, resizing, and hiding rows.
 */

import type { XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import { rowIdx, type RowIndex } from "@oxen/xlsx/domain/types";
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
export function insertRows(
  worksheet: XlsxWorksheet,
  startRow: RowIndex,
  count: number,
): XlsxWorksheet {
  assertValidRowIndex(startRow, "startRow");
  assertPositiveInteger(count, "count");

  return {
    ...worksheet,
    rows: shiftRowNumbers(worksheet.rows, startRow, count),
    mergeCells: mapDefined(worksheet.mergeCells, (range) =>
      shiftCellRangeRowsInsert(range, startRow, count),
    ),
    dimension: mapOptional(worksheet.dimension, (dimension) =>
      shiftCellRangeRowsInsert(dimension, startRow, count),
    ),
  };
}





















/**
 * Delete rows at the specified position
 */
export function deleteRows(
  worksheet: XlsxWorksheet,
  startRow: RowIndex,
  count: number,
): XlsxWorksheet {
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
    mergeCells: mapDefined(worksheet.mergeCells, (range) =>
      shiftCellRangeRowsDelete(range, startRow, count),
    ),
    dimension: mapOptional(worksheet.dimension, (dimension) =>
      shiftCellRangeRowsDelete(dimension, startRow, count),
    ),
  };
}





















/**
 * Set the height of a row
 */
export function setRowHeight(
  worksheet: XlsxWorksheet,
  rowIndex: RowIndex,
  height: number,
): XlsxWorksheet {
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
export function hideRows(
  worksheet: XlsxWorksheet,
  startRow: RowIndex,
  count: number,
): XlsxWorksheet {
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
export function unhideRows(
  worksheet: XlsxWorksheet,
  startRow: RowIndex,
  count: number,
): XlsxWorksheet {
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
