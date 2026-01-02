/**
 * @file Table renderer
 *
 * Converts Table domain objects to HTML output.
 */

import type { Table, TableCell, TableRow } from "../../domain/table";
import type { HtmlString } from "../html/primitives";
import { createElement, buildStyle, EMPTY_HTML } from "../html/primitives";
import { fillToBackground, lineToBorder } from "../html/fill";
import type { HtmlRenderContext } from "../html/context";
import { renderTextBody } from "../html/text";
import type { Transform, Pixels } from "../../domain/index";
import { px, deg } from "../../domain/types";

// =============================================================================
// Table Rendering
// =============================================================================

/**
 * Render a table to HTML
 */
export function renderTable(
  table: Table,
  transform: Transform,
  ctx: HtmlRenderContext
): HtmlString {
  const { properties, grid, rows } = table;

  // Build table styles
  const tableStyles: Record<string, string> = {
    position: "absolute",
    left: `${transform.x}px`,
    top: `${transform.y}px`,
    width: `${transform.width}px`,
    height: `${transform.height}px`,
    "border-collapse": "collapse",
    "table-layout": "fixed",
  };

  // Add background fill
  if (properties.fill) {
    tableStyles.background = fillToBackground(properties.fill, ctx.colorContext);
  }

  // RTL direction
  const dir = properties.rtl ? "rtl" : "ltr";

  // Render rows
  const rowElements = rows.map((row, rowIdx) =>
    renderTableRow(row, rowIdx, rows.length, grid.columns.map(c => c.width as number), properties, ctx)
  );

  return createElement(
    "table",
    {
      dir,
      style: buildStyle(tableStyles),
      class: "pptx-table",
    },
    ...rowElements
  );
}

/**
 * Render a table row to HTML
 */
function renderTableRow(
  row: TableRow,
  rowIdx: number,
  totalRows: number,
  columnWidths: number[],
  tableProperties: Table["properties"],
  ctx: HtmlRenderContext
): HtmlString {
  const rowStyles: Record<string, string> = {};

  if (row.height !== undefined && (row.height as number) > 0) {
    rowStyles.height = `${row.height}px`;
  }

  // Apply row styling based on table properties
  const isFirstRow = isFlagEnabled(tableProperties.firstRow, rowIdx === 0);
  const isBandRow = isFlagEnabled(tableProperties.bandRow, rowIdx % 2 === 1);

  // Add visual hints for special rows (actual styling would come from table style)
  if (isFirstRow) {
    rowStyles["font-weight"] = "bold";
  }
  if (isBandRow) {
    rowStyles["background-color"] = "rgba(0, 0, 0, 0.05)";
  }

  // Render cells
  const rowHeight = resolveRowHeight(row);
  const cellElements = row.cells.map((cell, colIdx) =>
    renderTableCell(
      cell,
      rowIdx,
      colIdx,
      row.cells.length,
      columnWidths[colIdx] ?? 0,
      rowHeight,
      tableProperties,
      ctx
    )
  );

  return createElement(
    "tr",
    { style: buildStyle(rowStyles) },
    ...cellElements
  );
}

/**
 * Render a table cell to HTML
 */
