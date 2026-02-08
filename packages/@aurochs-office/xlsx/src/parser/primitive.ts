/**
 * @file XML Attribute Value Primitive Parsers
 *
 * Provides parsing functions for XML attribute values to TypeScript primitives
 * and branded types used in XLSX parsing.
 *
 * @see ECMA-376 Part 4, Section 18 (SpreadsheetML Reference)
 */

import {
  type ColIndex,
  type RowIndex,
  type StyleId,
  colIdx,
  rowIdx,
  styleId,
} from "../domain/types";

// =============================================================================
// Integer Parsing
// =============================================================================

/**
 * Parse an optional integer attribute value.
 *
 * @param value - Attribute value from XML
 * @returns Parsed integer or undefined if not present or invalid
 *
 * @example
 * parseIntAttr("42")       // => 42
 * parseIntAttr("-1")       // => -1
 * parseIntAttr("")         // => undefined
 * parseIntAttr(undefined)  // => undefined
 * parseIntAttr("abc")      // => undefined
 */
export function parseIntAttr(value: string | undefined): number | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    return undefined;
  }
  return num;
}

/**
 * Parse a required integer attribute value.
 *
 * @param value - Attribute value from XML
 * @param attrName - Attribute name for error message
 * @returns Parsed integer
 * @throws Error if value is missing or invalid
 *
 * @example
 * parseIntRequired("42", "count")  // => 42
 * parseIntRequired(undefined, "count")  // throws Error
 */
export function parseIntRequired(
  value: string | undefined,
  attrName: string,
): number {
  const result = parseIntAttr(value);
  if (result === undefined) {
    throw new Error(`Required attribute "${attrName}" is missing or invalid`);
  }
  return result;
}

// =============================================================================
// Float Parsing
// =============================================================================

/**
 * Parse an optional floating-point attribute value.
 *
 * @param value - Attribute value from XML
 * @returns Parsed float or undefined if not present or invalid
 *
 * @example
 * parseFloatAttr("3.14")   // => 3.14
 * parseFloatAttr("-1.5")   // => -1.5
 * parseFloatAttr("")       // => undefined
 * parseFloatAttr(undefined) // => undefined
 * parseFloatAttr("abc")    // => undefined
 */
export function parseFloatAttr(value: string | undefined): number | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }
  const num = parseFloat(value);
  if (isNaN(num)) {
    return undefined;
  }
  return num;
}

// =============================================================================
// Boolean Parsing
// =============================================================================

/**
 * Parse an optional boolean attribute value.
 *
 * Supports both numeric ("0"/"1") and string ("false"/"true") formats
 * as used in OOXML.
 *
 * @param value - Attribute value from XML
 * @returns Parsed boolean or undefined if not present or unrecognized
 *
 * @example
 * parseBooleanAttr("1")     // => true
 * parseBooleanAttr("0")     // => false
 * parseBooleanAttr("true")  // => true
 * parseBooleanAttr("false") // => false
 * parseBooleanAttr(undefined) // => undefined
 */
export function parseBooleanAttr(
  value: string | undefined,
): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === "1" || value === "true") {
    return true;
  }
  if (value === "0" || value === "false") {
    return false;
  }
  return undefined;
}

/**
 * Parse a boolean attribute value with a default.
 *
 * @param value - Attribute value from XML
 * @param defaultValue - Value to return if attribute is missing or unrecognized
 * @returns Parsed boolean or defaultValue
 *
 * @example
 * parseBooleanDefault("1", false)      // => true
 * parseBooleanDefault(undefined, true) // => true
 * parseBooleanDefault("invalid", false) // => false
 */
export function parseBooleanDefault(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  const result = parseBooleanAttr(value);
  return result ?? defaultValue;
}

// =============================================================================
// Branded Type Parsing
// =============================================================================

/**
 * Parse an optional row index attribute value.
 *
 * @param value - Attribute value from XML
 * @returns Parsed RowIndex or undefined
 *
 * @example
 * parseRowIndexAttr("1")    // => RowIndex(1)
 * parseRowIndexAttr(undefined) // => undefined
 */
export function parseRowIndexAttr(
  value: string | undefined,
): RowIndex | undefined {
  const num = parseIntAttr(value);
  return num !== undefined ? rowIdx(num) : undefined;
}

/**
 * Parse an optional column index attribute value.
 *
 * @param value - Attribute value from XML
 * @returns Parsed ColIndex or undefined
 *
 * @example
 * parseColIndexAttr("1")    // => ColIndex(1)
 * parseColIndexAttr(undefined) // => undefined
 */
export function parseColIndexAttr(
  value: string | undefined,
): ColIndex | undefined {
  const num = parseIntAttr(value);
  return num !== undefined ? colIdx(num) : undefined;
}

/**
 * Parse an optional style ID attribute value.
 *
 * @param value - Attribute value from XML
 * @returns Parsed StyleId or undefined
 *
 * @example
 * parseStyleIdAttr("0")    // => StyleId(0)
 * parseStyleIdAttr(undefined) // => undefined
 */
export function parseStyleIdAttr(
  value: string | undefined,
): StyleId | undefined {
  const num = parseIntAttr(value);
  return num !== undefined ? styleId(num) : undefined;
}

// =============================================================================
// RGB Hex Parsing
// =============================================================================

/**
 * Parse an optional RGB hex color attribute value.
 *
 * Accepts both AARRGGBB (8-digit) and RRGGBB (6-digit) formats
 * as used in OOXML color specifications.
 *
 * @param value - Attribute value from XML
 * @returns The hex string as-is, or undefined if not present
 *
 * @example
 * parseRgbHex("FF0000")    // => "FF0000" (red)
 * parseRgbHex("FFFF0000")  // => "FFFF0000" (opaque red)
 * parseRgbHex(undefined)   // => undefined
 */
export function parseRgbHex(value: string | undefined): string | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }
  // AARRGGBB or RRGGBB format
  return value;
}

// =============================================================================
// Xstring Parsing
// =============================================================================

/**
 * Parse an Excel Xstring value by unescaping Excel-specific escape sequences.
 *
 * Excel uses _xHHHH_ format to escape Unicode characters in XML strings,
 * where HHHH is a 4-digit hexadecimal Unicode code point.
 *
 * Note: Standard XML escape sequences (e.g., &amp;, &lt;) are already
 * handled by the XML parser before this function is called.
 *
 * @param value - String value from XML
 * @returns Unescaped string
 *
 * @example
 * parseXstring("Hello_x000D_World")  // => "Hello\rWorld"
 * parseXstring("Tab_x0009_Here")     // => "Tab\tHere"
 * parseXstring("Normal text")        // => "Normal text"
 */
export function parseXstring(value: string): string {
  // XML escape sequences are already handled by XML parser
  // Handle Excel-specific escapes if any (_x0000_ format)
  return value.replace(/_x([0-9A-Fa-f]{4})_/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}
