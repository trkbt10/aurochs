/**
 * @file SVG Table renderer
 *
 * Converts Table domain objects to SVG output using native SVG elements.
 * (foreignObject is not supported by resvg)
 *
 * @see ECMA-376 Part 1, Section 21.1.3 - DrawingML Tables
 */

import type { Fill, Line } from "../../domain/color";
import type { Table, TableCell, TablePartStyle, TableProperties, TableStyle } from "../../domain/table/types";
import {
  resolveSvgRowHeight,
  resolveTableScale,
  resolveSpanCount,
  resolveSpanWidth,
  resolveSpanHeight,
  isFlagEnabled,
} from "../../domain/table/resolver";
import type { Pixels } from "../../domain/index";
import type { ColorContext } from "../../domain/resolution";
import { renderFillToStyle, renderLineToStyle } from "./fill";
import type { RenderOptions } from "../render-options";
import type { TableStyleList } from "../../parser/table/style-parser";

// =============================================================================
// Table Style Resolution
// =============================================================================

/**
 * Cell position context for style resolution
 */
type CellPositionContext = {
  readonly rowIdx: number;
  readonly colIdx: number;
  readonly rowCount: number;
  readonly colCount: number;
  readonly properties: TableProperties;
};

/**
 * Find table style by ID from style list.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.2 (a:tblStyleLst)
 */
function findTableStyle(
  tableStyleId: string | undefined,
  tableStyles: TableStyleList | undefined,
): TableStyle | undefined {
  if (!tableStyleId || !tableStyles) {
    return undefined;
  }

  return tableStyles.styles.find((style) => style.id === tableStyleId);
}

/**
 * Get applicable part styles for a cell based on its position.
 *
 * Per ECMA-376 Part 1, Section 21.1.3.11, styles are layered with priority:
 * 1. wholeTbl (lowest - base style)
 * 2. band1H/band2H or band1V/band2V (banding)
 * 3. firstRow/lastRow/firstCol/lastCol (special regions)
 * 4. corner cells (seCell/swCell/neCell/nwCell) (highest)
 *
 * Higher priority styles override lower priority styles.
 */
function getApplicablePartStyles(
  style: TableStyle,
  ctx: CellPositionContext,
): readonly TablePartStyle[] {
  const parts: TablePartStyle[] = [];
  const { rowIdx, colIdx, rowCount, colCount, properties } = ctx;

  // Layer 1: wholeTbl (base)
  if (style.wholeTbl) {
    parts.push(style.wholeTbl);
  }

  // Layer 2: Banding (mutually exclusive with special row/col in most cases)
  const isFirstRowEnabled = isFlagEnabled(properties.firstRow, rowIdx === 0);
  const isLastRowEnabled = isFlagEnabled(properties.lastRow, rowIdx === rowCount - 1);
  const isFirstColEnabled = isFlagEnabled(properties.firstCol, colIdx === 0);
  const isLastColEnabled = isFlagEnabled(properties.lastCol, colIdx === colCount - 1);

  // Horizontal banding (odd/even rows)
  if (isFlagEnabled(properties.bandRow, true) && !isFirstRowEnabled && !isLastRowEnabled) {
    // band1H = odd rows (1, 3, 5...), band2H = even rows (2, 4, 6...)
    // But we need to adjust for firstRow being special
    const effectiveRowIdx = properties.firstRow ? rowIdx - 1 : rowIdx;
    if (effectiveRowIdx >= 0) {
      const isOddRow = effectiveRowIdx % 2 === 0;
      if (isOddRow && style.band1H) {
        parts.push(style.band1H);
      } else if (!isOddRow && style.band2H) {
        parts.push(style.band2H);
      }
    }
  }

  // Vertical banding (odd/even columns)
  if (isFlagEnabled(properties.bandCol, true) && !isFirstColEnabled && !isLastColEnabled) {
    const effectiveColIdx = properties.firstCol ? colIdx - 1 : colIdx;
    if (effectiveColIdx >= 0) {
      const isOddCol = effectiveColIdx % 2 === 0;
      if (isOddCol && style.band1V) {
        parts.push(style.band1V);
      } else if (!isOddCol && style.band2V) {
        parts.push(style.band2V);
      }
    }
  }

  // Layer 3: Special rows and columns
  if (isFirstRowEnabled && style.firstRow) {
    parts.push(style.firstRow);
  }
  if (isLastRowEnabled && style.lastRow) {
    parts.push(style.lastRow);
  }
  if (isFirstColEnabled && style.firstCol) {
    parts.push(style.firstCol);
  }
  if (isLastColEnabled && style.lastCol) {
    parts.push(style.lastCol);
  }

  // Layer 4: Corner cells (highest priority)
  const isFirstRow = rowIdx === 0 && properties.firstRow;
  const isLastRow = rowIdx === rowCount - 1 && properties.lastRow;
  const isFirstCol = colIdx === 0 && properties.firstCol;
  const isLastCol = colIdx === colCount - 1 && properties.lastCol;

  if (isFirstRow && isFirstCol && style.nwCell) {
    parts.push(style.nwCell);
  }
  if (isFirstRow && isLastCol && style.neCell) {
    parts.push(style.neCell);
  }
  if (isLastRow && isFirstCol && style.swCell) {
    parts.push(style.swCell);
  }
  if (isLastRow && isLastCol && style.seCell) {
    parts.push(style.seCell);
  }

  return parts;
}