function renderTableCell(
  cell: TableCell,
  rowIdx: number,
  colIdx: number,
  totalCols: number,
  width: number,
  rowHeight: number | undefined,
  tableProperties: Table["properties"],
  ctx: HtmlRenderContext
): HtmlString {
  const { properties, textBody } = cell;

  // Skip merged cells
  if (properties.horizontalMerge || properties.verticalMerge) {
    return EMPTY_HTML;
  }

  const cellStyles: Record<string, string> = {
    "word-wrap": "break-word",
    "vertical-align": "top",
  };

  // Cell width
  if (width > 0) {
    cellStyles.width = `${width}px`;
  }

  // Cell margins/padding
  if (properties.margins) {
    cellStyles["padding-left"] = `${properties.margins.left}px`;
    cellStyles["padding-right"] = `${properties.margins.right}px`;
    cellStyles["padding-top"] = `${properties.margins.top}px`;
    cellStyles["padding-bottom"] = `${properties.margins.bottom}px`;
  } else {
    // Default cell padding
    cellStyles.padding = "4px 8px";
  }

  // Vertical alignment (anchor)
  if (properties.anchor) {
    switch (properties.anchor) {
      case "top":
        cellStyles["vertical-align"] = "top";
        break;
      case "center":
        cellStyles["vertical-align"] = "middle";
        break;
      case "bottom":
        cellStyles["vertical-align"] = "bottom";
        break;
    }
  }

  // Cell background
  if (properties.fill) {
    cellStyles.background = fillToBackground(properties.fill, ctx.colorContext);
  }

  // Cell borders
  if (properties.borders) {
    if (properties.borders.left) {
      cellStyles["border-left"] = lineToBorder(properties.borders.left, ctx.colorContext);
    }
    if (properties.borders.right) {
      cellStyles["border-right"] = lineToBorder(properties.borders.right, ctx.colorContext);
    }
    if (properties.borders.top) {
      cellStyles["border-top"] = lineToBorder(properties.borders.top, ctx.colorContext);
    }
    if (properties.borders.bottom) {
      cellStyles["border-bottom"] = lineToBorder(properties.borders.bottom, ctx.colorContext);
    }
  }

  // Apply column styling based on table properties
  const isFirstCol = isFlagEnabled(tableProperties.firstCol, colIdx === 0);
  const isBandCol = isFlagEnabled(tableProperties.bandCol, colIdx % 2 === 1);

  if (isFirstCol) {
    cellStyles["font-weight"] = "bold";
  }
  if (isBandCol && !cellStyles.background) {
    cellStyles["background-color"] = "rgba(0, 0, 0, 0.03)";
  }

  // Build cell attributes
  const cellAttrs: Record<string, string | number | boolean | undefined> = {
    style: buildStyle(cellStyles),
    "data-cell": `${rowIdx},${colIdx}`,
  };

  if (properties.rowSpan && properties.rowSpan > 1) {
    cellAttrs.rowspan = properties.rowSpan;
  }
  if (properties.colSpan && properties.colSpan > 1) {
    cellAttrs.colspan = properties.colSpan;
  }

  // Render cell content
  const content = textBody ? renderTableCellContent(textBody, width, rowHeight, ctx) : EMPTY_HTML;

  return createElement("td", cellAttrs, content);
}

// =============================================================================
// SVG Table Rendering (Native SVG elements for resvg compatibility)
// =============================================================================

import { renderFillToStyle, renderLineToStyle } from "../svg/fill";

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
 * @param ctx - Render context
 *
 * @see ECMA-376 Part 1, Section 21.1.3.5 (a:gridCol)
 * @see ECMA-376 Part 1, Section 21.1.3.16 (a:tr)
 */
