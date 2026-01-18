/**
 * @file ECMA-376 Part 1 WordprocessingML Specification Defaults
 *
 * These are fallback values defined by the specification when no explicit
 * value is provided AND no docDefaults/style inheritance applies.
 *
 * IMPORTANT: These are NOT application defaults (e.g., Word's 11pt Calibri).
 * These are the values mandated by the ECMA-376 standard itself.
 *
 * @see ECMA-376-1:2016 Part 1, Section 17 (WordprocessingML)
 */

// =============================================================================
// Unit Conversion Constants (Exact per Spec)
// =============================================================================

/**
 * Twips per point.
 * 1 point = 20 twips.
 * @see ECMA-376-1:2016 Section 17.15.1.25 (Measurement Units)
 */
export const TWIPS_PER_POINT = 20;

/**
 * Half-points per point.
 * Font sizes in OOXML are specified in half-points (sz element).
 * @see ECMA-376-1:2016 Section 17.3.2.38 (sz)
 */
export const HALF_POINTS_PER_POINT = 2;

/**
 * EMU (English Metric Units) per inch.
 * @see ECMA-376-1:2016 Section 20.1.10.16 (ST_Coordinate)
 */
export const EMU_PER_INCH = 914400;

/**
 * Twips per inch.
 * 1 inch = 1440 twips = 72 points.
 */
export const TWIPS_PER_INCH = 1440;

/**
 * Points per inch.
 */
export const POINTS_PER_INCH = 72;

/**
 * Pixels per inch at standard CSS resolution.
 */
export const PIXELS_PER_INCH = 96;

/**
 * Points to pixels conversion factor at 96 DPI.
 */
export const PT_TO_PX = PIXELS_PER_INCH / POINTS_PER_INCH; // 96 / 72 = 1.333...

/**
 * Twips to pixels conversion factor at 96 DPI.
 */
export const TWIPS_TO_PX = PIXELS_PER_INCH / TWIPS_PER_INCH; // 96 / 1440 = 0.0667...

// =============================================================================
// Page Size - Letter (ECMA-376 Default when pgSz Omitted)
// =============================================================================

/**
 * Default page width in twips (Letter size: 8.5 inches).
 * @see ECMA-376-1:2016 Section 17.6.13 (pgSz)
 */
export const SPEC_DEFAULT_PAGE_WIDTH_TWIPS = 12240; // 8.5 * 1440

/**
 * Default page height in twips (Letter size: 11 inches).
 * @see ECMA-376-1:2016 Section 17.6.13 (pgSz)
 */
export const SPEC_DEFAULT_PAGE_HEIGHT_TWIPS = 15840; // 11 * 1440

// =============================================================================
// Page Margins - Spec Default when pgMar Omitted
// =============================================================================

/**
 * Default margin in twips (1 inch).
 * @see ECMA-376-1:2016 Section 17.6.11 (pgMar)
 */
export const SPEC_DEFAULT_MARGIN_TWIPS = 1440; // 1 inch

/**
 * Default header/footer distance from page edge in twips (0.5 inch).
 * This is the distance from the top/bottom edge of the page to the header/footer content.
 * @see ECMA-376-1:2016 Section 17.6.11 (pgMar - header/footer attributes)
 */
export const SPEC_DEFAULT_HEADER_FOOTER_DISTANCE_TWIPS = 720; // 0.5 inch

// =============================================================================
// Font Size - Spec Default when sz Omitted AND No Style Inheritance
// =============================================================================

/**
 * Default font size in half-points (10pt).
 * This is the ECMA-376 specification default, NOT the Word application default (11pt).
 * @see ECMA-376-1:2016 Section 17.3.2.38 (sz)
 */
export const SPEC_DEFAULT_FONT_SIZE_HALF_POINTS = 20; // 10pt

/**
 * Default font size in points.
 * Derived from SPEC_DEFAULT_FONT_SIZE_HALF_POINTS for convenience.
 */
export const SPEC_DEFAULT_FONT_SIZE_PT = SPEC_DEFAULT_FONT_SIZE_HALF_POINTS / HALF_POINTS_PER_POINT; // 10pt

// =============================================================================
// Text Direction - Spec Default
// =============================================================================

/**
 * Text direction values as defined in ECMA-376.
 * @see ECMA-376-1:2016 Section 17.18.93 (ST_TextDirection)
 */
export type EcmaTextDirection =
  | "lrTb"   // Left to right, top to bottom (horizontal, standard)
  | "tbRl"   // Top to bottom, right to left (vertical, Japanese/Chinese)
  | "btLr"   // Bottom to top, left to right
  | "lrTbV"  // Horizontal with vertical glyph rotation
  | "tbRlV"  // Vertical with vertical glyph rotation
  | "tbLrV"; // Top to bottom, left to right with vertical glyph rotation

/**
 * Default text direction.
 * @see ECMA-376-1:2016 Section 17.3.1.41 (textDirection)
 */
export const SPEC_DEFAULT_TEXT_DIRECTION: EcmaTextDirection = "lrTb";

// =============================================================================
// Tab Stop - Spec Default
// =============================================================================

/**
 * Default tab stop interval in twips (0.5 inch).
 * @see ECMA-376-1:2016 Section 17.15.1.25 (defaultTabStop)
 */
export const SPEC_DEFAULT_TAB_STOP_TWIPS = 720; // 0.5 inch

// =============================================================================
// Line Spacing - Spec Default
// =============================================================================

/**
 * Default line spacing value in twips (single line spacing).
 * When lineRule is "auto", this value represents 240 = 100% (single spacing).
 * @see ECMA-376-1:2016 Section 17.3.1.33 (spacing)
 */
export const SPEC_DEFAULT_LINE_SPACING_VALUE = 240; // Single line spacing (100%)

// =============================================================================
// Conversion Utilities
// =============================================================================

import type { Pixels, Points } from "../../ooxml/domain/units";
import { px, pt } from "../../ooxml/domain/units";

/**
 * Convert twips to pixels.
 */
export function twipsToPx(twips: number): Pixels {
  return px(twips * TWIPS_TO_PX);
}

/**
 * Convert twips to points.
 */
export function twipsToPt(twips: number): Points {
  return pt(twips / TWIPS_PER_POINT);
}

/**
 * Convert half-points to points.
 */
export function halfPointsToPt(halfPoints: number): Points {
  return pt(halfPoints / HALF_POINTS_PER_POINT);
}

/**
 * Convert points to pixels.
 */
export function ptToPx(points: Points): Pixels {
  return px((points as number) * PT_TO_PX);
}

/**
 * EMU to pixels conversion factor.
 * 914400 EMU = 1 inch = 96 CSS pixels.
 */
export const EMU_TO_PX = PIXELS_PER_INCH / EMU_PER_INCH;

/**
 * Convert EMUs to pixels.
 * @see ECMA-376-1:2016 Section 20.1.10.16 (ST_Coordinate)
 */
export function emuToPx(emu: number): Pixels {
  return px(emu * EMU_TO_PX);
}
