/**
 * @file Shared font scheme parser for DrawingML themes
 *
 * Parses `a:fontScheme` elements (containing `a:majorFont` and `a:minorFont`)
 * into FontScheme domain objects. Used by both XLSX and PPTX theme parsers.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.18 (a:fontScheme)
 * @see ECMA-376 Part 1, Section 20.1.4.1.16-17 (a:majorFont / a:minorFont)
 */

import type { XmlElement } from "@aurochs/xml";
import { getAttr, getChild, getChildren } from "@aurochs/xml";
import type { FontScheme, FontSpec } from "../domain/font-scheme";

// =============================================================================
// Font Spec Extraction
// =============================================================================

/**
 * Extract a FontSpec from a font element (`a:majorFont` or `a:minorFont`).
 *
 * Reads the three primary script categories (`a:latin`, `a:ea`, `a:cs`) and
 * collects all supplemental script-specific font definitions (`a:font`).
 *
 * @param fontElement - The `a:majorFont` or `a:minorFont` element, or undefined
 * @returns Parsed font spec
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.16-17
 */
export function extractFontSpec(fontElement: XmlElement | undefined): FontSpec {
  if (fontElement === undefined) {
    return { latin: undefined, eastAsian: undefined, complexScript: undefined };
  }

  const latin = getChild(fontElement, "a:latin");
  const ea = getChild(fontElement, "a:ea");
  const cs = getChild(fontElement, "a:cs");

  const supplementalFonts = collectSupplementalFonts(fontElement);

  return {
    latin: latin?.attrs?.typeface,
    eastAsian: ea?.attrs?.typeface,
    complexScript: cs?.attrs?.typeface,
    supplementalFonts: Object.keys(supplementalFonts).length > 0 ? supplementalFonts : undefined,
  };
}

// =============================================================================
// Supplemental Fonts
// =============================================================================

/**
 * Collect `<a:font script="..." typeface="..."/>` entries from a font element.
 *
 * These are supplemental font definitions that map IETF script tags
 * (e.g. "Jpan", "Hang", "Hans") to specific typefaces.
 *
 * @param fontElement - The `a:majorFont` or `a:minorFont` element
 * @returns Record of script tag → typeface name
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.9 (a:font)
 */
function collectSupplementalFonts(fontElement: XmlElement): Record<string, string> {
  const fonts: Record<string, string> = {};
  for (const child of getChildren(fontElement, "a:font")) {
    const script = getAttr(child, "script");
    const typeface = getAttr(child, "typeface");
    if (script !== undefined && typeface !== undefined && typeface !== "") {
      fonts[script] = typeface;
    }
  }
  return fonts;
}

// =============================================================================
// Font Scheme Parsing
// =============================================================================

const EMPTY_FONT_SPEC: FontSpec = {
  latin: undefined,
  eastAsian: undefined,
  complexScript: undefined,
};

/**
 * Parse a FontScheme from `a:majorFont` and `a:minorFont` elements.
 *
 * @param majorFontElement - The `a:majorFont` element, or undefined
 * @param minorFontElement - The `a:minorFont` element, or undefined
 * @returns Parsed font scheme
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.18 (a:fontScheme)
 */
export function parseFontSchemeFromElements(
  majorFontElement: XmlElement | undefined,
  minorFontElement: XmlElement | undefined,
): FontScheme {
  return {
    majorFont: majorFontElement ? extractFontSpec(majorFontElement) : EMPTY_FONT_SPEC,
    minorFont: minorFontElement ? extractFontSpec(minorFontElement) : EMPTY_FONT_SPEC,
  };
}
