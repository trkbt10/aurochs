/**
 * @file Convert XmlNode trees to React elements.
 *
 * This eliminates the need for `dangerouslySetInnerHTML` by producing
 * React element trees directly from the structured XmlNode representation.
 *
 * Benefits:
 * - No XSS surface — React's createElement handles escaping
 * - React reconciliation works across re-renders (structural diffing)
 * - Elements are individually addressable for editing/patching
 *
 * ## Attribute mapping
 *
 * SVG attributes use kebab-case (`clip-path`, `font-size`, `stroke-width`),
 * while React requires camelCase JSX props (`clipPath`, `fontSize`, `strokeWidth`).
 * Namespaced attributes also need mapping (`xml:space` → `xmlSpace`,
 * `xlink:href` → `xlinkHref`).
 *
 * The mapping table covers all SVG presentation attributes used by the
 * PDF renderer. Unknown attributes pass through unchanged (React will
 * warn in development mode if they are invalid).
 */

import { createElement, type ReactNode } from "react";
import type { XmlElement, XmlNode } from "@aurochs/xml";
import type { SvgFragment } from "./svg-node";

// =============================================================================
// SVG attribute name → React JSX prop name
// =============================================================================

/**
 * Mapping from SVG attribute names (kebab-case / namespaced) to
 * React JSX prop names (camelCase).
 *
 * Only attributes that differ between SVG and React are listed.
 * Attributes that are identical in both (e.g. `id`, `fill`, `stroke`,
 * `width`, `height`, `d`, `transform`) are passed through as-is.
 */
const SVG_ATTR_TO_JSX: Readonly<Record<string, string>> = {
  // Presentation attributes (kebab-case → camelCase)
  "clip-path": "clipPath",
  "clip-rule": "clipRule",
  "dominant-baseline": "dominantBaseline",
  "fill-opacity": "fillOpacity",
  "fill-rule": "fillRule",
  "flood-color": "floodColor",
  "flood-opacity": "floodOpacity",
  "font-family": "fontFamily",
  "font-size": "fontSize",
  "font-style": "fontStyle",
  "font-weight": "fontWeight",
  "image-rendering": "imageRendering",
  "letter-spacing": "letterSpacing",
  "lighting-color": "lightingColor",
  "marker-end": "markerEnd",
  "marker-mid": "markerMid",
  "marker-start": "markerStart",
  "paint-order": "paintOrder",
  "pointer-events": "pointerEvents",
  "shape-rendering": "shapeRendering",
  "stop-color": "stopColor",
  "stop-opacity": "stopOpacity",
  "stroke-dasharray": "strokeDasharray",
  "stroke-dashoffset": "strokeDashoffset",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "stroke-miterlimit": "strokeMiterlimit",
  "stroke-opacity": "strokeOpacity",
  "stroke-width": "strokeWidth",
  "text-anchor": "textAnchor",
  "text-decoration": "textDecoration",
  "text-rendering": "textRendering",
  "text-orientation": "textOrientation",
  "writing-mode": "writingMode",
  "word-spacing": "wordSpacing",
  "lengthAdjust": "lengthAdjust",
  "textLength": "textLength",
  "preserveAspectRatio": "preserveAspectRatio",
  "viewBox": "viewBox",

  // Namespace attributes
  "xml:space": "xmlSpace",
  "xml:lang": "xmlLang",
  "xlink:href": "xlinkHref",
  "xlink:show": "xlinkShow",
  "xlink:title": "xlinkTitle",
  "xlink:type": "xlinkType",
  "xlink:role": "xlinkRole",
  "xlink:arcrole": "xlinkArcrole",
  "xlink:actuate": "xlinkActuate",

  // xmlns declarations — React handles these internally for SVG elements
  // and they should not be passed as props. They are filtered out below.
};

/**
 * Attributes that should be omitted when converting to JSX.
 *
 * React automatically handles SVG namespace declarations — passing them
 * as props causes warnings or errors.
 */
const OMIT_ATTRS = new Set(["xmlns", "xmlns:xlink"]);

function toJsxPropName(svgAttrName: string): string | null {
  if (OMIT_ATTRS.has(svgAttrName)) {
    return null;
  }
  return SVG_ATTR_TO_JSX[svgAttrName] ?? svgAttrName;
}

// =============================================================================
// Conversion
// =============================================================================

/**
 * Convert a single XmlNode to a React element.
 *
 * @param node - The SVG node to convert
 * @param key - React key for list reconciliation
 */
function svgNodeToReactNode(node: XmlNode, key: string | number): ReactNode {
  if (node.type === "text") {
    return node.value;
  }

  return svgElementToReactNode(node, key);
}

function svgElementToReactNode(element: XmlElement, key: string | number): ReactNode {
  // Build React props from SVG attributes
  const props: Record<string, unknown> = { key };

  for (const [attrName, attrValue] of Object.entries(element.attrs)) {
    const jsxName = toJsxPropName(attrName);
    if (jsxName !== null) {
      props[jsxName] = attrValue;
    }
  }

  // Convert children
  if (element.children.length === 0) {
    return createElement(element.name, props);
  }

  const children: ReactNode[] = [];
  for (let i = 0; i < element.children.length; i++) {
    children.push(svgNodeToReactNode(element.children[i], i));
  }

  return createElement(element.name, props, ...children);
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Convert an XmlElement tree to a React element tree.
 *
 * This produces a complete React element hierarchy that can be rendered
 * directly in JSX without `dangerouslySetInnerHTML`.
 *
 * @param element - Root SVG element (typically the `<svg>` root)
 * @param key - Optional React key for the root element
 *
 * @example
 * ```tsx
 * const svgNode = renderPdfPageToXmlNode(page, options);
 * return <div>{svgElementToJsx(svgNode)}</div>;
 * ```
 */
export function svgElementToJsx(element: XmlElement, key?: string | number): ReactNode {
  return svgElementToReactNode(element, key ?? 0);
}

/**
 * Convert an SvgFragment to an array of React elements.
 *
 * Useful for rendering inside an existing `<svg>` or `<g>` element
 * without a wrapper — replaces `dangerouslySetInnerHTML={{ __html: ... }}`.
 *
 * @param fragment - Array of SVG nodes
 * @param keyPrefix - Optional prefix for React keys (for list uniqueness)
 *
 * @example
 * ```tsx
 * const nodes = renderPdfElementToXmlNodes(element, pageHeight);
 * return <g>{svgFragmentToJsx(nodes)}</g>;
 * ```
 */
export function svgFragmentToJsx(fragment: SvgFragment, keyPrefix: string = "svg"): ReactNode[] {
  const elements: ReactNode[] = [];
  for (let i = 0; i < fragment.length; i++) {
    elements.push(svgNodeToReactNode(fragment[i], `${keyPrefix}-${i}`));
  }
  return elements;
}

/**
 * Extract the children of an XmlElement and render them as React elements.
 *
 * This is the JSX equivalent of `extractSvgInnerContent()` — it renders
 * the content inside an SVG root element without the `<svg>` wrapper itself.
 *
 * Used when the caller already provides an `<svg>` container (e.g., EditorCanvas)
 * and only needs the inner content (defs, shapes, text, etc.).
 *
 * @param element - An SVG element whose children should be extracted
 * @param keyPrefix - Optional prefix for React keys
 */
export function svgChildrenToJsx(element: XmlElement, keyPrefix: string = "svg"): ReactNode[] {
  return svgFragmentToJsx(element.children, keyPrefix);
}
