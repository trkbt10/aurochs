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

import type { Table, TableRow, TableCell, TableColumn } from "@aurochs-office/pptx/domain/table/types";
import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import { dmlFillToFig } from "@aurochs-converters/interop-drawing-ml/dml-to-fig";
import { convertText } from "./text";
import type { ConvertContext } from "./shape";

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
  const columns = table.grid.columns;
  const nodes: FigDesignNode[] = [];

  // Pre-compute column x-offsets
  const colOffsets: number[] = [0];
  for (let c = 0; c < columns.length; c++) {
    colOffsets.push(colOffsets[c] + (columns[c].width as number));
  }

  let rowY = 0;
  for (const row of table.rows) {
    const rowHeight = row.height as number;

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
      const cellHeight = computeSpanHeight(table.rows, rowY, rowSpan, table.rows.indexOf(row));

      const cellNode = buildCellNode(cell, cellX, rowY, cellWidth, cellHeight, idCounter, ctx);
      nodes.push(cellNode);
    }

    rowY += rowHeight;
  }

  return nodes;
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
    height += rows[startRowIdx + i].height as number;
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
  idCounter: TableIdCounter,
  ctx: ConvertContext,
): FigDesignNode {
  const id = nextId(idCounter);
  const fills = cell.properties.fill ? dmlFillToFig(cell.properties.fill, ctx.colorContext) : [];

  const children: FigDesignNode[] = [];

  // Add text content as a child TEXT node
  if (cell.textBody) {
    const textData = convertText(cell.textBody, ctx.fontScheme);
    if (textData) {
      const textId = nextId(idCounter);
      const margins = cell.properties.margins;
      const marginLeft = margins ? (margins.left as number) : 0;
      const marginTop = margins ? (margins.top as number) : 0;
      const marginRight = margins ? (margins.right as number) : 0;
      const marginBottom = margins ? (margins.bottom as number) : 0;

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
    strokes: [],
    strokeWeight: 0,
    effects: [],
    clipsContent: true,
    children: children.length > 0 ? children : undefined,
  };
}

function nextId(counter: TableIdCounter): string {
  const id = ++counter.value;
  return `0:${id}`;
}
