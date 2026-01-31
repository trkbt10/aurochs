/**
 * @file Chart-Workbook Synchronization (Write Operations)
 *
 * Provides functions for writing PPTX chart data to embedded Excel workbooks.
 * This ensures that when chart data is updated, the embedded workbook is also updated.
 *
 * PPTX charts have two data sources:
 * 1. chart.xml cache (c:numCache, c:strCache) - for display
 * 2. externalData (embeddings/*.xlsx) - for editing in PowerPoint
 *
 * When updating chart data, both must be synchronized.
 *
 * @see ECMA-376 Part 1, Section 21.2 (DrawingML - Charts)
 */

import type { XlsxWorkbook, XlsxWorksheet, XlsxRow } from "@oxen-office/xlsx/domain/workbook";
import type { Cell, CellValue } from "@oxen-office/xlsx/domain/cell/types";
import { colIdx, rowIdx } from "@oxen-office/xlsx/domain/types";
import type { ChartDataSpec } from "../types";

// =============================================================================
// Workbook Update Functions
// =============================================================================

/**
 * Synchronize chart data to an XLSX workbook.
 *
 * Updates the workbook's first sheet with chart data in the standard layout:
 * - A1: preserved (title/header)
 * - A2:A[n]: categories
 * - B1, C1, ...: series names
 * - B2:B[n], C2:C[n], ...: series values
 *
 * @param workbook - The XLSX workbook to update
 * @param chartData - The chart data to write
 * @returns A new workbook with updated data
 *
 * @example
 * ```typescript
 * const updatedWorkbook = syncChartToWorkbook(workbook, {
 *   categories: ["Q1", "Q2", "Q3", "Q4"],
 *   series: [
 *     { name: "Sales", values: [100, 120, 140, 160] },
 *     { name: "Costs", values: [80, 85, 90, 95] },
 *   ],
 * });
 * ```
 */
export function syncChartToWorkbook(
  workbook: XlsxWorkbook,
  chartData: ChartDataSpec,
): XlsxWorkbook {
  if (workbook.sheets.length === 0) {
    throw new Error("syncChartToWorkbook: workbook has no sheets");
  }

  const firstSheet = workbook.sheets[0];
  const updatedSheet = updateWorksheetWithChartData(firstSheet, chartData);

  return {
    ...workbook,
    sheets: [updatedSheet, ...workbook.sheets.slice(1)],
  };
}

/**
 * Update a worksheet with chart data.
 *
 * @param worksheet - The worksheet to update
 * @param chartData - The chart data
 * @returns Updated worksheet
 */
function updateWorksheetWithChartData(
  worksheet: XlsxWorksheet,
  chartData: ChartDataSpec,
): XlsxWorksheet {
  const { categories, series } = chartData;

  // Build new rows
  const newRows: XlsxRow[] = [];

  // Row 1: Header row with series names
  // Preserve A1 from existing data if present
  const existingA1 = getCellFromWorksheet(worksheet, 1, 1);
  const headerCells: Cell[] = [];

  // A1: preserve or leave empty
  if (existingA1) {
    headerCells.push(existingA1);
  } else {
    headerCells.push(createCell(1, 1, { type: "empty" }));
  }

  // B1, C1, ... : series names
  for (let i = 0; i < series.length; i++) {
    headerCells.push(
      createCell(i + 2, 1, { type: "string", value: series[i].name }),
    );
  }

  newRows.push({
    rowNumber: rowIdx(1),
    cells: headerCells,
  });

  // Rows 2+: Category + values
  for (let rowIdx_ = 0; rowIdx_ < categories.length; rowIdx_++) {
    const rowNumber = rowIdx_ + 2;
    const rowCells: Cell[] = [];

    // Column A: category
    rowCells.push(
      createCell(1, rowNumber, { type: "string", value: categories[rowIdx_] }),
    );

    // Columns B, C, ...: series values
    for (let seriesIdx = 0; seriesIdx < series.length; seriesIdx++) {
      const value = series[seriesIdx].values[rowIdx_];
      rowCells.push(
        createCell(seriesIdx + 2, rowNumber, {
          type: "number",
          value: value ?? 0,
        }),
      );
    }

    newRows.push({
      rowNumber: rowIdx(rowNumber),
      cells: rowCells,
    });
  }

  return {
    ...worksheet,
    rows: newRows,
    dimension: {
      start: {
        col: colIdx(1),
        row: rowIdx(1),
        colAbsolute: false,
        rowAbsolute: false,
      },
      end: {
        col: colIdx(series.length + 1),
        row: rowIdx(categories.length + 1),
        colAbsolute: false,
        rowAbsolute: false,
      },
    },
  };
}

/**
 * Create a cell with address and value.
 */
function createCell(col: number, row: number, value: CellValue): Cell {
  return {
    address: {
      col: colIdx(col),
      row: rowIdx(row),
      colAbsolute: false,
      rowAbsolute: false,
    },
    value,
  };
}

/**
 * Get a cell from a worksheet by column and row index.
 */
function getCellFromWorksheet(
  worksheet: XlsxWorksheet,
  col: number,
  row: number,
): Cell | undefined {
  const targetRow = worksheet.rows.find((r) => (r.rowNumber as number) === row);
  if (!targetRow) {
    return undefined;
  }

  return targetRow.cells.find((c) => (c.address.col as number) === col);
}
