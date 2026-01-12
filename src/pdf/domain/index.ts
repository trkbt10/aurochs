/**
 * @file PDF domain barrel export
 *
 * Exports all PDF domain types and utilities.
 */

// Coordinate domain
export type { PdfPoint, PdfBBox, PdfMatrix, MatrixDecomposition } from "./coordinate";
export {
  IDENTITY_MATRIX,
  multiplyMatrices,
  transformPoint,
  invertMatrix,
  translationMatrix,
  scalingMatrix,
  rotationMatrix,
  isIdentityMatrix,
  isSimpleTransform,
  getMatrixScale,
  getMatrixRotation,
  decomposeMatrix,
  hasShear,
} from "./coordinate";

// Graphics state domain
export type {
  PdfColorSpace,
  PdfAlternateColorSpace,
  PdfColor,
  PdfLineJoin,
  PdfLineCap,
  PdfTextRenderingMode,
  PdfGraphicsState,
} from "./graphics-state";
export {
  DEFAULT_FILL_COLOR,
  DEFAULT_STROKE_COLOR,
  createDefaultGraphicsState,
  GraphicsStateStack,
} from "./graphics-state";

// Path domain
export type {
  PdfMoveTo,
  PdfLineTo,
  PdfCurveTo,
  PdfCurveToV,
  PdfCurveToY,
  PdfRect,
  PdfClosePath,
  PdfPathOp,
  PdfPaintOp,
  PdfPath,
} from "./path";

// Text domain
export type { PdfText } from "./text";

// Image domain
export type { PdfImage } from "./image";

// Document domain
export type { PdfElement, PdfPage, PdfDocument, PdfImportOptions } from "./document";
export { isPdfPath, isPdfText, isPdfImage } from "./document";

// Constants
export { PT_TO_PX, PX_TO_PT } from "./constants";
