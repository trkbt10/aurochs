/**
 * @file Chart-Workbook Reader (Read Operations)
 *
 * Provides functions for reading chart data from embedded Excel workbooks.
 *
 * PPTX charts have two data sources:
 * 1. chart.xml cache (c:numCache, c:strCache) - for display
 * 2. externalData (embeddings/*.xlsx) - for editing in PowerPoint
 *
 * This module handles reading from the embedded workbook.
 *
 * @see ECMA-376 Part 1, Section 21.2 (DrawingML - Charts)
 */

import type { XlsxWorkbook, XlsxWorksheet } from "@oxen-office/xlsx/domain/workbook";
import type { Cell } from "@oxen-office/xlsx/domain/cell/types";
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
