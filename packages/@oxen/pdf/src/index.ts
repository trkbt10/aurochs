/**
 * @file PDF module public API
 *
 * Provides types and functions for importing PDF files into PPTX format.
 */

// =============================================================================
// Domain Types (re-exported from domain/)
// =============================================================================

// Coordinate System Types
export type { PdfPoint, PdfBBox, PdfMatrix, MatrixDecomposition } from "./domain";
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
} from "./domain";

// Graphics State Types
export type {
  PdfColorSpace,
  PdfAlternateColorSpace,
  PdfColor,
  PdfLineJoin,
  PdfLineCap,
  PdfTextRenderingMode,
  PdfGraphicsState,
  GraphicsStateStack,
} from "./domain";
export {
  DEFAULT_FILL_COLOR,
  DEFAULT_STROKE_COLOR,
  createDefaultGraphicsState,
  createGraphicsStateStack,
} from "./domain";

// Path Types
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
} from "./domain";

// Text Types
export type { PdfText } from "./domain";

// Image Types
export type { PdfImage } from "./domain";

// Document Types
export type { PdfElement, PdfPage, PdfDocument, PdfImportOptions } from "./domain";
export { isPdfPath, isPdfText, isPdfImage } from "./domain";

// Constants
export { PT_TO_PX, PX_TO_PT } from "./domain";

// =============================================================================
// Parser API
// =============================================================================

export { parsePdf, getPdfPageCount, getPdfPageDimensions } from "./parser/core/pdf-parser";
export type { PdfParserOptions } from "./parser/core/pdf-parser";

// =============================================================================
// Importer API
// =============================================================================

// Uncomment after Phase 4-2 completion:
// export { importPdf, importPdfFromFile, importPdfFromUrl } from "./importer/pdf-importer";
// export type { PdfImportResult, PageStats } from "./importer/pdf-importer";
