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
export type { PdfText, PdfTextFontMetrics } from "./text";

// Image domain
export type { PdfImage } from "./image";

// Document domain
export type { PdfElement, PdfPage, PdfDocument, PdfEmbeddedFont } from "./document";
export { PDF_UNITS, isPdfPath, isPdfText, isPdfImage } from "./document";

// Content stream domain
export type { PdfTokenType, PdfToken } from "./content-stream";
export { tokenizeContentStream } from "./content-stream";

// Constants
export { PT_TO_PX, PX_TO_PT } from "./constants";
