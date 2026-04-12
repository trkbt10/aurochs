/**
 * @file XLSX Sheet HTML Renderer
 *
 * Renders XLSX worksheets as HTML tables using the safe XML element builder.
 * All attribute values are automatically escaped via `el()` / `selfClosingEl()`.
 * Text content is escaped via `escapeXml()`.
 *
 * Drawing elements (images, shapes, charts) are rendered as an SVG overlay
 * using the existing SVG drawing renderer pipeline.
 *
 * @see ECMA-376 Part 4, Section 18.3 (Worksheets)
 */

import { el, escapeXml } from "@aurochs/xml";
import type { XlsxWorkbook, XlsxWorksheet, XlsxRow } from "@aurochs-office/xlsx/domain/workbook";
import type { Cell, CellValue } from "@aurochs-office/xlsx/domain/cell/types";
import { createXlsxSvgRenderContext } from "../svg/context";
import { renderAllDrawings } from "../svg/drawing-renderer";

// =============================================================================
// Types
// =============================================================================

/**
 * Rendered HTML output for a single sheet.
 */
export type SheetHtmlResult = {
  /** Sheet display name */
  readonly name: string;
  /** Complete HTML string for the sheet */
  readonly html: string;
};

/**
 * Rendered HTML output for a workbook.
 */
export type WorkbookHtmlResult = {
  /** HTML output per visible sheet */
  readonly sheets: readonly SheetHtmlResult[];
};

// =============================================================================
// Public API
// =============================================================================

/**
 * Render an XlsxWorkbook to HTML tables (one per visible sheet).
 *
 * Drawing elements are rendered as SVG overlays via the existing SVG pipeline.
 */
export function renderWorkbookToHtml(workbook: XlsxWorkbook): WorkbookHtmlResult {
  const sheets: SheetHtmlResult[] = [];
  for (let i = 0; i < workbook.sheets.length; i++) {
    const sheet = workbook.sheets[i];
    if (sheet.state !== "visible") {
      continue;
    }
    sheets.push({
      name: sheet.name,
      html: renderSheetToHtml(workbook, i),
    });
  }
  return { sheets };
}

// =============================================================================
// Sheet Rendering
// =============================================================================

function renderSheetToHtml(workbook: XlsxWorkbook, sheetIndex: number): string {
  const sheet = workbook.sheets[sheetIndex];
  const maxCol = computeMaxColumn(sheet);
  const maxRow = computeMaxRow(sheet);

  if (maxCol === 0 || maxRow === 0) {
    return el("div", { class: "xlsx-empty" }, escapeXml("Empty sheet"));
  }

  const rowMap = buildRowMap(sheet.rows);
  const mergeMap = buildMergeMap(sheet);

  const table = renderTable({ rowMap, mergeMap, maxCol, maxRow });
  const drawingOverlay = renderDrawingOverlaySvg(workbook, sheetIndex);

  if (!drawingOverlay) {
    return table;
  }

  // Wrap table and drawing overlay in a positioned container
  return el("div", { class: "xlsx-sheet-container", style: "position:relative" }, table, drawingOverlay);
}

// =============================================================================
// Table Rendering
// =============================================================================

type RenderTableParams = {
  readonly rowMap: ReadonlyMap<number, XlsxRow>;
  readonly mergeMap: ReadonlyMap<string, MergeInfo>;
  readonly maxCol: number;
  readonly maxRow: number;
};

function renderTable({ rowMap, mergeMap, maxCol, maxRow }: RenderTableParams): string {
  const thead = renderThead(maxCol);
  const tbodyRows: string[] = [];
  for (let r = 1; r <= maxRow; r++) {
    tbodyRows.push(renderRow({ rowNum: r, maxCol, row: rowMap.get(r), mergeMap }));
  }
  const tbody = el("tbody", {}, ...tbodyRows);
  return el("table", { class: "xlsx-table" }, thead, tbody);
}

function renderThead(maxCol: number): string {
  const headerCells: string[] = [
    el("th", { class: "xlsx-header xlsx-row-header" }),
  ];
  for (let c = 1; c <= maxCol; c++) {
    headerCells.push(
      el("th", { class: "xlsx-header xlsx-col-header" }, escapeXml(columnLabel(c))),
    );
  }
  return el("thead", {}, el("tr", {}, ...headerCells));
}

type RenderRowParams = {
  readonly rowNum: number;
  readonly maxCol: number;
  readonly row: XlsxRow | undefined;
  readonly mergeMap: ReadonlyMap<string, MergeInfo>;
};

function renderRow({ rowNum, maxCol, row, mergeMap }: RenderRowParams): string {
  const cellMap = new Map<number, Cell>();
  if (row) {
    for (const cell of row.cells) {
      cellMap.set(cell.address.col, cell);
    }
  }

  const cells: string[] = [
    el("td", { class: "xlsx-row-header" }, escapeXml(String(rowNum))),
  ];

  for (let c = 1; c <= maxCol; c++) {
    const cellHtml = renderCell({ row: rowNum, col: c, cell: cellMap.get(c), mergeMap });
    if (cellHtml !== "") {
      cells.push(cellHtml);
    }
  }

  return el("tr", {}, ...cells);
}

type RenderCellParams = {
  readonly row: number;
  readonly col: number;
  readonly cell: Cell | undefined;
  readonly mergeMap: ReadonlyMap<string, MergeInfo>;
};

