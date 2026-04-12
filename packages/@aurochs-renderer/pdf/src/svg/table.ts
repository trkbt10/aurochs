/**
 * @file PDF Table SVG Renderer
 *
 * Renders PdfTable elements as SVG node trees (rectangles + text).
 */

import type { PdfTable } from "@aurochs/pdf/domain";
import { formatSvgNumber } from "./number-format";
import type { XmlNode } from "@aurochs/xml";
import type { SvgFragment } from "./svg-node";
import { svgRect, svgText } from "./svg-node";
import { serializeSvgFragment } from "./svg-serializer";

/**
 * Render a PdfTable to an SvgFragment (array of SVG nodes).
 *
 * Renders in SVG coordinate space (top-left origin). The table's (x, y) is
 * already in SVG coordinates (converted from PDF bottom-left by the caller).
 */
export function renderPdfTableNode(table: PdfTable, pageHeight: number): SvgFragment {
  const nodes: XmlNode[] = [];
  const borderWidth = table.borderWidth ?? 1;
  const borderColor = table.borderColor ?? "#000000";

  // Table position in SVG coordinates (top-left origin)
  const tableX = table.x;
  const tableY = pageHeight - table.y;

  // Compute total table dimensions for outer border
  const totalWidth = table.columns.reduce((sum, col) => sum + col.width, 0);
  const totalHeight = table.rows.reduce((sum, row) => sum + row.height, 0);

  // Outer border
  nodes.push(
    svgRect({
      x: tableX, y: tableY,
      width: totalWidth, height: totalHeight,
      fill: "none", stroke: borderColor, strokeWidth: borderWidth,
    }),
  );

  // Render rows and cells — accumulate Y offset through rows, X offset through cells
  const cellNodes = table.rows.reduce<{ readonly nodes: XmlNode[]; readonly y: number }>(
    (rowAcc, row) => {
      const rowNodes = row.cells.reduce<{ readonly nodes: XmlNode[]; readonly x: number }>(
        (cellAcc, cell, ci) => {
          const colSpan = cell.colSpan ?? 1;
          const cellWidth = table.columns.slice(ci, ci + colSpan).reduce((sum, col) => sum + col.width, 0);
          const rowSpan = cell.rowSpan ?? 1;
          const cellHeight = row.height * rowSpan;
          const cellX = cellAcc.x;
          const cellY = rowAcc.y;

          const cellNodes: XmlNode[] = [];

          if (cell.backgroundColor) {
            cellNodes.push(svgRect({
              x: cellX, y: cellY, width: cellWidth, height: cellHeight,
              fill: cell.backgroundColor, stroke: "none",
            }));
          }

          cellNodes.push(svgRect({
            x: cellX, y: cellY, width: cellWidth, height: cellHeight,
            fill: "none", stroke: borderColor, strokeWidth: borderWidth * 0.5,
          }));

          if (cell.text) {
            const textX = cellX + 4;
            const textY = computeTextY(cellY, cellHeight, cell.verticalAlignment);
            cellNodes.push(svgText(
              {
                x: formatSvgNumber(textX),
                y: formatSvgNumber(textY),
                "font-size": "10",
                fill: "#000000",
                "dominant-baseline": getDominantBaseline(cell.verticalAlignment),
              },
              cell.text,
            ));
          }

          return {
            nodes: [...cellAcc.nodes, ...cellNodes],
            x: cellX + (table.columns[ci]?.width ?? 0),
          };
        },
        { nodes: [], x: tableX },
      );

      return {
        nodes: [...rowAcc.nodes, ...rowNodes.nodes],
        y: rowAcc.y + row.height,
      };
    },
    { nodes: [], y: tableY },
  );

  return [...nodes, ...cellNodes.nodes];
}

/**
 * Render a PdfTable to SVG markup string (backward compatible).
 */
export function renderPdfTable(table: PdfTable, pageHeight: number): string {
  return serializeSvgFragment(renderPdfTableNode(table, pageHeight));
}

/** Compute text Y position based on vertical alignment. */
function computeTextY(cellY: number, cellHeight: number, alignment?: "top" | "center" | "bottom"): number {
  switch (alignment) {
    case "bottom":
      return cellY + cellHeight - 4;
    case "center":
      return cellY + cellHeight / 2;
    default:
      return cellY + 4;
  }
}

/** Map vertical alignment to SVG dominant-baseline. */
function getDominantBaseline(alignment?: "top" | "center" | "bottom"): string {
  switch (alignment) {
    case "bottom":
      return "text-after-edge";
    case "center":
      return "central";
    default:
      return "text-before-edge";
  }
}
