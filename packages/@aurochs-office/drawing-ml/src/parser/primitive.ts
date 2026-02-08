/**
 * @file Common DrawingML primitive parsing utilities
 *
 * Converts XML attribute strings to common primitive/domain types.
 * Intended to be shared across OOXML format parsers (PPTX/XLSX/DOCX).
 *
 * Notes:
 * - Length values expressed in EMUs are converted to CSS-friendly pixels.
 * - Percent values are normalized to 0-100 scale.
 *
 * @see ECMA-376 Part 1, Section 20.1.10 (Simple Types)
 */

import type { Degrees, Percent, Pixels } from "../domain/units";
import type { SchemeColorValue } from "../domain/color";
import { deg, pct, px } from "../domain/units";
import { getAttr, type XmlElement } from "@aurochs/xml";

// =============================================================================
// Constants
// =============================================================================

/** EMU per inch (914400) */
const EMU_PER_INCH = 914400;

/** Standard display DPI (96) */
const STANDARD_DPI = 96;

/** Points per inch (72) */
const POINTS_PER_INCH = 72;

/** EMU to pixels factor */
const EMU_TO_PX = STANDARD_DPI / EMU_PER_INCH;

/** Angle units per degree (60000) */
const ANGLE_UNITS_PER_DEGREE = 60000;

/** Percent units per percent (1000) */
const PERCENT_1000 = 1000;

/** Percent units per 100% (100000) */
const PERCENT_100000 = 100000;

// =============================================================================
// Integer/Number Parsing
// =============================================================================

/** Parse a string to a 32-bit signed integer. */
export function parseInt32(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const num = parseInt(value, 10);
  return Number.isNaN(num) ? undefined : num;
}

/** Parse a string to a 64-bit safe integer (JavaScript number range). */
export function parseInt64(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const num = parseInt(value, 10);
  if (Number.isNaN(num)) {
    return undefined;
  }
  if (!Number.isSafeInteger(num)) {
    return undefined;
  }
  return num;
}

/** Parse a string to an unsigned 32-bit integer (0 to 4294967295). */
export function parseUnsignedInt(value: string | undefined): number | undefined {
  const num = parseInt64(value);
  if (num === undefined) {
    return undefined;
  }
  if (num < 0 || num > 4294967295) {
    return undefined;
  }
  return num;
}

/** Parse a string to an index value (unsigned 32-bit integer). */
export function parseIndex(value: string | undefined): number | undefined {
  return parseUnsignedInt(value);
}

/** Parse a string to a 32-bit signed integer with a default fallback. */
export function parseInt32Or(value: string | undefined, defaultValue: number): number {
  return parseInt32(value) ?? defaultValue;
}

/** Parse a string to a 64-bit floating-point number. */
export function parseFloat64(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const num = parseFloat(value);
  return Number.isNaN(num) ? undefined : num;
}

// =============================================================================
// Boolean Parsing
// =============================================================================

/**
 * Parse OOXML boolean values.
 *
 * OOXML commonly uses: "1"/"true"/"on" for true, "0"/"false"/"off" for false.
 * Some producers may emit empty string for true when the attribute exists.
 */
export function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  const lower = value.toLowerCase();
  if (lower === "1" || lower === "true" || lower === "on" || lower === "") {
    return true;
  }
  if (lower === "0" || lower === "false" || lower === "off") {
    return false;
  }
  return undefined;
}

/** Parse an OOXML boolean value with a default fallback. */
export function parseBooleanOr(value: string | undefined, defaultValue: boolean): boolean {
  return parseBoolean(value) ?? defaultValue;
}

// =============================================================================
// EMU Parsing
// =============================================================================

/**
 * Parse EMU coordinate to pixels.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.16 (ST_Coordinate)
 */
export function parseEmu(value: string | undefined): Pixels | undefined {
  const num = parseInt32(value);
  if (num === undefined) {
    return undefined;
  }
  return px(num * EMU_TO_PX);
}

/**
 * Parse line width (0 to 20116800 EMU) to pixels.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.35 (ST_LineWidth)
 */
export function parseLineWidth(value: string | undefined): Pixels | undefined {
  const num = parseInt32(value);
  if (num === undefined) {
    return undefined;
  }
  if (num < 0 || num > 20116800) {
    return undefined;
  }
  return px(num * EMU_TO_PX);
}

// =============================================================================
// Angle Parsing
// =============================================================================

/**
 * Parse OOXML angle units (60000ths of a degree) to degrees.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.3 (ST_Angle)
 */