/**
 * Resolve cell fill from table style parts.
 * Later parts in the array have higher priority.
 */
function resolveFillFromParts(parts: readonly TablePartStyle[]): Fill | undefined {
  // Iterate in reverse to get highest priority first
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (part.fill) {
      return part.fill;
    }
    // Note: fillReference would need theme style matrix resolution
    // For now, we only support direct fills
  }
  return undefined;
}

/**
 * Resolved borders from table style parts
 */
type ResolvedBorders = {
  readonly insideH?: Line;
  readonly insideV?: Line;
  readonly tlToBr?: Line;
  readonly blToTr?: Line;
};

/**
 * Resolve borders from table style parts.
 * Includes inside borders (insideH, insideV) and diagonal borders (tlToBr, blToTr).
 */
function resolveBordersFromParts(parts: readonly TablePartStyle[]): ResolvedBorders {
  let insideH: Line | undefined;
  let insideV: Line | undefined;
  let tlToBr: Line | undefined;
  let blToTr: Line | undefined;

  // Iterate in order (later has higher priority)
  for (const part of parts) {
    if (part.borders?.insideH) {
      insideH = part.borders.insideH;
    }
    if (part.borders?.insideV) {
      insideV = part.borders.insideV;
    }
    if (part.borders?.tlToBr) {
      tlToBr = part.borders.tlToBr;
    }
    if (part.borders?.blToTr) {
      blToTr = part.borders.blToTr;
    }
  }

  return { insideH, insideV, tlToBr, blToTr };
}

// =============================================================================
// SVG Table Rendering
// =============================================================================

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
 * @param colorContext - Color context for resolving colors
 * @param options - Render options
 * @param tableStyles - Table styles from ppt/tableStyles.xml
 *
 * @see ECMA-376 Part 1, Section 21.1.3.5 (a:gridCol)
 * @see ECMA-376 Part 1, Section 21.1.3.16 (a:tr)
 */
