/**
 * @file PDF graphics state domain
 *
 * Exports types and utilities for PDF graphics state handling.
 * Color types and utilities are in domain/color.
 */

export type {
  PdfLineJoin,
  PdfLineCap,
  PdfTextRenderingMode,
  PdfSoftMask,
  PdfGraphicsState,
} from "./types";

export { DEFAULT_FILL_COLOR, DEFAULT_STROKE_COLOR, createDefaultGraphicsState } from "./defaults";

export type { GraphicsStateStack } from "./stack";
export { createGraphicsStateStack } from "./stack";
