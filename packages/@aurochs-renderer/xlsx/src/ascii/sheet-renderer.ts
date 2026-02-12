/**
 * @file Renders XLSX sheet data as ASCII grid
 */

import { renderAsciiTable } from "./table-utils";
import type { SheetAsciiParams, AsciiCell, AsciiSheetRow } from "./types";

/** Convert a 0-based column index to a column letter (A, B, ... Z, AA, AB, ...). */
function indexToColumnLetter(index: number): string {
  const char = String.fromCharCode((index % 26) + 65);
  const remaining = Math.floor(index / 26) - 1;
  return remaining >= 0 ? indexToColumnLetter(remaining) + char : char;
}

/** Format a cell value for display. */
function formatCellValue(cell: AsciiCell): string {
  if (cell.value === null || cell.value === undefined) {
    return "";
  }
  if (cell.type === "number" && typeof cell.value === "number") {
    // Format numbers with commas for readability
    return cell.value.toLocaleString("en-US");
  }
  return String(cell.value);
}

/** Determine alignment for a cell based on its type. */
function cellAlignment(cell: AsciiCell): "left" | "right" {
  return cell.type === "number" ? "right" : "left";
}

/** Detect column alignment from the first non-empty cell in a column. */
function detectColumnAlignment(
  rows: readonly AsciiSheetRow[],
  columnIndex: number,
): "left" | "right" {
  const firstNonEmpty = rows.find(
    (row) => columnIndex < row.cells.length && row.cells[columnIndex]!.type !== "empty",
  );
  return firstNonEmpty ? cellAlignment(firstNonEmpty.cells[columnIndex]!) : "left";
}

/** Render sheet data as an ASCII table grid. */
export function renderSheetAscii(params: SheetAsciiParams): string {
  const { rows, columnCount, width, showRowNumbers = true, showColumnHeaders = true } = params;

  if (rows.length === 0 || columnCount === 0) {
    return `(empty sheet: ${params.name})`;
  }

  // Build headers
  const headers: string[] = [];
  if (showRowNumbers) {
    headers.push("");
  }
  if (showColumnHeaders) {
    for (const c of Array.from({ length: columnCount }, (_, i) => i)) {
      headers.push(indexToColumnLetter(c));
    }
  }

  // Build data rows
  const dataRows: string[][] = [];
  const alignments: ("left" | "right")[] = [];

  // Set alignment for row number column
  if (showRowNumbers) {
    alignments.push("right");
  }

  // Determine alignment per column based on first non-empty cell
  for (const c of Array.from({ length: columnCount }, (_, i) => i)) {
    alignments.push(detectColumnAlignment(rows, c));
  }

  for (const row of rows) {
    const rowData: string[] = [];
    if (showRowNumbers) {
      rowData.push(String(row.rowNumber));
    }
    for (const c of Array.from({ length: columnCount }, (_, i) => i)) {
      const cell = c < row.cells.length ? row.cells[c]! : { value: null, type: "empty" as const };
      rowData.push(formatCellValue(cell));
    }
    dataRows.push(rowData);
  }

  return renderAsciiTable({
    headers: showColumnHeaders ? headers : undefined,
    rows: dataRows,
    maxWidth: width,
    alignments,
  });
}