export function renderTableSvg(
  table: Table,
  frameWidth: Pixels,
  frameHeight: Pixels,
  colorContext: ColorContext,
  options?: RenderOptions,
  tableStyles?: TableStyleList,
): string {
  const { properties, grid, rows } = table;

  const columnWidths = grid.columns.map((c) => c.width as number);
  const totalWidth = columnWidths.reduce((sum, w) => sum + w, 0);

  const DEFAULT_MIN_ROW_HEIGHT = 20;
  const rowHeights = rows.map((row) => resolveSvgRowHeight(row, DEFAULT_MIN_ROW_HEIGHT));
  const totalHeight = rowHeights.reduce((sum, h) => sum + h, 0);

  const xfrmWidth = frameWidth as number;
  const xfrmHeight = frameHeight as number;
  const tableScalingMode = options?.tableScalingMode ?? "natural";
  const { scaleX, scaleY } = resolveTableScale(
    tableScalingMode,
    totalWidth,
    totalHeight,
    xfrmWidth,
    xfrmHeight,
  );

  const elements: string[] = [];

  // Look up table style by ID
  const tableStyle = findTableStyle(properties.tableStyleId, tableStyles);

  // Row and column counts for position context
  const rowCount = rows.length;
  const colCount = grid.columns.length;

  if (properties.fill) {
    const fillStyle = renderFillToStyle(properties.fill, colorContext);
    elements.push(
      `<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="${fillStyle.fill}"${
        fillStyle.fillOpacity !== undefined ? ` fill-opacity="${fillStyle.fillOpacity}"` : ""
      }/>`,
    );
  }

  const cursor = { x: 0, y: 0 };
  rows.forEach((row, rowIdx) => {
    const rowHeight = rowHeights[rowIdx];
    cursor.x = 0;

    row.cells.forEach((cell, colIdx) => {
      const cellWidth = columnWidths[colIdx] ?? 100;
      const { properties: cellProps } = cell;

      if (cellProps.horizontalMerge || cellProps.verticalMerge) {
        cursor.x += cellWidth;
        return;
      }

      const colSpan = resolveSpanCount(cellProps.colSpan);
      const rowSpan = resolveSpanCount(cellProps.rowSpan);
      const spanWidth = resolveSpanWidth(columnWidths, colIdx, colSpan, cellWidth);
      const spanHeight = resolveSpanHeight(rowHeights, rowIdx, rowSpan, rowHeight);

      // Create position context for style resolution
      const positionContext: CellPositionContext = {
        rowIdx,
        colIdx,
        rowCount,
        colCount,
        properties,
      };

      const cellFillStyle = resolveCellFillStyle({
        cellProps,
        colorContext,
        positionContext,
        tableStyle,
      });

      elements.push(
        `<rect x="${cursor.x}" y="${cursor.y}" width="${spanWidth}" height="${spanHeight}" fill="${cellFillStyle.fill}"${
          cellFillStyle.opacity !== undefined ? ` fill-opacity="${cellFillStyle.opacity}"` : ""
        }/>`,
      );

      // Resolve borders from table style (inside and diagonal)
      const styleParts = tableStyle ? getApplicablePartStyles(tableStyle, positionContext) : [];
      const styleBorders = resolveBordersFromParts(styleParts);

      // Determine if this cell is on an inside edge (not outer edge of table)
      const isNotLastRow = rowIdx + rowSpan < rowCount;
      const isNotLastCol = colIdx + colSpan < colCount;
      const isNotFirstRow = rowIdx > 0;
      const isNotFirstCol = colIdx > 0;

      if (cellProps.borders) {
        const { left, right, top, bottom, tlToBr, blToTr } = cellProps.borders;

        if (top) {
          const lineStyle = renderLineToStyle(top, colorContext);
          elements.push(
            `<line x1="${cursor.x}" y1="${cursor.y}" x2="${cursor.x + spanWidth}" y2="${cursor.y}" stroke="${lineStyle.stroke}" stroke-width="${lineStyle.strokeWidth}"/>`,
          );
        }
        if (bottom) {
          const lineStyle = renderLineToStyle(bottom, colorContext);
          elements.push(
            `<line x1="${cursor.x}" y1="${cursor.y + spanHeight}" x2="${cursor.x + spanWidth}" y2="${cursor.y + spanHeight}" stroke="${lineStyle.stroke}" stroke-width="${lineStyle.strokeWidth}"/>`,
          );
        }
        if (left) {
          const lineStyle = renderLineToStyle(left, colorContext);
          elements.push(
            `<line x1="${cursor.x}" y1="${cursor.y}" x2="${cursor.x}" y2="${cursor.y + spanHeight}" stroke="${lineStyle.stroke}" stroke-width="${lineStyle.strokeWidth}"/>`,
          );
        }
        if (right) {
          const lineStyle = renderLineToStyle(right, colorContext);
          elements.push(
            `<line x1="${cursor.x + spanWidth}" y1="${cursor.y}" x2="${cursor.x + spanWidth}" y2="${cursor.y + spanHeight}" stroke="${lineStyle.stroke}" stroke-width="${lineStyle.strokeWidth}"/>`,
          );
        }

        // Diagonal borders
        // tlToBr: Top-left to bottom-right diagonal
        if (tlToBr) {
          const lineStyle = renderLineToStyle(tlToBr, colorContext);
          elements.push(
            `<line x1="${cursor.x}" y1="${cursor.y}" x2="${cursor.x + spanWidth}" y2="${cursor.y + spanHeight}" stroke="${lineStyle.stroke}" stroke-width="${lineStyle.strokeWidth}"/>`,
          );
        }
        // blToTr: Bottom-left to top-right diagonal
        if (blToTr) {
          const lineStyle = renderLineToStyle(blToTr, colorContext);
          elements.push(
            `<line x1="${cursor.x}" y1="${cursor.y + spanHeight}" x2="${cursor.x + spanWidth}" y2="${cursor.y}" stroke="${lineStyle.stroke}" stroke-width="${lineStyle.strokeWidth}"/>`,
          );
        }
      } else {
        // No explicit cell borders - render inside borders from style if available
        // Top inside border (if not first row and insideH is defined)
        if (isNotFirstRow && styleBorders.insideH) {
          const lineStyle = renderLineToStyle(styleBorders.insideH, colorContext);
          elements.push(
            `<line x1="${cursor.x}" y1="${cursor.y}" x2="${cursor.x + spanWidth}" y2="${cursor.y}" stroke="${lineStyle.stroke}" stroke-width="${lineStyle.strokeWidth}"/>`,
          );
        }

        // Bottom inside border (if not last row and insideH is defined)
        if (isNotLastRow && styleBorders.insideH) {
          const lineStyle = renderLineToStyle(styleBorders.insideH, colorContext);
          elements.push(
            `<line x1="${cursor.x}" y1="${cursor.y + spanHeight}" x2="${cursor.x + spanWidth}" y2="${cursor.y + spanHeight}" stroke="${lineStyle.stroke}" stroke-width="${lineStyle.strokeWidth}"/>`,
          );
        }

        // Left inside border (if not first column and insideV is defined)
        if (isNotFirstCol && styleBorders.insideV) {
          const lineStyle = renderLineToStyle(styleBorders.insideV, colorContext);
          elements.push(
            `<line x1="${cursor.x}" y1="${cursor.y}" x2="${cursor.x}" y2="${cursor.y + spanHeight}" stroke="${lineStyle.stroke}" stroke-width="${lineStyle.strokeWidth}"/>`,
          );
        }

        // Right inside border (if not last column and insideV is defined)
        if (isNotLastCol && styleBorders.insideV) {
          const lineStyle = renderLineToStyle(styleBorders.insideV, colorContext);
          elements.push(
            `<line x1="${cursor.x + spanWidth}" y1="${cursor.y}" x2="${cursor.x + spanWidth}" y2="${cursor.y + spanHeight}" stroke="${lineStyle.stroke}" stroke-width="${lineStyle.strokeWidth}"/>`,
          );
        }

        // Diagonal borders from style
        if (styleBorders.tlToBr) {
          const lineStyle = renderLineToStyle(styleBorders.tlToBr, colorContext);
          elements.push(
            `<line x1="${cursor.x}" y1="${cursor.y}" x2="${cursor.x + spanWidth}" y2="${cursor.y + spanHeight}" stroke="${lineStyle.stroke}" stroke-width="${lineStyle.strokeWidth}"/>`,
          );
        }
        if (styleBorders.blToTr) {
          const lineStyle = renderLineToStyle(styleBorders.blToTr, colorContext);
          elements.push(
            `<line x1="${cursor.x}" y1="${cursor.y + spanHeight}" x2="${cursor.x + spanWidth}" y2="${cursor.y}" stroke="${lineStyle.stroke}" stroke-width="${lineStyle.strokeWidth}"/>`,
          );
        }

        // Fallback: if no style borders are defined and no cell borders, render default
        if (!styleBorders.insideH && !styleBorders.insideV && !styleBorders.tlToBr && !styleBorders.blToTr) {
          elements.push(
            `<rect x="${cursor.x}" y="${cursor.y}" width="${spanWidth}" height="${spanHeight}" fill="none" stroke="#AAAAAA" stroke-width="0.5"/>`,
          );
        }
      }

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

          // Apply cell margins (default: 9.6px ≈ 91440 EMU / 9525)
          const margins = cellProps.margins ?? { left: 9.6, right: 9.6, top: 9.6, bottom: 9.6 };

          // Handle vertical text types
          const verticalType = cellProps.verticalType ?? "horz";
          const textFill = resolveTextFill(positionContext, tableStyle, colorContext);

          if (verticalType === "vert" || verticalType === "eaVert") {
            // Rotate 90 degrees clockwise
            // Position text at right edge, center vertically, then rotate around that point
            const textX = cursor.x + spanWidth - (margins.right as number) - fontSize / 2;
            const textY = cursor.y + (margins.top as number);

            elements.push(
              `<text x="${textX}" y="${textY}" font-size="${fontSize}px" font-family="sans-serif" fill="${textFill}" transform="rotate(90, ${textX}, ${textY})">${escapeXmlText(textContent)}</text>`,
            );
          } else if (verticalType === "vert270") {
            // Rotate 270 degrees (or -90 degrees)
            // Position text at left edge, bottom, then rotate around that point
            const textX = cursor.x + (margins.left as number) + fontSize / 2;
            const textY = cursor.y + spanHeight - (margins.bottom as number);

            elements.push(
              `<text x="${textX}" y="${textY}" font-size="${fontSize}px" font-family="sans-serif" fill="${textFill}" transform="rotate(-90, ${textX}, ${textY})">${escapeXmlText(textContent)}</text>`,
            );
          } else if (verticalType === "wordArtVert" || verticalType === "mongolianVert") {
            // Stack characters vertically (one per line)
            // Each character is rendered separately with increasing Y offset
            const chars = [...textContent];
            const charSpacing = fontSize * 1.2;
            const startX = cursor.x + spanWidth / 2;
            const startY = cursor.y + (margins.top as number) + fontSize;

            chars.forEach((char, idx) => {
              const charY = startY + idx * charSpacing;
              // Only render if within cell bounds
              if (charY < cursor.y + spanHeight - (margins.bottom as number)) {
                elements.push(
                  `<text x="${startX}" y="${charY}" font-size="${fontSize}px" font-family="sans-serif" fill="${textFill}" text-anchor="middle">${escapeXmlText(char)}</text>`,
                );
              }
            });
          } else {
            // Default horizontal text
            const textX = cursor.x + (margins.left as number);

            // Apply cell anchor (vertical alignment)
            const anchor = cellProps.anchor ?? "center";
            let textY: number;
            switch (anchor) {
              case "top":
                textY = cursor.y + (margins.top as number) + fontSize;
                break;
              case "bottom":
                textY = cursor.y + spanHeight - (margins.bottom as number);
                break;
              case "center":
              default:
                textY = cursor.y + spanHeight / 2 + fontSize / 3;
                break;
            }

            elements.push(
              `<text x="${textX}" y="${textY}" font-size="${fontSize}px" font-family="sans-serif" fill="${textFill}">${escapeXmlText(textContent)}</text>`,
            );
          }
        }
      }

      cursor.x += cellWidth;
    });
    cursor.y += rowHeight;
  });

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