export function parseAngle(value: string | undefined): Degrees | undefined {
  const num = parseInt32(value);
  if (num === undefined) {
    return undefined;
  }
  return deg(num / ANGLE_UNITS_PER_DEGREE);
}

// =============================================================================
// Percentage Parsing
// =============================================================================

/**
 * Parse percentage in 1000ths (e.g., "50000" => 50%).
 *
 * @see ECMA-376 Part 1, Section 20.1.10.40 (ST_Percentage)
 */
export function parsePercentage(value: string | undefined): Percent | undefined {
  const num = parseInt32(value);
  if (num === undefined) {
    return undefined;
  }
  return pct(num / PERCENT_1000);
}

/**
 * Parse percentage in 100000ths (e.g., "50000" => 50%).
 *
 * Used by many DrawingML color transforms.
 */
export function parsePercentage100k(value: string | undefined): Percent | undefined {
  const num = parseInt32(value);
  if (num === undefined) {
    return undefined;
  }
  return pct((num / PERCENT_100000) * 100);
}

/** Parse a percentage that must be non-negative (in 1000ths). */
export function parsePositivePercentage(value: string | undefined): Percent | undefined {
  const p = parsePercentage(value);
  if (p === undefined || p < 0) {
    return undefined;
  }
  return p;
}

/** Parse a fixed percentage (0-100%, in 100000ths scale). */
export function parseFixedPercentage(value: string | undefined): Percent | undefined {
  const p = parsePercentage100k(value);
  if (p === undefined || p < 0 || p > 100) {
    return undefined;
  }
  return p;
}

// =============================================================================
// Enumerations (Shared)
// =============================================================================

/**
 * Parse scheme color value.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.54 (ST_SchemeColorVal)
 */
export function parseSchemeColorValue(value: string | undefined): SchemeColorValue | undefined {
  switch (value) {
    case "dk1":
    case "lt1":
    case "dk2":
    case "lt2":
    case "accent1":
    case "accent2":
    case "accent3":
    case "accent4":
    case "accent5":
    case "accent6":
    case "hlink":
    case "folHlink":
    case "bg1":
    case "bg2":
    case "tx1":
    case "tx2":
    case "phClr":
      return value;
    default:
      return undefined;
  }
}

// =============================================================================
// Attribute Helpers
// =============================================================================

/** Get an EMU attribute and convert it to pixels. */
export function getEmuAttr(element: XmlElement, name: string): Pixels | undefined {
  return parseEmu(getAttr(element, name));
}

/** Get an angle attribute and convert it to degrees. */
export function getAngleAttr(element: XmlElement, name: string): Degrees | undefined {
  return parseAngle(getAttr(element, name));
}

/** Get a boolean attribute from an element. */
export function getBoolAttr(element: XmlElement | undefined, name: string): boolean | undefined {
  if (!element) {
    return undefined;
  }
  return parseBoolean(getAttr(element, name));
}

/** Get a boolean attribute with a default fallback. */
export function getBoolAttrOr(element: XmlElement, name: string, defaultValue: boolean): boolean {
  return parseBooleanOr(getAttr(element, name), defaultValue);
}

/** Get an integer attribute from an element. */
export function getIntAttr(element: XmlElement | undefined, name: string): number | undefined {
  if (!element) {
    return undefined;
  }
  return parseInt32(getAttr(element, name));
}

/** Get an integer attribute with a default fallback. */
export function getIntAttrOr(element: XmlElement, name: string, defaultValue: number): number {
  return parseInt32Or(getAttr(element, name), defaultValue);
}

/** Get a floating-point attribute from an element. */
export function getFloatAttr(element: XmlElement | undefined, name: string): number | undefined {
  if (!element) {
    return undefined;
  }
  return parseFloat64(getAttr(element, name));
}

/** Get a percentage attribute (1000ths scale) and convert to percent. */
export function getPercentAttr(element: XmlElement, name: string): Percent | undefined {
  return parsePercentage(getAttr(element, name));
}

/** Get a percentage attribute (100000ths scale) and convert to percent. */
export function getPercent100kAttr(element: XmlElement, name: string): Percent | undefined {
  return parsePercentage100k(getAttr(element, name));
}

// =============================================================================
// Unit Helpers
// =============================================================================

/**
 * Convert points to pixels.
 */
export function pointsToPixels(points: number): Pixels {
  const PT_TO_PX = STANDARD_DPI / POINTS_PER_INCH;
  return px(points * PT_TO_PX);
}
