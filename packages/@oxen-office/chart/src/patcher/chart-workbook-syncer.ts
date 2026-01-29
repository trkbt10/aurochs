/**
 * @file Chart-Workbook Synchronization
 *
 * Provides functions for synchronizing PPTX chart data with embedded Excel workbooks.
 * This ensures that when chart data is updated, both the chart cache and the
 * embedded workbook remain consistent.
 *
 * PPTX charts have two data sources:
 * 1. chart.xml cache (c:numCache, c:strCache) - for display
 * 2. externalData (embeddings/*.xlsx) - for editing in PowerPoint
 *
 * When updating chart data, both must be synchronized.
 *
 * @see ECMA-376 Part 1, Section 21.2 (DrawingML - Charts)
 * @see docs/reports/phase-10-chart-externalData-workbook-sync.md
 */

import type { XlsxWorkbook, XlsxWorksheet, XlsxRow } from "@oxen-office/xlsx/domain/workbook";
import type { Cell, CellValue } from "@oxen-office/xlsx/domain/cell/types";
import { colIdx, rowIdx } from "@oxen-office/xlsx/domain/types";
import { parseXml, getByPath, getChildren, getAttr } from "@oxen/xml";

// =============================================================================
// Types
// =============================================================================

/**
 * Chart data structure for synchronization.
 *
 * This matches the standard chart data layout:
 * - Categories in column A (A2:A[n])
 * - Series names in row 1 (B1, C1, ...)
 * - Series values in data cells (B2:B[n], C2:C[n], ...)
 */
export type ChartDataUpdate = {
  /** Category labels (X-axis values) */
  readonly categories: readonly string[];
  /** Data series with names and values */
  readonly series: readonly {
    /** Series name (legend label) */
    readonly name: string;
    /** Series values (Y-axis values) */
    readonly values: readonly number[];
  }[];
};

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
  chartData: ChartDataUpdate,
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
  chartData: ChartDataUpdate,
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

// =============================================================================
// Workbook Read Functions
// =============================================================================

/**
 * Extract chart data from an XLSX workbook.
 *
 * Reads chart data from the standard layout:
 * - A2:A[n]: categories
 * - B1, C1, ...: series names
 * - B2:B[n], C2:C[n], ...: series values
 *
 * @param workbook - The XLSX workbook to read
 * @param sheetIndex - Sheet index (0-based, defaults to 0)
 * @returns Extracted chart data
 *
 * @example
 * ```typescript
 * const chartData = extractChartDataFromWorkbook(workbook);
 * console.log(chartData.categories); // ["Q1", "Q2", "Q3", "Q4"]
 * console.log(chartData.series[0].name); // "Sales"
 * ```
 */
export function extractChartDataFromWorkbook(
  workbook: XlsxWorkbook,
  sheetIndex: number = 0,
): ChartDataUpdate {
  if (sheetIndex < 0 || sheetIndex >= workbook.sheets.length) {
    throw new Error(
      `extractChartDataFromWorkbook: sheet index ${sheetIndex} out of range (0-${workbook.sheets.length - 1})`,
    );
  }

  const sheet = workbook.sheets[sheetIndex];
  return extractChartDataFromWorksheet(sheet);
}

/**
 * Extract chart data from a single worksheet.
 */
function extractChartDataFromWorksheet(worksheet: XlsxWorksheet): ChartDataUpdate {
  // Build a cell lookup map for efficient access
  const cellMap = buildCellMap(worksheet);

  // Determine data dimensions
  const { maxRow, maxCol } = findDataDimensions(worksheet);

  // Extract categories from column A (A2:A[maxRow])
  const categories: string[] = [];
  for (let row = 2; row <= maxRow; row++) {
    const cell = cellMap.get(cellKey(1, row));
    categories.push(getCellStringValue(cell));
  }

  // Extract series names from row 1 (B1, C1, ...)
  // and series values from B2:B[n], C2:C[n], ...
  const series: { name: string; values: number[] }[] = [];

  for (let col = 2; col <= maxCol; col++) {
    const nameCell = cellMap.get(cellKey(col, 1));
    const name = getCellStringValue(nameCell);

    const values: number[] = [];
    for (let row = 2; row <= maxRow; row++) {
      const valueCell = cellMap.get(cellKey(col, row));
      values.push(getCellNumericValue(valueCell));
    }

    series.push({ name, values });
  }

  return { categories, series };
}

