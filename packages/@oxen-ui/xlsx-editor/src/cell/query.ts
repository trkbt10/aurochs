/**
 * @file Cell query operations
 *
 * Operations for reading and querying cells in a worksheet.
 */

import type { XlsxRow, XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import type { Cell, CellValue } from "@oxen/xlsx/domain/cell/types";
import type { CellAddress, CellRange } from "@oxen/xlsx/domain/cell/address";
import { colIdx, rowIdx, type ColIndex, type RowIndex } from "@oxen/xlsx/domain/types";

function findRow(worksheet: XlsxWorksheet, rowIndex: RowIndex): XlsxRow | undefined {
  return worksheet.rows.find((row) => row.rowNumber === rowIndex);
}

function findCellInRow(row: XlsxRow, colIndex: ColIndex): Cell | undefined {
  return row.cells.find((cell) => cell.address.col === colIndex);
}

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

function buildCellLookup(
  worksheet: XlsxWorksheet,
): ReadonlyMap<number, ReadonlyMap<number, Cell>> {
  const rowMap = new Map<number, Map<number, Cell>>();

  for (const row of worksheet.rows) {
    const cellsByCol = new Map<number, Cell>();
    for (const cell of row.cells) {
      cellsByCol.set(cell.address.col as number, cell);
    }
    rowMap.set(row.rowNumber as number, cellsByCol);
  }

  return rowMap;
}

/**
 * Get a cell at a specific address
 */
export function getCell(worksheet: XlsxWorksheet, address: CellAddress): Cell | undefined {
  const row = findRow(worksheet, address.row);
  if (!row) {return undefined;}
  return findCellInRow(row, address.col);
}

/**
 * Get a cell's value at a specific address
 */
export function getCellValue(
  worksheet: XlsxWorksheet,
  address: CellAddress,
): CellValue | undefined {
  return getCell(worksheet, address)?.value;
}

/**
 * Get all cells in a range
 */
export function getCellsInRange(
  worksheet: XlsxWorksheet,
  range: CellRange,
): readonly Cell[] {
  const { minRow, maxRow, minCol, maxCol } = getRangeBounds(range);

  const cells: Cell[] = [];
  for (const row of worksheet.rows) {
    const rowNumber = row.rowNumber as number;
    if (rowNumber < minRow || rowNumber > maxRow) {continue;}

    for (const cell of row.cells) {
      const colNumber = cell.address.col as number;
      if (colNumber < minCol || colNumber > maxCol) {continue;}
      cells.push(cell);
    }
  }

  cells.sort((a, b) => {
    const rowDiff = (a.address.row as number) - (b.address.row as number);
    if (rowDiff !== 0) {return rowDiff;}
    return (a.address.col as number) - (b.address.col as number);
  });

  return cells;
}

const EMPTY_VALUE: CellValue = { type: "empty" };

/**
 * Get cell values in a range as a 2D array (row-major)
 */
export function getCellValuesInRange(
  worksheet: XlsxWorksheet,
  range: CellRange,
): readonly (readonly CellValue[])[] {
  const { minRow, maxRow, minCol, maxCol } = getRangeBounds(range);
  const cellLookup = buildCellLookup(worksheet);

  const values: CellValue[][] = [];
  for (let row = minRow; row <= maxRow; row++) {
    const rowValues: CellValue[] = [];
    const cellsByCol = cellLookup.get(row);

    for (let col = minCol; col <= maxCol; col++) {
      rowValues.push(cellsByCol?.get(col)?.value ?? EMPTY_VALUE);
    }

    values.push(rowValues);
  }

  return values;
}

/**
 * Check if a cell exists at the given address
 */
export function hasCell(worksheet: XlsxWorksheet, address: CellAddress): boolean {
  return getCell(worksheet, address) !== undefined;
}

type RangeBounds = {
  readonly minRow: number;
  readonly maxRow: number;
  readonly minCol: number;
  readonly maxCol: number;
};

function updateBounds(
  bounds: RangeBounds | undefined,
  rowNumber: number,
  colNumber: number,
): RangeBounds {
  if (bounds === undefined) {
    return { minRow: rowNumber, maxRow: rowNumber, minCol: colNumber, maxCol: colNumber };
  }
  return {
    minRow: Math.min(bounds.minRow, rowNumber),
    maxRow: Math.max(bounds.maxRow, rowNumber),
    minCol: Math.min(bounds.minCol, colNumber),
    maxCol: Math.max(bounds.maxCol, colNumber),
  };
}

/**
 * Get the used range of the worksheet (bounding box of all cells)
 */
export function getUsedRange(worksheet: XlsxWorksheet): CellRange | undefined {
  const allCells = worksheet.rows.flatMap((row) => row.cells);

  const bounds = allCells.reduce<RangeBounds | undefined>((acc, cell) => {
    const rowNumber = cell.address.row as number;
    const colNumber = cell.address.col as number;
    return updateBounds(acc, rowNumber, colNumber);
  }, undefined);

  if (bounds === undefined) {
    return undefined;
  }

  return {
    start: {
      col: colIdx(bounds.minCol),
      row: rowIdx(bounds.minRow),
      colAbsolute: false,
      rowAbsolute: false,
    },
    end: {
      col: colIdx(bounds.maxCol),
      row: rowIdx(bounds.maxRow),
      colAbsolute: false,
      rowAbsolute: false,
    },
  };
}

/**
 * Find cells matching a predicate
 */
export function findCells(
  worksheet: XlsxWorksheet,
  predicate: (cell: Cell) => boolean,
): readonly Cell[] {
  const result: Cell[] = [];
  for (const row of worksheet.rows) {
    for (const cell of row.cells) {
      if (predicate(cell)) {
        result.push(cell);
      }
    }
  }
  return result;
}

