/**
 * @file SVG string parser
 *
 * Parses SVG strings into XmlElement trees so that downstream code can
 * inspect, transform, or convert them to React elements without
 * operating on raw strings.
 */

import type { XmlElement, XmlNode } from "@aurochs/xml";
import { parseXml, isXmlElement } from "@aurochs/xml";

/**
 * Parse an SVG string into an XmlElement tree.
 *
 * The SVG string must contain a single root `<svg>` element.
 * Returns the root element, or null if parsing fails.
 *
 * @param svg - Complete SVG document string
 * @returns The root `<svg>` XmlElement, or null if invalid
 *
 * @example
 * ```ts
 * const element = parseSvgString('<svg viewBox="0 0 100 100"><rect .../></svg>');
 * if (element) {
 *   // element.name === "svg"
 *   // element.attrs.viewBox === "0 0 100 100"
 *   // element.children contains the <rect> etc.
 * }
 * ```
 */
export function parseSvgString(svg: string): XmlElement | null {
  try {
    const doc = parseXml(svg);
    // Find the first element child (the <svg> root)
    for (const child of doc.children) {
      if (isXmlElement(child)) {
        return child;
      }
    }
    return null;
  } catch (error: unknown) {
    // Invalid SVG/XML — return null to signal parse failure.
    // Log in development for debugging malformed SVG inputs.
    if (process.env.NODE_ENV === "development") {
      console.warn("parseSvgString: invalid SVG/XML", error);
    }
    return null;
  }
}

/**
 * Parse an SVG string and return the inner children of the root `<svg>` element.
 *
 * Useful when the caller already has an outer SVG context (e.g. a `<g>`)
 * and only needs the content inside the `<svg>` wrapper. The returned
 * nodes can be passed to `svgChildrenToJsx()` for React rendering.
 *
 * @param svg - Complete SVG document string
 * @returns Array of child XmlNodes inside the `<svg>` root, or empty array
 *
 * @example
 * ```ts
 * const children = parseSvgInnerContent(svgString);
 * // Convert to React:
 * <svg viewBox={...}>{svgChildrenToJsx(children)}</svg>
 * ```
 */
export function parseSvgInnerContent(svg: string): readonly XmlNode[] {
  const root = parseSvgString(svg);
  if (root === null) {
    return [];
  }
  return root.children;
}

/**
 * Parse an SVG fragment string (which may have multiple root elements).
 *
 * SVG fragments like `<defs>...</defs><g>...</g>` are not valid XML documents
 * (they lack a single root). This function wraps the fragment in a temporary
 * root element, parses it, and returns the children.
 *
 * @param fragment - SVG fragment string (may have zero or more root elements)
 * @returns Array of parsed XmlNodes
 *
 * @example
 * ```ts
 * const nodes = parseSvgFragment('<defs><linearGradient .../></defs><g>...</g>');
 * // nodes contains the <defs> and <g> elements as XmlNodes
 * ```
 */
export function parseSvgFragment(fragment: string): readonly XmlNode[] {
  if (fragment === "") {
    return [];
  }
  try {
    // Wrap in a temporary root element to ensure valid XML
    const doc = parseXml(`<_r>${fragment}</_r>`);
    for (const child of doc.children) {
      if (isXmlElement(child)) {
        return child.children;
      }
    }
    return [];
  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.warn("parseSvgFragment: invalid SVG/XML fragment", error);
    }
    return [];
  }
}

/**
 * Modify SVG root element attributes for responsive scaling.
 *
 * Returns a new XmlElement with:
 * - `width` and `height` set to "100%" so the SVG fills its container
 * - `preserveAspectRatio` set to "xMidYMid meet" (if not already present)
 * - The existing `viewBox` preserved for correct aspect ratio
 *
 * @param element - The root `<svg>` XmlElement
 * @returns A new XmlElement with normalized attributes
 */
export function normalizeSvgForScaling(element: XmlElement): XmlElement {
  const attrs = { ...element.attrs };

  // Set responsive dimensions
  attrs.width = "100%";
  attrs.height = "100%";

  // Ensure preserveAspectRatio is set
  if (attrs.preserveAspectRatio === undefined) {
    attrs.preserveAspectRatio = "xMidYMid meet";
  }

  return {
    type: "element",
    name: element.name,
    attrs,
    children: element.children,
  };
}
