/**
 * @file PDF-specific svgChildrenToJsx
 *
 * The PDF editor works with complete XmlElement roots (the `<svg>` node
 * returned by renderPdfPageToSvgNode). This function accepts that root
 * element directly and converts its children to React nodes, so callers
 * don't need to manually unwrap `.children`.
 */

import type { ReactNode } from "react";
import type { XmlElement } from "@aurochs/xml";
import { svgChildrenToJsx as svgNodesToJsx } from "@aurochs-renderer/svg";

/**
 * Extract the children of an XmlElement and render them as React elements.
 *
 * @param element - An SVG element whose children should be extracted
 * @param keyPrefix - Optional prefix for React keys
 */
export function svgChildrenToJsx(element: XmlElement, keyPrefix: string = "svg"): ReactNode[] {
  return svgNodesToJsx(element.children, keyPrefix);
}
