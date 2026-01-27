/**
 * @file Alignment parsing helpers (format panel)
 *
 * Small helpers for converting UI strings to SpreadsheetML alignment enums.
 */

import type { XlsxAlignment } from "@oxen/xlsx/domain/style/types";

/**
 * Parse a horizontal alignment string into a SpreadsheetML alignment enum.
 */
export function parseHorizontalAlignment(value: string): NonNullable<XlsxAlignment["horizontal"]> {
  switch (value) {
    case "left":
    case "center":
    case "right":
    case "fill":
    case "justify":
    case "centerContinuous":
    case "distributed":
      return value;
  }
  throw new Error(`Unknown horizontal alignment: ${value}`);
}

/**
 * Parse a vertical alignment string into a SpreadsheetML alignment enum.
 */
export function parseVerticalAlignment(value: string): NonNullable<XlsxAlignment["vertical"]> {
  switch (value) {
    case "top":
    case "center":
    case "bottom":
    case "justify":
    case "distributed":
      return value;
  }
  throw new Error(`Unknown vertical alignment: ${value}`);
}
