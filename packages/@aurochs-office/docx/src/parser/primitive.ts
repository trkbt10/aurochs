/**
 * @file DOCX Primitive Parsing Utilities
 *
 * Converts XML attribute strings to Domain Object primitive types.
 * Handles DOCX-specific measurements like twips and half-points.
 *
 * @see ECMA-376 Part 1, Section 17.18 (Simple Types)
 */

import type { Pixels, Points } from "@aurochs-office/drawing-ml/domain/units";
import { px, pt } from "@aurochs-office/drawing-ml/domain/units";
import type { Twips, HalfPoints, DocxStyleId, DocxNumId, DocxAbstractNumId, DocxIlvl, DocxRelId } from "../domain";
import type { EighthPoints } from "@aurochs-office/ooxml/domain/border";
import { twips, halfPoints, docxStyleId, docxNumId, docxAbstractNumId, docxIlvl, docxRelId } from "../domain";
import { eighthPt } from "@aurochs-office/ooxml/domain/border";
import { getAttr, getChild, type XmlElement } from "@aurochs/xml";

// =============================================================================
// Constants
// =============================================================================

/** Twips per inch (1440) */
const TWIPS_PER_INCH = 1440;

/** Standard display DPI (96) */
const STANDARD_DPI = 96;

/** Twips to pixels factor */
const TWIPS_TO_PX = STANDARD_DPI / TWIPS_PER_INCH;

/** Points per inch (72) */
const POINTS_PER_INCH = 72;

/** Points to pixels factor */
const PT_TO_PX = STANDARD_DPI / POINTS_PER_INCH;

// =============================================================================
// Integer/Number Parsing
// =============================================================================

/**
 * Parse integer from string.
 */
export function parseInt32(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const num = parseInt(value, 10);
  return isNaN(num) ? undefined : num;
}

/**
 * Parse integer with default value.
 */
export function parseInt32Or(value: string | undefined, defaultValue: number): number {
  const num = parseInt32(value);
  return num ?? defaultValue;
}

/**
 * Parse float from string.
 */
export function parseFloat64(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const num = parseFloat(value);
  return isNaN(num) ? undefined : num;
}

// =============================================================================
// Boolean Parsing
// =============================================================================

/**
 * Parse boolean from string.
 *
 * OOXML uses "1", "true", "on" for true; "0", "false", "off" for false.
 * Special case: empty string or attribute without value = true.
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

/**
 * Parse boolean with default value.
 */
export function parseBooleanOr(value: string | undefined, defaultValue: boolean): boolean {
  const bool = parseBoolean(value);
  return bool ?? defaultValue;
}

/**
 * Parse toggle boolean.
 *
 * For toggle properties like bold, italic, etc.
 * Presence of element = true, val="0"/"false" = false.
 *
 * @see ECMA-376 Part 1, Section 17.18.60 (ST_OnOff)
 */
export function parseOnOff(element: XmlElement | undefined): boolean | undefined {
  if (!element) {
    return undefined;
  }
  const val = getAttr(element, "val");
  // Element present without val attribute = true
  if (val === undefined) {
    return true;
  }
  return parseBoolean(val);
}

// =============================================================================
// Twips Parsing
// =============================================================================

/**
 * Parse twips value.
 *
 * @see ECMA-376 Part 1, Section 17.18.23 (ST_TwipsMeasure)
 */
export function parseTwips(value: string | undefined): Twips | undefined {
  const num = parseInt32(value);
  if (num === undefined) {
    return undefined;
  }
  return twips(num);
}

/**
 * Parse twips value to pixels.
 */
export function parseTwipsToPixels(value: string | undefined): Pixels | undefined {
  const tw = parseTwips(value);
  if (tw === undefined) {
    return undefined;
  }
  return px(tw * TWIPS_TO_PX);
}

/**
 * Parse twips value to points.
 */
export function parseTwipsToPoints(value: string | undefined): Points | undefined {
  const tw = parseTwips(value);
  if (tw === undefined) {
    return undefined;
  }
  return pt(tw / 20);
}

/**
 * Parse signed twips value.
 *
 * @see ECMA-376 Part 1, Section 17.18.84 (ST_SignedTwipsMeasure)
 */
export function parseSignedTwips(value: string | undefined): Twips | undefined {
  return parseTwips(value);
}

// =============================================================================
// Half-Points Parsing
// =============================================================================

/**
 * Parse half-points value (font size).
 *
 * @see ECMA-376 Part 1, Section 17.18.42 (ST_HpsMeasure)
 */
export function parseHalfPoints(value: string | undefined): HalfPoints | undefined {
  const num = parseInt32(value);
  if (num === undefined) {
    return undefined;
  }
  return halfPoints(num);
}

/**
 * Parse half-points to points.
 */
export function parseHalfPointsToPoints(value: string | undefined): Points | undefined {
  const hp = parseHalfPoints(value);
  if (hp === undefined) {
    return undefined;
  }
  return pt(hp / 2);
}

/**
 * Parse half-points to pixels.
 */
export function parseHalfPointsToPixels(value: string | undefined): Pixels | undefined {
  const hp = parseHalfPoints(value);
  if (hp === undefined) {
    return undefined;
  }
  return px((hp / 2) * PT_TO_PX);
}

// =============================================================================
// Eighths of a Point Parsing
// =============================================================================

/**
 * Parse eighths of a point (border width).
 *
 * @see ECMA-376 Part 1, Section 17.18.23 (ST_EighthPointMeasure)
 */
export function parseEighthPoints(value: string | undefined): EighthPoints | undefined {
  const num = parseInt32(value);
  if (num === undefined) {
    return undefined;
  }
  return eighthPt(num);
}

/**
 * Parse eighths of a point to pixels.
 */
