/**
 * @file Sheet layout calculation for XLSX SVG rendering
 *
 * Calculates cell positions and dimensions considering:
 * - Column widths (custom or default)
 * - Row heights (custom or default)
 * - Merged cells
 * - Hidden rows/columns
 *
 * @see ECMA-376 Part 4, Section 18.3.1.13 (col)
 * @see ECMA-376 Part 4, Section 18.3.1.73 (row)
 */

import type { XlsxWorksheet, XlsxRow, XlsxColumnDef } from "@aurochs-office/xlsx/domain/workbook";
import type { CellRange } from "@aurochs-office/xlsx/domain/cell/address";
import type { SheetLayout, CellLayout, XlsxRenderOptions } from "./types";

// =============================================================================
// Excel Unit Conversions
// =============================================================================

function columnWidthToPixels(excelWidth: number, scale: number): number {
  return Math.round(excelWidth * scale);
}

function rowHeightToPixels(points: number): number {
  return Math.round(points * (96 / 72));
}

// =============================================================================
// Cell Reference Utilities
// =============================================================================

/**
 * Convert a 1-based column index to column letter (A, B, ..., Z, AA, AB, ...).
 */
export function columnIndexToLetter(col: number): string {
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

/**
 * Create a cell reference string from row and column indices.
 * Both are 1-based.
 */
export function cellRefFromIndices(row: number, col: number): string {
  return `${columnIndexToLetter(col)}${row}`;
}

// =============================================================================
// Column Width Resolution
// =============================================================================

function getColumnWidth(colIndex: number, columns: readonly XlsxColumnDef[] | undefined, options: XlsxRenderOptions): number {
  if (columns) {
    for (const col of columns) {
      const min = col.min as number;
      const max = col.max as number;
      if (colIndex >= min && colIndex <= max) {
        if (col.hidden) {
          return 0;
        }
        if (col.width !== undefined) {
          return columnWidthToPixels(col.width, options.scale);
        }
      }
    }
  }
  return columnWidthToPixels(options.defaultColumnWidth, options.scale);
}

// =============================================================================
// Row Height Resolution
// =============================================================================

function buildRowHeightMap(rows: readonly XlsxRow[], _options: XlsxRenderOptions): Map<number, number> {
  const heightMap = new Map<number, number>();

  for (const row of rows) {
    const rowNum = row.rowNumber as number;
    if (row.hidden) {
      heightMap.set(rowNum, 0);
    } else if (row.height !== undefined) {
      heightMap.set(rowNum, rowHeightToPixels(row.height));
    }
  }

  return heightMap;
}

function getRowHeight(rowIndex: number, rowHeightMap: Map<number, number>, options: XlsxRenderOptions): number {
  const height = rowHeightMap.get(rowIndex);
  if (height !== undefined) {
    return height;
  }
  return rowHeightToPixels(options.defaultRowHeight);
}

// =============================================================================
// Merge Cell Processing
// =============================================================================

type MergeInfo = {
  readonly isOrigin: boolean;
  readonly colspan: number;
  readonly rowspan: number;
};

function buildMergeMap(mergeCells: readonly CellRange[] | undefined): Map<string, MergeInfo> {
  const mergeMap = new Map<string, MergeInfo>();

  if (!mergeCells) {
    return mergeMap;
  }

  for (const range of mergeCells) {
    processMergeRange(range, mergeMap);
  }

  return mergeMap;
}

function processMergeRange(range: CellRange, mergeMap: Map<string, MergeInfo>): void {
  const startRow = range.start.row as number;
  const startCol = range.start.col as number;
  const endRow = range.end.row as number;
  const endCol = range.end.col as number;

  const colspan = endCol - startCol + 1;
  const rowspan = endRow - startRow + 1;

  const originRef = cellRefFromIndices(startRow, startCol);
  mergeMap.set(originRef, { isOrigin: true, colspan, rowspan });

  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      if (r === startRow && c === startCol) {
        continue;
      }
      const cellRef = cellRefFromIndices(r, c);
      mergeMap.set(cellRef, { isOrigin: false, colspan: 1, rowspan: 1 });
    }
  }
}

// =============================================================================
// Layout Calculation
// =============================================================================

/**
 * Calculate the complete layout for a sheet.
 */
