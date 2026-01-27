/**
 * @file Font Parser for styles.xml
 *
 * Parses font elements from the stylesheet (xl/styles.xml) of XLSX files.
 * Font definitions specify text formatting properties including typeface,
 * size, and various styling options.
 *
 * @see ECMA-376 Part 4, Section 18.8.22 (font)
 * @see ECMA-376 Part 4, Section 18.8.9 (color)
 * @see ECMA-376 Part 4, Section 18.8.8 (fonts)
 */

import type { XlsxFont, XlsxColor, UnderlineStyle } from "../../domain/style/font";
import { parseBooleanAttr, parseFloatAttr, parseIntAttr } from "../primitive";
import type { XmlElement } from "@oxen/xml";
import { getChild, getChildren, getAttr } from "@oxen/xml";

// =============================================================================
// Color Parsing
// =============================================================================

/**
 * Parse a color element into XlsxColor.
 *
 * Colors in SpreadsheetML can be specified as:
 * - RGB: Direct AARRGGBB hex value (rgb attribute)
 * - Theme: Reference to theme color with optional tint
 * - Indexed: Reference to legacy indexed color palette
 * - Auto: Automatic color (system-dependent)
 *
 * @param colorElement - The <color> element from the font definition
 * @returns The parsed color or undefined if element is missing or invalid
 *
 * @see ECMA-376 Part 4, Section 18.8.9 (color)
 * @see ECMA-376 Part 4, Section 18.8.3 (CT_Color)
 *
 * @example
 * ```xml
 * <color rgb="FFFF0000"/>       <!-- RGB red -->
 * <color theme="1" tint="0.5"/> <!-- Theme color with tint -->
 * <color indexed="10"/>         <!-- Indexed color -->
 * <color auto="1"/>             <!-- Auto color -->
 * ```
 */
export function parseColor(colorElement: XmlElement): XlsxColor | undefined {
  // Check for RGB color
  const rgb = getAttr(colorElement, "rgb");
  if (rgb) {
    return { type: "rgb", value: rgb };
  }

  // Check for theme color
  const theme = getAttr(colorElement, "theme");
  if (theme !== undefined) {
    const tint = parseFloatAttr(getAttr(colorElement, "tint"));
    return {
      type: "theme",
      theme: parseInt(theme, 10),
      tint,
    };
  }

  // Check for indexed color
  const indexed = getAttr(colorElement, "indexed");
  if (indexed !== undefined) {
    return { type: "indexed", index: parseInt(indexed, 10) };
  }

  // Check for auto color (attribute presence indicates auto)
  if (getAttr(colorElement, "auto") !== undefined) {
    return { type: "auto" };
  }

  return undefined;
}

// =============================================================================
// Font Parsing
// =============================================================================

/**
 * Parse a boolean element as used in font definitions.
 *
 * In SpreadsheetML, boolean properties (bold, italic, strike, etc.) use
 * a special convention:
 * - Element present with no val attribute → true
 * - Element present with val="1" or val="true" → true
 * - Element present with val="0" or val="false" → false
 * - Element absent → undefined (inherit/default)
 *
 * @param el - The boolean element (e.g., <b/>, <i/>, <strike/>)
 * @returns true, false, or undefined based on element presence and value
 */
function parseBoolElement(el: XmlElement | undefined): boolean | undefined {
  if (!el) {
    return undefined;
  }
  const val = getAttr(el, "val");
  if (val === undefined) {
    // Element present without val attribute means true
    return true;
  }
  return parseBooleanAttr(val);
}

/**
 * Parse underline style from the <u> element.
 *
 * @param uEl - The <u> element or undefined if not present
 * @returns The underline style or undefined
 */
function parseUnderlineElement(uEl: XmlElement | undefined): UnderlineStyle | undefined {
  if (!uEl) {
    return undefined;
  }
  const uVal = getAttr(uEl, "val");
  if (uVal === undefined) {
    // <u/> without val means single underline
    return "single";
  }
  return uVal as UnderlineStyle;
}

/**
 * Parse scheme value from the <scheme> element.
 *
 * @param schemeEl - The <scheme> element or undefined if not present
 * @returns The scheme value or undefined if invalid
 */
