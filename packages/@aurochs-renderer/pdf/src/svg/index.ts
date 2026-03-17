/** @file Public SVG renderer API for @aurochs-renderer/pdf */

export { renderPdfPageToSvg, renderPdfElementToSvg, renderPdfDocumentToSvgs, renderPdfDocumentPageToSvg } from "./render-page-svg";
export { resolveTextAnchor, computeTextSvgBounds, resolveTextFontMetrics, type TextSvgBounds, type TextAnchor } from "./text-bounds";
