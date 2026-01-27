/**
 * @file Cell mutation operations
 *
 * Operations for updating, deleting, and clearing cells in a worksheet.
 */

import type { XlsxRow, XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import type { Cell, CellValue } from "@oxen/xlsx/domain/cell/types";
import type { CellAddress, CellRange } from "@oxen/xlsx/domain/cell/address";
import type { Formula } from "@oxen/xlsx/domain/cell/formula";

const EMPTY_VALUE: CellValue = { type: "empty" };

function getRangeBounds(range: CellRange): {
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

function findRowIndex(worksheet: XlsxWorksheet, rowNumber: CellAddress["row"]): number {
  return worksheet.rows.findIndex((row) => row.rowNumber === rowNumber);
}

function findCellIndex(row: XlsxRow, col: CellAddress["col"]): number {
  return row.cells.findIndex((cell) => cell.address.col === col);
}

function insertRowSorted(rows: readonly XlsxRow[], row: XlsxRow): readonly XlsxRow[] {
  const rowNumber = row.rowNumber as number;
  const insertIndex = rows.findIndex((r) => (r.rowNumber as number) > rowNumber);
  if (insertIndex === -1) {
    return [...rows, row];
  }
  return [...rows.slice(0, insertIndex), row, ...rows.slice(insertIndex)];
}

function insertCellSorted(cells: readonly Cell[], cell: Cell): readonly Cell[] {
  const colNumber = cell.address.col as number;
  const insertIndex = cells.findIndex((c) => (c.address.col as number) > colNumber);
  if (insertIndex === -1) {
    return [...cells, cell];
  }
  return [...cells.slice(0, insertIndex), cell, ...cells.slice(insertIndex)];
}

function normalizeUpdaterResult(address: CellAddress, result: Cell): Cell {
  return { ...result, address };
}

/**
 * Update a single cell's value in a worksheet
 */
export function updateCell(
  worksheet: XlsxWorksheet,
  address: CellAddress,
  value: CellValue,
): XlsxWorksheet {
  return updateCellById(worksheet, address, (cell) => {
    if (!cell) {
      return { address, value };
    }
    const { formula: removedFormula, ...withoutFormula } = cell;
    void removedFormula;
    return { ...withoutFormula, value };
  });
}

/**
 * Update a cell using an updater function
 */
export function updateCellById(
  worksheet: XlsxWorksheet,
  address: CellAddress,
  updater: (cell: Cell | undefined) => Cell,
): XlsxWorksheet {
  const rowIndex = findRowIndex(worksheet, address.row);

  if (rowIndex === -1) {
    const createdCell = normalizeUpdaterResult(address, updater(undefined));
    const createdRow: XlsxRow = {
      rowNumber: address.row,
      cells: [createdCell],
    };
    return { ...worksheet, rows: insertRowSorted(worksheet.rows, createdRow) };
  }

  const row = worksheet.rows[rowIndex];
  const cellIndex = findCellIndex(row, address.col);
  const currentCell = cellIndex === -1 ? undefined : row.cells[cellIndex];
  const updatedCell = normalizeUpdaterResult(address, updater(currentCell));

  const updateCellsInRow = (rowCells: readonly Cell[], idx: number, cell: Cell): readonly Cell[] => {
    if (idx === -1) {
      return insertCellSorted(rowCells, cell);
    }
    const next = [...rowCells];
    next[idx] = cell;
    return next;
  };
  const updatedCells = updateCellsInRow(row.cells, cellIndex, updatedCell);

  const updatedRow: XlsxRow = { ...row, cells: updatedCells };
  const updatedRows = [...worksheet.rows];
  updatedRows[rowIndex] = updatedRow;
  return { ...worksheet, rows: updatedRows };
}

function processRowForDeletion(
  row: XlsxRow,
  minRow: number,
  maxRow: number,
  minCol: number,
  maxCol: number,
): { readonly row: XlsxRow; readonly changed: boolean } {
  const rowNumber = row.rowNumber as number;
  if (rowNumber < minRow || rowNumber > maxRow) {
    return { row, changed: false };
  }

  const nextCells = row.cells.filter((cell) => {
    const colNumber = cell.address.col as number;
    return colNumber < minCol || colNumber > maxCol;
  });

  if (nextCells.length === row.cells.length) {
    return { row, changed: false };
  }
  return { row: { ...row, cells: nextCells }, changed: true };
}

/**
 * Delete cells in a range (set to empty)
 */
export function deleteCellRange(
  worksheet: XlsxWorksheet,
  range: CellRange,
): XlsxWorksheet {
  const { minRow, maxRow, minCol, maxCol } = getRangeBounds(range);

  const result = worksheet.rows.reduce<{
    readonly rows: readonly XlsxRow[];
    readonly changed: boolean;
  }>(
    (acc, row) => {
      const processed = processRowForDeletion(row, minRow, maxRow, minCol, maxCol);
      return {
        rows: [...acc.rows, processed.row],
        changed: acc.changed || processed.changed,
      };
    },
    { rows: [], changed: false },
  );

  return result.changed ? { ...worksheet, rows: result.rows } : worksheet;
}

function clearCellContentInRange(
  cell: Cell,
  minCol: number,
  maxCol: number,
): { readonly cell: Cell; readonly changed: boolean } {
  const colNumber = cell.address.col as number;
  if (colNumber < minCol || colNumber > maxCol) {
    return { cell, changed: false };
  }
  const { formula: removedFormula, ...withoutFormula } = cell;
  void removedFormula;
  return { cell: { ...withoutFormula, value: EMPTY_VALUE }, changed: true };
}

function processRowForContentClear(
  row: XlsxRow,
  minRow: number,
  maxRow: number,
  minCol: number,
  maxCol: number,
): { readonly row: XlsxRow; readonly changed: boolean } {
  const rowNumber = row.rowNumber as number;
  if (rowNumber < minRow || rowNumber > maxRow) {
    return { row, changed: false };
  }

  const cellResults = row.cells.map((cell) => clearCellContentInRange(cell, minCol, maxCol));
  const anyChanged = cellResults.some((r) => r.changed);

  if (!anyChanged) {
    return { row, changed: false };
  }
  return { row: { ...row, cells: cellResults.map((r) => r.cell) }, changed: true };
}

/**
 * Clear cell contents (keep style)
 */
export function clearCellContents(
  worksheet: XlsxWorksheet,
  range: CellRange,
): XlsxWorksheet {
  const { minRow, maxRow, minCol, maxCol } = getRangeBounds(range);

  const result = worksheet.rows.reduce<{
    readonly rows: readonly XlsxRow[];
    readonly changed: boolean;
  }>(
    (acc, row) => {
      const processed = processRowForContentClear(row, minRow, maxRow, minCol, maxCol);
      return {
        rows: [...acc.rows, processed.row],
        changed: acc.changed || processed.changed,
      };
    },
    { rows: [], changed: false },
  );

  return result.changed ? { ...worksheet, rows: result.rows } : worksheet;
}

function clearCellFormatInRange(
  cell: Cell,
  minCol: number,
  maxCol: number,
): { readonly cell: Cell; readonly changed: boolean } {
  const colNumber = cell.address.col as number;
  if (colNumber < minCol || colNumber > maxCol) {
    return { cell, changed: false };
  }
  if (cell.styleId === undefined) {
    return { cell, changed: false };
  }
  const { styleId: removedStyleId, ...withoutStyle } = cell;
  void removedStyleId;
  return { cell: withoutStyle, changed: true };
}

function processRowForFormatClear(
  row: XlsxRow,
  minRow: number,
  maxRow: number,
  minCol: number,
  maxCol: number,
): { readonly row: XlsxRow; readonly changed: boolean } {
  const rowNumber = row.rowNumber as number;
  if (rowNumber < minRow || rowNumber > maxRow) {
    return { row, changed: false };
  }

  const cellResults = row.cells.map((cell) => clearCellFormatInRange(cell, minCol, maxCol));
  const anyChanged = cellResults.some((r) => r.changed);

  if (!anyChanged) {
    return { row, changed: false };
  }
  return { row: { ...row, cells: cellResults.map((r) => r.cell) }, changed: true };
}

/**
 * Clear cell formats (keep value)
 */
export function clearCellFormats(
  worksheet: XlsxWorksheet,
  range: CellRange,
): XlsxWorksheet {
  const { minRow, maxRow, minCol, maxCol } = getRangeBounds(range);

  const result = worksheet.rows.reduce<{
    readonly rows: readonly XlsxRow[];
    readonly changed: boolean;
  }>(
    (acc, row) => {
      const processed = processRowForFormatClear(row, minRow, maxRow, minCol, maxCol);
      return {
        rows: [...acc.rows, processed.row],
        changed: acc.changed || processed.changed,
      };
    },
    { rows: [], changed: false },
  );

  return result.changed ? { ...worksheet, rows: result.rows } : worksheet;
}

/**
 * Set cell formula
 */
export function setCellFormula(
  worksheet: XlsxWorksheet,
  address: CellAddress,
  formula: string,
): XlsxWorksheet {
  const expression = formula.trim();
  if (expression.length === 0) {
    throw new Error("formula is required");
  }
  const nextFormula: Formula = { type: "normal", expression };
  return updateCellById(worksheet, address, (cell) => {
    if (!cell) {
      return { address, value: EMPTY_VALUE, formula: nextFormula };
    }
    return { ...cell, formula: nextFormula };
  });
}
