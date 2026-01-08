/**
 * @file SVG Table renderer
 *
 * Converts Table domain objects to SVG output using native SVG elements.
 * (foreignObject is not supported by resvg)
 *
 * @see ECMA-376 Part 1, Section 21.1.3 - DrawingML Tables
 */

import type { Table, TableCell } from "../../domain/table/types";
import {
  resolveSvgRowHeight,
  resolveTableScale,
  resolveSpanCount,
  resolveSpanWidth,
  resolveSpanHeight,
  isFlagEnabled,
} from "../../domain/table/resolver";
import type { Pixels } from "../../domain/index";
import type { ColorContext } from "../../domain/resolution";
import { renderFillToStyle, renderLineToStyle } from "./fill";
import type { RenderOptions } from "../render-options";

// =============================================================================
// SVG Table Rendering
// =============================================================================

/**
 * Render table to SVG using native SVG elements
 * (foreignObject is not supported by resvg)
 *
 * Per ECMA-376 Part 1, Section 21.1.3:
 * - Table dimensions are defined by gridCol/@w and tr/@h attributes
 * - The graphicFrame's xfrm defines position and bounding box, NOT scaling
 * - Tables should render at their natural size, not stretched to fill xfrm
 *
 * @param table - Table domain object
 * @param frameWidth - Frame width from graphicFrame's xfrm (for scaling options)
 * @param frameHeight - Frame height from graphicFrame's xfrm (for scaling options)
 * @param colorContext - Color context for resolving colors
 * @param options - Render options
 *
 * @see ECMA-376 Part 1, Section 21.1.3.5 (a:gridCol)
 * @see ECMA-376 Part 1, Section 21.1.3.16 (a:tr)
 */
