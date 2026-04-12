/**
 * @file PDF text domain
 *
 * Exports types for PDF text handling.
 */

export type { PdfText, PdfTextFontMetrics, PdfTextEditState } from "./types";

// Domain operations (type-safe PdfText update functions)
export {
  withTextContent,
  withFontFamily,
  withFontSize,
  withCharSpacing,
} from "./operations";
