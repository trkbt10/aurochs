/**
 * @file XLSX Renderer
 *
 * Converts an XLSX file buffer into HTML tables for webview display.
 */

import { loadZipPackage } from "@oxen/zip";
import { parseXlsxWorkbook } from "@oxen-office/xlsx/parser";
import type { XlsxWorkbook, XlsxWorksheet, XlsxRow } from "@oxen-office/xlsx/domain/workbook";
import type { Cell, CellValue } from "@oxen-office/xlsx/domain/cell/types";

export type XlsxSheetHtml = {
  readonly name: string;
  readonly html: string;
};

export type XlsxRenderResult = {
  readonly sheets: readonly XlsxSheetHtml[];
};

/**
 * Render an XLSX file to HTML tables (one per sheet).
 */
export async function renderXlsxHtml(data: Uint8Array): Promise<XlsxRenderResult> {
  const pkg = await loadZipPackage(data);
  const getFileContent = async (path: string): Promise<string | undefined> => {
    return pkg.readText(path) ?? undefined;
  };
  const workbook = await parseXlsxWorkbook(getFileContent);
  return renderXlsxWorkbookHtml(workbook);
}

/**
 * Render an XlsxWorkbook domain model to HTML tables (used by both XLSX and XLS paths).
 */
export function renderXlsxWorkbookHtml(workbook: XlsxWorkbook): XlsxRenderResult {
  const sheets = workbook.sheets
    .filter((s) => s.state === "visible")
    .map((sheet) => ({
      name: sheet.name,
      html: renderSheet(sheet),
    }));

  return { sheets };
}

function renderSheet(sheet: XlsxWorksheet): string {
  const maxCol = computeMaxColumn(sheet);
  const maxRow = computeMaxRow(sheet);

  if (maxCol === 0 || maxRow === 0) {
    return `<div class="xlsx-empty">Empty sheet</div>`;
  }

  const rowMap = buildRowMap(sheet.rows);
  const mergeMap = buildMergeMap(sheet);

  const colHeaders = range(1, maxCol)
    .map((c) => `<th class="xlsx-header xlsx-col-header">${columnLabel(c)}</th>`)
    .join("");
  const thead = `<thead><tr><th class="xlsx-header xlsx-row-header"></th>${colHeaders}</tr></thead>`;

  const tbody = range(1, maxRow)
    .map((r) => renderRow({ rowNum: r, maxCol, row: rowMap.get(r), mergeMap }))
    .join("\n");

  return `<table class="xlsx-table">\n${thead}\n<tbody>\n${tbody}\n</tbody>\n</table>`;
}

type RenderRowParams = {
  readonly rowNum: number;
  readonly maxCol: number;
  readonly row: XlsxRow | undefined;
  readonly mergeMap: Map<string, MergeInfo>;
};

function renderRow(params: RenderRowParams): string {
  const { rowNum, maxCol, row, mergeMap } = params;
  const cellMap = new Map<number, Cell>();
  if (row) {
    for (const cell of row.cells) {
      cellMap.set(cell.address.col, cell);
    }
  }

  const cells = range(1, maxCol)
    .map((c) => renderCell({ row: rowNum, col: c, cell: cellMap.get(c), mergeMap }))
    .filter((s) => s !== "")
    .join("");

  return `<tr><td class="xlsx-row-header">${rowNum}</td>${cells}</tr>`;
}

type RenderCellParams = {
  readonly row: number;
  readonly col: number;
  readonly cell: Cell | undefined;
  readonly mergeMap: Map<string, MergeInfo>;
};

function renderCell(params: RenderCellParams): string {
  const { row, col, cell, mergeMap } = params;
  const merge = mergeMap.get(`${row}:${col}`);
  if (merge === "hidden") {
    return "";
  }

  const displayValue = cell ? formatCellValue(cell.value) : "";
  const isNumber = cell?.value.type === "number";
  const className = isNumber ? "xlsx-cell xlsx-number" : "xlsx-cell";
  const mergeAttrs = resolveMergeAttrs(merge);

  return `<td class="${className}"${mergeAttrs}>${escapeHtml(displayValue)}</td>`;
}

function resolveMergeAttrs(merge: MergeInfo | undefined): string {
  if (merge && typeof merge === "object") {
    return buildMergeAttrs(merge);
  }
  return "";
}

function buildMergeAttrs(merge: { colspan: number; rowspan: number }): string {
  const parts: string[] = [];
  if (merge.colspan > 1) {
    parts.push(`colspan="${merge.colspan}"`);
  }
  if (merge.rowspan > 1) {
    parts.push(`rowspan="${merge.rowspan}"`);
  }
  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

type MergeInfo = { colspan: number; rowspan: number } | "hidden";

function buildRowMap(rows: readonly XlsxRow[]): Map<number, XlsxRow> {
  const map = new Map<number, XlsxRow>();
  for (const row of rows) {
    map.set(row.rowNumber, row);
  }
  return map;
}

function buildMergeMap(sheet: XlsxWorksheet): Map<string, MergeInfo> {
  const map = new Map<string, MergeInfo>();
  if (!sheet.mergeCells) {
    return map;
  }

  for (const mergeRange of sheet.mergeCells) {
    const startRow = mergeRange.start.row;
    const startCol = mergeRange.start.col;
    const endRow = mergeRange.end.row;
    const endCol = mergeRange.end.col;

    const rowspan = endRow - startRow + 1;
    const colspan = endCol - startCol + 1;

    map.set(`${startRow}:${startCol}`, { rowspan, colspan });

    for (const r of range(startRow, endRow)) {
      for (const c of range(startCol, endCol)) {
        if (r === startRow && c === startCol) {
          continue;
        }
        map.set(`${r}:${c}`, "hidden");
      }
    }
  }

  return map;
}

function computeMaxColumn(sheet: XlsxWorksheet): number {
  const cellMax = sheet.rows.reduce(
    (acc, row) => row.cells.reduce((a, cell) => Math.max(a, cell.address.col), acc),
    0,
  );
  const mergeMax = (sheet.mergeCells ?? []).reduce(
    (acc, r) => Math.max(acc, r.end.col),
    0,
  );
  return Math.min(Math.max(cellMax, mergeMax), 100);
}

function computeMaxRow(sheet: XlsxWorksheet): number {
  const rowMax = sheet.rows.reduce(
    (acc, row) => Math.max(acc, row.rowNumber),
    0,
  );
  const mergeMax = (sheet.mergeCells ?? []).reduce(
    (acc, r) => Math.max(acc, r.end.row),
    0,
  );
  return Math.min(Math.max(rowMax, mergeMax), 5000);
}

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

function columnLabel(col: number): string {
  if (col <= 0) {
    return "";
  }
  const prefix = columnLabel(Math.floor((col - 1) / 26));
  return prefix + String.fromCharCode(65 + ((col - 1) % 26));
}

/**
 * Generate an inclusive range [start, end].
 */
function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
