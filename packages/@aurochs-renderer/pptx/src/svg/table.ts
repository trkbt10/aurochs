/**
 * @file SVG Table renderer
 *
 * Converts Table domain objects to SVG output using native SVG elements.
 * (foreignObject is not supported by resvg)
 *
 * @see ECMA-376 Part 1, Section 21.1.3 - DrawingML Tables
 */

import type { Fill, Line } from "@aurochs-office/pptx/domain/color/types";
import type {
  Table,
  TableCell,
  TablePartStyle,
  TableProperties,
  TableStyle,
} from "@aurochs-office/pptx/domain/table/types";
import {
  resolveSvgRowHeight,
  resolveTableScale,
  resolveSpanCount,
  resolveSpanWidth,
  resolveSpanHeight,
  isFlagEnabled,
} from "@aurochs-office/pptx/domain/table/resolver";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import { renderFillToStyle, renderLineToStyle } from "./fill";
import type { CoreRenderContext } from "../render-context";
import type { RenderOptions } from "../render-options";
import type { TableStyleList } from "@aurochs-office/pptx/parser/table/style-parser";
import type { SvgDefsCollector } from "./slide-utils";
import { renderTextSvg } from "./slide-text";

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
function getApplicablePartStyles(style: TableStyle, ctx: CellPositionContext): readonly TablePartStyle[] {
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
  // Iterate in order (later has higher priority)
  return parts.reduce<ResolvedBorders>(
    (acc, part) => ({
      insideH: part.borders?.insideH ?? acc.insideH,
      insideV: part.borders?.insideV ?? acc.insideV,
      tlToBr: part.borders?.tlToBr ?? acc.tlToBr,
      blToTr: part.borders?.blToTr ?? acc.blToTr,
    }),
    { insideH: undefined, insideV: undefined, tlToBr: undefined, blToTr: undefined },
  );
}

function lineStyleToSvgAttrs(lineStyle: ReturnType<typeof renderLineToStyle>): string {
  const attrs: string[] = [`stroke="${lineStyle.stroke}"`, `stroke-width="${lineStyle.strokeWidth}"`];
  if (lineStyle.strokeOpacity !== undefined) {
    attrs.push(`stroke-opacity="${lineStyle.strokeOpacity}"`);
  }
  if (lineStyle.strokeLinecap) {
    attrs.push(`stroke-linecap="${lineStyle.strokeLinecap}"`);
  }
  if (lineStyle.strokeLinejoin) {
    attrs.push(`stroke-linejoin="${lineStyle.strokeLinejoin}"`);
  }
  if (lineStyle.strokeDasharray) {
    attrs.push(`stroke-dasharray="${lineStyle.strokeDasharray}"`);
  }
  if (lineStyle.markerStart) {
    attrs.push(`marker-start="${lineStyle.markerStart}"`);
  }
  if (lineStyle.markerEnd) {
    attrs.push(`marker-end="${lineStyle.markerEnd}"`);
  }
  return attrs.join(" ");
}

function renderAxisAlignedLineAsRect({
  x1,
  y1,
  x2,
  y2,
  lineStyle,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lineStyle: ReturnType<typeof renderLineToStyle>;
}): string | null {
  // Only for solid, axis-aligned lines. Dashes and diagonals must remain strokes.
  if (lineStyle.stroke === "none") {
    return null;
  }
  if (lineStyle.strokeDasharray !== undefined) {
    return null;
  }
  const w = lineStyle.strokeWidth;
  if (!(w > 0)) {
    return null;
  }
  const opacity = lineStyle.strokeOpacity !== undefined ? ` fill-opacity="${lineStyle.strokeOpacity}"` : "";

  if (x1 === x2) {
    const y = Math.min(y1, y2);
    const h = Math.abs(y2 - y1);
    const x = x1 - w / 2;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${lineStyle.stroke}"${opacity}/>`;
  }
  if (y1 === y2) {
    const x = Math.min(x1, x2);
    const width = Math.abs(x2 - x1);
    const y = y1 - w / 2;
    return `<rect x="${x}" y="${y}" width="${width}" height="${w}" fill="${lineStyle.stroke}"${opacity}/>`;
  }
  return null;
}

