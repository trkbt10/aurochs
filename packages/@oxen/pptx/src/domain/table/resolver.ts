/**
 * @file Table resolution utilities
 *
 * Shared utilities for table dimension and layout calculations.
 *
 * @see ECMA-376 Part 1, Section 21.1.3 - DrawingML Tables
 */

import type { TableRow } from "./types";

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
  mode: TableScalingMode,
  totalWidth: number,
  totalHeight: number,
  frameWidth: number,
  frameHeight: number
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
  columnWidths: readonly number[],
  colIdx: number,
  span: number,
  fallbackWidth: number
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
  rowHeights: readonly number[],
  rowIdx: number,
  span: number,
  fallbackHeight: number
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
