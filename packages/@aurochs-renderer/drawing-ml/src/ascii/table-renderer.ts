/**
 * @file Generic ASCII table renderer
 */

import { TABLE_CHARS } from "./ascii-canvas";
import { truncateText } from "./ascii-canvas";

export type AsciiTableParams = {
  readonly headers?: readonly string[];
  readonly rows: readonly (readonly string[])[];
  readonly columnWidths?: readonly number[];
  readonly maxWidth: number;
  readonly alignments?: readonly ("left" | "right" | "center")[];
};

function computeColumnWidths(params: AsciiTableParams): readonly number[] {
  if (params.columnWidths) {
    return params.columnWidths;
  }

  const colCount = Math.max(
    params.headers?.length ?? 0,
    ...params.rows.map((r) => r.length),
  );
  if (colCount === 0) {
    return [];
  }

  // Measure max content width per column
  const widths: number[] = new Array(colCount).fill(0);
  if (params.headers) {
    for (let c = 0; c < params.headers.length; c++) {
      widths[c] = Math.max(widths[c]!, params.headers[c]!.length);
    }
  }
  for (const row of params.rows) {
    for (let c = 0; c < row.length; c++) {
      if (c < widths.length) {
        widths[c] = Math.max(widths[c]!, row[c]!.length);
      }
    }
  }

  // Account for borders: │ col │ col │ → (colCount + 1) border chars + colCount * 2 padding
  const borderOverhead = colCount + 1 + colCount * 2;
  const availableContent = params.maxWidth - borderOverhead;

  if (availableContent <= 0) {
    return widths.map(() => 1);
  }

  const totalContent = widths.reduce((a, b) => a + b, 0);
  if (totalContent <= availableContent) {
    return widths;
  }

  // Scale down proportionally
  const scale = availableContent / totalContent;
  return widths.map((w) => Math.max(1, Math.floor(w * scale)));
}

function padCell(text: string, width: number, alignment: "left" | "right" | "center"): string {
  const truncated = truncateText(text, width);
  const padding = width - truncated.length;
  if (padding <= 0) {
    return truncated;
  }

  switch (alignment) {
    case "right":
      return " ".repeat(padding) + truncated;
    case "center": {
      const left = Math.floor(padding / 2);
      const right = padding - left;
      return " ".repeat(left) + truncated + " ".repeat(right);
    }
    default:
      return truncated + " ".repeat(padding);
  }
}

function drawHorizontalLine({
  widths,
  left,
  middle,
  right,
}: {
  readonly widths: readonly number[];
  readonly left: string;
  readonly middle: string;
  readonly right: string;
}): string {
  return left + widths.map((w) => TABLE_CHARS.horizontal.repeat(w + 2)).join(middle) + right;
}

function drawDataRow(
  cells: readonly string[],
  widths: readonly number[],
  alignments: readonly ("left" | "right" | "center")[],
): string {
  const parts: string[] = [];
  for (let c = 0; c < widths.length; c++) {
    const text = c < cells.length ? cells[c]! : "";
    const align = c < alignments.length ? alignments[c]! : "left";
    parts.push(" " + padCell(text, widths[c]!, align) + " ");
  }
  return TABLE_CHARS.vertical + parts.join(TABLE_CHARS.vertical) + TABLE_CHARS.vertical;
}

/** Render a table as ASCII box-drawing characters. */
export function renderAsciiTable(params: AsciiTableParams): string {
  const widths = computeColumnWidths(params);
  if (widths.length === 0) {
    return "";
  }

  const colCount = widths.length;
  const alignments: ("left" | "right" | "center")[] = [];
  for (let c = 0; c < colCount; c++) {
    alignments.push(params.alignments && c < params.alignments.length ? params.alignments[c]! : "left");
  }

  const lines: string[] = [];

  // Top border
  lines.push(
    drawHorizontalLine({ widths, left: TABLE_CHARS.topLeft, middle: TABLE_CHARS.topTee, right: TABLE_CHARS.topRight }),
  );

  // Header row
  if (params.headers) {
    lines.push(drawDataRow(params.headers, widths, alignments));
    lines.push(
      drawHorizontalLine({ widths, left: TABLE_CHARS.leftTee, middle: TABLE_CHARS.cross, right: TABLE_CHARS.rightTee }),
    );
  }

  // Data rows
  for (const row of params.rows) {
    lines.push(drawDataRow(row, widths, alignments));
  }

  // Bottom border
  lines.push(
    drawHorizontalLine({
      widths,
      left: TABLE_CHARS.bottomLeft,
      middle: TABLE_CHARS.bottomTee,
      right: TABLE_CHARS.bottomRight,
    }),
  );

  return lines.join("\n");
}
