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
// Scale (resize)
// =============================================================================

/** Apply stroke width scaling, returning the original graphics state when scale is 1. */
function scaleStrokeWidth(gs: PdfElement["graphicsState"], strokeScale: number): PdfElement["graphicsState"] {
  if (strokeScale === 1) { return gs; }
  return { ...gs, lineWidth: gs.lineWidth * strokeScale };
}

/**
 * Scale a PDF element to fit new bounds.
 *
 * @param element - The element to scale (immutable — returns a new instance).
 * @param oldBounds - The element's current bounding box in PDF coordinate space (bottom-left origin).
 * @param newBounds - The desired bounding box in PDF coordinate space (bottom-left origin).
 */
export function scaleElement(
  element: PdfElement,
  oldBounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
  newBounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): PdfElement {
  if (oldBounds.width === 0 || oldBounds.height === 0) { return element; }

  const scaleX = newBounds.width / oldBounds.width;
  const scaleY = newBounds.height / oldBounds.height;
  const originX = oldBounds.x;
  const originY = oldBounds.y;
  const offsetX = newBounds.x - originX;
  const offsetY = newBounds.y - originY;

  if (element.type === "path") {
    const scalePoint = (p: { readonly x: number; readonly y: number }): { readonly x: number; readonly y: number } => ({
      x: (p.x - originX) * scaleX + originX + offsetX,
      y: (p.y - originY) * scaleY + originY + offsetY,
    });

    const operations = element.operations.map((op) => {
      if (op.type === "rect") {
        const topLeft = scalePoint({ x: op.x, y: op.y });
        return { ...op, x: topLeft.x, y: topLeft.y, width: op.width * scaleX, height: op.height * scaleY };
      }
      if (op.type === "closePath") { return op; }
      if ("point" in op) {
        return { ...op, point: scalePoint(op.point) };
      }
      if ("end" in op) {
        return {
          ...op,
          end: scalePoint(op.end),
          ...("cp1" in op ? { cp1: scalePoint(op.cp1) } : {}),
          ...("cp2" in op ? { cp2: scalePoint(op.cp2) } : {}),
        };
      }
      return op;
    });

    // Scale stroke width proportionally (geometric mean of scale factors)
    const strokeScale = Math.sqrt(Math.abs(scaleX * scaleY));
    const gs = element.graphicsState;
    const scaledGs = scaleStrokeWidth(gs, strokeScale);

    return { ...element, operations, graphicsState: scaledGs };
  }

  if (element.type === "text") {
    return {
      ...element,
      x: newBounds.x,
      y: newBounds.y,
      width: newBounds.width,
      height: newBounds.height,
    };
  }

  if (element.type === "textBlock") {
    return {
      ...element,
      x: newBounds.x,
      y: newBounds.y,
      width: newBounds.width,
      height: newBounds.height,
    };
  }

  if (element.type === "image") {
    const ctm = element.graphicsState.ctm;
    const decomp = decomposeMatrix(ctm);
    const newCtm: readonly [number, number, number, number, number, number] = [
      decomp.scaleX * scaleX * Math.cos(decomp.rotation),
      decomp.scaleX * scaleX * Math.sin(decomp.rotation),
      -decomp.scaleY * scaleY * Math.sin(decomp.rotation),
      decomp.scaleY * scaleY * Math.cos(decomp.rotation),
      newBounds.x,
      newBounds.y,
    ];
    return { ...element, graphicsState: { ...element.graphicsState, ctm: newCtm } };
  }

  return element;
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

  if (element.type === "textBlock") {
    // Move block bounds and all individual runs within
    const paragraphs = element.paragraphs.map((para) => ({
      ...para,
      runs: para.runs.map((run) => ({ ...run, x: run.x + dx, y: run.y - dy })),
      baselineY: para.baselineY - dy,
    }));
    return { ...element, x: element.x + dx, y: element.y - dy, paragraphs };
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
