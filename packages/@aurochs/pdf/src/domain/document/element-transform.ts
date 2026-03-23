/**
 * @file PDF element transformation operations
 *
 * Pure domain functions for transforming PDF elements:
 * - Rotation extraction from CTM
 * - Rotation application via CTM recomposition
 * - Position delta application (move)
 *
 * All functions are immutable — they return new element instances.
 */

import type { PdfElement } from "./types";
import { decomposeMatrix } from "../coordinate";

// =============================================================================
// Rotation extraction
// =============================================================================

/** Extract rotation in radians from a PDF element's CTM. */
export function getElementRotationRad(element: PdfElement): number {
  return decomposeMatrix(element.graphicsState.ctm).rotation;
}

/** Extract rotation in degrees from a PDF element's graphics state CTM. */
export function getElementRotationDeg(element: PdfElement): number {
  const deg = (getElementRotationRad(element) * 180) / Math.PI;
  const normalized = ((deg % 360) + 360) % 360;
  // Snap near-zero and near-360 to 0
  if (Math.abs(normalized) < 0.01 || Math.abs(normalized - 360) < 0.01) { return 0; }
  return normalized;
}

// =============================================================================
// Rotation application
// =============================================================================

/**
 * Apply a rotation delta (in radians) to a PDF element by recomposing its CTM.
 * Preserves scale and translation; adds the delta to the existing rotation.
 */
export function rotateElement(element: PdfElement, angleDeltaRad: number): PdfElement {
  const ctm = element.graphicsState.ctm;
  const decomp = decomposeMatrix(ctm);
  const newAngle = decomp.rotation + angleDeltaRad;
  const cos = Math.cos(newAngle);
  const sin = Math.sin(newAngle);
  const newCtm: readonly [number, number, number, number, number, number] = [
    decomp.scaleX * cos,
    decomp.scaleX * sin,
    -decomp.scaleY * sin,
    decomp.scaleY * cos,
    ctm[4], // translation preserved
    ctm[5],
  ];
  return { ...element, graphicsState: { ...element.graphicsState, ctm: newCtm } };
}

// =============================================================================
// Position delta (move)
// =============================================================================

/**
 * Apply a position delta to a PDF element.
 *
 * @param element - The element to move (immutable — returns a new instance).
 * @param dx - Horizontal delta (positive = rightward). Same convention in both SVG and PDF.
 * @param dy - Vertical delta in **SVG convention** (positive = downward).
 *             Internally converted to PDF convention (positive = upward) by negating.
 */
export function moveElement(element: PdfElement, dx: number, dy: number): PdfElement {
  if (element.type === "text") {
    return { ...element, x: element.x + dx, y: element.y - dy };
  }

  if (element.type === "path") {
    const operations = element.operations.map((op) => {
      if (op.type === "rect") {
        return { ...op, x: op.x + dx, y: op.y - dy };
      }
      if ("point" in op) {
        return { ...op, point: { x: op.point.x + dx, y: op.point.y - dy } };
      }
      if ("end" in op) {
        return {
          ...op,
          end: { x: op.end.x + dx, y: op.end.y - dy },
          ...("cp1" in op ? { cp1: { x: op.cp1.x + dx, y: op.cp1.y - dy } } : {}),
          ...("cp2" in op ? { cp2: { x: op.cp2.x + dx, y: op.cp2.y - dy } } : {}),
        };
      }
      return op;
    });
    return { ...element, operations };
  }

  if (element.type === "image") {
    const ctm = [...element.graphicsState.ctm] as [number, number, number, number, number, number];
    ctm[4] += dx;
    ctm[5] -= dy;
    return { ...element, graphicsState: { ...element.graphicsState, ctm } };
  }

  if (element.type === "table") {
    return { ...element, x: element.x + dx, y: element.y - dy };
  }

  return element;
}
