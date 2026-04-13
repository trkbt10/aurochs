/**
 * @file Table resolution utilities
 *
 * Shared utilities for table dimension and layout calculations.
 *
 * @see ECMA-376 Part 1, Section 21.1.3 - DrawingML Tables
 */

import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { TableRow, TableStyle, TablePartStyle, TableProperties } from "./types";

// =============================================================================
// Types
// =============================================================================

/**
 * Table scaling result
 */
export type TableScaleResult = {
  readonly scaleX: number;
  readonly scaleY: number;
};

/**
 * Table scaling mode
 *
 * Controls how tables are sized when their natural dimensions
 * differ from the graphicFrame's xfrm.
 *
 * - natural: Use table's natural size (ECMA-376 compliant)
 * - stretchToFit: Scale to fill xfrm (PowerPoint-like)
 * - uniformFit: Scale uniformly to fit xfrm (preserves aspect ratio)
 */
export type TableScalingMode = "natural" | "stretchToFit" | "uniformFit";

export type ResolveTableScaleOptions = {
  readonly mode: TableScalingMode;
  readonly totalWidth: number;
  readonly totalHeight: number;
  readonly frameWidth: number;
  readonly frameHeight: number;
};

export type ResolveSpanWidthOptions = {
  readonly columnWidths: readonly number[];
  readonly colIdx: number;
  readonly span: number;
  readonly fallbackWidth: number;
};

export type ResolveSpanHeightOptions = {
  readonly rowHeights: readonly number[];
  readonly rowIdx: number;
  readonly span: number;
  readonly fallbackHeight: number;
};

// =============================================================================
// Row Height Resolution
// =============================================================================

/**
 * Resolve row height for HTML rendering.
 * Returns undefined if height is not explicitly set.
 */
export function resolveRowHeight(row: TableRow): number | undefined {
  if (row.height !== undefined && (row.height as number) > 0) {
    return row.height as number;
  }
  return undefined;
}

/**
 * Resolve row height for SVG rendering.
 * Returns default height if not explicitly set (SVG requires explicit dimensions).
 */
export function resolveSvgRowHeight(row: TableRow, defaultHeight: number): number {
  const height = row.height as number;
  if (height > 0) {
    return height;
  }
  return defaultHeight;
}

// =============================================================================
// Table Scaling
// =============================================================================

/**
 * Calculate table scale factors based on scaling mode.
 *
 * Per ECMA-376 Part 1, Section 21.1.3:
 * - Table dimensions are DEFINED by gridCol/@w and tr/@h attributes
 * - The xfrm specifies position and bounding box, NOT a scaling target
 *
 * However, different applications handle dimension mismatches differently:
 * - natural (ECMA-376 strict): No scaling, use natural dimensions
 * - stretchToFit (PowerPoint): Stretches tables to fill the xfrm bounding box
 * - uniformFit: Scales uniformly to fit xfrm (preserves aspect ratio)
 */
export function resolveTableScale(
  { mode, totalWidth, totalHeight, frameWidth, frameHeight }: ResolveTableScaleOptions,
): TableScaleResult {
  if (mode === "stretchToFit") {
    const scaleX = totalWidth > 0 ? frameWidth / totalWidth : 1;
    const scaleY = totalHeight > 0 ? frameHeight / totalHeight : 1;
    return { scaleX, scaleY };
  }

  if (mode === "uniformFit") {
    if (totalWidth > 0 && totalHeight > 0) {
      const scale = Math.min(frameWidth / totalWidth, frameHeight / totalHeight);
      return { scaleX: scale, scaleY: scale };
    }
    return { scaleX: 1, scaleY: 1 };
  }

  // natural mode: no scaling
  return { scaleX: 1, scaleY: 1 };
}

// =============================================================================
// Cell Span Resolution
// =============================================================================

/**
 * Resolve span count (default to 1 if not specified)
 */
export function resolveSpanCount(span: number | undefined): number {
  if (span !== undefined && span > 0) {
    return span;
  }
  return 1;
}

/**
 * Calculate total width for a cell spanning multiple columns
 */
export function resolveSpanWidth(
  { columnWidths, colIdx, span, fallbackWidth }: ResolveSpanWidthOptions,
): number {
  const spanWidths = columnWidths.slice(colIdx, colIdx + span);
  const summed = spanWidths.reduce((total, width) => total + width, 0);
  if (summed > 0) {
    return summed;
  }
  return fallbackWidth;
}

/**
 * Calculate total height for a cell spanning multiple rows
 */
export function resolveSpanHeight(
  { rowHeights, rowIdx, span, fallbackHeight }: ResolveSpanHeightOptions,
): number {
  const spanHeights = rowHeights.slice(rowIdx, rowIdx + span);
  const summed = spanHeights.reduce((total, height) => total + height, 0);
  if (summed > 0) {
    return summed;
  }
  return fallbackHeight;
}

// =============================================================================
// Table Property Flags
// =============================================================================

/**
 * Check if a table property flag is enabled for a given condition.
 */
export function isFlagEnabled(flag: boolean | undefined, condition: boolean): boolean {
  if (!flag) {
    return false;
  }
  return condition;
}

// =============================================================================
// Table Style Resolution
// =============================================================================

/**
 * Context for resolving a cell's position within a table.
 */
export type CellPositionContext = {
  readonly rowIdx: number;
  readonly colIdx: number;
  readonly rowCount: number;
  readonly colCount: number;
  readonly properties: TableProperties;
};

/**
 * Get applicable part styles for a cell based on its position.
 *
 * Per ECMA-376 Part 1, Section 21.1.3.11, styles are layered with priority:
 * 1. wholeTbl (lowest — base style)
 * 2. band1H/band2H or band1V/band2V (banding)
 * 3. firstRow/lastRow/firstCol/lastCol (special regions)
 * 4. corner cells (seCell/swCell/neCell/nwCell) (highest)
 *
 * Higher priority styles override lower priority styles.
 * The returned array is ordered from lowest to highest priority.
 */
export function getApplicablePartStyles(style: TableStyle, ctx: CellPositionContext): readonly TablePartStyle[] {
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
    // Adjust for firstRow being special — banding counts from the first non-header row
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
 *
 * @see ECMA-376 Part 1, Section 21.1.3.11
 */
export function resolveFillFromParts(parts: readonly TablePartStyle[]): BaseFill | undefined {
  // Iterate in reverse to get highest priority first
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];

    // Direct fill takes priority
    if (part.fill) {
      // noFill means explicitly transparent — skip to lower priority parts
      if (part.fill.type === "noFill") continue;
      return part.fill;
    }

    // fillReference: ECMA-376 §20.1.4.2.10 — references a fill from the theme's
    // fmtScheme.fillStyleLst by index. The `color` field carries the resolved color
    // override (typically a scheme color like accent1). For table style resolution,
    // the fillReference.color is the effective fill — the style matrix index primarily
    // selects the fill type (solid/gradient/pattern), and index 1 is almost always
    // solid fill in standard themes.
    if (part.fillReference?.color) {
      return part.fillReference.color;
    }
  }
  return undefined;
}
