/**
 * @file SVG node builder functions for structured SVG output.
 *
 * Uses @aurochs/xml AST types (XmlElement, XmlNode) directly as the
 * canonical representation for SVG elements. SVG *is* XML, and the
 * xml package already provides the right shape plus serialization
 * and escaping utilities.
 *
 * This module provides:
 * - `SvgFragment` type for multi-node output (defs + content, table cells)
 * - `SvgAttrs` type for pre-formatted SVG attribute maps
 * - Builder functions that construct XmlElement nodes for common SVG elements
 */

import type { XmlElement, XmlNode } from "@aurochs/xml";
import { createElement, createText } from "@aurochs/xml";
import { formatSvgNumber, formatSvgMatrix } from "./number-format";

// =============================================================================
// Types
// =============================================================================

/**
 * An ordered list of sibling SVG nodes.
 *
 * Used when a render function produces multiple top-level nodes
 * (e.g., `<defs>` + `<path>`, or a table's cells), rather than a
 * single root element.
 */
export type SvgFragment = readonly XmlNode[];

/**
 * SVG attribute map — string values only (matching XmlElement.attrs).
 *
 * Number formatting is handled explicitly by callers using formatSvgNumber,
 * ensuring consistent precision. This avoids implicit number-to-string
 * conversion that could produce unexpected formats.
 */
export type SvgAttrs = Record<string, string>;

// =============================================================================
// Attribute building helpers
// =============================================================================

/**
 * Build an attribute map from key-value pairs, omitting undefined values.
 *
 * This is the SVG-specific equivalent of the xml package's AttrMap,
 * but enforces that all values are pre-formatted strings (numbers must
 * be converted via formatSvgNumber before passing in).
 */
export function svgAttrs(entries: ReadonlyArray<readonly [string, string | undefined]>): SvgAttrs {
  const attrs: SvgAttrs = {};
  for (const [key, value] of entries) {
    if (value !== undefined) {
      attrs[key] = value;
    }
  }
  return attrs;
}

// =============================================================================
// SVG element builders
// =============================================================================

/** Create a `<svg>` root element. */
export function svgRoot(attrs: {
  readonly viewBox: string;
  readonly width: string;
  readonly height: string;
  readonly preserveAspectRatio: string;
}, children: readonly XmlNode[]): XmlElement {
  return createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    "xmlns:xlink": "http://www.w3.org/1999/xlink",
    viewBox: attrs.viewBox,
    width: attrs.width,
    height: attrs.height,
    preserveAspectRatio: attrs.preserveAspectRatio,
  }, children);
}

/** Create a `<defs>` element wrapping the given children. */
export function svgDefs(children: readonly XmlNode[]): XmlElement {
  return createElement("defs", {}, children);
}

/** Create a `<g>` group element. */
export function svgGroup(attrs: SvgAttrs, children: readonly XmlNode[]): XmlElement {
  return createElement("g", attrs, children);
}

/** Create a `<rect>` element. */
export function svgRect(attrs: {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fill?: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly extra?: SvgAttrs;
}): XmlElement {
  return createElement("rect", {
    x: formatSvgNumber(attrs.x),
    y: formatSvgNumber(attrs.y),
    width: formatSvgNumber(attrs.width),
    height: formatSvgNumber(attrs.height),
    ...(attrs.fill !== undefined ? { fill: attrs.fill } : {}),
    ...(attrs.stroke !== undefined ? { stroke: attrs.stroke } : {}),
    ...(attrs.strokeWidth !== undefined ? { "stroke-width": formatSvgNumber(attrs.strokeWidth) } : {}),
    ...attrs.extra,
  });
}

/** Create a `<clipPath>` element. */
export function svgClipPath(id: string, children: readonly XmlNode[]): XmlElement {
  return createElement("clipPath", { id }, children);
}

/** Create a `<path>` element. */
export function svgPath(attrs: SvgAttrs): XmlElement {
  return createElement("path", attrs);
}

/** Create a `<text>` element with text content. */
export function svgText(attrs: SvgAttrs, textContent: string): XmlElement {
  return createElement("text", attrs, [createText(textContent)]);
}

/** Create an `<image>` element. */
export function svgImage(attrs: SvgAttrs): XmlElement {
  return createElement("image", attrs);
}

/** Create a transform attribute string from a matrix. */
export function svgMatrixTransform(matrix: readonly number[]): string {
  return `matrix(${formatSvgMatrix(matrix)})`;
}
