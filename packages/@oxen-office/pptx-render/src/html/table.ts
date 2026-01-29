/**
 * @file HTML Table renderer
 *
 * Converts Table domain objects to HTML output.
 *
 * @see ECMA-376 Part 1, Section 21.1.3 - DrawingML Tables
 */

import type { Table, TableCell, TableRow } from "@oxen-office/pptx/domain/table/types";
import { resolveRowHeight, isFlagEnabled } from "@oxen-office/pptx/domain/table/resolver";
import type { HtmlString } from "./primitives";
import { createElement, buildStyle, EMPTY_HTML } from "./primitives";
import { fillToBackground, lineToBorder } from "./fill";
import type { HtmlRenderContext } from "./context";
import { renderTextBody } from "./text";
import type { Transform } from "@oxen-office/pptx/domain/index";
import { px, deg } from "@oxen-office/ooxml/domain/units";

// =============================================================================
// Table Rendering
// =============================================================================

/**
 * Render a table to HTML
 */
export function renderTable(
  table: Table,
  transform: Transform,
  ctx: HtmlRenderContext,
): HtmlString {
  const { properties, grid, rows } = table;

  const tableStyles: Record<string, string> = {
    position: "absolute",
    left: `${transform.x}px`,
    top: `${transform.y}px`,
    width: `${transform.width}px`,
    height: `${transform.height}px`,
    "border-collapse": "collapse",
    "table-layout": "fixed",
  };

  if (properties.fill) {
    tableStyles.background = fillToBackground(properties.fill, ctx.colorContext);
  }

  const dir = properties.rtl ? "rtl" : "ltr";

  const rowElements = rows.map((row, rowIdx) =>
    renderTableRow(
      row,
      rowIdx,
      rows.length,
      grid.columns.map((c) => c.width as number),
      properties,
      ctx,
    ),
  );

  return createElement(
    "table",
    {
      dir,
      style: buildStyle(tableStyles),
      class: "pptx-table",
    },
    ...rowElements,
  );
}

/**
 * Render a table row to HTML
 */
function renderTableRow(
  ...args: [
    row: TableRow,
    rowIdx: number,
    _totalRows: number,
    columnWidths: number[],
    tableProperties: Table["properties"],
    ctx: HtmlRenderContext,
  ]
): HtmlString {
  const [row, rowIdx, _totalRows, columnWidths, tableProperties, ctx] = args;
  const rowStyles: Record<string, string> = {};

  if (row.height !== undefined && (row.height as number) > 0) {
    rowStyles.height = `${row.height}px`;
  }

  const isFirstRow = isFlagEnabled(tableProperties.firstRow, rowIdx === 0);
  const isBandRow = isFlagEnabled(tableProperties.bandRow, rowIdx % 2 === 1);

  if (isFirstRow) {
    rowStyles["font-weight"] = "bold";
  }
  if (isBandRow) {
    rowStyles["background-color"] = "rgba(0, 0, 0, 0.05)";
  }

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
      ctx,
    ),
  );

  return createElement("tr", { style: buildStyle(rowStyles) }, ...cellElements);
}

/**
 * Render a table cell to HTML
 */
function renderTableCell(
  ...args: [
    cell: TableCell,
    rowIdx: number,
    colIdx: number,
    _totalCols: number,
    width: number,
    rowHeight: number | undefined,
    tableProperties: Table["properties"],
    ctx: HtmlRenderContext,
  ]
): HtmlString {
  const [cell, rowIdx, colIdx, _totalCols, width, rowHeight, tableProperties, ctx] = args;
  const { properties, textBody } = cell;

  if (properties.horizontalMerge || properties.verticalMerge) {
    return EMPTY_HTML;
  }

  const cellStyles: Record<string, string> = {
    "word-wrap": "break-word",
    "vertical-align": "top",
  };

  if (width > 0) {
    cellStyles.width = `${width}px`;
  }

  if (properties.margins) {
    cellStyles["padding-left"] = `${properties.margins.left}px`;
    cellStyles["padding-right"] = `${properties.margins.right}px`;
    cellStyles["padding-top"] = `${properties.margins.top}px`;
    cellStyles["padding-bottom"] = `${properties.margins.bottom}px`;
  } else {
    cellStyles.padding = "4px 8px";
  }

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

  if (properties.fill) {
    cellStyles.background = fillToBackground(properties.fill, ctx.colorContext);
  }

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

  const isFirstCol = isFlagEnabled(tableProperties.firstCol, colIdx === 0);
  const isBandCol = isFlagEnabled(tableProperties.bandCol, colIdx % 2 === 1);

  if (isFirstCol) {
    cellStyles["font-weight"] = "bold";
  }
  if (isBandCol && !cellStyles.background) {
    cellStyles["background-color"] = "rgba(0, 0, 0, 0.03)";
  }

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

  const content = textBody ? renderTableCellContent(textBody, width, rowHeight, ctx) : EMPTY_HTML;

  return createElement("td", cellAttrs, content);
}

function renderTableCellContent(
  ...args: [
    textBody: TableCell["textBody"],
    width: number,
    rowHeight: number | undefined,
    ctx: HtmlRenderContext,
  ]
): HtmlString {
  const [textBody, width, rowHeight, ctx] = args;
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
