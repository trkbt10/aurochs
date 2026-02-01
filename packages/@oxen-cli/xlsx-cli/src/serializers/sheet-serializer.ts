/**
 * @file Sheet serialization utilities for JSON output
 */

import type { XlsxWorksheet, XlsxRow } from "@oxen-office/xlsx/domain/workbook";
import { indexToColumnLetter } from "@oxen-office/xlsx/domain/cell/address";
import { colIdx } from "@oxen-office/xlsx/domain/types";
import { serializeCell, type CellJson } from "./cell-serializer";

// =============================================================================
// JSON Types
// =============================================================================

export type RowJson = {
  readonly rowNumber: number;
  readonly cells: readonly CellJson[];
};

export type SheetSummaryJson = {
  readonly name: string;
  readonly rowCount: number;
  readonly hasData: boolean;
  readonly mergedCellCount?: number;
  readonly formulaCount?: number;
};

export type SheetDataJson = {
  readonly name: string;
  readonly rows: readonly RowJson[];
  readonly mergedCells?: readonly string[];
};

// =============================================================================
// Serialization Functions
// =============================================================================

function serializeRow(row: XlsxRow): RowJson {
  const cells = row.cells.map(serializeCell);
  // Sort cells by column
  cells.sort((a, b) => a.ref.localeCompare(b.ref, undefined, { numeric: true }));
  return {
    rowNumber: row.rowNumber as number,
    cells,
  };
}

/**
 * Serialize an XLSX worksheet to summary JSON format.
 */
export function serializeSheetSummary(sheet: XlsxWorksheet): SheetSummaryJson {
  const formulaCount = sheet.rows.reduce(
    (sum, row) => sum + row.cells.filter((cell) => cell.formula).length,
    0,
  );

  return {
    name: sheet.name,
    rowCount: sheet.rows.length,
    hasData: sheet.rows.length > 0,
    ...(sheet.mergeCells && sheet.mergeCells.length > 0 && { mergedCellCount: sheet.mergeCells.length }),
    ...(formulaCount > 0 && { formulaCount }),
  };
}

/**
 * Serialize an XLSX worksheet to detailed JSON format.
 */
export function serializeSheetData(sheet: XlsxWorksheet): SheetDataJson {
  const rows = sheet.rows.map(serializeRow);
  // Sort rows by row number
  rows.sort((a, b) => a.rowNumber - b.rowNumber);

  const mergedCells = sheet.mergeCells?.map((range) => {
    const startCol = indexToColumnLetter(range.start.col);
    const endCol = indexToColumnLetter(range.end.col);
    return `${startCol}${range.start.row}:${endCol}${range.end.row}`;
  });

  return {
    name: sheet.name,
    rows,
    ...(mergedCells && mergedCells.length > 0 && { mergedCells }),
  };
}

/**
 * Format a CellRange as a string (e.g., "A1:C10").
 */
export function formatRange(range: { start: { row: number; col: number }; end: { row: number; col: number } }): string {
  const startCol = indexToColumnLetter(colIdx(range.start.col as number));
  const endCol = indexToColumnLetter(colIdx(range.end.col as number));
  return `${startCol}${range.start.row}:${endCol}${range.end.row}`;
}

/**
 * Get the used range of a sheet.
 */
export function getSheetRange(sheet: XlsxWorksheet): { startRow: number; endRow: number; startCol: string; endCol: string } | undefined {
  if (sheet.rows.length === 0) {
    return undefined;
  }

  // If dimension is available, use it
  if (sheet.dimension) {
    const startCol = indexToColumnLetter(sheet.dimension.start.col);
    const endCol = indexToColumnLetter(sheet.dimension.end.col);
    return {
      startRow: sheet.dimension.start.row as number,
      endRow: sheet.dimension.end.row as number,
      startCol,
      endCol,
    };
  }

  // Calculate from row data
  const bounds = sheet.rows.reduce(
    (acc, row) => {
      const rowNum = row.rowNumber as number;
      const rowBounds = row.cells.reduce(
        (cellAcc, cell) => {
          const colNum = cell.address.col as number;
          return {
            minCol: Math.min(cellAcc.minCol, colNum),
            maxCol: Math.max(cellAcc.maxCol, colNum),
          };
        },
        { minCol: acc.minCol, maxCol: acc.maxCol },
      );
      return {
        minRow: Math.min(acc.minRow, rowNum),
        maxRow: Math.max(acc.maxRow, rowNum),
        minCol: rowBounds.minCol,
        maxCol: rowBounds.maxCol,
      };
    },
    {
      minRow: Number.MAX_SAFE_INTEGER,
      maxRow: 0,
      minCol: Number.MAX_SAFE_INTEGER,
      maxCol: 0,
    },
  );

  return {
    startRow: bounds.minRow,
    endRow: bounds.maxRow,
    startCol: indexToColumnLetter(colIdx(bounds.minCol)),
    endCol: indexToColumnLetter(colIdx(bounds.maxCol)),
  };
}