export function renderTableSvg(
  table: Table,
  frameWidth: Pixels,
  frameHeight: Pixels,
  ctx: HtmlRenderContext
): string {
  const { properties, grid, rows } = table;
  const colorContext = ctx.colorContext;

  // Calculate column widths and row heights from table definition
  // These are the ACTUAL dimensions per ECMA-376, not scaled to xfrm
  const columnWidths = grid.columns.map(c => c.width as number);
  const totalWidth = columnWidths.reduce((sum, w) => sum + w, 0);

  // Row heights: h="0" means minimum height, use a default
  const DEFAULT_MIN_ROW_HEIGHT = 20;
  const rowHeights = rows.map(row => resolveSvgRowHeight(row, DEFAULT_MIN_ROW_HEIGHT));
  const totalHeight = rowHeights.reduce((sum, h) => sum + h, 0);

  // Per ECMA-376 Part 1, Section 21.1.3:
  // - Table dimensions are DEFINED by gridCol/@w and tr/@h attributes
  // - These are the authoritative dimensions, not the graphicFrame's xfrm
  // - The xfrm specifies position and bounding box, NOT a scaling target
  //
  // However, different applications handle dimension mismatches differently:
  // - ECMA-376 strict: No scaling, use natural dimensions
  // - PowerPoint: Stretches tables to fill the xfrm bounding box
  // - LibreOffice: Uses natural dimensions
  //
  // The tableScalingMode in render options controls this behavior.
  const xfrmWidth = frameWidth as number;
  const xfrmHeight = frameHeight as number;
  const tableScalingMode = ctx.options?.tableScalingMode ?? "natural";
  const { scaleX, scaleY } = resolveTableScale(
    tableScalingMode,
    totalWidth,
    totalHeight,
    xfrmWidth,
    xfrmHeight
  );

  const elements: string[] = [];

  // Render table background if present
  if (properties.fill) {
    const fillStyle = renderFillToStyle(properties.fill, colorContext);
    elements.push(
      `<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="${fillStyle.fill}"${
        fillStyle.fillOpacity !== undefined ? ` fill-opacity="${fillStyle.fillOpacity}"` : ""
      }/>`
    );
  }

  // Render cells
  const cursor = { x: 0, y: 0 };
  rows.forEach((row, rowIdx) => {
    const rowHeight = rowHeights[rowIdx];
    cursor.x = 0;

    // Special styling for first rows
    const isFirstRow = isFlagEnabled(properties.firstRow, rowIdx === 0);
    const isBandRow = isFlagEnabled(properties.bandRow, rowIdx % 2 === 1);

    row.cells.forEach((cell, colIdx) => {
      const cellWidth = columnWidths[colIdx] ?? 100;
      const { properties: cellProps } = cell;

      // Skip merged cells
      if (cellProps.horizontalMerge || cellProps.verticalMerge) {
        cursor.x += cellWidth;
        return;
      }

      // Handle cell span
      const colSpan = resolveSpanCount(cellProps.colSpan);
      const rowSpan = resolveSpanCount(cellProps.rowSpan);
      const spanWidth = resolveSpanWidth(columnWidths, colIdx, colSpan, cellWidth);
      const spanHeight = resolveSpanHeight(rowHeights, rowIdx, rowSpan, rowHeight);

      // Determine cell fill
      const cellFillStyle = resolveCellFillStyle(cellProps, colorContext, rowIdx, isFirstRow, isBandRow);

      // Render cell background
      elements.push(
        `<rect x="${cursor.x}" y="${cursor.y}" width="${spanWidth}" height="${spanHeight}" fill="${cellFillStyle.fill}"${
          cellFillStyle.opacity !== undefined ? ` fill-opacity="${cellFillStyle.opacity}"` : ""
        }/>`
      );

      // Render cell borders
      if (cellProps.borders) {
        const { left, right, top, bottom } = cellProps.borders;

        if (top) {
          const lineStyle = renderLineToStyle(top, colorContext);
          elements.push(
            `<line x1="${cursor.x}" y1="${cursor.y}" x2="${cursor.x + spanWidth}" y2="${cursor.y}" stroke="${lineStyle.stroke}" stroke-width="${lineStyle.strokeWidth}"/>`
          );
        }
        if (bottom) {
          const lineStyle = renderLineToStyle(bottom, colorContext);
          elements.push(
            `<line x1="${cursor.x}" y1="${cursor.y + spanHeight}" x2="${cursor.x + spanWidth}" y2="${cursor.y + spanHeight}" stroke="${lineStyle.stroke}" stroke-width="${lineStyle.strokeWidth}"/>`
          );
        }
        if (left) {
          const lineStyle = renderLineToStyle(left, colorContext);
          elements.push(
            `<line x1="${cursor.x}" y1="${cursor.y}" x2="${cursor.x}" y2="${cursor.y + spanHeight}" stroke="${lineStyle.stroke}" stroke-width="${lineStyle.strokeWidth}"/>`
          );
        }
        if (right) {
          const lineStyle = renderLineToStyle(right, colorContext);
          elements.push(
            `<line x1="${cursor.x + spanWidth}" y1="${cursor.y}" x2="${cursor.x + spanWidth}" y2="${cursor.y + spanHeight}" stroke="${lineStyle.stroke}" stroke-width="${lineStyle.strokeWidth}"/>`
          );
        }
      } else {
        // Default thin border
        elements.push(
          `<rect x="${cursor.x}" y="${cursor.y}" width="${spanWidth}" height="${spanHeight}" fill="none" stroke="#AAAAAA" stroke-width="0.5"/>`
        );
      }

      // Render cell text (simplified - just first paragraph, first run)
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
          const textX = cursor.x + 4; // Left padding
          const textY = cursor.y + spanHeight / 2 + fontSize / 3; // Vertical center
          const textFill = isFirstRow ? "#FFFFFF" : "#000000";

          elements.push(
            `<text x="${textX}" y="${textY}" font-size="${fontSize}px" font-family="sans-serif" fill="${textFill}">${escapeXmlText(textContent)}</text>`
          );
        }
      }

      cursor.x += cellWidth;
    });
    cursor.y += rowHeight;
  });

  // Wrap in group with transform
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

