/**
 * @file Renders a DOCX table as ASCII using the shared table renderer
 */

import { renderAsciiTable } from "@oxen-renderer/drawing-ml/ascii";
import type { AsciiTable } from "./types";

/** Render a DOCX table block as ASCII. */
export function renderDocxTableAscii(table: AsciiTable, width: number): string {
  if (table.rows.length === 0) {
    return "";
  }

  // Use first row as headers
  const firstRow = table.rows[0]!;
  const headers = firstRow.cells.map((c) => c.text);
  const dataRows = table.rows.slice(1).map((row) => row.cells.map((c) => c.text));

  return renderAsciiTable({
    headers,
    rows: dataRows,
    maxWidth: width,
  });
}
