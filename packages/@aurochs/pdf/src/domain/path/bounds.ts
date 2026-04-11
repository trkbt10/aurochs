/**
 * @file PDF path bounding box calculation
 *
 * Calculates the axis-aligned bounding box of a PDF path
 * from its operations (moveTo, lineTo, curveTo, rect).
 */

import type { PdfPath, PdfPathOp } from "./types";

type Extremes = { minX: number; minY: number; maxX: number; maxY: number };

const EMPTY_EXTREMES: Extremes = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

function extendExtremes(ext: Extremes, x: number, y: number): Extremes {
  return {
    minX: Math.min(ext.minX, x),
    minY: Math.min(ext.minY, y),
    maxX: Math.max(ext.maxX, x),
    maxY: Math.max(ext.maxY, y),
  };
}

function accumulateOp(ext: Extremes, op: PdfPathOp): Extremes {
  if (op.type === "rect") {
    return extendExtremes(extendExtremes(ext, op.x, op.y), op.x + op.width, op.y + op.height);
  }
  if ("point" in op) {
    return extendExtremes(ext, op.point.x, op.point.y);
  }
  if ("end" in op) {
    return extendExtremes(ext, op.end.x, op.end.y);
  }
  return ext;
}

/**
 * Calculate the axis-aligned bounding box of a PDF path from its operations.
 *
 * Iterates all operations and collects min/max coordinates.
 * Control points of curves are included (approximation — not the tight bbox).
 *
 * Returns `{ x: 0, y: 0, width: 0, height: 0 }` for empty paths.
 */
export function getPathBounds(path: PdfPath): { x: number; y: number; width: number; height: number } {
  const ext = path.operations.reduce(accumulateOp, EMPTY_EXTREMES);

  if (!isFinite(ext.minX)) { return { x: 0, y: 0, width: 0, height: 0 }; }
  return { x: ext.minX, y: ext.minY, width: ext.maxX - ext.minX, height: ext.maxY - ext.minY };
}
