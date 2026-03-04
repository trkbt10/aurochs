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
