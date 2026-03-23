/**
 * @file PDF path bounding box calculation
 *
 * Calculates the axis-aligned bounding box of a PDF path
 * from its operations (moveTo, lineTo, curveTo, rect).
 */

import type { PdfPath } from "./types";

/**
 * Calculate the axis-aligned bounding box of a PDF path from its operations.
 *
 * Iterates all operations and collects min/max coordinates.
 * Control points of curves are included (approximation — not the tight bbox).
 *
 * Returns `{ x: 0, y: 0, width: 0, height: 0 }` for empty paths.
 */
export function getPathBounds(path: PdfPath): { x: number; y: number; width: number; height: number } {
  // eslint-disable-next-line no-restricted-syntax -- accumulator for bounds
  let minX = Infinity;
  // eslint-disable-next-line no-restricted-syntax -- accumulator for bounds
  let minY = Infinity;
  // eslint-disable-next-line no-restricted-syntax -- accumulator for bounds
  let maxX = -Infinity;
  // eslint-disable-next-line no-restricted-syntax -- accumulator for bounds
  let maxY = -Infinity;

  for (const op of path.operations) {
    if (op.type === "rect") {
      minX = Math.min(minX, op.x);
      minY = Math.min(minY, op.y);
      maxX = Math.max(maxX, op.x + op.width);
      maxY = Math.max(maxY, op.y + op.height);
    } else if ("point" in op) {
      minX = Math.min(minX, op.point.x);
      minY = Math.min(minY, op.point.y);
      maxX = Math.max(maxX, op.point.x);
      maxY = Math.max(maxY, op.point.y);
    } else if ("end" in op) {
      minX = Math.min(minX, op.end.x);
      minY = Math.min(minY, op.end.y);
      maxX = Math.max(maxX, op.end.x);
      maxY = Math.max(maxY, op.end.y);
    }
  }

  if (!isFinite(minX)) { return { x: 0, y: 0, width: 0, height: 0 }; }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
