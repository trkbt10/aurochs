/**
 * @file Border rendering for XLSX SVG output
 *
 * Renders cell borders with various styles:
 * - thin, medium, thick
 * - dashed, dotted
 * - double
 * - etc.
 *
 * @see ECMA-376 Part 4, Section 18.18.3 (ST_BorderStyle)
 */

import type { XlsxBorderStyle } from "@aurochs-office/xlsx/domain/style/border";
import type { CellLayout, ResolvedBorder, ResolvedBorderEdge } from "./types";

// =============================================================================
// Border Style to SVG Attributes
// =============================================================================

type BorderSvgProps = {
  readonly strokeWidth: number;
  readonly strokeDasharray?: string;
};

function getBorderStyleProps(style: XlsxBorderStyle): BorderSvgProps {
  switch (style) {
    case "thin":
      return { strokeWidth: 1 };
    case "medium":
      return { strokeWidth: 2 };
    case "thick":
      return { strokeWidth: 3 };
    case "dashed":
      return { strokeWidth: 1, strokeDasharray: "4 2" };
    case "dotted":
      return { strokeWidth: 1, strokeDasharray: "1 1" };
    case "double":
      return { strokeWidth: 1 };
    case "hair":
      return { strokeWidth: 0.5 };
    case "mediumDashed":
      return { strokeWidth: 2, strokeDasharray: "4 2" };
    case "dashDot":
      return { strokeWidth: 1, strokeDasharray: "4 2 1 2" };
    case "mediumDashDot":
      return { strokeWidth: 2, strokeDasharray: "4 2 1 2" };
    case "dashDotDot":
      return { strokeWidth: 1, strokeDasharray: "4 2 1 2 1 2" };
    case "mediumDashDotDot":
      return { strokeWidth: 2, strokeDasharray: "4 2 1 2 1 2" };
    case "slantDashDot":
      return { strokeWidth: 2, strokeDasharray: "4 2 1 2" };
    case "none":
    default:
      return { strokeWidth: 0 };
  }
}

// =============================================================================
// Edge Rendering
// =============================================================================

type EdgeCoordinates = {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
};

function renderEdge(coords: EdgeCoordinates, edge: ResolvedBorderEdge): string {
  const props = getBorderStyleProps(edge.style);
  if (props.strokeWidth === 0) {
    return "";
  }

  const { x1, y1, x2, y2 } = coords;
  const attrs: string[] = [
    `x1="${x1}"`,
    `y1="${y1}"`,
    `x2="${x2}"`,
    `y2="${y2}"`,
    `stroke="${edge.color}"`,
    `stroke-width="${props.strokeWidth}"`,
  ];

  if (props.strokeDasharray) {
    attrs.push(`stroke-dasharray="${props.strokeDasharray}"`);
  }

  if (edge.style === "double") {
    return renderDoubleEdge(coords, attrs);
  }

  return `<line ${attrs.join(" ")}/>`;
}

function renderDoubleEdge(coords: EdgeCoordinates, attrs: readonly string[]): string {
  const offset = 2;
  const isHorizontal = coords.y1 === coords.y2;
  const attrStr = attrs.join(" ");

  if (isHorizontal) {
    return [
      `<line ${attrStr} transform="translate(0, -${offset / 2})"/>`,
      `<line ${attrStr} transform="translate(0, ${offset / 2})"/>`,
    ].join("");
  }

  return [
    `<line ${attrStr} transform="translate(-${offset / 2}, 0)"/>`,
    `<line ${attrStr} transform="translate(${offset / 2}, 0)"/>`,
  ].join("");
}

// =============================================================================
// Cell Border Rendering
// =============================================================================

/**
 * Render all borders for a cell.
 */
export function renderCellBorders(layout: CellLayout, border: ResolvedBorder): string {
  if (layout.isHiddenByMerge || layout.width === 0 || layout.height === 0) {
    return "";
  }

  const { x, y, width, height } = layout;
  const parts: string[] = [];

  if (border.top) {
    parts.push(renderEdge({ x1: x, y1: y, x2: x + width, y2: y }, border.top));
  }

  if (border.right) {
    parts.push(renderEdge({ x1: x + width, y1: y, x2: x + width, y2: y + height }, border.right));
  }

  if (border.bottom) {
    parts.push(renderEdge({ x1: x, y1: y + height, x2: x + width, y2: y + height }, border.bottom));
  }

  if (border.left) {
    parts.push(renderEdge({ x1: x, y1: y, x2: x, y2: y + height }, border.left));
  }

  if (border.diagonal) {
    if (border.diagonalDown) {
      parts.push(renderEdge({ x1: x, y1: y, x2: x + width, y2: y + height }, border.diagonal));
    }
    if (border.diagonalUp) {
      parts.push(renderEdge({ x1: x, y1: y + height, x2: x + width, y2: y }, border.diagonal));
    }
  }

  return parts.join("");
}

