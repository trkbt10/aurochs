/**
 * @file ASCII table rendering utilities for XLSX
 *
 * Self-contained ASCII table drawing implementation.
 * This replaces the dependency on @aurochs-renderer/drawing-ml for table rendering.
 */

// =============================================================================
// Box Drawing Characters
// =============================================================================

export const TABLE_CHARS = {
  topLeft: "\u250C",
  topRight: "\u2510",
  bottomLeft: "\u2514",
  bottomRight: "\u2518",
  horizontal: "\u2500",
  vertical: "\u2502",
  topTee: "\u252C",
  bottomTee: "\u2534",
  leftTee: "\u251C",
  rightTee: "\u2524",
  cross: "\u253C",
} as const;

// =============================================================================
// Text Utilities
// =============================================================================

/**
 * Truncate text to maximum length with ellipsis.
 */
export function truncateText(text: string, maxLen: number): string {
  if (maxLen <= 0) {
    return "";
  }
  if (text.length <= maxLen) {
    return text;
  }
  if (maxLen <= 3) {
    return text.substring(0, maxLen);
  }
  return text.substring(0, maxLen - 3) + "...";
}

/**
 * Pad cell text to specified width with given alignment.
 */
export function padCell(text: string, width: number, alignment: "left" | "right" | "center"): string {
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

// =============================================================================
// Table Rendering
// =============================================================================

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

  const colCount = Math.max(params.headers?.length ?? 0, ...params.rows.map((r) => r.length));

  if (colCount === 0) {
    return [];
  }

  const widths: number[] = new Array<number>(colCount).fill(0);

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

  const borderOverhead = colCount + 1 + colCount * 2;
  const availableContent = params.maxWidth - borderOverhead;

  if (availableContent <= 0) {
    return widths.map(() => 1);
  }

  const totalContent = widths.reduce((a, b) => a + b, 0);
  if (totalContent <= availableContent) {
    return widths;
  }

  const scale = availableContent / totalContent;
  return widths.map((w) => Math.max(1, Math.floor(w * scale)));
}

type HorizontalLineParams = {
  readonly widths: readonly number[];
  readonly left: string;
  readonly middle: string;
  readonly right: string;
};

function drawHorizontalLine(params: HorizontalLineParams): string {
  const { widths, left, middle, right } = params;
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

/**
 * Render a table in ASCII box-drawing format.
 */
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

  lines.push(drawHorizontalLine({ widths, left: TABLE_CHARS.topLeft, middle: TABLE_CHARS.topTee, right: TABLE_CHARS.topRight }));

  if (params.headers) {
    lines.push(drawDataRow(params.headers, widths, alignments));
    lines.push(drawHorizontalLine({ widths, left: TABLE_CHARS.leftTee, middle: TABLE_CHARS.cross, right: TABLE_CHARS.rightTee }));
  }

  for (const row of params.rows) {
    lines.push(drawDataRow(row, widths, alignments));
  }

  lines.push(drawHorizontalLine({ widths, left: TABLE_CHARS.bottomLeft, middle: TABLE_CHARS.bottomTee, right: TABLE_CHARS.bottomRight }));

  return lines.join("\n");
}
