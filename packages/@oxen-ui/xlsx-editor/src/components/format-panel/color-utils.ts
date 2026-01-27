/**
 * @file Color utilities for format UI
 *
 * Helpers for converting between UI-friendly color inputs (RRGGBB) and SpreadsheetML color objects
 * (ARGB stored as `rgb="AARRGGBB"`).
 */

import type { XlsxColor as XlsxFontColor } from "@oxen/xlsx/domain/style/font";
import type { XlsxColor as XlsxFillColor } from "@oxen/xlsx/domain/style/fill";

/**
 * Normalize a user-entered RGB hex string to `RRGGBB` (uppercase), or return `undefined` if invalid/empty.
 */
export function normalizeRgbHexInput(input: string): string | undefined {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  const withoutHash = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (!/^[0-9a-fA-F]{6}$/u.test(withoutHash)) {
    return undefined;
  }
  return withoutHash.toUpperCase();
}

/**
 * Extract `RRGGBB` from a SpreadsheetML rgb color (`AARRGGBB`), or return `undefined` for non-rgb/invalid.
 */
export function rgbHexFromXlsxColor(color: XlsxFontColor | XlsxFillColor | undefined): string | undefined {
  if (!color) {
    return undefined;
  }
  if (color.type !== "rgb") {
    return undefined;
  }
  const value = color.value.trim();
  if (!/^[0-9a-fA-F]{8}$/u.test(value)) {
    return undefined;
  }
  return value.slice(2).toUpperCase();
}

/**
 * Create a SpreadsheetML rgb color object from `RRGGBB`, using full alpha (`FF`).
 */
export function makeXlsxRgbColor(hex: string): XlsxFontColor & XlsxFillColor {
  if (!/^[0-9A-F]{6}$/u.test(hex)) {
    throw new Error(`Expected RRGGBB hex color: ${hex}`);
  }
  const value = `FF${hex}`;
  return { type: "rgb", value };
}
