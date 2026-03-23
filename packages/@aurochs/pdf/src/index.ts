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
export type { PdfElement, PdfPage, PdfDocument, PdfTable, PdfTableRow, PdfTableCell } from "./domain";
export { isPdfPath, isPdfText, isPdfImage, isPdfTable } from "./domain";

// Element Addressing
export type { PdfElementId } from "./domain";
export { createElementId, parseElementId } from "./domain";

// Element Transformation
export { getElementRotationRad, getElementRotationDeg, rotateElement, moveElement } from "./domain";

// Document Mutation
export {
  updateElementInDocument,
  deleteElements,
  addElementsToPage,
  addPage,
  deletePages,
  duplicatePages,
  reorderPages,
  updatePageSize,
} from "./domain";

// Path Bounds
export { getPathBounds } from "./domain";

// Table Mutation
export {
  createTableCell,
  insertRow,
  removeRow,
  insertColumn,
  removeColumn,
  setColumnWidth,
  setRowHeight,
  mergeCells,
  splitCell,
  type TableCellRange,
} from "./domain";

// Constants
export { PT_TO_PX, PX_TO_PT, PDF_PAGE_SIZES } from "./domain";
export { DEFAULT_FONT_METRICS } from "./domain";

// =============================================================================
// Parser API
// =============================================================================

export {
  parsePdfSource,
  createPdfContext,
  rewritePdfContext,
  serializePdfDocumentAsJson,
  deserializePdfDocumentFromJson,
  getPdfPageCount,
  getPdfPageDimensions,
} from "./parser/core/pdf-parser";
export type {
  PdfParseOptions,
  PdfBuildOptions,
  PdfParsedPage,
  PdfParsedDocument,
  PdfBuildContext,
  ParsedElementRewriteArgs,
  ExtractedImageRewriteArgs,
  ParsedElementRewriter,
  ExtractedImageRewriter,
  PdfContextRewriter,
} from "./parser/core/pdf-parser";

// =============================================================================
// Importer API
// =============================================================================

// Uncomment after Phase 4-2 completion:
// export { importPdf, importPdfFromFile, importPdfFromUrl } from "./importer/pdf-importer";
// export type { PdfImportResult, PageStats } from "./importer/pdf-importer";
