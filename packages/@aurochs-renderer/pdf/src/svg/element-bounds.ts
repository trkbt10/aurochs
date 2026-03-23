/**
 * @file PDF element SVG bounds
 *
 * Converts PDF element positions (bottom-left origin, Y-up) to
 * SVG coordinate space (top-left origin, Y-down).
 *
 * Used by both:
 * - The document query (for selection rectangles in the editor)
 * - Any rendering context that needs element bounding boxes
 */

import type { PdfElement } from "@aurochs/pdf";
import { getPathBounds, getElementRotationDeg, type PdfElementId, createElementId } from "@aurochs/pdf";
import { computeTextSvgBounds } from "./text-bounds";

// =============================================================================
// Types
// =============================================================================

/** Bounds of a PDF element in SVG coordinate space (top-left origin). */
export type PdfElementBounds = {
  readonly id: PdfElementId;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Rotation in degrees (0 = no rotation). */
  readonly rotation: number;
};

// =============================================================================
// Conversion
// =============================================================================

/**
 * Convert PDF element bounds to SVG coordinates.
 * PDF uses bottom-left origin; SVG uses top-left origin.
 *
 * For text: delegates to computeTextSvgBounds (same SoT as the SVG renderer).
 * This ensures selection rectangles can never diverge from rendered text.
 */
export function elementToSvgBounds(args: {
  readonly element: PdfElement;
  readonly elementIndex: number;
  readonly pageIndex: number;
  readonly pageHeight: number;
}): PdfElementBounds {
  const { element, elementIndex, pageIndex, pageHeight } = args;
  const id = createElementId(pageIndex, elementIndex);

  if (element.type === "text") {
    const bounds = computeTextSvgBounds(element, pageHeight);
    return { id, ...bounds };
  }

  if (element.type === "path") {
    const bounds = getPathBounds(element);
    return {
      id,
      x: bounds.x,
      y: pageHeight - bounds.y - bounds.height,
      width: bounds.width,
      height: bounds.height,
      rotation: getElementRotationDeg(element),
    };
  }

  if (element.type === "image") {
    // Image size/position determined by CTM
    const ctm = element.graphicsState.ctm;
    const w = Math.abs(ctm[0]);
    const h = Math.abs(ctm[3]);
    const x = ctm[4];
    const y = ctm[5];
    return {
      id,
      x,
      y: pageHeight - y - h,
      width: w,
      height: h,
      rotation: getElementRotationDeg(element),
    };
  }

  if (element.type === "table") {
    const totalWidth = element.columns.reduce((sum, col) => sum + col.width, 0);
    const totalHeight = element.rows.reduce((sum, row) => sum + row.height, 0);
    return {
      id,
      x: element.x,
      y: pageHeight - element.y,
      width: totalWidth,
      height: totalHeight,
      rotation: 0,
    };
  }

  return { id, x: 0, y: 0, width: 0, height: 0, rotation: 0 };
}
