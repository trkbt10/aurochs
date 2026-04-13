/**
 * @file Convert PPTX Table to Fig child nodes
 *
 * A PPTX table is decomposed into Fig nodes:
 * - Each cell becomes a RECTANGLE node (for the cell background/border)
 *   with a TEXT child (for the cell content), grouped together.
 * - Cell positions are computed from the grid column widths and row heights.
 *
 * This produces a flat list of child nodes that, when placed inside
 * a FRAME with clipsContent=true, renders like a table.
 */

import type { Table, TableRow, TableCell, TableColumn, TableStyle } from "@aurochs-office/pptx/domain/table/types";
import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import type { FigPaint } from "@aurochs/fig/types";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import { dmlFillToFig, dmlLineTofig, type FigStrokeResult } from "@aurochs-converters/interop-drawing-ml/dml-to-fig";
import type { CellBorders } from "@aurochs-office/pptx/domain/table/types";
import type { BaseLine } from "@aurochs-office/drawing-ml/domain/line";
import { EMU_PER_PIXEL } from "@aurochs-office/ooxml/domain/ooxml-units";
import { getApplicablePartStyles, resolveFillFromParts, type CellPositionContext } from "@aurochs-office/pptx/domain/table/resolver";
import { convertText } from "./text";
import type { ConvertContext } from "./shape";

/**
 * Default table cell margins per ECMA-376 §21.1.3.17 (tcPr).
 *
 * marL/marR default: 91440 EMU = 0.1 inch
 * marT/marB default: 45720 EMU = 0.05 inch
 *
 * Converted to pixels at 96 DPI via EMU_PER_PIXEL (9525 EMU/px).
 */
const DEFAULT_CELL_MARGIN_LR = 91440 / EMU_PER_PIXEL; // 9.6 px
const DEFAULT_CELL_MARGIN_TB = 45720 / EMU_PER_PIXEL; // 4.8 px

export type TableIdCounter = { value: number };

/**
 * Convert a PPTX Table into an array of Fig child nodes.
 *
 * Each cell is a RECTANGLE with optional TEXT child.
 * Cell positions are derived from column widths and row heights.
 */
export function convertTableToNodes(
  table: Table,
  idCounter: TableIdCounter,
  ctx: ConvertContext,
): readonly FigDesignNode[] {
  // Resolve table style if available
  const tableStyle = findTableStyle(table.properties.tableStyleId, ctx);

  const columns = table.grid.columns;
  const nodes: FigDesignNode[] = [];
  const rowCount = table.rows.length;
  const colCount = columns.length;

  // Pre-compute column x-offsets
  const colOffsets: number[] = [0];
  for (let c = 0; c < columns.length; c++) {
    colOffsets.push(colOffsets[c] + (columns[c].width));
  }

  let rowY = 0;
  for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
    const row = table.rows[rowIdx];
    const rowHeight = row.height;

    for (let colIdx = 0; colIdx < row.cells.length; colIdx++) {
      const cell = row.cells[colIdx];
      if (colIdx >= columns.length) break;

      // Handle column/row spans
      const colSpan = cell.properties.colSpan ?? 1;
      const rowSpan = cell.properties.rowSpan ?? 1;

      // Skip merge placeholders (horizontalMerge / verticalMerge)
      if (cell.properties.horizontalMerge || cell.properties.verticalMerge) continue;

      const cellX = colOffsets[colIdx];
      const cellWidth = computeSpanWidth(colOffsets, colIdx, colSpan, columns.length);
      const cellHeight = computeSpanHeight(table.rows, rowY, rowSpan, rowIdx);

      // Resolve cell fill: explicit cell fill takes priority, then style-derived fill
      const cellFills = resolveCellFills(cell, tableStyle, {
        rowIdx, colIdx, rowCount, colCount,
        properties: table.properties,
      }, ctx);

      const cellNode = buildCellNode(cell, cellX, rowY, cellWidth, cellHeight, cellFills, idCounter, ctx);
      nodes.push(cellNode);
    }

    rowY += rowHeight;
  }

  return nodes;
}

/**
 * Find the TableStyle for this table from the context's TableStyleList.
 */
function findTableStyle(
  tableStyleId: string | undefined,
  ctx: ConvertContext,
): TableStyle | undefined {
  if (!tableStyleId || !ctx.tableStyles) return undefined;
  return ctx.tableStyles.styles.find((s) => s.id === tableStyleId);
}

/**
 * Resolve the fill paints for a cell.
 *
 * Priority (ECMA-376 §21.1.3.11):
 * 1. Cell-level explicit fill (highest)
 * 2. Table style-based fill (from applicable part styles)
 * 3. Table background fill (tblBg)
 * 4. No fill (transparent)
 */