export function parseEighthPointsToPixels(value: string | undefined): Pixels | undefined {
  const ep = parseEighthPoints(value);
  if (ep === undefined) {
    return undefined;
  }
  return px((ep / 8) * PT_TO_PX);
}

// =============================================================================
// Percentage Parsing
// =============================================================================

/**
 * Parse percentage (50ths of a percent).
 *
 * @see ECMA-376 Part 1, Section 17.18.107 (ST_TextScale)
 */
export function parsePercentage50(value: string | undefined): number | undefined {
  const num = parseInt32(value);
  if (num === undefined) {
    return undefined;
  }
  return num / 50;
}

/**
 * Parse decimal percentage.
 *
 * @see ECMA-376 Part 1, Section 17.18.68 (ST_DecimalNumber used as percent)
 */
export function parseDecimalPercentage(value: string | undefined): number | undefined {
  const num = parseInt32(value);
  if (num === undefined) {
    return undefined;
  }
  return num;
}

// =============================================================================
// Identifier Parsing
// =============================================================================

/**
 * Parse style ID.
 *
 * @see ECMA-376 Part 1, Section 17.18.85 (ST_String)
 */
export function parseStyleId(value: string | undefined): DocxStyleId | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }
  return docxStyleId(value);
}

/**
 * Parse numbering ID.
 *
 * @see ECMA-376 Part 1, Section 17.18.66 (ST_DecimalNumber)
 */
export function parseNumId(value: string | undefined): DocxNumId | undefined {
  const num = parseInt32(value);
  if (num === undefined) {
    return undefined;
  }
  return docxNumId(num);
}

/**
 * Parse abstract numbering ID.
 *
 * @see ECMA-376 Part 1, Section 17.18.66 (ST_DecimalNumber)
 */
export function parseAbstractNumId(value: string | undefined): DocxAbstractNumId | undefined {
  const num = parseInt32(value);
  if (num === undefined) {
    return undefined;
  }
  return docxAbstractNumId(num);
}

/**
 * Parse numbering level index (0-8).
 *
 * @see ECMA-376 Part 1, Section 17.18.66 (ST_DecimalNumber)
 */
export function parseIlvl(value: string | undefined): DocxIlvl | undefined {
  const num = parseInt32(value);
  if (num === undefined || num < 0 || num > 8) {
    return undefined;
  }
  return docxIlvl(num);
}

/**
 * Parse relationship ID.
 *
 * @see ECMA-376 Part 2, Section 9.3 (Relationships)
 */
export function parseRelId(value: string | undefined): DocxRelId | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }
  return docxRelId(value);
}

// =============================================================================
// Attribute Helpers
// =============================================================================

/**
 * Get twips attribute.
 */
export function getTwipsAttr(element: XmlElement, name: string): Twips | undefined {
  return parseTwips(getAttr(element, name));
}

/**
 * Get half-points attribute.
 */
export function getHalfPointsAttr(element: XmlElement, name: string): HalfPoints | undefined {
  return parseHalfPoints(getAttr(element, name));
}

/**
 * Get boolean attribute.
 */
export function getBoolAttr(element: XmlElement | undefined, name: string): boolean | undefined {
  if (!element) {
    return undefined;
  }
  return parseBoolean(getAttr(element, name));
}

/**
 * Get boolean attribute with default.
 */
export function getBoolAttrOr(element: XmlElement, name: string, defaultValue: boolean): boolean {
  return parseBooleanOr(getAttr(element, name), defaultValue);
}

/**
 * Get integer attribute.
 */
export function getIntAttr(element: XmlElement | undefined, name: string): number | undefined {
  if (!element) {
    return undefined;
  }
  return parseInt32(getAttr(element, name));
}

/**
 * Get integer attribute with default.
 */
export function getIntAttrOr(element: XmlElement, name: string, defaultValue: number): number {
  return parseInt32Or(getAttr(element, name), defaultValue);
}

/**
 * Get style ID attribute.
 */
export function getStyleIdAttr(element: XmlElement, name: string): DocxStyleId | undefined {
  return parseStyleId(getAttr(element, name));
}

/**
 * Get relationship ID attribute.
 */
export function getRelIdAttr(element: XmlElement, name: string): DocxRelId | undefined {
  return parseRelId(getAttr(element, name));
}

// =============================================================================
// Child Element Helpers
// =============================================================================

/**
 * Get child element's attribute value.
 */
export function getChildAttr(parent: XmlElement, childName: string, attrName: string): string | undefined {
  const child = getChild(parent, childName);
  if (!child) {
    return undefined;
  }
  return getAttr(child, attrName);
}

/**
 * Get child element's val attribute (common pattern).
 */
export function getChildVal(parent: XmlElement, childName: string): string | undefined {
  return getChildAttr(parent, childName, "val");
}

/**
 * Get child element's val attribute as boolean.
 */
export function getChildBoolVal(parent: XmlElement, childName: string): boolean | undefined {
  const val = getChildVal(parent, childName);
  return parseBoolean(val);
}

/**
 * Get child element's val attribute as integer.
 */
export function getChildIntVal(parent: XmlElement, childName: string): number | undefined {
  const val = getChildVal(parent, childName);
  return parseInt32(val);
}

/**
 * Check if child element exists (for toggle properties).
 */
export function hasChild(parent: XmlElement, childName: string): boolean {
  return getChild(parent, childName) !== undefined;
}

/**
 * Parse toggle property from child element.
 *
 * For properties like <w:b/> (bold), <w:i/> (italic), etc.
 * Element present = true (unless val="0" or val="false").
 */
export function parseToggleChild(parent: XmlElement, childName: string): boolean | undefined {
  const child = getChild(parent, childName);
  return parseOnOff(child);
}
