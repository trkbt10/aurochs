/**
 * @file OOXML Unit Serialization
 *
 * Serialization functions for OOXML unit conversions shared across
 * all OOXML formats (PPTX, XLSX, DOCX).
 *
 * This is the SoT for OOXML unit constants and conversions.
 *
 * @see ECMA-376 Part 1, Section 20.1 (DrawingML)
 */

import type { Degrees, Percent, Pixels } from "@aurochs-office/drawing-ml/domain/units";

// =============================================================================
// Constants
// =============================================================================

/**
 * EMUs (English Metric Units) per inch.
 * Fundamental measurement unit in OOXML.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.16 (ST_Coordinate)
 */
export const EMU_PER_INCH = 914400;

/**
 * Standard screen DPI for pixel conversion.
 * 96 DPI is the standard assumption for EMU ↔ pixel conversion.
 */
export const STANDARD_DPI = 96;

/**
 * EMUs per CSS pixel at standard 96 DPI.
 * 914400 / 96 = 9525.
 */
export const EMU_PER_PIXEL = EMU_PER_INCH / STANDARD_DPI;

/**
 * Points per inch (standard typographic measurement).
 */
export const POINTS_PER_INCH = 72;

/**
 * OOXML percentage to decimal conversion factor.
 * OOXML stores percentages as integers where 100000 = 100%.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.40 (ST_Percentage)
 */
export const OOXML_PERCENT_FACTOR = 100000;

// =============================================================================
// Boolean Serialization
// =============================================================================

/**
 * Serialize a boolean to OOXML format (1/0).
 *
 * @see ECMA-376 Part 1, Section 22.9.2.13 (ST_OnOff)
 */
export function ooxmlBool(value: boolean): "1" | "0" {
  return value ? "1" : "0";
}

// =============================================================================
// Angle Serialization
// =============================================================================

/**
 * Convert degrees to OOXML angle units (60000ths of a degree).
 *
 * @see ECMA-376 Part 1, Section 20.1.10.3 (ST_Angle)
 */
export function ooxmlAngleUnits(degrees: Degrees): string {
  return String(Math.round(degrees * 60000));
}

// =============================================================================
// Percentage Serialization
// =============================================================================

/**
 * Convert percentage to OOXML 100000ths format (100000 = 100%).
 *
 * @see ECMA-376 Part 1, Section 20.1.10.40 (ST_Percentage)
 */
export function ooxmlPercent100k(percent: Percent): string {
  return String(Math.round((percent / 100) * 100000));
}

/**
 * Convert percentage to OOXML 1000ths format (1000 = 1%).
 *
 * @see ECMA-376 Part 1, Section 20.1.10.41 (ST_PositivePercentage)
 */
export function ooxmlPercent1000(percent: Percent): string {
  return String(Math.round(percent * 1000));
}

// =============================================================================
// EMU Conversion
// =============================================================================

/**
 * Convert CSS pixels to EMU (English Metric Units).
 *
 * @see ECMA-376 Part 1, Section 20.1.10.16 (ST_Coordinate)
 */
export function ooxmlEmu(pixels: Pixels): string {
  return String(Math.round(pixels * EMU_PER_PIXEL));
}
