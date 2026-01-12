/**
 * @file PDF graphics state domain
 *
 * Exports types and utilities for PDF graphics state handling.
 */

export type {
  PdfColorSpace,
  PdfAlternateColorSpace,
  PdfColor,
  PdfLineJoin,
  PdfLineCap,
  PdfTextRenderingMode,
  PdfGraphicsState,
} from "./types";

export { DEFAULT_FILL_COLOR, DEFAULT_STROKE_COLOR, createDefaultGraphicsState } from "./defaults";

export { GraphicsStateStack } from "./stack";