export function calculateSheetLayout(sheet: XlsxWorksheet, options: XlsxRenderOptions): SheetLayout {
  const dimension = sheet.dimension;
  const maxRow = dimension ? (dimension.end.row as number) : getMaxRowFromData(sheet.rows);
  const maxCol = dimension ? (dimension.end.col as number) : getMaxColFromData(sheet.rows);

  if (maxRow === 0 || maxCol === 0) {
    return createEmptyLayout();
  }

  const columnData = calculateColumnData(maxCol, sheet.columns, options);
  const rowData = calculateRowData(maxRow, sheet.rows, options);
  const mergeMap = buildMergeMap(sheet.mergeCells);
  const cells = buildCellLayoutMap({ maxRow, maxCol, columnData, rowData, mergeMap });

  return {
    cells,
    totalWidth: columnData.totalWidth,
    totalHeight: rowData.totalHeight,
    columnPositions: columnData.positions,
    rowPositions: rowData.positions,
    columnWidths: columnData.widths,
    rowHeights: rowData.heights,
    columnCount: maxCol,
    rowCount: maxRow,
  };
}

function createEmptyLayout(): SheetLayout {
  return {
    cells: new Map(),
    totalWidth: 0,
    totalHeight: 0,
    columnPositions: [],
    rowPositions: [],
    columnWidths: [],
    rowHeights: [],
    columnCount: 0,
    rowCount: 0,
  };
}

type ColumnData = {
  readonly widths: number[];
  readonly positions: number[];
  readonly totalWidth: number;
};

function calculateColumnData(
  maxCol: number,
  columns: readonly XlsxColumnDef[] | undefined,
  options: XlsxRenderOptions,
): ColumnData {
  const headerOffset = options.showRowHeaders ? options.headerSize : 0;
  const widths = buildColumnWidths(maxCol, columns, options);
  const positions = buildPositionsFromWidths(widths, headerOffset);
  const totalWidth = headerOffset + widths.reduce((sum, w) => sum + w, 0);

  return { widths, positions, totalWidth };
}

function buildColumnWidths(
  maxCol: number,
  columns: readonly XlsxColumnDef[] | undefined,
  options: XlsxRenderOptions,
): number[] {
  const widths: number[] = [];
  for (let col = 1; col <= maxCol; col++) {
    widths.push(getColumnWidth(col, columns, options));
  }
  return widths;
}

function buildPositionsFromWidths(widths: readonly number[], startOffset: number): number[] {
  if (widths.length === 0) {
    return [];
  }
  return widths.map((_, index) => {
    if (index === 0) {
      return startOffset;
    }
    const prevWidthsSum = widths.slice(0, index).reduce((sum, w) => sum + w, 0);
    return startOffset + prevWidthsSum;
  });
}

type RowData = {
  readonly heights: number[];
  readonly positions: number[];
  readonly totalHeight: number;
};

function calculateRowData(maxRow: number, rows: readonly XlsxRow[], options: XlsxRenderOptions): RowData {
  const rowHeightMap = buildRowHeightMap(rows, options);
  const headerOffset = options.showColumnHeaders ? options.headerSize : 0;
  const heights = buildRowHeights(maxRow, rowHeightMap, options);
  const positions = buildPositionsFromWidths(heights, headerOffset);
  const totalHeight = headerOffset + heights.reduce((sum, h) => sum + h, 0);

  return { heights, positions, totalHeight };
}

function buildRowHeights(maxRow: number, rowHeightMap: Map<number, number>, options: XlsxRenderOptions): number[] {
  const heights: number[] = [];
  for (let row = 1; row <= maxRow; row++) {
    heights.push(getRowHeight(row, rowHeightMap, options));
  }
  return heights;
}

type CellLayoutMapParams = {
  readonly maxRow: number;
  readonly maxCol: number;
  readonly columnData: ColumnData;
  readonly rowData: RowData;
  readonly mergeMap: Map<string, MergeInfo>;
};

function buildCellLayoutMap(params: CellLayoutMapParams): Map<string, CellLayout> {
  const { maxRow, maxCol, columnData, rowData, mergeMap } = params;
  const cells = new Map<string, CellLayout>();

  for (let row = 1; row <= maxRow; row++) {
    for (let col = 1; col <= maxCol; col++) {
      const cellRef = cellRefFromIndices(row, col);
      const layout = createCellLayout({ row, col, columnData, rowData, mergeMap, maxRow, maxCol });
      cells.set(cellRef, layout);
    }
  }

  return cells;
}

