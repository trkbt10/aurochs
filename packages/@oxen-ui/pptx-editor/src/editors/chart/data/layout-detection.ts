/**
 * @file Chart Data Layout Detection
 *
 * Detects chart data layout from worksheet structure.
 * Used to identify where categories, series names, and data values are located.
 *
 * @see ECMA-376 Part 4 (SpreadsheetML)
 */

import type { XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import type { CellAddress, CellRange } from "@oxen/xlsx/domain/cell/address";
import { colIdx, rowIdx } from "@oxen/xlsx/domain/types";

// =============================================================================
// Types
// =============================================================================

/**
 * Chart data layout information
 */
export type ChartDataLayout = {
  /** Header row (1-based) */
  readonly headerRow: number;
  /** Data start row (1-based) */
  readonly dataStartRow: number;
  /** Category column (1-based) */
  readonly categoryCol: number;
  /** Series start column (1-based) */
  readonly seriesStartCol: number;
  /** Number of categories */
  readonly categoryCount: number;
  /** Number of series */
  readonly seriesCount: number;
};

// =============================================================================
// Helper Functions
// =============================================================================

export function createAddress(col: number, row: number): CellAddress {
  return {
    col: colIdx(col),
    row: rowIdx(row),
    colAbsolute: false,
    rowAbsolute: false,
  };
}

export function createCellRange(
  startCol: number,
  startRow: number,
  endCol: number,
  endRow: number,
): CellRange {
  return {
    start: createAddress(startCol, startRow),
    end: createAddress(endCol, endRow),
  };
}

// =============================================================================
// Layout Detection
// =============================================================================

/**
 * Default (empty) chart data layout
 */
export const EMPTY_CHART_DATA_LAYOUT: ChartDataLayout = {
  headerRow: 1,
  dataStartRow: 2,
  categoryCol: 1,
  seriesStartCol: 2,
  categoryCount: 0,
  seriesCount: 0,
} as const;

/**
 * Detect chart data layout from worksheet
 * Assumes standard chart data format:
 * - Row 1: Header (series names)
 * - Column A: Categories
 * - Columns B+: Series data
 */
export function detectChartDataLayout(worksheet: XlsxWorksheet): ChartDataLayout {
  const headerRow = 1;
  const dataStartRow = 2;
  const categoryCol = 1; // Column A
  const seriesStartCol = 2; // Column B

  // Count categories (non-empty cells in column A starting from row 2)
  let categoryCount = 0;
  for (const row of worksheet.rows) {
    const rowNum = row.rowNumber as number;
    if (rowNum >= dataStartRow) {
      const hasCategory = row.cells.some(
        (cell) => (cell.address.col as number) === categoryCol && cell.value.type !== "empty",
      );
      if (hasCategory) {
        categoryCount = Math.max(categoryCount, rowNum - dataStartRow + 1);
      }
    }
  }

  // Count series (non-empty cells in header row starting from column B)
  let seriesCount = 0;
  const headerRowData = worksheet.rows.find((r) => (r.rowNumber as number) === headerRow);
  if (headerRowData) {
    for (const cell of headerRowData.cells) {
      const colNum = cell.address.col as number;
      if (colNum >= seriesStartCol && cell.value.type !== "empty") {
        seriesCount = Math.max(seriesCount, colNum - seriesStartCol + 1);
      }
    }
  }

  return {
    headerRow,
    dataStartRow,
    categoryCol,
    seriesStartCol,
    categoryCount,
    seriesCount,
  };
}

/**
 * Count categories in worksheet
 */
export function countCategories(worksheet: XlsxWorksheet): number {
  return detectChartDataLayout(worksheet).categoryCount;
}

/**
 * Count series in worksheet
 */
export function countSeries(worksheet: XlsxWorksheet): number {
  return detectChartDataLayout(worksheet).seriesCount;
}