/**
 * Build a map of cells by "col,row" key for efficient lookup.
 */
function buildCellMap(worksheet: XlsxWorksheet): Map<string, Cell> {
  const map = new Map<string, Cell>();

  for (const row of worksheet.rows) {
    for (const cell of row.cells) {
      const key = cellKey(cell.address.col as number, cell.address.row as number);
      map.set(key, cell);
    }
  }

  return map;
}

/**
 * Create a cell key from column and row.
 */
function cellKey(col: number, row: number): string {
  return `${col},${row}`;
}

/**
 * Find the maximum row and column with data.
 */
function findDataDimensions(worksheet: XlsxWorksheet): { maxRow: number; maxCol: number } {
  return worksheet.rows.reduce(
    (acc, row) => {
      const rowNum = row.rowNumber as number;
      const maxCellCol = row.cells.reduce(
        (colAcc, cell) => Math.max(colAcc, cell.address.col as number),
        acc.maxCol,
      );
      return {
        maxRow: Math.max(acc.maxRow, rowNum),
        maxCol: maxCellCol,
      };
    },
    { maxRow: 1, maxCol: 1 },
  );
}

/**
 * Get string value from a cell.
 */
function getCellStringValue(cell: Cell | undefined): string {
  if (!cell) {
    return "";
  }

  switch (cell.value.type) {
    case "string":
      return cell.value.value;
    case "number":
      return String(cell.value.value);
    case "boolean":
      return cell.value.value ? "TRUE" : "FALSE";
    case "empty":
      return "";
    case "error":
      return cell.value.value;
    case "date":
      return cell.value.value.toISOString();
    default:
      return "";
  }
}

/**
 * Get numeric value from a cell.
 */
function getCellNumericValue(cell: Cell | undefined): number {
  if (!cell) {
    return 0;
  }

  switch (cell.value.type) {
    case "number":
      return cell.value.value;
    case "string": {
      const parsed = parseFloat(cell.value.value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    case "boolean":
      return cell.value.value ? 1 : 0;
    case "empty":
      return 0;
    default:
      return 0;
  }
}

// =============================================================================
// Relationship Resolution
// =============================================================================

/**
 * Namespace URIs for OPC relationships.
 */
const RELATIONSHIP_TYPE_PACKAGE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/package";

/**
 * Resolve the embedded XLSX path from chart relationships XML.
 *
 * Parses the chart's .rels file to find the external data (embedded workbook)
 * relationship target.
 *
 * @param chartRelsXml - The chart relationships XML content
 * @returns The resolved path to the embedded XLSX, or undefined if not found
 *
 * @example
 * ```typescript
 * const relsXml = file.readText("ppt/charts/_rels/chart1.xml.rels");
 * const xlsxPath = resolveEmbeddedXlsxPath(relsXml);
 * // => "../embeddings/Microsoft_Excel_Worksheet1.xlsx"
 * ```
 */
export function resolveEmbeddedXlsxPath(chartRelsXml: string): string | undefined {
  if (!chartRelsXml) {
    return undefined;
  }

  try {
    const doc = parseXml(chartRelsXml);
    const relationships = getByPath(doc, ["Relationships"]);

    if (!relationships) {
      return undefined;
    }

    const relationshipElements = getChildren(relationships, "Relationship");

    for (const rel of relationshipElements) {
      const type = getAttr(rel, "Type");
      const target = getAttr(rel, "Target");

      // Look for package relationship (embedded xlsx)
      if (type === RELATIONSHIP_TYPE_PACKAGE && target) {
        // Check if it's an xlsx file
        if (target.endsWith(".xlsx")) {
          return target;
        }
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
}

// XlsxWorkbook, XlsxWorksheet: import directly from "@/xlsx/domain/workbook"