type CreateCellLayoutParams = {
  readonly row: number;
  readonly col: number;
  readonly columnData: ColumnData;
  readonly rowData: RowData;
  readonly mergeMap: Map<string, MergeInfo>;
  readonly maxRow: number;
  readonly maxCol: number;
};

function createCellLayout(params: CreateCellLayoutParams): CellLayout {
  const { row, col, columnData, rowData, mergeMap, maxRow, maxCol } = params;
  const cellRef = cellRefFromIndices(row, col);
  const mergeInfo = mergeMap.get(cellRef);

  const x = columnData.positions[col - 1] ?? 0;
  const y = rowData.positions[row - 1] ?? 0;

  if (mergeInfo && mergeInfo.isOrigin) {
    return createMergeOriginLayout({ row, col, x, y, mergeInfo, columnData, rowData, maxRow, maxCol });
  }

  if (mergeInfo && !mergeInfo.isOrigin) {
    return createHiddenByMergeLayout({ x, y, col, row, columnData, rowData });
  }

  return createNormalCellLayout({ x, y, col, row, columnData, rowData });
}

type MergeOriginParams = {
  readonly row: number;
  readonly col: number;
  readonly x: number;
  readonly y: number;
  readonly mergeInfo: MergeInfo;
  readonly columnData: ColumnData;
  readonly rowData: RowData;
  readonly maxRow: number;
  readonly maxCol: number;
};

function createMergeOriginLayout(params: MergeOriginParams): CellLayout {
  const { row, col, x, y, mergeInfo, columnData, rowData, maxRow, maxCol } = params;

  const width = computeMergeWidth({ startIndex: col, span: mergeInfo.colspan, maxIndex: maxCol, sizes: columnData.widths });
  const height = computeMergeHeight({ startIndex: row, span: mergeInfo.rowspan, maxIndex: maxRow, sizes: rowData.heights });

  return {
    x,
    y,
    width,
    height,
    colspan: mergeInfo.colspan,
    rowspan: mergeInfo.rowspan,
    isMergeOrigin: true,
    isHiddenByMerge: false,
  };
}

type ComputeMergeSizeParams = {
  readonly startIndex: number;
  readonly span: number;
  readonly maxIndex: number;
  readonly sizes: readonly number[];
};

function computeMergeWidth(params: ComputeMergeSizeParams): number {
  const { startIndex, span, maxIndex, sizes } = params;
  const endIndex = Math.min(startIndex + span - 1, maxIndex);
  return sizes.slice(startIndex - 1, endIndex).reduce((sum, size) => sum + size, 0);
}

function computeMergeHeight(params: ComputeMergeSizeParams): number {
  const { startIndex, span, maxIndex, sizes } = params;
  const endIndex = Math.min(startIndex + span - 1, maxIndex);
  return sizes.slice(startIndex - 1, endIndex).reduce((sum, size) => sum + size, 0);
}

type BasicCellParams = {
  readonly x: number;
  readonly y: number;
  readonly col: number;
  readonly row: number;
  readonly columnData: ColumnData;
  readonly rowData: RowData;
};

function createHiddenByMergeLayout(params: BasicCellParams): CellLayout {
  const { x, y, col, row, columnData, rowData } = params;
  return {
    x,
    y,
    width: columnData.widths[col - 1] ?? 0,
    height: rowData.heights[row - 1] ?? 0,
    colspan: 1,
    rowspan: 1,
    isMergeOrigin: false,
    isHiddenByMerge: true,
  };
}

function createNormalCellLayout(params: BasicCellParams): CellLayout {
  const { x, y, col, row, columnData, rowData } = params;
  return {
    x,
    y,
    width: columnData.widths[col - 1] ?? 0,
    height: rowData.heights[row - 1] ?? 0,
    colspan: 1,
    rowspan: 1,
    isMergeOrigin: false,
    isHiddenByMerge: false,
  };
}

function getMaxRowFromData(rows: readonly XlsxRow[]): number {
  if (rows.length === 0) {
    return 0;
  }
  return Math.max(...rows.map((r) => r.rowNumber as number));
}

function getMaxColFromData(rows: readonly XlsxRow[]): number {
  const allCols = rows.flatMap((row) => row.cells.map((cell) => cell.address.col as number));
  return allCols.length === 0 ? 0 : Math.max(...allCols);
}
