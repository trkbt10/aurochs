/**
 * @file PDF Table SVG Renderer
 *
 * Renders PdfTable elements as SVG rectangles (cell borders/backgrounds) + text.
 */

import type { PdfTable } from "@aurochs/pdf/domain";
import { formatSvgNumber } from "./number-format";
import { escapeXmlText } from "./xml-escape";

/**
 * Render a PdfTable to SVG markup.
 *
 * Renders in SVG coordinate space (top-left origin). The table's (x, y) is
 * already in SVG coordinates (converted from PDF bottom-left by the caller).
 */
export function renderPdfTable(table: PdfTable, pageHeight: number): string {
  const parts: string[] = [];
  const borderWidth = table.borderWidth ?? 1;
  const borderColor = table.borderColor ?? "#000000";

  // Table position in SVG coordinates (top-left origin)
  const tableX = table.x;
  const tableY = pageHeight - table.y;

  // Compute total table dimensions for outer border
  const totalWidth = table.columns.reduce((sum, col) => sum + col.width, 0);
  const totalHeight = table.rows.reduce((sum, row) => sum + row.height, 0);

  // Outer border
  parts.push(
    `<rect x="${formatSvgNumber(tableX)}" y="${formatSvgNumber(tableY)}"` +
    ` width="${formatSvgNumber(totalWidth)}" height="${formatSvgNumber(totalHeight)}"` +
    ` fill="none" stroke="${borderColor}" stroke-width="${formatSvgNumber(borderWidth)}" />`,
  );

  // Render rows and cells
  // eslint-disable-next-line no-restricted-syntax -- accumulator for Y offset
  let currentY = tableY;

  for (const row of table.rows) {
    // eslint-disable-next-line no-restricted-syntax -- accumulator for X offset
    let currentX = tableX;

    for (let ci = 0; ci < row.cells.length; ci++) {
      const cell = row.cells[ci];
      const colSpan = cell.colSpan ?? 1;

      // Compute cell width (sum of spanned columns)
      // eslint-disable-next-line no-restricted-syntax -- accumulator for width
      let cellWidth = 0;
      for (let s = 0; s < colSpan && ci + s < table.columns.length; s++) {
        cellWidth += table.columns[ci + s].width;
      }

      const rowSpan = cell.rowSpan ?? 1;
      // eslint-disable-next-line no-restricted-syntax -- accumulator for height
      let cellHeight = row.height;
      if (rowSpan > 1) {
        // Sum heights of spanned rows (approximate - uses current row context)
        cellHeight = row.height * rowSpan;
      }

      // Cell background
      if (cell.backgroundColor) {
        parts.push(
          `<rect x="${formatSvgNumber(currentX)}" y="${formatSvgNumber(currentY)}"` +
          ` width="${formatSvgNumber(cellWidth)}" height="${formatSvgNumber(cellHeight)}"` +
          ` fill="${cell.backgroundColor}" stroke="none" />`,
        );
      }

      // Cell border
      parts.push(
        `<rect x="${formatSvgNumber(currentX)}" y="${formatSvgNumber(currentY)}"` +
        ` width="${formatSvgNumber(cellWidth)}" height="${formatSvgNumber(cellHeight)}"` +
        ` fill="none" stroke="${borderColor}" stroke-width="${formatSvgNumber(borderWidth * 0.5)}" />`,
      );

      // Cell text
      if (cell.text) {
        const textX = currentX + 4; // Left padding
        const textY = computeTextY(currentY, cellHeight, cell.verticalAlignment);

        parts.push(
          `<text x="${formatSvgNumber(textX)}" y="${formatSvgNumber(textY)}"` +
          ` font-size="10" fill="#000000" dominant-baseline="${getDominantBaseline(cell.verticalAlignment)}"` +
          `>${escapeXmlText(cell.text)}</text>`,
        );
      }

      currentX += table.columns[ci]?.width ?? 0;
    }

    currentY += row.height;
  }

  return parts.join("");
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
