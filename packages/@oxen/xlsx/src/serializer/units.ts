/**
 * @file Branded Types String Serialization
 *
 * Provides serialization functions for converting TypeScript values to
 * XML attribute string format used in XLSX files.
 *
 * @see ECMA-376 Part 4, Section 18 (SpreadsheetML Reference)
 */

import type { ColIndex, RowIndex, StyleId } from "../domain/types";
import { colIdx } from "../domain/types";
import type { CellAddress, CellRange } from "../domain/cell/address";
import { indexToColumnLetter, columnLetterToIndex } from "../domain/cell/address";

// =============================================================================
// Integer Serialization
// =============================================================================

/**
 * Serialize an integer to a string.
 *
 * @param value - Integer value to serialize
 * @returns String representation of the integer
 *
 * @example
 * serializeInt(42)    // => "42"
 * serializeInt(-1)    // => "-1"
 * serializeInt(0)     // => "0"
 */
export function serializeInt(value: number): string {
  return String(Math.trunc(value));
}

/**
 * Serialize an optional integer to a string.
 *
 * @param value - Integer value to serialize, or undefined
 * @returns String representation of the integer, or undefined
 *
 * @example
 * serializeIntOptional(42)        // => "42"
 * serializeIntOptional(undefined) // => undefined
 */
export function serializeIntOptional(
  value: number | undefined,
): string | undefined {
  return value !== undefined ? serializeInt(value) : undefined;
}

// =============================================================================
// Floating-Point Serialization
// =============================================================================

/**
 * Serialize a floating-point number to a string.
 *
 * Removes unnecessary trailing zeros and decimal points.
 *
 * @param value - Float value to serialize
 * @returns String representation of the float
 *
 * @example
 * serializeFloat(3.14)   // => "3.14"
 * serializeFloat(2.0)    // => "2"
 * serializeFloat(1.500)  // => "1.5"
 * serializeFloat(0)      // => "0"
 */
export function serializeFloat(value: number): string {
  // String() handles:
  // - Integer values: no decimal point (e.g., "2" not "2.0")
  // - Trailing zeros: removed (e.g., "1.5" not "1.50")
  // - Scientific notation for very large/small numbers
  return String(value);
}

/**
 * Serialize an optional floating-point number to a string.
 *
 * @param value - Float value to serialize, or undefined
 * @returns String representation of the float, or undefined
 *
 * @example
 * serializeFloatOptional(3.14)     // => "3.14"
 * serializeFloatOptional(undefined) // => undefined
 */
export function serializeFloatOptional(
  value: number | undefined,
): string | undefined {
  return value !== undefined ? serializeFloat(value) : undefined;
}

// =============================================================================
// Boolean Serialization
// =============================================================================

/**
 * Serialize a boolean to a string (1/0 format).
 *
 * Uses the numeric format ("1" / "0") which is standard in OOXML.
 *
 * @param value - Boolean value to serialize
 * @returns "1" for true, "0" for false
 *
 * @example
 * serializeBoolean(true)   // => "1"
 * serializeBoolean(false)  // => "0"
 */
export function serializeBoolean(value: boolean): string {
  return value ? "1" : "0";
}

/**
 * Serialize an optional boolean to a string (1/0 format).
 *
 * @param value - Boolean value to serialize, or undefined
 * @returns "1", "0", or undefined
 *
 * @example
 * serializeBooleanOptional(true)      // => "1"
 * serializeBooleanOptional(false)     // => "0"
 * serializeBooleanOptional(undefined) // => undefined
 */
export function serializeBooleanOptional(
  value: boolean | undefined,
): string | undefined {
  return value !== undefined ? serializeBoolean(value) : undefined;
}

// =============================================================================
// Branded Type Serialization
// =============================================================================

/**
 * Serialize a RowIndex to a string.
 *
 * @param value - RowIndex value (1-based)
 * @returns String representation
 *
 * @example
 * serializeRowIndex(rowIdx(1))    // => "1"
 * serializeRowIndex(rowIdx(100))  // => "100"
 */
export function serializeRowIndex(value: RowIndex): string {
  return serializeInt(value as number);
}

/**
 * Serialize a ColIndex to a string.
 *
 * @param value - ColIndex value (1-based)
 * @returns String representation
 *
 * @example
 * serializeColIndex(colIdx(1))   // => "1"
 * serializeColIndex(colIdx(26))  // => "26"
 */
