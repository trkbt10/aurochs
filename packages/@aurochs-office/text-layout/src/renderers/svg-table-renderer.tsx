/**
 * @file SVG Table Renderer
 *
 * Renders table layout results as SVG elements.
 *
 * @see ECMA-376 Part 1, Section 17.4 (Tables)
 */

import type { ReactNode } from "react";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import type { LayoutTableResult, LayoutTableRowResult, LayoutTableCellResult, LayoutBorderStyle } from "../types";
import { TextOverlay } from "./svg-renderer";

// =============================================================================
// Border Rendering
// =============================================================================

/**
 * Get SVG stroke-dasharray for border style.
 */
function getBorderDashArray(style: LayoutBorderStyle["style"]): string | undefined {
  switch (style) {
    case "dotted":
      return "1,2";
    case "dashed":
      return "4,2";
    case "double":
      // Double borders are rendered as two lines
      return undefined;
    default:
      return undefined;
  }
}

/**
 * Render a cell border edge.
 */
function renderBorderEdge(params: {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly border: LayoutBorderStyle | undefined;
  readonly key: string;
}): ReactNode {
  const { x1, y1, x2, y2, border, key } = params;
  if (border === undefined || border.style === "none") {
    return null;
  }

  const { style, width, color } = border;
  const widthValue = width as number;

  if (style === "double") {
    // Render two lines for double border
    const gap = widthValue / 3;
    const isHorizontal = y1 === y2;

    if (isHorizontal) {
      return (
        <>
          <line
            key={`${key}-1`}
            x1={x1}
            y1={y1 - gap}
            x2={x2}
            y2={y2 - gap}
            stroke={color}
            strokeWidth={widthValue / 3}
          />
          <line
            key={`${key}-2`}
            x1={x1}
            y1={y1 + gap}
            x2={x2}
            y2={y2 + gap}
            stroke={color}
            strokeWidth={widthValue / 3}
          />
        </>
      );
    } else {
      return (
        <>
          <line
            key={`${key}-1`}
            x1={x1 - gap}
            y1={y1}
            x2={x2 - gap}
            y2={y2}
            stroke={color}
            strokeWidth={widthValue / 3}
          />
          <line
            key={`${key}-2`}
            x1={x1 + gap}
            y1={y1}
            x2={x2 + gap}
            y2={y2}
            stroke={color}
            strokeWidth={widthValue / 3}
          />
        </>
      );
    }
  }

  return (
    <line
      key={key}
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={color}
      strokeWidth={widthValue}
      strokeDasharray={getBorderDashArray(style)}
    />
  );
}

// =============================================================================
// Cell Rendering
// =============================================================================

/**
 * Render a single table cell.
 */
function renderCell(cell: LayoutTableCellResult, rowIndex: number, cellIndex: number): ReactNode {
  const { x, y, width, height, paragraphs, padding, borders, backgroundColor, verticalAlign } = cell;

  const xVal = x as number;
  const yVal = y as number;
  const widthVal = width as number;
  const heightVal = height as number;

  // Calculate content area
  const contentX = xVal + (padding.left as number);
  const contentY = yVal + (padding.top as number);
  const contentHeight = heightVal - (padding.top as number) - (padding.bottom as number);

  // Calculate vertical offset for alignment
  const totalParagraphHeight = paragraphs.reduce((sum, p) => {
    const lineHeights = p.lines.reduce((h, l) => h + (l.height as number), 0);
    return sum + lineHeights;
  }, 0);

  const verticalOffset = calculateVerticalOffset(verticalAlign, contentHeight, totalParagraphHeight);

  const key = `cell-${rowIndex}-${cellIndex}`;

  return (
    <g key={key}>
      {/* Cell background */}
      {backgroundColor !== undefined && (
        <rect x={xVal} y={yVal} width={widthVal} height={heightVal} fill={backgroundColor} />
      )}

      {/* Cell content */}
      <g transform={`translate(${contentX}, ${contentY + verticalOffset})`}>
        <TextOverlay
          layoutResult={{
            paragraphs,
            totalHeight: contentHeight as Pixels,
            yOffset: 0 as Pixels,
            writingMode: "horizontal-tb",
          }}
        />
      </g>

      {/* Cell borders */}
      {borders !== undefined && (
        <g key={`${key}-borders`}>
          {renderBorderEdge({
            x1: xVal,
            y1: yVal,
            x2: xVal + widthVal,
            y2: yVal,
            border: borders.top,
            key: `${key}-top`,
          })}
          {renderBorderEdge({
            x1: xVal + widthVal,
            y1: yVal,
            x2: xVal + widthVal,
            y2: yVal + heightVal,
            border: borders.right,
            key: `${key}-right`,
          })}
          {renderBorderEdge({
            x1: xVal,
            y1: yVal + heightVal,
            x2: xVal + widthVal,
            y2: yVal + heightVal,
            border: borders.bottom,
            key: `${key}-bottom`,
          })}
          {renderBorderEdge({
            x1: xVal,
            y1: yVal,
            x2: xVal,
            y2: yVal + heightVal,
            border: borders.left,
            key: `${key}-left`,
          })}
        </g>
      )}
    </g>
  );
}

/**
 * Calculate vertical offset for cell content alignment.
 */
function calculateVerticalOffset(
  align: "top" | "center" | "bottom",
  containerHeight: number,
  contentHeight: number,
): number {
  switch (align) {
    case "center":
      return (containerHeight - contentHeight) / 2;
    case "bottom":
      return containerHeight - contentHeight;
    case "top":
    default:
      return 0;
  }
}

// =============================================================================
// Row Rendering
// =============================================================================

/**
 * Render a table row.
 */
function renderRow(row: LayoutTableRowResult, rowIndex: number): ReactNode {
  return <g key={`row-${rowIndex}`}>{row.cells.map((cell, cellIndex) => renderCell(cell, rowIndex, cellIndex))}</g>;
}

// =============================================================================
// Table Rendering
// =============================================================================

/**
 * Props for TableOverlay component.
 */
export type TableOverlayProps = {
  /** Table layout result */
  readonly table: LayoutTableResult;
};

/**
 * Render a table as SVG elements.
 */
export function TableOverlay({ table }: TableOverlayProps): ReactNode {
  const { x, y, rows } = table;

  return (
    <g transform={`translate(${x as number}, ${y as number})`}>
      {rows.map((row, rowIndex) => renderRow(row, rowIndex))}
    </g>
  );
}

/**
 * Render multiple tables.
 */
export function renderTables(tables: readonly LayoutTableResult[]): ReactNode {
  return (
    <>
      {tables.map((table, index) => (
        <TableOverlay key={`table-${index}`} table={table} />
      ))}
    </>
  );
}
