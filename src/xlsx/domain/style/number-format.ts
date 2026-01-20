/**
 * @file Number format type definitions for XLSX
 *
 * Defines number format types and built-in format mappings as specified in ECMA-376.
 *
 * @see ECMA-376 Part 4, Section 18.8.30 (numFmt Element)
 * @see ECMA-376 Part 4, Section 18.8.31 (numFmts)
 */

import type { NumFmtId } from "../types";

// =============================================================================
// Types
// =============================================================================

/**
 * Number format definition
 *
 * Represents a custom or built-in number format.
 * IDs 0-163 are reserved for built-in formats.
 * IDs 164+ are available for custom formats.
 *
 * @see ECMA-376 Part 4, Section 18.8.30
 */
export type XlsxNumberFormat = {
  readonly numFmtId: NumFmtId;
  readonly formatCode: string;
};

// =============================================================================
// Built-in Format Definitions
// =============================================================================

/**
 * Built-in number format codes
 *
 * These are the standard format codes defined by ECMA-376.
 * Not all IDs 0-163 are defined; gaps are reserved for locale-specific formats.
 *
 * @see ECMA-376 Part 4, Section 18.8.30
 */
export const BUILTIN_NUMBER_FORMATS: ReadonlyMap<number, string> = new Map([
  [0, "General"],
  [1, "0"],
  [2, "0.00"],
  [3, "#,##0"],
  [4, "#,##0.00"],
  [9, "0%"],
  [10, "0.00%"],
  [11, "0.00E+00"],
  [12, "# ?/?"],
  [13, "# ??/??"],
  [14, "mm-dd-yy"],
  [15, "d-mmm-yy"],
  [16, "d-mmm"],
  [17, "mmm-yy"],
  [18, "h:mm AM/PM"],
  [19, "h:mm:ss AM/PM"],
  [20, "h:mm"],
  [21, "h:mm:ss"],
  [22, "m/d/yy h:mm"],
  [37, "#,##0 ;(#,##0)"],
  [38, "#,##0 ;[Red](#,##0)"],
  [39, "#,##0.00;(#,##0.00)"],
  [40, "#,##0.00;[Red](#,##0.00)"],
  [45, "mm:ss"],
  [46, "[h]:mm:ss"],
  [47, "mmss.0"],
  [48, "##0.0E+0"],
  [49, "@"],
]);

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a numFmtId is a built-in format
 *
 * @param numFmtIdValue - The number format ID to check
 * @returns true if the ID corresponds to a built-in format
 */
export function isBuiltinFormat(numFmtIdValue: number): boolean {
  return BUILTIN_NUMBER_FORMATS.has(numFmtIdValue);
}

/**
 * Get the format code for a built-in format ID
 *
 * @param numFmtIdValue - The number format ID
 * @returns The format code string, or undefined if not a built-in format
 */
export function getBuiltinFormatCode(numFmtIdValue: number): string | undefined {
  return BUILTIN_NUMBER_FORMATS.get(numFmtIdValue);
}

/**
 * Check if a format code represents a date/time format
 *
 * Detects date/time format codes by looking for date/time tokens
 * (y, m, d, h, s, AM/PM) outside of quoted strings.
 *
 * @param formatCode - The format code to check
 * @returns true if the format code contains date/time tokens
 */
export function isDateFormat(formatCode: string): boolean {
  // Remove quoted strings to avoid false positives
  const withoutQuoted = formatCode.replace(/"[^"]*"/g, "");
  return /[ymdhs]|AM\/PM/i.test(withoutQuoted);
}

/**
 * Resolve the format code for a given numFmtId.
 *
 * Checks built-in formats first, then searches `styles.numberFormats`.
 * Falls back to "General" when not found.
 */
export function resolveFormatCode(
  numFmtIdValue: number,
  customFormats: readonly XlsxNumberFormat[],
): string {
  const builtin = getBuiltinFormatCode(numFmtIdValue);
  if (builtin !== undefined) {
    return builtin;
  }

  const custom = customFormats.find((f) => (f.numFmtId as number) === numFmtIdValue);
  return custom?.formatCode ?? "General";
}
