/**
 * @file Theme Parser for XLSX
 *
 * Parses DrawingML theme XML elements (a:theme) for use in SpreadsheetML.
 * Themes are located at xl/theme/theme1.xml in the package.
 *
 * Font scheme parsing is delegated to the shared OOXML parser
 * (`@aurochs-office/ooxml/parser/font-scheme`).
 *
 * @see ECMA-376 Part 1, Section 20.1.6 (Theme)
 */

import type { XmlElement, XmlDocument } from "@aurochs/xml";
import { getAttr, getChild, getByPath, isXmlElement } from "@aurochs/xml";
import type { ColorScheme } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FontScheme } from "@aurochs-office/ooxml/domain/font-scheme";
import { parseFontSchemeFromElements } from "@aurochs-office/ooxml/parser/font-scheme";
import type { XlsxTheme } from "../domain/theme";

// =============================================================================
// Font Scheme Parsing
// =============================================================================

/**
 * Parse FontScheme from theme content.
 *
 * @param themeDocument - Parsed theme XML document
 * @returns Parsed font scheme
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.18 (a:fontScheme)
 */
function parseFontScheme(themeDocument: XmlDocument): FontScheme {
  const fontSchemeEl = getByPath(themeDocument, ["a:theme", "a:themeElements", "a:fontScheme"]);

  const majorFont = fontSchemeEl !== undefined ? getChild(fontSchemeEl, "a:majorFont") : undefined;
  const minorFont = fontSchemeEl !== undefined ? getChild(fontSchemeEl, "a:minorFont") : undefined;

  return parseFontSchemeFromElements(majorFont, minorFont);
}

// =============================================================================
// Color Scheme Parsing
// =============================================================================

/**
 * Collect colors from a:clrScheme element.
 *
 * @param clrScheme - The a:clrScheme element
 * @returns Color scheme as a record of color names to hex values
 */
function collectColorScheme(clrScheme: XmlElement | undefined): ColorScheme {
  const colors: Record<string, string> = {};
  if (clrScheme === undefined) {
    return colors;
  }

  // Color scheme has children like a:dk1, a:lt1, a:accent1, etc.
  for (const child of clrScheme.children) {
    if (!isXmlElement(child)) {
      continue;
    }
    const colorElement = child;
    const colorName = colorElement.name.replace("a:", "");

    // Get color value from srgbClr or sysClr
    const srgbClr = getChild(colorElement, "a:srgbClr");
    if (srgbClr !== undefined) {
      colors[colorName] = srgbClr.attrs?.val ?? "";
    } else {
      const sysClr = getChild(colorElement, "a:sysClr");
      if (sysClr !== undefined) {
        colors[colorName] = sysClr.attrs?.lastClr ?? "";
      }
    }
  }

  return colors;
}

/**
 * Parse ColorScheme from theme content.
 *
 * @param themeDocument - Parsed theme XML document
 * @returns Parsed color scheme
 *
 * @see ECMA-376 Part 1, Section 20.1.6.2 (a:clrScheme)
 */
function parseColorScheme(themeDocument: XmlDocument): ColorScheme {
  const clrScheme = getByPath(themeDocument, ["a:theme", "a:themeElements", "a:clrScheme"]);
  return collectColorScheme(clrScheme);
}

// =============================================================================
// Theme Parsing
// =============================================================================

/**
 * Parse complete theme from theme XML document.
 *
 * @param themeDocument - Parsed theme XML document
 * @param xmlPath - Path to the theme XML within the package
 * @returns Parsed theme definition
 *
 * @see ECMA-376 Part 1, Section 20.1.6.9 (a:theme)
 */
export function parseTheme(themeDocument: XmlDocument, xmlPath: string): XlsxTheme {
  const themeElement = getByPath(themeDocument, ["a:theme"]);
  const name = themeElement ? getAttr(themeElement, "name") : undefined;

  return {
    name: name ?? undefined,
    colorScheme: parseColorScheme(themeDocument),
    fontScheme: parseFontScheme(themeDocument),
    xmlPath,
  };
}
