/**
 * @file Drawing layout calculation utilities
 *
 * Converts XLSX drawing anchor positions to pixel coordinates.
 */

import type {
  XlsxDrawingAnchor,
  XlsxTwoCellAnchor,
  XlsxOneCellAnchor,
  XlsxAbsoluteAnchor,
  XlsxCellAnchorOffset,
} from "@aurochs-office/xlsx/domain/drawing/types";
import type { SheetLayout, XlsxRenderOptions } from "./types";

// =============================================================================
// Types
// =============================================================================

/**
 * Pixel bounds for a drawing element.
 */
export type DrawingBounds = {
  /** X position in pixels */
  readonly x: number;
  /** Y position in pixels */
  readonly y: number;
  /** Width in pixels */
  readonly width: number;
  /** Height in pixels */
  readonly height: number;
};

// =============================================================================
// Constants
// =============================================================================

/**
 * EMUs (English Metric Units) per inch.
 * 914400 EMU = 1 inch
 */
const EMU_PER_INCH = 914400;

/**
 * Default pixels per inch (96 DPI).
 */
const PIXELS_PER_INCH = 96;

/**
 * Points per inch (72 pt = 1 inch).
 */
const POINTS_PER_INCH = 72;

// =============================================================================
// Conversion Utilities
// =============================================================================

/**
 * Convert EMU to pixels.
 *
 * @param emu - Value in EMUs
 * @param dpi - Dots per inch (default: 96)
 */
export function emuToPixels(emu: number, dpi: number = PIXELS_PER_INCH): number {
  return (emu / EMU_PER_INCH) * dpi;
}

/**
 * Convert points to pixels.
 *
 * @param points - Value in points
 */
export function pointsToPixels(points: number): number {
  return (points / POINTS_PER_INCH) * PIXELS_PER_INCH;
}

// =============================================================================
// Layout Calculation
// =============================================================================

/**
 * Calculate pixel position from cell anchor offset.
 *
 * @param anchor - Cell anchor offset (col, colOff, row, rowOff)
 * @param layout - Sheet layout with column/row positions
 * @param options - Render options
 */
function getColumnPosition(colIndex: number, colOff: number, layout: SheetLayout): number {
  if (colIndex < layout.columnPositions.length) {
    return layout.columnPositions[colIndex] + emuToPixels(colOff);
  }
  return layout.totalWidth;
}

function getRowPosition(rowIndex: number, rowOff: number, layout: SheetLayout): number {
  if (rowIndex < layout.rowPositions.length) {
    return layout.rowPositions[rowIndex] + emuToPixels(rowOff);
  }
  return layout.totalHeight;
}

function calculateCellAnchorPosition(
  anchor: XlsxCellAnchorOffset,
  layout: SheetLayout,
  _options: XlsxRenderOptions,
): { x: number; y: number } {
  const x = getColumnPosition(anchor.col, anchor.colOff, layout);
  const y = getRowPosition(anchor.row, anchor.rowOff, layout);
  return { x, y };
}

/**
 * Calculate bounds for a two-cell anchor.
 *
 * Two-cell anchors span from one cell to another.
 */
function calculateTwoCellAnchorBounds(
  anchor: XlsxTwoCellAnchor,
  layout: SheetLayout,
  options: XlsxRenderOptions,
): DrawingBounds {
  const from = calculateCellAnchorPosition(anchor.from, layout, options);
  const to = calculateCellAnchorPosition(anchor.to, layout, options);

  return {
    x: from.x,
    y: from.y,
    width: Math.max(0, to.x - from.x),
    height: Math.max(0, to.y - from.y),
  };
}

/**
 * Calculate bounds for a one-cell anchor.
 *
 * One-cell anchors have a position and explicit size.
 */
function calculateOneCellAnchorBounds(
  anchor: XlsxOneCellAnchor,
  layout: SheetLayout,
  options: XlsxRenderOptions,
): DrawingBounds {
  const from = calculateCellAnchorPosition(anchor.from, layout, options);

  return {
    x: from.x,
    y: from.y,
    width: emuToPixels(anchor.ext.cx),
    height: emuToPixels(anchor.ext.cy),
  };
}

/**
 * Calculate bounds for an absolute anchor.
 *
 * Absolute anchors have explicit position and size in EMUs.
 */
function calculateAbsoluteAnchorBounds(anchor: XlsxAbsoluteAnchor): DrawingBounds {
  return {
    x: emuToPixels(anchor.pos.x),
    y: emuToPixels(anchor.pos.y),
    width: emuToPixels(anchor.ext.cx),
    height: emuToPixels(anchor.ext.cy),
  };
}

/**
 * Calculate pixel bounds for any drawing anchor type.
 *
 * @param anchor - Drawing anchor (twoCellAnchor, oneCellAnchor, or absoluteAnchor)
 * @param layout - Sheet layout with column/row positions
 * @param options - Render options
 * @returns Pixel bounds for the drawing
 */
export function calculateDrawingBounds(
  anchor: XlsxDrawingAnchor,
  layout: SheetLayout,
  options: XlsxRenderOptions,
): DrawingBounds {
  switch (anchor.type) {
    case "twoCellAnchor":
      return calculateTwoCellAnchorBounds(anchor, layout, options);
    case "oneCellAnchor":
      return calculateOneCellAnchorBounds(anchor, layout, options);
    case "absoluteAnchor":
      return calculateAbsoluteAnchorBounds(anchor);
  }
}
