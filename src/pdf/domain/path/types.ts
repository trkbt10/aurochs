/**
 * @file PDF path types
 *
 * Types for PDF vector path operations and elements.
 */

import type { PdfPoint } from "../coordinate";
import type { PdfGraphicsState } from "../graphics-state";

// =============================================================================
// Path Operations
// =============================================================================

export type PdfMoveTo = {
  readonly type: "moveTo";
  readonly point: PdfPoint;
};

export type PdfLineTo = {
  readonly type: "lineTo";
  readonly point: PdfPoint;
};

export type PdfCurveTo = {
  readonly type: "curveTo";
  readonly cp1: PdfPoint;
  readonly cp2: PdfPoint;
  readonly end: PdfPoint;
};

export type PdfCurveToV = {
  readonly type: "curveToV";
  readonly cp2: PdfPoint;
  readonly end: PdfPoint;
};

export type PdfCurveToY = {
  readonly type: "curveToY";
  readonly cp1: PdfPoint;
  readonly end: PdfPoint;
};

export type PdfRect = {
  readonly type: "rect";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type PdfClosePath = {
  readonly type: "closePath";
};

export type PdfPathOp =
  | PdfMoveTo
  | PdfLineTo
  | PdfCurveTo
  | PdfCurveToV
  | PdfCurveToY
  | PdfRect
  | PdfClosePath;

// =============================================================================
// Paint Operations
// =============================================================================

export type PdfPaintOp = "stroke" | "fill" | "fillStroke" | "clip" | "none";

// =============================================================================
// Path Element
// =============================================================================

export type PdfPath = {
  readonly type: "path";
  readonly operations: readonly PdfPathOp[];
  readonly paintOp: PdfPaintOp;
  readonly graphicsState: PdfGraphicsState;
};
