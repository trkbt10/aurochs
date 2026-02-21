/**
 * @file Text extraction utilities for XLSX workbooks
 *
 * Pure domain utilities for extracting plain text from workbook objects.
 * These operate only on domain types and have no I/O dependencies.
 */

import type { Workbook, WorkbookSheet, WorkbookRow, WorkbookCell } from "./workbook-parser";

/**
 * Extract text from a cell.
 *
 * Converts the cell value to a string representation.
 * - Strings are returned as-is
 * - Numbers are converted to string
 * - Booleans are converted to "TRUE" or "FALSE"
 */
export function extractTextFromCell(cell: WorkbookCell): string {
  const { value } = cell;

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }

  return "";
}

/**
 * Extract text from a row.
 *
 * Concatenates all cell values with tabs.
 */
export function extractTextFromRow(row: WorkbookRow): string {
  const cells = Array.from(row.cells.values());
  return cells.map(extractTextFromCell).join("\t");
}

/**
 * Extract text from a sheet.
 *
 * Concatenates all rows with newlines.
 * Rows are sorted by row number.
 */
export function extractTextFromSheet(sheet: WorkbookSheet): string {
  const rows = Array.from(sheet.rows.values()).sort((a, b) => a.rowNumber - b.rowNumber);
  return rows.map(extractTextFromRow).join("\n");
}

/**
 * Extract text from a workbook.
 *
 * Concatenates text from all sheets, separated by double newlines.
 * Sheets are prefixed with their names.
 */
export function extractTextFromWorkbook(workbook: Workbook): string {
  const sheets = Array.from(workbook.sheets.values());

  return sheets
    .map((sheet) => {
      const text = extractTextFromSheet(sheet);
      return `[${sheet.name}]\n${text}`;
    })
    .join("\n\n");
}
