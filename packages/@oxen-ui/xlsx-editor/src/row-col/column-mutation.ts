/**
 * @file Column mutation operations
 *
 * Operations for inserting, deleting, resizing, and hiding columns.
 */

import type { XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import { colIdx, type ColIndex } from "@oxen/xlsx/domain/types";
import {
  assertPositiveInteger,
  assertValidColIndex,
  assertFiniteNumber,
  toColNumber,
  shiftCellAddress,
  updateColumnDefs,
  updateColumnDefsForDeletion,
  applyColumnOverride,
  shiftCellRangeColsInsert,
  shiftCellRangeColsDelete,
  mapDefined,
  mapOptional,
} from "./cell-range-utils";





















/**
 * Insert columns at the specified position
 */
export function insertColumns(
  worksheet: XlsxWorksheet,
  startCol: ColIndex,
  count: number,
): XlsxWorksheet {
  assertValidColIndex(startCol, "startCol");
  assertPositiveInteger(count, "count");

  return {
    ...worksheet,
    columns: updateColumnDefs(worksheet.columns, startCol, count),
    rows: worksheet.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell) => {
        if (toColNumber(cell.address.col) < toColNumber(startCol)) {
          return cell;
        }
        return shiftCellAddress(cell, 0, count);
      }),
    })),
    mergeCells: mapDefined(worksheet.mergeCells, (range) =>
      shiftCellRangeColsInsert(range, startCol, count),
    ),
    dimension: mapOptional(worksheet.dimension, (dimension) =>
      shiftCellRangeColsInsert(dimension, startCol, count),
    ),
  };
}





















/**
 * Delete columns at the specified position
 */
export function deleteColumns(
  worksheet: XlsxWorksheet,
  startCol: ColIndex,
  count: number,
): XlsxWorksheet {
  assertValidColIndex(startCol, "startCol");
  assertPositiveInteger(count, "count");

  const delStart = toColNumber(startCol);
  const delEnd = delStart + count - 1;

  const rows = worksheet.rows.map((row) => {
    const remainingCells = row.cells
      .filter((cell) => {
        const col = toColNumber(cell.address.col);
        return col < delStart || col > delEnd;
      })
      .map((cell) =>
        toColNumber(cell.address.col) > delEnd ? shiftCellAddress(cell, 0, -count) : cell,
      );

    return remainingCells === row.cells ? row : { ...row, cells: remainingCells };
  });

  return {
    ...worksheet,
    rows,
    columns: updateColumnDefsForDeletion(worksheet.columns, startCol, count),
    mergeCells: mapDefined(worksheet.mergeCells, (range) =>
      shiftCellRangeColsDelete(range, startCol, count),
    ),
    dimension: mapOptional(worksheet.dimension, (dimension) =>
      shiftCellRangeColsDelete(dimension, startCol, count),
    ),
  };
}





















/**
 * Set the width of a column
 */
export function setColumnWidth(
  worksheet: XlsxWorksheet,
  colIndex: ColIndex,
  width: number,
): XlsxWorksheet {
  assertValidColIndex(colIndex, "colIndex");
  assertFiniteNumber(width, "width");
  if (width < 0) {
    throw new Error(`width must be >= 0: ${width}`);
  }

  return {
    ...worksheet,
    columns: applyColumnOverride(worksheet.columns, colIndex, { width }),
  };
}





















/**
 * Hide columns at the specified position
 */
export function hideColumns(
  worksheet: XlsxWorksheet,
  startCol: ColIndex,
  count: number,
): XlsxWorksheet {
  assertValidColIndex(startCol, "startCol");
  assertPositiveInteger(count, "count");

  const start = toColNumber(startCol);
  const indices = Array.from({ length: count }, (_, i) => colIdx(start + i));
  const columns = indices.reduce(
    (acc, col) => applyColumnOverride(acc, col, { hidden: true }),
    worksheet.columns,
  );

  return { ...worksheet, columns };
}





















/**
 * Unhide columns at the specified position
 */
export function unhideColumns(
  worksheet: XlsxWorksheet,
  startCol: ColIndex,
  count: number,
): XlsxWorksheet {
  assertValidColIndex(startCol, "startCol");
  assertPositiveInteger(count, "count");

  const start = toColNumber(startCol);
  const indices = Array.from({ length: count }, (_, i) => colIdx(start + i));
  const columns = indices.reduce(
    (acc, col) => applyColumnOverride(acc, col, { hidden: undefined }),
    worksheet.columns,
  );

  return { ...worksheet, columns };
}
