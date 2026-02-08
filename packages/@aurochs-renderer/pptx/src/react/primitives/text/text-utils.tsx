/**
 * @file Text rendering utility functions
 *
 * Pure utility functions for text rendering calculations.
 *
 * @see ECMA-376 Part 1, Section 21.1.2 (DrawingML - Text)
 */

import type { PositionedSpan } from "../../../text-layout";

// =============================================================================
// Font Family
// =============================================================================

/**
 * Build CSS font-family string from span properties.
 *
 * Combines primary font with fallbacks for East Asian, complex script, and symbol fonts.
 *
 * @param span - Positioned span with font information
 * @returns CSS font-family value
 */
export function buildFontFamily(span: PositionedSpan): string {
  const families = [span.fontFamily];

  if (span.fontFamilyEastAsian !== undefined) {
    families.push(span.fontFamilyEastAsian);
  }

  if (span.fontFamilyComplexScript !== undefined && span.fontFamilyComplexScript !== span.fontFamily) {
    families.push(span.fontFamilyComplexScript);
  }

  if (span.fontFamilySymbol !== undefined && span.fontFamilySymbol !== span.fontFamily) {
    families.push(span.fontFamilySymbol);
  }

  return families.join(", ");
}

// =============================================================================
// Text Transform
// =============================================================================

/**
 * Apply text transform (uppercase/lowercase) to text.
 *
 * @param text - Input text
 * @param transform - Transform type (none, uppercase, lowercase)
 * @returns Transformed text
 *
 * @see ECMA-376 Part 1, Section 21.1.2.1.6 (ST_TextCapsType)
 */
export function applyTextTransform(
  text: string,
  transform: "none" | "uppercase" | "lowercase" | undefined,
): string {
  if (transform === "uppercase") {
    return text.toUpperCase();
  }
  if (transform === "lowercase") {
    return text.toLowerCase();
  }
  return text;
}

// =============================================================================
// Vertical Alignment
// =============================================================================

/**
 * Super/subscript offset multiplier.
 */
const VERTICAL_OFFSET_MULTIPLIER = 0.3;

/**
 * Apply vertical alignment offset for super/subscript.
 *
 * @param lineY - Base line Y coordinate
 * @param fontSizePx - Font size in pixels
 * @param verticalAlign - Vertical alignment type
 * @returns Adjusted Y coordinate
 *
 * @see ECMA-376 Part 1, Section 21.1.2.3.3 (baseline attribute)
 */
export function applyVerticalAlign(
  lineY: number,
  fontSizePx: number,
  verticalAlign: "baseline" | "superscript" | "subscript",
): number {
  if (verticalAlign === "superscript") {
    return lineY - fontSizePx * VERTICAL_OFFSET_MULTIPLIER;
  }
  if (verticalAlign === "subscript") {
    return lineY + fontSizePx * VERTICAL_OFFSET_MULTIPLIER;
  }
  return lineY;
}

// =============================================================================
// SVG Dominant Baseline
// =============================================================================

/**
 * Font alignment to SVG dominant-baseline mapping.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.2.7 (fontAlgn)
 */
const FONT_ALIGNMENT_TO_BASELINE: Record<string, string | undefined> = {
  top: "text-top",
  center: "central",
  bottom: "text-bottom",
  auto: undefined,
  base: undefined,
};

/**
 * Convert ECMA-376 font alignment to SVG dominant-baseline.
 *
 * @param fontAlignment - Font alignment value
 * @returns SVG dominant-baseline value or undefined for default
 */
export function toSvgDominantBaseline(
  fontAlignment: "auto" | "top" | "center" | "base" | "bottom",
): string | undefined {
  return FONT_ALIGNMENT_TO_BASELINE[fontAlignment];
}