export function serializeColIndex(value: ColIndex): string {
  return serializeInt(value as number);
}

/**
 * Serialize a StyleId to a string.
 *
 * @param value - StyleId value
 * @returns String representation
 *
 * @example
 * serializeStyleId(styleId(0))  // => "0"
 * serializeStyleId(styleId(5))  // => "5"
 */
export function serializeStyleId(value: StyleId): string {
  return serializeInt(value as number);
}

// =============================================================================
// Cell Reference Serialization
// =============================================================================

/**
 * Serialize a CellAddress to A1 notation.
 *
 * @param address - CellAddress to serialize
 * @returns A1-style reference string (e.g., "A1", "$A$1")
 *
 * @example
 * serializeCellRef({ col: 1, row: 1, colAbsolute: false, rowAbsolute: false })  // => "A1"
 * serializeCellRef({ col: 1, row: 1, colAbsolute: true, rowAbsolute: true })    // => "$A$1"
 */
export function serializeCellRef(address: CellAddress): string {
  const colPrefix = address.colAbsolute ? "$" : "";
  const rowPrefix = address.rowAbsolute ? "$" : "";
  return `${colPrefix}${indexToColumnLetter(address.col)}${rowPrefix}${address.row}`;
}

/**
 * Serialize a CellRange to range reference notation.
 *
 * @param range - CellRange to serialize
 * @returns Range reference string (e.g., "A1:B2", "Sheet1!A1:B2")
 *
 * @example
 * serializeRef({ start: A1, end: B2 })                      // => "A1:B2"
 * serializeRef({ start: A1, end: A1 })                      // => "A1"
 * serializeRef({ start: A1, end: B2, sheetName: "Sheet1" }) // => "Sheet1!A1:B2"
 */
export function serializeRef(range: CellRange): string {
  const startStr = serializeCellRef(range.start);
  const endStr = serializeCellRef(range.end);

  // Check if start and end are the same cell
  const isSingleCell =
    range.start.col === range.end.col &&
    range.start.row === range.end.row &&
    range.start.colAbsolute === range.end.colAbsolute &&
    range.start.rowAbsolute === range.end.rowAbsolute;

  const rangeStr = isSingleCell ? startStr : `${startStr}:${endStr}`;

  if (range.sheetName) {
    // Quote sheet name if it contains spaces or special characters
    const needsQuotes = /[\s!']/.test(range.sheetName);
    const quotedName = needsQuotes ? `'${range.sheetName}'` : range.sheetName;
    return `${quotedName}!${rangeStr}`;
  }

  return rangeStr;
}

// =============================================================================
// Color Serialization
// =============================================================================

/**
 * Serialize an RGB hex color value.
 *
 * Normalizes the color to uppercase for consistency in XLSX files.
 *
 * @param value - RGB hex string (RRGGBB or AARRGGBB format)
 * @returns Uppercase hex string
 *
 * @example
 * serializeRgbHex("ff0000")    // => "FF0000"
 * serializeRgbHex("FF0000")    // => "FF0000"
 * serializeRgbHex("ffff0000")  // => "FFFF0000"
 */
export function serializeRgbHex(value: string): string {
  return value.toUpperCase();
}

// =============================================================================
// Column Letter Conversion
// =============================================================================

/**
 * Convert a 1-based column index to column letter(s).
 *
 * Delegates to the domain layer implementation.
 *
 * @param index - 1-based column index
 * @returns Column letter(s) (e.g., "A", "Z", "AA")
 *
 * @example
 * colIndexToLetter(1)   // => "A"
 * colIndexToLetter(26)  // => "Z"
 * colIndexToLetter(27)  // => "AA"
 */
export function colIndexToLetter(index: number): string {
  return indexToColumnLetter(colIdx(index));
}

/**
 * Convert column letter(s) to a 1-based column index.
 *
 * Delegates to the domain layer implementation.
 *
 * @param letter - Column letter(s), case-insensitive (e.g., "A", "Z", "AA")
 * @returns 1-based column index
 * @throws Error if input is empty or contains invalid characters
 *
 * @example
 * letterToColIndex("A")   // => 1
 * letterToColIndex("Z")   // => 26
 * letterToColIndex("AA")  // => 27
 */
export function letterToColIndex(letter: string): number {
  return columnLetterToIndex(letter) as number;
}
