/** @file Public SVG renderer API for @aurochs-renderer/pdf */

export { renderPdfPageToSvg, renderPdfElementToSvg, renderPdfDocumentToSvgs, renderPdfDocumentPageToSvg } from "./render-page-svg";
export { renderPdfPageToSvgNode, renderPdfElementToSvgNodes } from "./render-page-svg";

export type { SvgFragment, SvgAttrs } from "./svg-node";
export { serializeSvgFragment, serializeSvgNode } from "./svg-serializer";

// Accepts an XmlElement root and converts its children to React nodes.
// For the general XmlNode[] and XmlElement versions, use @aurochs-renderer/svg directly.
export { svgChildrenToJsx } from "./svg-children-to-jsx";

export { resolveTextAnchor, computeTextSvgBounds, resolveTextFontMetrics, type TextSvgBounds, type TextAnchor } from "./text-bounds";

export type { PdfElementBounds } from "./element-bounds";
export { elementToSvgBounds } from "./element-bounds";

export { createDocumentQuery, type PdfDocumentQuery, type TextFontInfo } from "./document-query";
