/**
 * @file Convert XML/SVG element trees to React elements.
 *
 * Produces React element trees from the structured XmlElement
 * representation (the canonical SVG node type in @aurochs/xml).
 *
 * React's createElement handles text escaping, and the resulting
 * element tree participates in React reconciliation (structural diffing).
 *
 * ## Attribute mapping
 *
 * SVG attributes use kebab-case (`clip-path`, `font-size`, `stroke-width`),
 * while React requires camelCase JSX props (`clipPath`, `fontSize`, `strokeWidth`).
 * Namespaced attributes also need mapping (`xml:space` → `xmlSpace`,
 * `xlink:href` → `xlinkHref`).
 *
 * The mapping table covers SVG presentation attributes used by the PPTX renderer.
 * Unknown attributes pass through unchanged (React will warn in development
 * mode if they are invalid).
 */

import { createElement, type ReactNode } from "react";
import type { XmlElement, XmlNode } from "@aurochs/xml";

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

  // Gradient/Pattern attributes
  "gradientUnits": "gradientUnits",
  "gradientTransform": "gradientTransform",
  "patternUnits": "patternUnits",
  "patternContentUnits": "patternContentUnits",
  "patternTransform": "patternTransform",
  "filterUnits": "filterUnits",
  "clipPathUnits": "clipPathUnits",
  "markerWidth": "markerWidth",
  "markerHeight": "markerHeight",
  "markerUnits": "markerUnits",
  "refX": "refX",
  "refY": "refY",
  "stdDeviation": "stdDeviation",

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
 */
function xmlNodeToReactNode(node: XmlNode, key: string | number): ReactNode {
  if (node.type === "text") {
    return node.value;
  }

  return xmlElementToReactNode(node, key);
}

function xmlElementToReactNode(element: XmlElement, key: string | number): ReactNode {
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
    children.push(xmlNodeToReactNode(element.children[i], i));
  }

  return createElement(element.name, props, ...children);
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Convert an XmlElement tree to a React element tree.
 *
 * @param element - Root SVG element (typically the `<svg>` root)
 * @param key - Optional React key for the root element
 *
 * @example
 * ```tsx
 * const root = parseSvgString(svgString);
 * return <div>{svgElementToJsx(root)}</div>;
 * ```
 */
export function svgElementToJsx(element: XmlElement, key?: string | number): ReactNode {
  return xmlElementToReactNode(element, key ?? 0);
}

/**
 * Convert an array of XmlNode children to React elements.
 *
 * Renders SVG inner content inside an existing `<svg>` or `<g>` element.
 *
 * @param nodes - Array of XML nodes (the children of an SVG element)
 * @param keyPrefix - Optional prefix for React keys (for list uniqueness)
 *
 * @example
 * ```tsx
 * const root = parseSvgString(svgString);
 * return (
 *   <svg viewBox="0 0 960 540">
 *     {svgChildrenToJsx(root.children)}
 *   </svg>
 * );
 * ```
 */
export function svgChildrenToJsx(nodes: readonly XmlNode[], keyPrefix: string = "svg"): ReactNode[] {
  const elements: ReactNode[] = [];
  for (let i = 0; i < nodes.length; i++) {
    elements.push(xmlNodeToReactNode(nodes[i], `${keyPrefix}-${i}`));
  }
  return elements;
}
