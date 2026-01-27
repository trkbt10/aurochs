/**
 * @file Cell style mutation operations
 *
 * Range-based style application for cells/rows/columns.
 */

import type { Cell, CellValue } from "@oxen/xlsx/domain/cell/types";
import type { CellAddress, CellRange } from "@oxen/xlsx/domain/cell/address";
import type { XlsxRow, XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import { EXCEL_MAX_COLS, EXCEL_MAX_ROWS } from "@oxen/xlsx/domain/constants";
import { colIdx, rowIdx, type StyleId } from "@oxen/xlsx/domain/types";
import {
  applyColumnRangeOverride,
  toColNumber,
  toRowNumber,
  updateRowCollection,
} from "../row-col/cell-range-utils";
import { clearCellFormats } from "./mutation";

const EMPTY_VALUE: CellValue = { type: "empty" };

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

function createAddress(col: number, row: number): CellAddress {
  return { col: colIdx(col), row: rowIdx(row), colAbsolute: false, rowAbsolute: false };
}

function applyStyleIdToCell(cell: Cell, styleId: StyleId): Cell {
  if ((styleId as number) === 0) {
    if (cell.styleId === undefined || (cell.styleId as number) === 0) {
      return cell;
    }
    const { styleId: removed, ...without } = cell;
    void removed;
    return without;
  }

  if (cell.styleId !== undefined && (cell.styleId as number) === (styleId as number)) {
    return cell;
  }
  return { ...cell, styleId };
}

function applyStyleToRowCells(params: {
  readonly row: XlsxRow;
  readonly minCol: number;
  readonly maxCol: number;
  readonly styleId: StyleId;
}): XlsxRow {
  const { row, minCol, maxCol, styleId } = params;
  const existing = row.cells;

  if ((styleId as number) === 0) {
    const updated = existing.map((cell) => {
      const col = toColNumber(cell.address.col);
      if (col < minCol || col > maxCol) {
        return cell;
      }
      return applyStyleIdToCell(cell, styleId);
    });
    const anyChanged = updated.some((c, i) => c !== existing[i]);
    return anyChanged ? { ...row, cells: updated } : row;
  }

  const nextCells: Cell[] = [];
  const cursor = { index: 0 };

  while (cursor.index < existing.length && toColNumber(existing[cursor.index]!.address.col) < minCol) {
    nextCells.push(existing[cursor.index]!);
    cursor.index += 1;
  }

  for (let col = minCol; col <= maxCol; col += 1) {
    const current = existing[cursor.index];
    if (current && toColNumber(current.address.col) === col) {
      nextCells.push(applyStyleIdToCell(current, styleId));
      cursor.index += 1;
      continue;
    }
    nextCells.push({
      address: createAddress(col, toRowNumber(row.rowNumber)),
      value: EMPTY_VALUE,
      styleId,
    });
  }

  while (cursor.index < existing.length) {
    nextCells.push(existing[cursor.index]!);
    cursor.index += 1;
  }

  return { ...row, cells: nextCells };
}

function applyStyleToRowRange(
  worksheet: XlsxWorksheet,
  params: { readonly minRow: number; readonly maxRow: number; readonly styleId: StyleId },
): XlsxWorksheet {
  const { minRow, maxRow, styleId } = params;

  const rowCount = maxRow - minRow + 1;
  if (rowCount > 10_000) {
    throw new Error(`Refusing to apply row style to too many rows: ${rowCount}`);
  }

  const rows = Array.from({ length: rowCount }, (_, i) => rowIdx(minRow + i)).reduce(
    (acc, rowIndex) =>
      updateRowCollection(acc, rowIndex, (row) => {
        if ((styleId as number) === 0) {
          if (!row || row.styleId === undefined || (row.styleId as number) === 0) {
            return row ?? { rowNumber: rowIndex, cells: [] };
          }
          const { styleId: removed, ...without } = row;
          void removed;
          return without;
        }

        const base = row ?? { rowNumber: rowIndex, cells: [] };
        if (base.styleId !== undefined && (base.styleId as number) === (styleId as number)) {
          return base;
        }
        return { ...base, styleId };
      }),
    worksheet.rows,
  );

  return rows === worksheet.rows ? worksheet : { ...worksheet, rows };
}

function applyStyleToColumnRange(
  worksheet: XlsxWorksheet,
  params: { readonly minCol: number; readonly maxCol: number; readonly styleId: StyleId },
): XlsxWorksheet {
  const { minCol, maxCol, styleId } = params;
  const columns = applyColumnRangeOverride(
    worksheet.columns,
    colIdx(minCol),
    colIdx(maxCol),
    (styleId as number) === 0 ? { styleId: undefined } : { styleId },
  );
  return { ...worksheet, columns };
}

function applyStyleToCellRange(
  worksheet: XlsxWorksheet,
  params: { readonly minRow: number; readonly maxRow: number; readonly minCol: number; readonly maxCol: number; readonly styleId: StyleId },
): XlsxWorksheet {
  const { minRow, maxRow, minCol, maxCol, styleId } = params;

  const rowCount = maxRow - minRow + 1;
  const colCount = maxCol - minCol + 1;
  const cellCount = rowCount * colCount;
  if (cellCount > 200_000) {
    throw new Error(`Refusing to apply style to too many cells: ${cellCount}`);
  }

  if ((styleId as number) === 0) {
    return clearCellFormats(worksheet, {
      start: createAddress(minCol, minRow),
      end: createAddress(maxCol, maxRow),
    });
  }

  const existingRows = worksheet.rows;
  const updatedRows: XlsxRow[] = [];
  const createdRowNumbers = new Set<number>();

  for (const row of existingRows) {
    const rowNumber = toRowNumber(row.rowNumber);
    if (rowNumber < minRow || rowNumber > maxRow) {
      updatedRows.push(row);
      continue;
    }
    createdRowNumbers.add(rowNumber);
    updatedRows.push(
      applyStyleToRowCells({
        row,
        minCol,
        maxCol,
        styleId,
      }),
    );
  }

  for (let rowNumber = minRow; rowNumber <= maxRow; rowNumber += 1) {
    if (createdRowNumbers.has(rowNumber)) {
      continue;
    }
    const rowIndex = rowIdx(rowNumber);
    const cells: Cell[] = [];
    for (let col = minCol; col <= maxCol; col += 1) {
      cells.push({
        address: createAddress(col, rowNumber),
        value: EMPTY_VALUE,
        styleId,
      });
    }
    updatedRows.push({ rowNumber: rowIndex, cells });
  }

  const sortedRows = [...updatedRows].sort((a, b) => toRowNumber(a.rowNumber) - toRowNumber(b.rowNumber));
  return { ...worksheet, rows: sortedRows };
}

/**
 * Apply a styleId to a worksheet range.
 *
 * For whole-column or whole-row selections, this prefers `worksheet.columns` / `row.styleId`
 * to avoid materializing enormous amounts of `<c>` nodes.
 */
export function applyStyleToRange(
  worksheet: XlsxWorksheet,
  range: CellRange,
  styleId: StyleId,
): XlsxWorksheet {
  const { minRow, maxRow, minCol, maxCol } = normalizeRangeBounds(range);

  const isWholeColumnSelection = minRow === 1 && maxRow === EXCEL_MAX_ROWS;
  if (isWholeColumnSelection) {
    return applyStyleToColumnRange(worksheet, { minCol, maxCol, styleId });
  }

  const isWholeRowSelection = minCol === 1 && maxCol === EXCEL_MAX_COLS;
  if (isWholeRowSelection) {
    return applyStyleToRowRange(worksheet, { minRow, maxRow, styleId });
  }

  return applyStyleToCellRange(worksheet, { minRow, maxRow, minCol, maxCol, styleId });
}
