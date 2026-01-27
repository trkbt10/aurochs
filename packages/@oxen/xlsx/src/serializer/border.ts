/**
 * @file SpreadsheetML Border Serializer
 *
 * Serializes XlsxBorder types to XML elements following ECMA-376 Part 4.
 *
 * @see ECMA-376 Part 4, Section 18.8.4 (border)
 * @see ECMA-376 Part 4, Section 18.18.3 (ST_BorderStyle)
 */

import type { XmlElement, XmlNode } from "@oxen/xml";
import { createElement } from "@oxen/xml";
import type { XlsxBorder, XlsxBorderEdge } from "../domain/style/border";
import type { XlsxColor } from "../domain/style/font";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Serialize an XlsxColor to an XML element.
 *
 * @param color - The color to serialize
 * @returns XmlElement representing the color
 */
function serializeColor(color: XlsxColor): XmlElement {
  switch (color.type) {
    case "rgb":
      return createElement("color", { rgb: color.value });
    case "theme": {
      const attrs: Record<string, string> = { theme: String(color.theme) };
      if (color.tint !== undefined) {
        attrs.tint = String(color.tint);
      }
      return createElement("color", attrs);
    }
    case "indexed":
      return createElement("color", { indexed: String(color.index) });
    case "auto":
      return createElement("color", { auto: "1" });
  }
}

// =============================================================================
// Border Edge Serialization
// =============================================================================

/**
 * Serialize a border edge to an XML element.
 *
 * Serialization rules:
 * - undefined -> element is omitted (returns undefined)
 * - style="none" -> `<left/>` (empty element)
 * - style specified with color -> `<left style="thin"><color .../></left>`
 *
 * @param edge - The border edge to serialize
 * @param elementName - The XML element name (e.g., "left", "right", "top", "bottom", "diagonal")
 * @returns XmlElement or undefined if edge is not defined
 */
export function serializeBorderEdge(
  edge: XlsxBorderEdge | undefined,
  elementName: string,
): XmlElement | undefined {
  if (edge === undefined) {
    return undefined;
  }

  // style="none" -> empty element
  if (edge.style === "none") {
    return createElement(elementName);
  }

  // style specified -> include style attribute
  const attrs: Record<string, string> = { style: edge.style };
  const children: XmlNode[] = [];

  // Add color child if present
  if (edge.color !== undefined) {
    children.push(serializeColor(edge.color));
  }

  return createElement(elementName, attrs, children);
}

// =============================================================================
// Border Serialization
// =============================================================================

/**
 * Serialize an XlsxBorder to an XML element.
 *
 * Child elements must be in the following order (ECMA-376 Part 4, Section 18.8.4):
 * 1. start (RTL)
 * 2. end (RTL)
 * 3. left
 * 4. right
 * 5. top
 * 6. bottom
 * 7. diagonal
 * 8. vertical
 * 9. horizontal
 *
 * Note: start, end, vertical, horizontal are not implemented in XlsxBorder type.
 *
 * @param border - The border to serialize
 * @returns XmlElement representing the border
 */
export function serializeBorder(border: XlsxBorder): XmlElement {
  const attrs: Record<string, string> = {};
  const children: XmlNode[] = [];

  // Diagonal attributes
  if (border.diagonalUp === true) {
    attrs.diagonalUp = "1";
  }
  if (border.diagonalDown === true) {
    attrs.diagonalDown = "1";
  }
  if (border.outline === true) {
    attrs.outline = "1";
  }

  // Child elements in order: left, right, top, bottom, diagonal
  // Note: start, end, vertical, horizontal are not supported in current type

  const leftEl = serializeBorderEdge(border.left, "left");
  if (leftEl !== undefined) {
    children.push(leftEl);
  }

  const rightEl = serializeBorderEdge(border.right, "right");
  if (rightEl !== undefined) {
    children.push(rightEl);
  }

  const topEl = serializeBorderEdge(border.top, "top");
  if (topEl !== undefined) {
    children.push(topEl);
  }

  const bottomEl = serializeBorderEdge(border.bottom, "bottom");
  if (bottomEl !== undefined) {
    children.push(bottomEl);
  }

  const diagonalEl = serializeBorderEdge(border.diagonal, "diagonal");
  if (diagonalEl !== undefined) {
    children.push(diagonalEl);
  }

  return createElement("border", attrs, children);
}

/**
 * Serialize a collection of borders to a borders XML element.
 *
 * The borders element wraps all border definitions in styles.xml.
 *
 * @param borders - The borders to serialize
 * @returns XmlElement representing the borders collection
 */
export function serializeBorders(borders: readonly XlsxBorder[]): XmlElement {
  const children = borders.map((border) => serializeBorder(border));
  return createElement("borders", { count: String(borders.length) }, children);
}
