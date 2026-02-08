/**
 * @file Markdown table renderer
 */

import type { ColumnAlignment } from "./types";

export type MarkdownTableParams = {
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
  readonly alignments?: readonly ColumnAlignment[];
};

/** Escape pipe characters in cell content for Markdown tables. */
function escapeCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

/** Build the separator row with alignment markers. */
function buildSeparator(
  columnCount: number,
  alignments: readonly ColumnAlignment[] | undefined,
): string {
  const cells: string[] = [];
  for (let i = 0; i < columnCount; i++) {
    const align = alignments?.[i] ?? "left";
    switch (align) {
      case "right":
        cells.push("---:");
        break;
      case "center":
        cells.push(":---:");
        break;
      case "left":
      default:
        cells.push("---");
        break;
    }
  }
  return `| ${cells.join(" | ")} |`;
}

/**
 * Render data as a Markdown pipe-delimited table.
 *
 * ```
 * | H1 | H2 |
 * | --- | --- |
 * | a  | b  |
 * ```
 */
export function renderMarkdownTable(params: MarkdownTableParams): string {
  const { headers, rows, alignments } = params;
  const columnCount = headers.length;

  if (columnCount === 0) {
    return "";
  }

  const lines: string[] = [];

  // Header row
  const headerCells = headers.map(escapeCell);
  lines.push(`| ${headerCells.join(" | ")} |`);

  // Separator row
  lines.push(buildSeparator(columnCount, alignments));

  // Data rows
  for (const row of rows) {
    const cells: string[] = [];
    for (let i = 0; i < columnCount; i++) {
      cells.push(escapeCell(i < row.length ? row[i]! : ""));
    }
    lines.push(`| ${cells.join(" | ")} |`);
  }

  return lines.join("\n");
}