function resolveCellFills(
  cell: TableCell,
  tableStyle: TableStyle | undefined,
  cellPos: CellPositionContext,
  ctx: ConvertContext,
): readonly FigPaint[] {
  // Priority 1: Explicit cell fill
  if (cell.properties.fill) {
    return dmlFillToFig(cell.properties.fill, ctx.colorContext);
  }

  // Priority 2: Style-derived fill
  if (tableStyle) {
    const parts = getApplicablePartStyles(tableStyle, cellPos);
    const styleFill = resolveFillFromParts(parts);
    if (styleFill) {
      return dmlFillToFig(styleFill, ctx.colorContext);
    }

    // Priority 3: Table background
    if (tableStyle.tblBg) {
      return dmlFillToFig(tableStyle.tblBg, ctx.colorContext);
    }
  }

  return [];
}

function computeSpanWidth(
  colOffsets: number[],
  startCol: number,
  span: number,
  totalCols: number,
): number {
  const endCol = Math.min(startCol + span, totalCols);
  return colOffsets[endCol] - colOffsets[startCol];
}

function computeSpanHeight(
  rows: readonly TableRow[],
  startY: number,
  span: number,
  startRowIdx: number,
): number {
  let height = 0;
  for (let i = 0; i < span && startRowIdx + i < rows.length; i++) {
    height += rows[startRowIdx + i].height;
  }
  return height;
}

/**
 * Build a Fig node for a single table cell.
 *
 * The cell is represented as a RECTANGLE (background) with
 * the cell text as a TEXT child node positioned inside.
 */
function buildCellNode(
  cell: TableCell,
  x: number,
  y: number,
  width: number,
  height: number,
  fills: readonly FigPaint[],
  idCounter: TableIdCounter,
  ctx: ConvertContext,
): FigDesignNode {
  const id = nextId(idCounter);

  // Resolve cell border as stroke.
  // Fig FRAME supports a single stroke, not per-side borders.
  // We pick the first available border line for the cell's stroke.
  const borderResult = resolveCellBorder(cell.properties.borders, ctx);

  const children: FigDesignNode[] = [];

  // Add text content as a child TEXT node
  if (cell.textBody) {
    const textData = convertText(cell.textBody, ctx.fontScheme, ctx.colorContext);
    if (textData) {
      const textId = nextId(idCounter);
      const margins = cell.properties.margins;
      const marginLeft = margins ? (margins.left) : DEFAULT_CELL_MARGIN_LR;
      const marginTop = margins ? (margins.top) : DEFAULT_CELL_MARGIN_TB;
      const marginRight = margins ? (margins.right) : DEFAULT_CELL_MARGIN_LR;
      const marginBottom = margins ? (margins.bottom) : DEFAULT_CELL_MARGIN_TB;

      children.push({
        id: textId as FigNodeId,
        type: "TEXT",
        name: "Cell Text",
        visible: true,
        opacity: 1,
        transform: {
          m00: 1, m01: 0, m02: marginLeft,
          m10: 0, m11: 1, m12: marginTop,
        },
        size: {
          x: width - marginLeft - marginRight,
          y: height - marginTop - marginBottom,
        },
        fills: [],
        strokes: [],
        strokeWeight: 0,
        effects: [],
        textData,
      });
    }
  }

  return {
    id: id as FigNodeId,
    type: "FRAME",
    name: cell.id ?? "Cell",
    visible: true,
    opacity: 1,
    transform: {
      m00: 1, m01: 0, m02: x,
      m10: 0, m11: 1, m12: y,
    },
    size: { x: width, y: height },
    fills,
    strokes: borderResult?.strokePaints ?? [],
    strokeWeight: borderResult?.strokeWeight ?? 0,
    effects: [],
    clipsContent: true,
    children: children.length > 0 ? children : undefined,
  };
}

/**
 * Resolve the first available border line from CellBorders as a Fig stroke.
 *
 * Fig FRAME does not support per-side borders. We pick the first
 * non-empty border (top → right → bottom → left) as the cell's stroke.
 * If borders have different styles on different sides, only the first is used.
 */
function resolveCellBorder(
  borders: CellBorders | undefined,
  ctx: ConvertContext,
): FigStrokeResult | undefined {
  if (!borders) return undefined;

  const candidates: (BaseLine | undefined)[] = [
    borders.top, borders.right, borders.bottom, borders.left,
  ];

  for (const line of candidates) {
    if (!line) continue;
    const result = dmlLineTofig(line, ctx.colorContext);
    if (result) return result;
  }

  return undefined;
}

function nextId(counter: TableIdCounter): string {
  const id = ++counter.value;
  return `0:${id}`;
}