function resolveRowHeight(row: TableRow): number | undefined {
  if (row.height !== undefined && (row.height as number) > 0) {
    return row.height as number;
  }
  return undefined;
}

function isFlagEnabled(flag: boolean | undefined, condition: boolean): boolean {
  if (!flag) {
    return false;
  }
  return condition;
}

function renderTableCellContent(
  textBody: TableCell["textBody"],
  width: number,
  rowHeight: number | undefined,
  ctx: HtmlRenderContext
): HtmlString {
  if (!textBody) {
    return EMPTY_HTML;
  }

  const contentHeight = rowHeight === undefined ? 100 : rowHeight;
  const cellTransform: Transform = {
    x: px(0),
    y: px(0),
    width: px(width),
    height: px(contentHeight),
    rotation: deg(0),
    flipH: false,
    flipV: false,
  };
  return renderTextBody(textBody, cellTransform, ctx);
}

function resolveSvgRowHeight(row: TableRow, defaultHeight: number): number {
  const height = row.height as number;
  if (height > 0) {
    return height;
  }
  return defaultHeight;
}

function resolveTableScale(
  mode: NonNullable<HtmlRenderContext["options"]>["tableScalingMode"],
  totalWidth: number,
  totalHeight: number,
  frameWidth: number,
  frameHeight: number
): { scaleX: number; scaleY: number } {
  if (mode === "stretchToFit") {
    const scaleX = totalWidth > 0 ? frameWidth / totalWidth : 1;
    const scaleY = totalHeight > 0 ? frameHeight / totalHeight : 1;
    return { scaleX, scaleY };
  }

  if (mode === "uniformFit") {
    if (totalWidth > 0 && totalHeight > 0) {
      const scale = Math.min(frameWidth / totalWidth, frameHeight / totalHeight);
      return { scaleX: scale, scaleY: scale };
    }
    return { scaleX: 1, scaleY: 1 };
  }

  return { scaleX: 1, scaleY: 1 };
}

function resolveSpanCount(span: number | undefined): number {
  if (span !== undefined && span > 0) {
    return span;
  }
  return 1;
}

function resolveSpanWidth(
  columnWidths: number[],
  colIdx: number,
  span: number,
  fallbackWidth: number
): number {
  const spanWidths = columnWidths.slice(colIdx, colIdx + span);
  const summed = spanWidths.reduce((total, width) => total + width, 0);
  if (summed > 0) {
    return summed;
  }
  return fallbackWidth;
}

function resolveSpanHeight(
  rowHeights: number[],
  rowIdx: number,
  span: number,
  fallbackHeight: number
): number {
  const spanHeights = rowHeights.slice(rowIdx, rowIdx + span);
  const summed = spanHeights.reduce((total, height) => total + height, 0);
  if (summed > 0) {
    return summed;
  }
  return fallbackHeight;
}

function resolveCellFillStyle(
  cellProps: TableCell["properties"],
  colorContext: HtmlRenderContext["colorContext"],
  rowIdx: number,
  isFirstRow: boolean,
  isBandRow: boolean
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
