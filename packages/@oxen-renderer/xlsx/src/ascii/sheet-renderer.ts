/**
 * @file Renders XLSX sheet data as ASCII grid
 */

import { renderAsciiTable } from "@oxen-renderer/drawing-ml/ascii";
import type { SheetAsciiParams, AsciiCell } from "./types";

/** Convert a 0-based column index to a column letter (A, B, ... Z, AA, AB, ...). */
function indexToColumnLetter(index: number): string {
  let result = "";
  let n = index;
  while (n >= 0) {
    result = String.fromCharCode((n % 26) + 65) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
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
    for (let c = 0; c < columnCount; c++) {
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
  for (let c = 0; c < columnCount; c++) {
    let align: "left" | "right" = "left";
    for (const row of rows) {
      if (c < row.cells.length && row.cells[c]!.type !== "empty") {
        align = cellAlignment(row.cells[c]!);
        break;
      }
    }
    alignments.push(align);
  }

  for (const row of rows) {
    const rowData: string[] = [];
    if (showRowNumbers) {
      rowData.push(String(row.rowNumber));
    }
    for (let c = 0; c < columnCount; c++) {
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