/**
 * Resolved cell style context for style resolution
 */
type CellStyleContext = {
  readonly cellProps: TableCell["properties"];
  readonly colorContext: ColorContext;
  readonly positionContext: CellPositionContext;
  readonly tableStyle: TableStyle | undefined;
};

function resolveCellFillStyle(
  ctx: CellStyleContext,
): { fill: string; opacity: number | undefined } {
  const { cellProps, colorContext, positionContext, tableStyle } = ctx;
  const { rowIdx, properties } = positionContext;

  // Priority 1: Cell-level explicit fill
  if (cellProps.fill) {
    const fillStyle = renderFillToStyle(cellProps.fill, colorContext);
    return { fill: fillStyle.fill, opacity: fillStyle.fillOpacity };
  }

  // Priority 2: Table style-based fill
  if (tableStyle) {
    const parts = getApplicablePartStyles(tableStyle, positionContext);
    const styleFill = resolveFillFromParts(parts);
    if (styleFill) {
      const fillStyle = renderFillToStyle(styleFill, colorContext);
      return { fill: fillStyle.fill, opacity: fillStyle.fillOpacity };
    }

    // Use table background if no part fill
    if (tableStyle.tblBg) {
      const fillStyle = renderFillToStyle(tableStyle.tblBg, colorContext);
      return { fill: fillStyle.fill, opacity: fillStyle.fillOpacity };
    }
  }

  // Priority 3: Default fallback colors (when no style is defined)
  const isFirstRowEnabled = isFlagEnabled(properties.firstRow, rowIdx === 0);
  const isBandRowEnabled = isFlagEnabled(properties.bandRow, rowIdx % 2 === 1);

  if (isFirstRowEnabled) {
    return { fill: "#4F81BD", opacity: undefined };
  }

  if (isBandRowEnabled) {
    return { fill: "#DCE6F1", opacity: undefined };
  }

  const fill = rowIdx % 2 === 0 ? "#FFFFFF" : "#F2F2F2";
  return { fill, opacity: undefined };
}

/**
 * Resolve text fill color based on table style
 */
function resolveTextFill(
  positionContext: CellPositionContext,
  tableStyle: TableStyle | undefined,
  colorContext: ColorContext,
): string {
  if (tableStyle) {
    const parts = getApplicablePartStyles(tableStyle, positionContext);
    // Check for text properties with font reference color
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      if (part.textProperties?.fontReference?.color) {
        const fillStyle = renderFillToStyle(part.textProperties.fontReference.color, colorContext);
        return fillStyle.fill;
      }
    }
  }

  // Fallback: white text for first row, black for others
  const isFirstRowEnabled = isFlagEnabled(
    positionContext.properties.firstRow,
    positionContext.rowIdx === 0,
  );
  return isFirstRowEnabled ? "#FFFFFF" : "#000000";
}
