/**
 * @file Sheet utility functions for XLSX worksheets
 *
 * Pure domain utilities for analyzing worksheet properties.
 * These operate only on domain types and have no I/O dependencies.
 */

import type { XlsxWorksheet } from "./workbook";
import { indexToColumnLetter } from "./cell/address";
import { colIdx } from "./types";

/**
 * Used range of a worksheet.
 */
export type SheetRange = {
  readonly startRow: number;
  readonly endRow: number;
  readonly startCol: string;
  readonly endCol: string;
};

/**
 * Get the used range of a worksheet.
 *
 * Uses the dimension property if available, otherwise calculates
 * from the row data.
 *
 * @param sheet - The worksheet to analyze
 * @returns The used range, or undefined if the sheet has no data
 */
export function getSheetRange(sheet: XlsxWorksheet): SheetRange | undefined {
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
