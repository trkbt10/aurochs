/** @file Public SVG renderer API for @aurochs-renderer/pdf */

// String-based rendering (backward compatible)
export { renderPdfPageToSvg, renderPdfElementToSvg, renderPdfDocumentToSvgs, renderPdfDocumentPageToSvg } from "./render-page-svg";

// Structured rendering (XmlElement / SvgFragment output)
export { renderPdfPageToSvgNode, renderPdfElementToSvgNodes } from "./render-page-svg";

// SVG-specific types and builders
export type { SvgFragment, SvgAttrs } from "./svg-node";

// SVG fragment serialization (XmlNode[] → string via @aurochs/xml)
export { serializeSvgFragment, serializeSvgNode } from "./svg-serializer";

// XmlElement → React element conversion (eliminates dangerouslySetInnerHTML)
export { svgElementToJsx, svgFragmentToJsx, svgChildrenToJsx } from "./svg-to-jsx";

// Text bounds (shared SoT between renderer and editor)
export { resolveTextAnchor, computeTextSvgBounds, resolveTextFontMetrics, type TextSvgBounds, type TextAnchor } from "./text-bounds";

// Element bounds (PDF → SVG coordinate conversion)
export type { PdfElementBounds } from "./element-bounds";
export { elementToSvgBounds } from "./element-bounds";

// Document query (bridges domain lookups + SVG coordinate conversion)
export { createDocumentQuery, type PdfDocumentQuery, type TextFontInfo } from "./document-query";