type BorderSegment = {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly style: ReturnType<typeof renderLineToStyle>;
};

function borderSegmentKey(seg: BorderSegment): string {
  const w = seg.style.strokeWidth;
  const snap = (n: number): string => n.toFixed(4);
  if (seg.x1 === seg.x2) {
    const x = seg.x1;
    const y0 = Math.min(seg.y1, seg.y2);
    const y1 = Math.max(seg.y1, seg.y2);
    return `V:${snap(x)}:${snap(y0)}:${snap(y1)}:${snap(w)}`;
  }
  if (seg.y1 === seg.y2) {
    const y = seg.y1;
    const x0 = Math.min(seg.x1, seg.x2);
    const x1 = Math.max(seg.x1, seg.x2);
    return `H:${snap(y)}:${snap(x0)}:${snap(x1)}:${snap(w)}`;
  }
  // Diagonal/other: normalize endpoint order.
  const a = `${snap(seg.x1)}:${snap(seg.y1)}`;
  const b = `${snap(seg.x2)}:${snap(seg.y2)}`;
  return a < b ? `D:${a}:${b}:${snap(w)}` : `D:${b}:${a}:${snap(w)}`;
}

function pickPreferredBorderSegment(a: BorderSegment, b: BorderSegment): BorderSegment {
  // Prefer wider strokes; if equal width, prefer opaque strokes; otherwise keep existing.
  if (b.style.strokeWidth > a.style.strokeWidth) {
    return b;
  }
  if (b.style.strokeWidth < a.style.strokeWidth) {
    return a;
  }
  const aOp = a.style.strokeOpacity ?? 1;
  const bOp = b.style.strokeOpacity ?? 1;
  if (bOp > aOp) {
    return b;
  }
  return a;
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
export function renderTableSvg({
  table,
  frameWidth,
  frameHeight,
  ctx,
  defsCollector,
  options,
  tableStyles,
}: {
  table: Table;
  frameWidth: Pixels;
  frameHeight: Pixels;
  ctx: CoreRenderContext;
  defsCollector: SvgDefsCollector;
  options?: RenderOptions;
  tableStyles?: TableStyleList;
}): string {
  const { properties, grid, rows } = table;

  const columnWidths = grid.columns.map((c) => c.width as number);
  const totalWidth = columnWidths.reduce((sum, w) => sum + w, 0);

  const DEFAULT_MIN_ROW_HEIGHT = 20;
  const rowHeights = rows.map((row) => resolveSvgRowHeight(row, DEFAULT_MIN_ROW_HEIGHT));
  const totalHeight = rowHeights.reduce((sum, h) => sum + h, 0);

  const xfrmWidth = frameWidth as number;
  const xfrmHeight = frameHeight as number;
  const tableScalingMode = options?.tableScalingMode ?? "natural";
  const { scaleX, scaleY } = resolveTableScale({
    mode: tableScalingMode,
    totalWidth,
    totalHeight,
    frameWidth: xfrmWidth,
    frameHeight: xfrmHeight,
  });

  const fillElements: string[] = [];
  const textElements: string[] = [];
  const borderSegments = new Map<string, BorderSegment>();

  // Look up table style by ID
  const tableStyle = findTableStyle(properties.tableStyleId, tableStyles);

  // Row and column counts for position context
  const rowCount = rows.length;
  const colCount = grid.columns.length;

  if (properties.fill) {
    const fillStyle = renderFillToStyle(properties.fill, ctx.colorContext);
    fillElements.push(
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
      const spanWidth = resolveSpanWidth({ columnWidths, colIdx, span: colSpan, fallbackWidth: cellWidth });
      const spanHeight = resolveSpanHeight({ rowHeights, rowIdx, span: rowSpan, fallbackHeight: rowHeight });

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
        colorContext: ctx.colorContext,
        positionContext,
        tableStyle,
      });

      fillElements.push(
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

      const addBorder = ({
        x1,
        y1,
        x2,
        y2,
        lineStyle,
      }: {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        lineStyle: ReturnType<typeof renderLineToStyle>;
      }) => {
        if (lineStyle.stroke === "none") {
          return;
        }
        const seg: BorderSegment = { x1, y1, x2, y2, style: lineStyle };
        const key = borderSegmentKey(seg);
        const prev = borderSegments.get(key);
        if (!prev) {
          borderSegments.set(key, seg);
          return;
        }
        borderSegments.set(key, pickPreferredBorderSegment(prev, seg));
      };

      if (cellProps.borders) {
        const { left, right, top, bottom, tlToBr, blToTr } = cellProps.borders;

        if (top) {
          const lineStyle = renderLineToStyle(top, ctx.colorContext);
          addBorder({ x1: cursor.x, y1: cursor.y, x2: cursor.x + spanWidth, y2: cursor.y, lineStyle });
        }
        if (bottom) {
          const lineStyle = renderLineToStyle(bottom, ctx.colorContext);
          const y = cursor.y + spanHeight;
          addBorder({ x1: cursor.x, y1: y, x2: cursor.x + spanWidth, y2: y, lineStyle });
        }
        if (left) {
          const lineStyle = renderLineToStyle(left, ctx.colorContext);
          addBorder({ x1: cursor.x, y1: cursor.y, x2: cursor.x, y2: cursor.y + spanHeight, lineStyle });
        }
        if (right) {
          const lineStyle = renderLineToStyle(right, ctx.colorContext);
          const x = cursor.x + spanWidth;
          addBorder({ x1: x, y1: cursor.y, x2: x, y2: cursor.y + spanHeight, lineStyle });
        }

        // Diagonal borders
        // tlToBr: Top-left to bottom-right diagonal
        if (tlToBr) {
          const lineStyle = renderLineToStyle(tlToBr, ctx.colorContext);
          addBorder({ x1: cursor.x, y1: cursor.y, x2: cursor.x + spanWidth, y2: cursor.y + spanHeight, lineStyle });
        }
        // blToTr: Bottom-left to top-right diagonal
        if (blToTr) {
          const lineStyle = renderLineToStyle(blToTr, ctx.colorContext);
          addBorder({ x1: cursor.x, y1: cursor.y + spanHeight, x2: cursor.x + spanWidth, y2: cursor.y, lineStyle });
        }
      } else {
        // No explicit cell borders - render inside borders from style if available
        // Top inside border (if not first row and insideH is defined)
        if (isNotFirstRow && styleBorders.insideH) {
          const lineStyle = renderLineToStyle(styleBorders.insideH, ctx.colorContext);
          addBorder({ x1: cursor.x, y1: cursor.y, x2: cursor.x + spanWidth, y2: cursor.y, lineStyle });
        }

        // Bottom inside border (if not last row and insideH is defined)
        if (isNotLastRow && styleBorders.insideH) {
          const lineStyle = renderLineToStyle(styleBorders.insideH, ctx.colorContext);
          const y = cursor.y + spanHeight;
          addBorder({ x1: cursor.x, y1: y, x2: cursor.x + spanWidth, y2: y, lineStyle });
        }

        // Left inside border (if not first column and insideV is defined)
        if (isNotFirstCol && styleBorders.insideV) {
          const lineStyle = renderLineToStyle(styleBorders.insideV, ctx.colorContext);
          addBorder({ x1: cursor.x, y1: cursor.y, x2: cursor.x, y2: cursor.y + spanHeight, lineStyle });
        }

        // Right inside border (if not last column and insideV is defined)
        if (isNotLastCol && styleBorders.insideV) {
          const lineStyle = renderLineToStyle(styleBorders.insideV, ctx.colorContext);
          const x = cursor.x + spanWidth;
          addBorder({ x1: x, y1: cursor.y, x2: x, y2: cursor.y + spanHeight, lineStyle });
        }

        // Diagonal borders from style
        if (styleBorders.tlToBr) {
          const lineStyle = renderLineToStyle(styleBorders.tlToBr, ctx.colorContext);
          addBorder({ x1: cursor.x, y1: cursor.y, x2: cursor.x + spanWidth, y2: cursor.y + spanHeight, lineStyle });
        }
        if (styleBorders.blToTr) {
          const lineStyle = renderLineToStyle(styleBorders.blToTr, ctx.colorContext);
          addBorder({ x1: cursor.x, y1: cursor.y + spanHeight, x2: cursor.x + spanWidth, y2: cursor.y, lineStyle });
        }

        // Fallback: if no style borders are defined and no cell borders, render default
        if (!styleBorders.insideH && !styleBorders.insideV && !styleBorders.tlToBr && !styleBorders.blToTr) {
          addBorder({
            x1: cursor.x,
            y1: cursor.y,
            x2: cursor.x + spanWidth,
            y2: cursor.y,
            lineStyle: { stroke: "#AAAAAA", strokeWidth: 0.5 },
          });
          addBorder({
            x1: cursor.x,
            y1: cursor.y + spanHeight,
            x2: cursor.x + spanWidth,
            y2: cursor.y + spanHeight,
            lineStyle: { stroke: "#AAAAAA", strokeWidth: 0.5 },
          });
          addBorder({
            x1: cursor.x,
            y1: cursor.y,
            x2: cursor.x,
            y2: cursor.y + spanHeight,
            lineStyle: { stroke: "#AAAAAA", strokeWidth: 0.5 },
          });
          addBorder({
            x1: cursor.x + spanWidth,
            y1: cursor.y,
            x2: cursor.x + spanWidth,
            y2: cursor.y + spanHeight,
            lineStyle: { stroke: "#AAAAAA", strokeWidth: 0.5 },
          });
        }
      }

      if (cell.textBody && cell.textBody.paragraphs.length > 0) {
        const margins = cellProps.margins ?? { left: 9.6, right: 9.6, top: 9.6, bottom: 9.6 };
        const innerW = Math.max(0, spanWidth - (margins.left as number) - (margins.right as number));
        const innerH = Math.max(0, spanHeight - (margins.top as number) - (margins.bottom as number));

        if (innerW > 0.1 && innerH > 0.1) {
          const textBody = {
            ...cell.textBody,
            bodyProperties: {
              ...cell.textBody.bodyProperties,
              ...(cellProps.anchor ? { anchor: cellProps.anchor } : {}),
              ...(cellProps.verticalType ? { verticalType: cellProps.verticalType } : {}),
              overflow: (cellProps.horzOverflow === "clip" ? "clip" : cell.textBody.bodyProperties.overflow) as
                | "clip"
                | "overflow"
                | undefined,
              verticalOverflow: "clip" as const,
            },
          };

          const svg = renderTextSvg({ textBody, ctx, boxWidth: innerW, boxHeight: innerH, defsCollector });
          if (svg) {
            const tx = cursor.x + (margins.left as number);
            const ty = cursor.y + (margins.top as number);
            textElements.push(`<g transform="translate(${tx}, ${ty})">${svg}</g>`);
          }
        }
      }

      cursor.x += cellWidth;
    });
    cursor.y += rowHeight;
  });

  const borderElements: string[] = [];
  const ordered = [...borderSegments.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [, seg] of ordered) {
    const asRect = renderAxisAlignedLineAsRect({
      x1: seg.x1,
      y1: seg.y1,
      x2: seg.x2,
      y2: seg.y2,
      lineStyle: seg.style,
    });
    if (asRect) {
      borderElements.push(asRect);
      continue;
    }
    const attrs = lineStyleToSvgAttrs(seg.style);
    borderElements.push(`<line x1="${seg.x1}" y1="${seg.y1}" x2="${seg.x2}" y2="${seg.y2}" ${attrs}/>`);
  }

  return `<g transform="scale(${scaleX}, ${scaleY})">${[...fillElements, ...borderElements, ...textElements].join("\n")}</g>`;
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

function resolveCellFillStyle(ctx: CellStyleContext): { fill: string; opacity: number | undefined } {
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
