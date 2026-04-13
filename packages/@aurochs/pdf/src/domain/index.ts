/**
 * @file PDF domain barrel export
 *
 * Exports all PDF domain types and utilities.
 */

// Color domain
export type { PdfColorSpace, PdfAlternateColorSpace, PdfColor, RgbColor } from "./color";
export {
  getColorSpaceComponents,
  grayToRgb,
  rgbToRgbBytes,
  cmykToRgb,
  rgbToHex,
  clamp01,
  clampByte,
  toByte,
} from "./color";

// Font domain
export type {
  FontMapping,
  FontMetrics,
  FontInfo,
  FontMappings,
  CIDOrdering,
} from "./font";
export {
  DEFAULT_FONT_METRICS,
  normalizeFontName,
  isBoldFont,
  isItalicFont,
  normalizeFontFamily,
} from "./font";

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

// Graphics state domain (color types are exported from ./color above)
export type {
  PdfLineJoin,
  PdfLineCap,
  PdfTextRenderingMode,
  PdfSoftMask,
  PdfGraphicsState,
  GraphicsStateStack,
} from "./graphics-state";
export {
  DEFAULT_FILL_COLOR,
  DEFAULT_STROKE_COLOR,
  createDefaultGraphicsState,
  createGraphicsStateStack,
  resolvePatternColors,
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
export { getPathBounds } from "./path";

// Text domain
export type { PdfText, PdfTextBlock, PdfTextBlockParagraph, PdfTextFontMetrics, PdfTextEditState } from "./text";
export {
  withTextContent,
  withFontFamily,
  withFontSize,
  withCharSpacing,
} from "./text";

// Image domain
export type { PdfImage } from "./image";

// Document domain
export type { PdfElement, PdfPage, PdfDocument, PdfEmbeddedFont, PdfTable, PdfTableRow, PdfTableCell } from "./document";
export { PDF_UNITS, PDF_PAGE_SIZES, isPdfPath, isPdfText, isPdfTextBlock, isPdfImage, isPdfTable } from "./document";

// Element addressing
export type { PdfElementId } from "./document";
export { createElementId, parseElementId } from "./document";

// Element transformation
export { getElementRotationRad, getElementRotationDeg, rotateElement, moveElement, scaleElement } from "./document";

// Document mutation
export {
  updateElementInDocument,
  deleteElements,
  addElementsToPage,
  addPage,
  deletePages,
  duplicatePages,
  reorderPages,
  updatePageSize,
} from "./document";

// Table mutation
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
} from "./document";

// Content stream domain
export type { PdfTokenType, PdfToken } from "./content-stream";
export { tokenizeContentStream } from "./content-stream";

// Constants
export { PT_TO_PX, PX_TO_PT } from "./constants";
