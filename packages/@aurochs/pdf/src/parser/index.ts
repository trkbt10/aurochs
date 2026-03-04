/** @file PDF parser public API exports */
export type {
  PdfParserOptions,
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
  parsePdf,
  parsePdfSource,
  createPdfContext,
  buildPdfFromContext,
  rewritePdfContext,
  serializePdfDocumentAsJson,
  deserializePdfDocumentFromJson,
  savePdfDocumentAsJson,
  loadPdfDocumentFromJson,
  buildAndSavePdfContextAsJson,
} from "./core/pdf-parser";

export type { PdfLoadEncryption, PdfLoadErrorCode, PdfLoadOptions, PdfLoadPurpose } from "./core/pdf-load-error";
export { PdfLoadError } from "./core/pdf-load-error";
