/** @file PDF parser public API exports */
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
} from "./core/pdf-parser";
export {
  getPdfPageCount,
  getPdfPageDimensions,
  parsePdfSource,
  createPdfContext,
  rewritePdfContext,
  serializePdfDocumentAsJson,
  deserializePdfDocumentFromJson,
} from "./core/pdf-parser";

export type { PdfLoadEncryption, PdfLoadErrorCode, PdfLoadOptions, PdfLoadPurpose } from "./core/pdf-load-error";
export { PdfLoadError } from "./core/pdf-load-error";