export function renderTableSvg(
  table: Table,
  frameWidth: Pixels,
  frameHeight: Pixels,
  colorContext: ColorContext,
  options?: RenderOptions,
): string {
  const { properties, grid, rows } = table;

  const columnWidths = grid.columns.map((c) => c.width as number);
  const totalWidth = columnWidths.reduce((sum, w) => sum + w, 0);

  const DEFAULT_MIN_ROW_HEIGHT = 20;
  const rowHeights = rows.map((row) => resolveSvgRowHeight(row, DEFAULT_MIN_ROW_HEIGHT));
  const totalHeight = rowHeights.reduce((sum, h) => sum + h, 0);

  const xfrmWidth = frameWidth as number;
  const xfrmHeight = frameHeight as number;
  const tableScalingMode = options?.tableScalingMode ?? "natural";
  const { scaleX, scaleY } = resolveTableScale(
    tableScalingMode,
    totalWidth,
    totalHeight,
    xfrmWidth,
    xfrmHeight,
  );

  const elements: string[] = [];

  if (properties.fill) {
    const fillStyle = renderFillToStyle(properties.fill, colorContext);
    elements.push(
      `<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="${fillStyle.fill}"${
        fillStyle.fillOpacity !== undefined ? ` fill-opacity="${fillStyle.fillOpacity}"` : ""
      }/>`,
    );
  }

  const cursor = { x: 0, y: 0 };
  rows.forEach((row, rowIdx) => {
    const rowHeight = rowHeights[rowIdx];
    cursor.x = 0;

    const isFirstRow = isFlagEnabled(properties.firstRow, rowIdx === 0);
    const isBandRow = isFlagEnabled(properties.bandRow, rowIdx % 2 === 1);

    row.cells.forEach((cell, colIdx) => {
      const cellWidth = columnWidths[colIdx] ?? 100;
      const { properties: cellProps } = cell;

      if (cellProps.horizontalMerge || cellProps.verticalMerge) {
        cursor.x += cellWidth;
        return;
      }

      const colSpan = resolveSpanCount(cellProps.colSpan);
      const rowSpan = resolveSpanCount(cellProps.rowSpan);
      const spanWidth = resolveSpanWidth(columnWidths, colIdx, colSpan, cellWidth);
      const spanHeight = resolveSpanHeight(rowHeights, rowIdx, rowSpan, rowHeight);

      const cellFillStyle = resolveCellFillStyle(cellProps, colorContext, rowIdx, isFirstRow, isBandRow);

      elements.push(
        `<rect x="${cursor.x}" y="${cursor.y}" width="${spanWidth}" height="${spanHeight}" fill="${cellFillStyle.fill}"${
          cellFillStyle.opacity !== undefined ? ` fill-opacity="${cellFillStyle.opacity}"` : ""
        }/>`,
      );

      if (cellProps.borders) {
        const { left, right, top, bottom } = cellProps.borders;

        if (top) {
          const lineStyle = renderLineToStyle(top, colorContext);
          elements.push(
            `<line x1="${cursor.x}" y1="${cursor.y}" x2="${cursor.x + spanWidth}" y2="${cursor.y}" stroke="${lineStyle.stroke}" stroke-width="${lineStyle.strokeWidth}"/>`,
          );
        }
        if (bottom) {
          const lineStyle = renderLineToStyle(bottom, colorContext);
          elements.push(
            `<line x1="${cursor.x}" y1="${cursor.y + spanHeight}" x2="${cursor.x + spanWidth}" y2="${cursor.y + spanHeight}" stroke="${lineStyle.stroke}" stroke-width="${lineStyle.strokeWidth}"/>`,
          );
        }
        if (left) {
          const lineStyle = renderLineToStyle(left, colorContext);
          elements.push(
            `<line x1="${cursor.x}" y1="${cursor.y}" x2="${cursor.x}" y2="${cursor.y + spanHeight}" stroke="${lineStyle.stroke}" stroke-width="${lineStyle.strokeWidth}"/>`,
          );
        }
        if (right) {
          const lineStyle = renderLineToStyle(right, colorContext);
          elements.push(
            `<line x1="${cursor.x + spanWidth}" y1="${cursor.y}" x2="${cursor.x + spanWidth}" y2="${cursor.y + spanHeight}" stroke="${lineStyle.stroke}" stroke-width="${lineStyle.strokeWidth}"/>`,
          );
        }
      } else {
        elements.push(
          `<rect x="${cursor.x}" y="${cursor.y}" width="${spanWidth}" height="${spanHeight}" fill="none" stroke="#AAAAAA" stroke-width="0.5"/>`,
        );
      }

      if (cell.textBody && cell.textBody.paragraphs.length > 0) {
        const para = cell.textBody.paragraphs[0];
        const textParts: string[] = [];

        for (const run of para.runs) {
          if (run.type === "text" && run.text) {
            textParts.push(run.text);
          } else if (run.type === "field" && run.text) {
            textParts.push(run.text);
          }
        }

        if (textParts.length > 0) {
          const textContent = textParts.join("");
          const fontSize = 12;
          const textX = cursor.x + 4;
          const textY = cursor.y + spanHeight / 2 + fontSize / 3;
          const textFill = isFirstRow ? "#FFFFFF" : "#000000";

          elements.push(
            `<text x="${textX}" y="${textY}" font-size="${fontSize}px" font-family="sans-serif" fill="${textFill}">${escapeXmlText(textContent)}</text>`,
          );
        }
      }

      cursor.x += cellWidth;
    });
    cursor.y += rowHeight;
  });

  return `<g transform="scale(${scaleX}, ${scaleY})">${elements.join("\n")}</g>`;
}

/**
 * Escape XML special characters in text
 */
function escapeXmlText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function resolveCellFillStyle(
  cellProps: TableCell["properties"],
  colorContext: ColorContext,
  rowIdx: number,
  isFirstRow: boolean,
  isBandRow: boolean,
): { fill: string; opacity: number | undefined } {
  if (cellProps.fill) {
    const fillStyle = renderFillToStyle(cellProps.fill, colorContext);
    return { fill: fillStyle.fill, opacity: fillStyle.fillOpacity };
  }

  if (isFirstRow) {
    return { fill: "#4F81BD", opacity: undefined };
  }

  if (isBandRow) {
    return { fill: "#DCE6F1", opacity: undefined };
  }

  const fill = rowIdx % 2 === 0 ? "#FFFFFF" : "#F2F2F2";
  return { fill, opacity: undefined };
}
