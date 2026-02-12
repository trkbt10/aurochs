/**
 * @file Main sheet renderer for XLSX SVG output
 *
 * Orchestrates rendering of all sheet elements:
 * - Background
 * - Grid lines
 * - Cell fills and text
 * - Cell borders
 * - Row/column headers
 */

import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import type { Cell } from "@aurochs-office/xlsx/domain/cell/types";
import type { StyleId } from "@aurochs-office/xlsx/domain/types";
import type { SheetSvgResult, XlsxRenderOptions, XlsxSvgRenderContext } from "./types";
import { createXlsxSvgRenderContext, getColorScheme } from "./context";
import { createStyleCache, createDefaultStyle } from "./style-resolver";
import { renderCell, renderCellFill } from "./cell-renderer";
import { renderCellBorders, renderGridLines, renderColumnHeaders, renderRowHeaders } from "./border-renderer";
import { cellRefFromIndices } from "./layout";
import { renderAllDrawings } from "./drawing-renderer";

// =============================================================================
// Main Render Function
// =============================================================================

/**
 * Render a sheet to SVG.
 */
export function renderSheetToSvg(config: {
  readonly workbook: XlsxWorkbook;
  readonly sheetIndex: number;
  readonly options?: Partial<XlsxRenderOptions>;
}): SheetSvgResult {
  const ctx = createXlsxSvgRenderContext({
    workbook: config.workbook,
    sheetIndex: config.sheetIndex,
    options: config.options,
  });

  return renderSheetWithContext(ctx);
}

/**
 * Render a sheet using an existing context.
 */
