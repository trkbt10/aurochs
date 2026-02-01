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
