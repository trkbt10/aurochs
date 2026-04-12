/**
 * @file SpreadsheetML unit conversion functions
 *
 * Canonical conversion between Excel units and screen pixels.
 * All rendering layers should use these functions to ensure consistent
 * layout across SVG, HTML, and React renderers.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.13 (col width)
 * @see ECMA-376 Part 4, Section 18.3.1.73 (row height)
 */

/**
 * Screen DPI assumed for pixel conversion (CSS reference pixel).
 *
 * The CSS `px` unit is defined as 1/96th of an inch, regardless of the
 * actual display resolution. All conversions in this module use this
 * value to match browser rendering.
 */
export const SCREEN_DPI = 96;

/**
 * Typographic points per inch.
 */
const POINTS_PER_INCH = 72;

// =============================================================================
// Points ↔ Pixels
// =============================================================================

/**
 * Convert typographic points to CSS pixels.
 *
 * Row heights in ECMA-376 are specified in points (1pt = 1/72 inch).
 * This converts to CSS pixels (1px = 1/96 inch).
 *
 * Formula: pixels = points × (96 / 72) = points × 4/3
 *
 * Note: Returns unrounded value for layout precision. Callers that need
 * integer pixels (e.g., SVG rendering) should round at the call site.
 */
export function pointsToPixels(points: number): number {
  return points * (SCREEN_DPI / POINTS_PER_INCH);
}

/**
 * Convert CSS pixels to typographic points.
 *
 * Inverse of `pointsToPixels`.
 */
export function pixelsToPoints(pixels: number): number {
  return pixels * (POINTS_PER_INCH / SCREEN_DPI);
}

// =============================================================================
// Column Width (Character Units) ↔ Pixels
// =============================================================================

/**
 * Options for column width conversion.
 */
export type ColumnWidthConversionOptions = {
  /**
   * Width of the widest digit (0-9) in the default font, in pixels.
   *
   * Excel uses this as the base unit for column width. The exact value
   * depends on the default font (e.g., Calibri 11pt ≈ 7px).
   *
   * Default: 7
   */
  readonly maxDigitWidthPx?: number;

  /**
   * Fixed padding added to each column in pixels.
   *
   * Excel adds a small padding on each side of the cell content.
   * The total padding is typically ~5px (2px left + 3px right).
   *
   * Default: 5
   */
  readonly paddingPx?: number;
};

/**
 * Convert Excel column width (in character units) to CSS pixels.
 *
 * Excel column width is specified as the number of characters of the
 * default font that fit in the column. The actual pixel width is:
 *
 *   pixels = truncate(chars × maxDigitWidth + padding)
 *
 * Where `maxDigitWidth` is the width of the widest digit in the default
 * font, and `padding` accounts for cell margins.
 *
 * @see https://learn.microsoft.com/en-us/office/troubleshoot/excel/determine-column-widths
 */
export function columnWidthCharToPixels(widthChars: number, options?: ColumnWidthConversionOptions): number {
  const maxDigitWidthPx = options?.maxDigitWidthPx ?? 7;
  const paddingPx = options?.paddingPx ?? 5;
  return Math.max(0, Math.floor(widthChars * maxDigitWidthPx + paddingPx));
}

/**
 * Convert CSS pixels to Excel column width (in character units).
 *
 * Inverse of `columnWidthCharToPixels`.
 */
export function pixelsToColumnWidthChar(pixels: number, options?: ColumnWidthConversionOptions): number {
  const maxDigitWidthPx = options?.maxDigitWidthPx ?? 7;
  const paddingPx = options?.paddingPx ?? 5;
  return Math.max(0, (pixels - paddingPx) / maxDigitWidthPx);
}
