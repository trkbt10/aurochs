/**
 * @file Common OOXML Unit Serialization
 *
 * Provides common serialization functions for OOXML unit conversions.
 * These are shared across all OOXML formats (PPTX, XLSX, DOCX).
 *
 * @see ECMA-376 Part 1, Section 20.1 (DrawingML)
 */

import type { Degrees, Percent, Pixels } from "../domain/units";

// =============================================================================
// Boolean Serialization
// =============================================================================

/**
 * Serialize a boolean to OOXML format (1/0).
 *
 * Uses the numeric format ("1" / "0") which is standard in OOXML.
 *
 * @param value - Boolean value to serialize
 * @returns "1" for true, "0" for false
 *
 * @example
 * ooxmlBool(true)   // => "1"
 * ooxmlBool(false)  // => "0"
 */
export function ooxmlBool(value: boolean): "1" | "0" {
  return value ? "1" : "0";
}

// =============================================================================
// DrawingML Angle Serialization
// =============================================================================

/**
 * Convert degrees to OOXML angle units (60000ths of a degree).
 *
 * OOXML angles are stored as 1/60000 of a degree.
 *
 * @param degrees - Angle in degrees
 * @returns String representation in 60000ths
 *
 * @see ECMA-376 Part 1, Section 20.1.10.3 (ST_Angle)
 *
 * @example
 * ooxmlAngleUnits(deg(90))  // => "5400000"
 * ooxmlAngleUnits(deg(45))  // => "2700000"
 */
export function ooxmlAngleUnits(degrees: Degrees): string {
  return String(Math.round(degrees * 60000));
}

// =============================================================================
// DrawingML Percentage Serialization
// =============================================================================

/**
 * Convert percentage to OOXML 100000ths format.
 *
 * OOXML percentages (100000ths): 100000 = 100%.
 *
 * @param percent - Percentage value (0-100)
 * @returns String representation in 100000ths
 *
 * @see ECMA-376 Part 1, Section 20.1.10.40 (ST_Percentage)
 *
 * @example
 * ooxmlPercent100k(pct(50))  // => "50000"
 * ooxmlPercent100k(pct(100)) // => "100000"
 */
export function ooxmlPercent100k(percent: Percent): string {
  return String(Math.round((percent / 100) * 100000));
}

/**
 * Convert percentage to OOXML 1000ths format.
 *
 * OOXML percentages (1000ths): 100000 = 100%.
 *
 * @param percent - Percentage value (0-100)
 * @returns String representation in 1000ths
 *
 * @see ECMA-376 Part 1, Section 20.1.10.41 (ST_PositivePercentage)
 *
 * @example
 * ooxmlPercent1000(pct(50))  // => "50000"
 * ooxmlPercent1000(pct(100)) // => "100000"
 */
export function ooxmlPercent1000(percent: Percent): string {
  return String(Math.round(percent * 1000));
}

// =============================================================================
// EMU Conversion
// =============================================================================

/**
 * EMU per CSS pixel constant.
 * 914400 EMU = 1 inch = 96 CSS pixels
 */
export const EMU_PER_PIXEL = 9525;

/**
 * Convert CSS pixels to EMU (English Metric Units).
 *
 * Parser uses: px = emu * (96 / 914400). So inverse is emu = px * 9525.
 *
 * @param pixels - Value in CSS pixels
 * @returns String representation in EMU
 *
 * @see ECMA-376 Part 1, Section 20.1.10.16 (ST_Coordinate)
 *
 * @example
 * ooxmlEmu(px(96))  // => "914400" (1 inch)
 * ooxmlEmu(px(1))   // => "9525"
 */
export function ooxmlEmu(pixels: Pixels): string {
  return String(Math.round(pixels * EMU_PER_PIXEL));
}
