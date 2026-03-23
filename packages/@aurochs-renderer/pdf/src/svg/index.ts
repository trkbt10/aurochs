/** @file Public SVG renderer API for @aurochs-renderer/pdf */

export { renderPdfPageToSvg, renderPdfElementToSvg, renderPdfDocumentToSvgs, renderPdfDocumentPageToSvg } from "./render-page-svg";
export { resolveTextAnchor, computeTextSvgBounds, resolveTextFontMetrics, type TextSvgBounds, type TextAnchor } from "./text-bounds";

// Element bounds (PDF → SVG coordinate conversion)
export type { PdfElementBounds } from "./element-bounds";
export { elementToSvgBounds } from "./element-bounds";

// Document query (bridges domain lookups + SVG coordinate conversion)
export { createDocumentQuery, type PdfDocumentQuery, type TextFontInfo } from "./document-query";
