/**
 * @file SpreadsheetML number/date/text formatting (facade)
 *
 * The heavy implementations live in dedicated formatter modules and operate on intermediate
 * representations (IR) where appropriate.
 */

import type { XlsxDateSystem } from "../date-system";
import { formatNumberByCode as formatNumberByCodeImpl } from "./formatters/number";
import { formatTextByCode as formatTextByCodeImpl } from "./formatters/text";

/**
 * Format a number (or Excel serial date) by an Excel/SpreadsheetML format code.
 */
export function formatNumberByCode(value: number, formatCode: string, options?: { readonly dateSystem?: XlsxDateSystem }): string {
  return formatNumberByCodeImpl(value, formatCode, options);
}

/**
 * Format a text value by an Excel/SpreadsheetML format code (text section only).
 *
 * This is used by the formula `TEXT()` function when its first argument is non-numeric.
 */
export function formatTextByCode(valueText: string, formatCode: string): string {
  return formatTextByCodeImpl(valueText, formatCode);
}

