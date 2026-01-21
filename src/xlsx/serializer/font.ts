/**
 * @file Font Serializer for styles.xml
 *
 * Serializes XlsxFont types to XML elements for XLSX stylesheet generation.
 * Follows ECMA-376 Part 4 specification for element ordering and structure.
 *
 * @see ECMA-376 Part 4, Section 18.8.22 (font)
 * @see ECMA-376 Part 4, Section 18.8.9 (color)
 * @see ECMA-376 Part 4, Section 18.8.8 (fonts)
 */

import type { XlsxFont, XlsxColor } from "../domain/style/font";
import type { XmlElement } from "../../xml";
import { createElement } from "../../xml";

// =============================================================================
// Color Serialization
// =============================================================================

/**
 * Serialize an XlsxColor to an XML color element.
 *
 * @param color - The color to serialize
 * @param elementName - The element name (default: "color")
 * @returns XmlElement representing the color
 *
 * @see ECMA-376 Part 4, Section 18.8.9 (color)
 *
 * @example
 * ```typescript
 * serializeColor({ type: "rgb", value: "FFFF0000" })
 * // => <color rgb="FFFF0000"/>
 *
 * serializeColor({ type: "theme", theme: 1, tint: 0.5 })
 * // => <color theme="1" tint="0.5"/>
 *
 * serializeColor({ type: "indexed", index: 64 })
 * // => <color indexed="64"/>
 *
 * serializeColor({ type: "auto" })
 * // => <color auto="1"/>
 * ```
 */
export function serializeColor(color: XlsxColor, elementName: string = "color"): XmlElement {
  const attrs: Record<string, string> = {};

  switch (color.type) {
    case "rgb":
      attrs.rgb = color.value;
      break;
    case "theme":
      attrs.theme = String(color.theme);
      if (color.tint !== undefined) {
        attrs.tint = String(color.tint);
      }
      break;
    case "indexed":
      attrs.indexed = String(color.index);
      break;
    case "auto":
      attrs.auto = "1";
      break;
  }

  return createElement(elementName, attrs);
}

// =============================================================================
// Font Serialization
// =============================================================================

/**
 * Serialize an XlsxFont to an XML font element.
 *
 * Child elements are output in ECMA-376 compliant order:
 * 1. b (bold)
 * 2. i (italic)
 * 3. strike
 * 4. condense
 * 5. extend
 * 6. outline
 * 7. shadow
 * 8. u (underline)
 * 9. vertAlign
 * 10. sz (size)
 * 11. color
 * 12. name
 * 13. family
 * 14. charset (not currently supported in XlsxFont type)
 * 15. scheme
 *
 * @param font - The font to serialize
 * @returns XmlElement representing the font
 *
 * @see ECMA-376 Part 4, Section 18.8.22 (font)
 *
 * @example
 * ```typescript
 * serializeFont({
 *   name: "Calibri",
 *   size: 11,
 *   bold: true,
 *   color: { type: "rgb", value: "FF000000" }
 * })
 * // => <font><b/><sz val="11"/><color rgb="FF000000"/><name val="Calibri"/></font>
 * ```
 */
export function serializeFont(font: XlsxFont): XmlElement {
  const children: XmlElement[] = [];

  // 1. Bold - only output if true
  if (font.bold === true) {
    children.push(createElement("b"));
  }

  // 2. Italic - only output if true
  if (font.italic === true) {
    children.push(createElement("i"));
  }

  // 3. Strikethrough - only output if true
  if (font.strikethrough === true) {
    children.push(createElement("strike"));
  }

  // 4. Condense - only output if true
  if (font.condense === true) {
    children.push(createElement("condense"));
  }

  // 5. Extend - only output if true
  if (font.extend === true) {
    children.push(createElement("extend"));
  }

  // 6. Outline - only output if true
  if (font.outline === true) {
    children.push(createElement("outline"));
  }

  // 7. Shadow - only output if true
  if (font.shadow === true) {
    children.push(createElement("shadow"));
  }

  // 8. Underline
  if (font.underline !== undefined && font.underline !== "none") {
    if (font.underline === "single") {
      // <u/> without val means single
      children.push(createElement("u"));
    } else {
      children.push(createElement("u", { val: font.underline }));
    }
  }

  // 9. Vertical alignment
  if (font.vertAlign !== undefined) {
    children.push(createElement("vertAlign", { val: font.vertAlign }));
  }

  // 10. Size (always output)
  children.push(createElement("sz", { val: String(font.size) }));

  // 11. Color
  if (font.color !== undefined) {
    children.push(serializeColor(font.color));
  }

  // 12. Name (always output)
  children.push(createElement("name", { val: font.name }));

  // 13. Family
  if (font.family !== undefined) {
    children.push(createElement("family", { val: String(font.family) }));
  }

  // 14. Charset - not currently in XlsxFont type

  // 15. Scheme
  if (font.scheme !== undefined) {
    children.push(createElement("scheme", { val: font.scheme }));
  }

  return createElement("font", {}, children);
}

// =============================================================================
// Fonts Collection Serialization
// =============================================================================

/**
 * Serialize a collection of fonts to an XML fonts element.
 *
 * @param fonts - Array of fonts to serialize
 * @returns XmlElement representing the fonts collection
 *
 * @see ECMA-376 Part 4, Section 18.8.8 (fonts)
 *
 * @example
 * ```typescript
 * serializeFonts([
 *   { name: "Calibri", size: 11 },
 *   { name: "Arial", size: 12, bold: true }
 * ])
 * // => <fonts count="2"><font>...</font><font>...</font></fonts>
 * ```
 */
export function serializeFonts(fonts: readonly XlsxFont[]): XmlElement {
  const children = fonts.map(serializeFont);
  return createElement("fonts", { count: String(fonts.length) }, children);
}
