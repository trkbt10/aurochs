/** @file PDF parser public API exports */
export type { PdfParserOptions } from "./core/pdf-parser";
export { getPdfPageCount, getPdfPageDimensions, parsePdf } from "./core/pdf-parser";

export type { PdfLoadEncryption, PdfLoadErrorCode, PdfLoadOptions, PdfLoadPurpose } from "./core/pdf-load-error";
export { PdfLoadError } from "./core/pdf-load-error";