// =============================================================================
// Grid Lines
// =============================================================================

type GridLinesParams = {
  readonly columnPositions: readonly number[];
  readonly rowPositions: readonly number[];
  readonly columnWidths: readonly number[];
  readonly rowHeights: readonly number[];
  readonly totalWidth: number;
  readonly totalHeight: number;
  readonly gridColor: string;
};

/**
 * Render grid lines for the sheet.
 */
export function renderGridLines(params: GridLinesParams): string {
  const { columnPositions, rowPositions, columnWidths, rowHeights, totalWidth, totalHeight, gridColor } = params;
  const lines: string[] = [];

  for (const xPos of computeVerticalLinePositions(columnPositions, columnWidths)) {
    lines.push(`<line x1="${xPos}" y1="0" x2="${xPos}" y2="${totalHeight}" stroke="${gridColor}" stroke-width="0.5"/>`);
  }

  for (const yPos of computeHorizontalLinePositions(rowPositions, rowHeights)) {
    lines.push(`<line x1="0" y1="${yPos}" x2="${totalWidth}" y2="${yPos}" stroke="${gridColor}" stroke-width="0.5"/>`);
  }

  return lines.join("");
}

function computeVerticalLinePositions(positions: readonly number[], widths: readonly number[]): number[] {
  const result: number[] = [];
  for (let i = 0; i <= positions.length; i++) {
    const x = i < positions.length ? positions[i]! : computeLastPosition(positions, widths);
    result.push(x);
  }
  return result;
}

function computeHorizontalLinePositions(positions: readonly number[], heights: readonly number[]): number[] {
  const result: number[] = [];
  for (let i = 0; i <= positions.length; i++) {
    const y = i < positions.length ? positions[i]! : computeLastPosition(positions, heights);
    result.push(y);
  }
  return result;
}

function computeLastPosition(positions: readonly number[], sizes: readonly number[]): number {
  const lastPos = positions[positions.length - 1] ?? 0;
  const lastSize = sizes[sizes.length - 1] ?? 0;
  return lastPos + lastSize;
}

// =============================================================================
// Row/Column Headers
// =============================================================================

type ColumnHeadersParams = {
  readonly columnPositions: readonly number[];
  readonly columnWidths: readonly number[];
  readonly headerSize: number;
  readonly totalWidth: number;
};

/**
 * Render column headers (A, B, C, ...).
 */
export function renderColumnHeaders(params: ColumnHeadersParams): string {
  const { columnPositions, columnWidths, headerSize, totalWidth } = params;
  const parts: string[] = [];

  parts.push(`<rect x="0" y="0" width="${totalWidth}" height="${headerSize}" fill="#F0F0F0" stroke="#C0C0C0"/>`);

  for (let i = 0; i < columnPositions.length; i++) {
    const x = columnPositions[i]!;
    const width = columnWidths[i] ?? 0;
    if (width === 0) {
      continue;
    }

    const label = columnIndexToLetter(i + 1);
    parts.push(
      `<text x="${x + width / 2}" y="${headerSize / 2}" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="#666666">${label}</text>`,
    );
  }

  return parts.join("");
}

type RowHeadersParams = {
  readonly rowPositions: readonly number[];
  readonly rowHeights: readonly number[];
  readonly headerSize: number;
  readonly totalHeight: number;
};

/**
 * Render row headers (1, 2, 3, ...).
 */
export function renderRowHeaders(params: RowHeadersParams): string {
  const { rowPositions, rowHeights, headerSize, totalHeight } = params;
  const parts: string[] = [];

  parts.push(`<rect x="0" y="0" width="${headerSize}" height="${totalHeight}" fill="#F0F0F0" stroke="#C0C0C0"/>`);

  for (let i = 0; i < rowPositions.length; i++) {
    const y = rowPositions[i]!;
    const height = rowHeights[i] ?? 0;
    if (height === 0) {
      continue;
    }

    const label = String(i + 1);
    parts.push(
      `<text x="${headerSize / 2}" y="${y + height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="#666666">${label}</text>`,
    );
  }

  return parts.join("");
}

/**
 * Convert column index (1-based) to letter.
 */
function columnIndexToLetter(col: number): string {
  return buildColumnLetterRecursive(col, []).join("");
}

function buildColumnLetterRecursive(n: number, result: readonly string[]): readonly string[] {
  if (n <= 0) {
    return result;
  }
  const remainder = (n - 1) % 26;
  const letter = String.fromCharCode(65 + remainder);
  return buildColumnLetterRecursive(Math.floor((n - 1) / 26), [letter, ...result]);
}