export function renderSheetWithContext(ctx: XlsxSvgRenderContext): SheetSvgResult {
  const { layout, options } = ctx;

  if (layout.columnCount === 0 || layout.rowCount === 0) {
    return createEmptySheetResult();
  }

  const colorScheme = getColorScheme(ctx);
  const resolveStyle = createStyleCache(ctx.workbook.styles, colorScheme, options);
  const elements: string[] = [];

  elements.push(renderBackground(ctx));

  if (options.showGridLines) {
    elements.push(renderGridLinesGroup(ctx));
  }

  elements.push(`<g class="cell-fills">${renderAllCellFills(ctx, resolveStyle)}</g>`);
  elements.push(`<g class="cell-borders">${renderAllCellBorders(ctx, resolveStyle)}</g>`);
  elements.push(`<g class="cell-text">${renderAllCellText(ctx, resolveStyle)}</g>`);

  // Render drawing elements (images, shapes, charts)
  if (options.showDrawings) {
    const drawingSvg = renderAllDrawings(ctx, ctx.sheet.drawing, {
      resolveImage: ctx.resolveImage,
      resolveChart: ctx.resolveChart,
    });
    if (drawingSvg) {
      elements.push(drawingSvg);
    }
  }

  if (options.showRowHeaders) {
    elements.push(renderRowHeadersGroup(ctx));
  }

  if (options.showColumnHeaders) {
    elements.push(renderColumnHeadersGroup(ctx));
  }

  const defs = buildDefsSection(ctx);
  const svg = buildSvgDocument({ layout, defs, elements });

  return {
    svg,
    width: layout.totalWidth,
    height: layout.totalHeight,
    warnings: ctx.warnings.getAll(),
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function createEmptySheetResult(): SheetSvgResult {
  const emptySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50" viewBox="0 0 200 50">
  <text x="100" y="25" text-anchor="middle" dominant-baseline="middle" font-size="14" fill="#999999">(empty sheet)</text>
</svg>`;
  return { svg: emptySvg, width: 200, height: 50, warnings: [] };
}

function buildDefsSection(ctx: XlsxSvgRenderContext): string {
  if (!ctx.defs.hasAny()) {
    return "";
  }
  return `<defs>${ctx.defs.getAll().join("")}</defs>`;
}

function buildSvgDocument(config: {
  readonly layout: { totalWidth: number; totalHeight: number };
  readonly defs: string;
  readonly elements: readonly string[];
}): string {
  const { layout, defs, elements } = config;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.totalWidth}" height="${layout.totalHeight}" viewBox="0 0 ${layout.totalWidth} ${layout.totalHeight}">
${defs}
${elements.join("\n")}
</svg>`;
}

function renderBackground(ctx: XlsxSvgRenderContext): string {
  const { layout, options } = ctx;
  return `<rect x="0" y="0" width="${layout.totalWidth}" height="${layout.totalHeight}" fill="${options.backgroundColor}"/>`;
}

function renderGridLinesGroup(ctx: XlsxSvgRenderContext): string {
  const { layout, options } = ctx;
  const content = renderGridLines({
    columnPositions: layout.columnPositions,
    rowPositions: layout.rowPositions,
    columnWidths: layout.columnWidths,
    rowHeights: layout.rowHeights,
    totalWidth: layout.totalWidth,
    totalHeight: layout.totalHeight,
    gridColor: options.gridLineColor,
  });
  return `<g class="grid-lines">${content}</g>`;
}

function renderRowHeadersGroup(ctx: XlsxSvgRenderContext): string {
  const { layout, options } = ctx;
  const content = renderRowHeaders({
    rowPositions: layout.rowPositions,
    rowHeights: layout.rowHeights,
    headerSize: options.headerSize,
    totalHeight: layout.totalHeight,
  });
  return `<g class="row-headers">${content}</g>`;
}

function renderColumnHeadersGroup(ctx: XlsxSvgRenderContext): string {
  const { layout, options } = ctx;
  const content = renderColumnHeaders({
    columnPositions: layout.columnPositions,
    columnWidths: layout.columnWidths,
    headerSize: options.headerSize,
    totalWidth: layout.totalWidth,
  });
  return `<g class="column-headers">${content}</g>`;
}

// =============================================================================
// Cell Rendering Helpers
// =============================================================================

function buildCellMap(ctx: XlsxSvgRenderContext): Map<string, Cell> {
  const cellMap = new Map<string, Cell>();

  for (const row of ctx.sheet.rows) {
    for (const cell of row.cells) {
      const ref = cellRefFromIndices(cell.address.row as number, cell.address.col as number);
      cellMap.set(ref, cell);
    }
  }

  return cellMap;
}

type StyleResolver = (styleId: StyleId | undefined) => ReturnType<typeof createDefaultStyle>;

function renderAllCellFills(ctx: XlsxSvgRenderContext, resolveStyle: StyleResolver): string {
  const cellMap = buildCellMap(ctx);
  const parts: string[] = [];

  for (const [ref, layout] of ctx.layout.cells) {
    if (layout.isHiddenByMerge || layout.width === 0 || layout.height === 0) {
      continue;
    }

    const cell = cellMap.get(ref);
    const style = resolveStyle(cell?.styleId);

    if (style.fill.type !== "none") {
      parts.push(renderCellFill({ layout, fill: style.fill, ctx }));
    }
  }

  return parts.join("");
}

function renderAllCellBorders(ctx: XlsxSvgRenderContext, resolveStyle: StyleResolver): string {
  const cellMap = buildCellMap(ctx);
  const parts: string[] = [];

  for (const [ref, layout] of ctx.layout.cells) {
    if (layout.isHiddenByMerge || layout.width === 0 || layout.height === 0) {
      continue;
    }

    const cell = cellMap.get(ref);
    const style = resolveStyle(cell?.styleId);

    const { left, right, top, bottom, diagonal } = style.border;
    if (left || right || top || bottom || diagonal) {
      parts.push(renderCellBorders(layout, style.border));
    }
  }

  return parts.join("");
}

function renderAllCellText(ctx: XlsxSvgRenderContext, resolveStyle: StyleResolver): string {
  const cellMap = buildCellMap(ctx);
  const parts: string[] = [];

  for (const [ref, layout] of ctx.layout.cells) {
    if (layout.isHiddenByMerge || layout.width === 0 || layout.height === 0) {
      continue;
    }

    const cell = cellMap.get(ref);
    if (!cell || cell.value.type === "empty") {
      continue;
    }

    const style = resolveStyle(cell.styleId);
    parts.push(renderCell({ cell, layout, style, ctx }));
  }

  return parts.join("");
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Render the first sheet of a workbook to SVG.
 */
export function renderFirstSheetToSvg(
  workbook: XlsxWorkbook,
  options?: Partial<XlsxRenderOptions>,
): SheetSvgResult {
  return renderSheetToSvg({ workbook, sheetIndex: 0, options });
}

/**
 * Render a sheet by name to SVG.
 */
export function renderSheetByNameToSvg(config: {
  readonly workbook: XlsxWorkbook;
  readonly sheetName: string;
  readonly options?: Partial<XlsxRenderOptions>;
}): SheetSvgResult {
  const { workbook, sheetName, options } = config;
  const index = workbook.sheets.findIndex((s) => s.name === sheetName);
  if (index === -1) {
    throw new Error(`Sheet "${sheetName}" not found in workbook`);
  }
  return renderSheetToSvg({ workbook, sheetIndex: index, options });
}
