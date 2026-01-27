/**
 * @file PDF color domain
 *
 * Exports types and utilities for PDF color handling.
 */

export type { PdfColorSpace, PdfAlternateColorSpace, PdfColor } from "./types";

export { getColorSpaceComponents } from "./color-space";

export type { RgbColor } from "./primitives";
export {
  grayToRgb,
  rgbToRgbBytes,
  cmykToRgb,
  rgbToHex,
  clamp01,
  clampByte,
  toByte,
} from "./primitives";
