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
// Well-known Built-in Format IDs
// =============================================================================

/**
 * Well-known built-in number format IDs for common use cases.
 *
 * These are the most commonly referenced built-in IDs when programmatically
 * creating XLSX files. They correspond to entries in BUILTIN_NUMBER_FORMATS above.
 *
 * @see ECMA-376 Part 4, Section 18.8.30
 */
export const WELL_KNOWN_NUM_FMT_IDS = {
  /** General format (ID 0): "General" */
  general: 0,
  /** Short date format (ID 14): "mm-dd-yy" */
  date: 14,
  /** Date and time format (ID 22): "m/d/yy h:mm" */
  datetime: 22,
} as const;

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
 * Built-in number format IDs that represent date/time formats.
 *
 * ECMA-376 Part 4, Section 18.8.30 defines built-in formats 0-49.
 * Among those, IDs 14-22 are date/time formats, 27-36 are locale-dependent
 * date/time formats (CJK calendars, etc.), and 45-47 are time/duration formats.
 *
 * This set is derived from BUILTIN_NUMBER_FORMATS above — every ID whose
 * format code contains date/time tokens (y, m, d, h, s) is included.
 *
 * @see ECMA-376 Part 4, Section 18.8.30
 */
export const BUILTIN_DATE_NUM_FMT_IDS: ReadonlySet<number> = new Set(
  [...BUILTIN_NUMBER_FORMATS.entries()]
    .filter(([, code]) => isDateFormat(code))
    .map(([id]) => id),
);

/**
 * Check if a numFmtId represents a date/time format.
 *
 * Checks built-in date format IDs first, then falls back to resolving
 * the format code from custom formats and checking its tokens.
 *
 * @param numFmtIdValue - The number format ID to check
 * @param customFormats - Custom number formats from the workbook styles
 * @returns true if the format ID represents a date/time format
 *
 * @see ECMA-376 Part 4, Section 18.8.30
 */
export function isDateNumFmtId(
  numFmtIdValue: number,
  customFormats: readonly XlsxNumberFormat[],
): boolean {
  if (BUILTIN_DATE_NUM_FMT_IDS.has(numFmtIdValue)) {
    return true;
  }

  // Custom formats (IDs >= 164): resolve and check the format code
  if (numFmtIdValue >= 164) {
    const custom = customFormats.find((f) => (f.numFmtId as number) === numFmtIdValue);
    if (custom) {
      return isDateFormat(custom.formatCode);
    }
  }

  return false;
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