function parseSchemeElement(schemeEl: XmlElement | undefined): "major" | "minor" | "none" | undefined {
  if (!schemeEl) {
    return undefined;
  }
  const schemeVal = getAttr(schemeEl, "val");
  if (schemeVal === "major" || schemeVal === "minor" || schemeVal === "none") {
    return schemeVal;
  }
  return undefined;
}

/**
 * Parse vertical alignment from the <vertAlign> element.
 *
 * @param vertAlignEl - The <vertAlign> element or undefined if not present
 * @returns The vertical alignment value or undefined if invalid
 */
function parseVertAlignElement(vertAlignEl: XmlElement | undefined): "superscript" | "subscript" | "baseline" | undefined {
  if (!vertAlignEl) {
    return undefined;
  }
  const vertAlignVal = getAttr(vertAlignEl, "val");
  if (vertAlignVal === "superscript" || vertAlignVal === "subscript" || vertAlignVal === "baseline") {
    return vertAlignVal;
  }
  return undefined;
}

/**
 * Parse a single font element into XlsxFont.
 *
 * @param fontElement - The <font> element from styles.xml
 * @returns The parsed font definition
 *
 * @see ECMA-376 Part 4, Section 18.8.22 (font)
 *
 * @example
 * ```xml
 * <font>
 *   <sz val="11"/>
 *   <color theme="1"/>
 *   <name val="Calibri"/>
 *   <family val="2"/>
 *   <scheme val="minor"/>
 *   <b/>
 *   <i/>
 * </font>
 * ```
 */
export function parseFont(fontElement: XmlElement): XlsxFont {
  // Get child elements
  const nameEl = getChild(fontElement, "name");
  const szEl = getChild(fontElement, "sz");
  const bEl = getChild(fontElement, "b");
  const iEl = getChild(fontElement, "i");
  const uEl = getChild(fontElement, "u");
  const strikeEl = getChild(fontElement, "strike");
  const colorEl = getChild(fontElement, "color");
  const familyEl = getChild(fontElement, "family");
  const schemeEl = getChild(fontElement, "scheme");
  const vertAlignEl = getChild(fontElement, "vertAlign");
  const outlineEl = getChild(fontElement, "outline");
  const shadowEl = getChild(fontElement, "shadow");
  const condenseEl = getChild(fontElement, "condense");
  const extendEl = getChild(fontElement, "extend");

  return {
    name: nameEl ? getAttr(nameEl, "val") ?? "Calibri" : "Calibri",
    size: parseFloatAttr(szEl ? getAttr(szEl, "val") : undefined) ?? 11,
    bold: parseBoolElement(bEl),
    italic: parseBoolElement(iEl),
    underline: parseUnderlineElement(uEl),
    strikethrough: parseBoolElement(strikeEl),
    color: colorEl ? parseColor(colorEl) : undefined,
    family: parseIntAttr(familyEl ? getAttr(familyEl, "val") : undefined),
    scheme: parseSchemeElement(schemeEl),
    vertAlign: parseVertAlignElement(vertAlignEl),
    outline: parseBoolElement(outlineEl),
    shadow: parseBoolElement(shadowEl),
    condense: parseBoolElement(condenseEl),
    extend: parseBoolElement(extendEl),
  };
}

// =============================================================================
// Fonts Collection Parsing
// =============================================================================

/**
 * Parse all font elements from the fonts collection.
 *
 * @param fontsElement - The <fonts> element from styles.xml
 * @returns Array of parsed font definitions
 *
 * @see ECMA-376 Part 4, Section 18.8.8 (fonts)
 *
 * @example
 * ```xml
 * <fonts count="2" x14ac:knownFonts="1">
 *   <font>
 *     <sz val="11"/>
 *     <name val="Calibri"/>
 *   </font>
 *   <font>
 *     <sz val="11"/>
 *     <name val="Arial"/>
 *     <b/>
 *   </font>
 * </fonts>
 * ```
 */
export function parseFonts(fontsElement: XmlElement): readonly XlsxFont[] {
  const result: XlsxFont[] = [];
  const fontElements = getChildren(fontsElement, "font");

  for (const fontEl of fontElements) {
    result.push(parseFont(fontEl));
  }

  return result;
}
