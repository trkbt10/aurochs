/** @file Public API for @aurochs-renderer/pdf */

export type {
  PdfBinarySource,
  PdfSvgRenderOptions,
  BuildPdfDocumentForRenderArgs,
  RenderPdfSourceToSvgsArgs,
  RenderPdfSourcePageToSvgArgs,
} from "./types";

export { buildPdfDocumentForRender, renderPdfSourceToSvgs, renderPdfSourcePageToSvg } from "./pipeline";

export { renderPdfPageToSvg, renderPdfDocumentToSvgs, renderPdfDocumentPageToSvg } from "./svg";

export type { PdfRenderSession, CreatePdfRenderSessionOptions } from "./session";
export { createPdfRenderSession, createPdfRenderSessionFromSourceContext } from "./session";

export type { PdfImageCache, PdfImageUrlStrategy, ImageResolveResult } from "./image-cache";
export { createPdfImageCache, objectUrlStrategy, dataUrlStrategy } from "./image-cache";

export type { PdfImageUrlResolver } from "./types";

// Re-export font provider creation for use by consumers that already have a PdfDocument
// (e.g., PdfEditor which receives a pre-built document).
export { createFontProviderForDocument } from "@aurochs/pdf/domain/font";
export type { FontProvider } from "@aurochs/pdf/domain/font";
