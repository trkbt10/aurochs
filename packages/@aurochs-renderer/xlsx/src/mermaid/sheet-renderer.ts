/**
 * @file Render XLSX sheet data as a Markdown table
 */

import { renderMarkdownTable, type ColumnAlignment } from "@aurochs/mermaid";
import type { SheetMermaidParams, MermaidCell } from "./types";

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
function formatCellValue(cell: MermaidCell): string {
  if (cell.value === null || cell.value === undefined) {
    return "";
  }
  if (cell.type === "number" && typeof cell.value === "number") {
    return cell.value.toLocaleString("en-US");
  }
  return String(cell.value);
}

/** Render sheet data as a Markdown table. */
export function renderSheetMermaid(params: SheetMermaidParams): string {
  const { rows, columnCount, showRowNumbers = true, showColumnHeaders = true } = params;

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

  // Build alignments
  const alignments: ColumnAlignment[] = [];
  if (showRowNumbers) {
    alignments.push("right");
  }

  // Determine alignment per column based on first non-empty cell
  for (let c = 0; c < columnCount; c++) {
    let align: ColumnAlignment = "left";
    for (const row of rows) {
      if (c < row.cells.length && row.cells[c]!.type !== "empty") {
        align = row.cells[c]!.type === "number" ? "right" : "left";
        break;
      }
    }
    alignments.push(align);
  }

  // Build data rows
  const dataRows: string[][] = [];
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

  return renderMarkdownTable({
    headers: showColumnHeaders ? headers : headers.slice(0, showRowNumbers ? 1 : 0),
    rows: dataRows,
    alignments,
  });
}