function renderCell({ row, col, cell, mergeMap }: RenderCellParams): string {
  const merge = mergeMap.get(`${row}:${col}`);
  if (merge === "hidden") {
    return "";
  }

  const displayValue = cell ? formatCellValue(cell.value) : "";
  const isNumber = cell?.value.type === "number";
  const className = isNumber ? "xlsx-cell xlsx-number" : "xlsx-cell";

  const attrs: Record<string, string | number | undefined> = {
    class: className,
  };

  if (merge && typeof merge === "object") {
    if (merge.colspan > 1) {
      attrs.colspan = merge.colspan;
    }
    if (merge.rowspan > 1) {
      attrs.rowspan = merge.rowspan;
    }
  }

  return el("td", attrs, escapeXml(displayValue));
}

// =============================================================================
// Drawing Overlay (SVG via existing pipeline)
// =============================================================================

/**
 * Render sheet drawings as an SVG element via the existing SVG drawing pipeline.
 *
 * The SVG element builder (`el()`) is used for the wrapper `<svg>` element,
 * while the drawing content is produced by `renderAllDrawings()` — the same
 * pipeline used by the full SVG sheet renderer.
 */
function renderDrawingOverlaySvg(workbook: XlsxWorkbook, sheetIndex: number): string | null {
  const sheet = workbook.sheets[sheetIndex];
  if (!sheet.drawing || sheet.drawing.anchors.length === 0) {
    return null;
  }

  const ctx = createXlsxSvgRenderContext({
    workbook,
    sheetIndex,
    options: {
      showGridLines: false,
      showRowHeaders: false,
      showColumnHeaders: false,
    },
  });

  const drawingContent = renderAllDrawings(ctx, sheet.drawing, {
    resolveImage: ctx.resolveImage,
    resolveChart: ctx.resolveChart,
  });

  if (!drawingContent) {
    return null;
  }

  // The drawing content is already safely constructed by the SVG renderer.
  // Wrap it in an <svg> element using el() for the outer attributes.
  return el(
    "svg",
    {
      class: "xlsx-drawings-overlay",
      xmlns: "http://www.w3.org/2000/svg",
      width: ctx.layout.totalWidth,
      height: ctx.layout.totalHeight,
      viewBox: `0 0 ${ctx.layout.totalWidth} ${ctx.layout.totalHeight}`,
      style: "position:absolute;top:0;left:0;pointer-events:none",
    },
    drawingContent,
  );
}

// =============================================================================
// Cell Value Formatting
// =============================================================================

function formatCellValue(value: CellValue): string {
  switch (value.type) {
    case "string":
      return value.value;
    case "number":
      return formatNumber(value.value);
    case "boolean":
      return value.value ? "TRUE" : "FALSE";
    case "date":
      return value.value.toLocaleDateString();
    case "error":
      return value.value;
    case "empty":
      return "";
  }
}

function formatNumber(n: number): string {
  if (Number.isInteger(n)) {
    return n.toLocaleString();
  }
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

// =============================================================================
// Merge Cell Computation
// =============================================================================

type MergeInfo = { readonly colspan: number; readonly rowspan: number } | "hidden";

function buildMergeMap(sheet: XlsxWorksheet): ReadonlyMap<string, MergeInfo> {
  const map = new Map<string, MergeInfo>();
  if (!sheet.mergeCells) {
    return map;
  }

  for (const mergeRange of sheet.mergeCells) {
    const startRow = mergeRange.start.row as number;
    const startCol = mergeRange.start.col as number;
    const endRow = mergeRange.end.row as number;
    const endCol = mergeRange.end.col as number;

    const rowspan = endRow - startRow + 1;
    const colspan = endCol - startCol + 1;

    map.set(`${startRow}:${startCol}`, { rowspan, colspan });

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        if (r === startRow && c === startCol) {
          continue;
        }
        map.set(`${r}:${c}`, "hidden");
      }
    }
  }

  return map;
}

// =============================================================================
// Layout Computation
// =============================================================================

function buildRowMap(rows: readonly XlsxRow[]): ReadonlyMap<number, XlsxRow> {
  const map = new Map<number, XlsxRow>();
  for (const row of rows) {
    map.set(row.rowNumber, row);
  }
  return map;
}

function computeMaxColumn(sheet: XlsxWorksheet): number {
  const cellMax = sheet.rows.reduce(
    (acc, row) => row.cells.reduce((a, cell) => Math.max(a, cell.address.col as number), acc),
    0,
  );
  const mergeMax = (sheet.mergeCells ?? []).reduce((acc, r) => Math.max(acc, r.end.col as number), 0);
  return Math.min(Math.max(cellMax, mergeMax), 100);
}

function computeMaxRow(sheet: XlsxWorksheet): number {
  const rowMax = sheet.rows.reduce((acc, row) => Math.max(acc, row.rowNumber), 0);
  const mergeMax = (sheet.mergeCells ?? []).reduce((acc, r) => Math.max(acc, r.end.row as number), 0);
  return Math.min(Math.max(rowMax, mergeMax), 5000);
}

function columnLabel(col: number): string {
  if (col <= 0) {
    return "";
  }
  const prefix = columnLabel(Math.floor((col - 1) / 26));
  return prefix + String.fromCharCode(65 + ((col - 1) % 26));
}
