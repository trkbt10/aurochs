/**
 * @file Font metrics data for text width estimation
 *
 * This module provides font metrics for accurate text width calculation.
 * Font-specific metrics are stored in src/text/fonts/ directory.
 *
 * To add metrics for a new font:
 * 1. Create a file in src/text/fonts/ (e.g., arial.ts)
 * 2. Define and export the FontMetrics object
 * 3. Register in src/text/fonts/index.ts
 *
 * @see src/text/fonts/ - Font metrics data files
 * @see https://docs.microsoft.com/en-us/typography/opentype/spec/
 */

import { getFontMetrics } from "./fonts";

/**
 * Default bold width scale factor.
 * Bold text is typically 5% wider than regular text.
 */
const DEFAULT_BOLD_WIDTH_SCALE = 1.05;

/**
 * Get character width for a specific character and font.
 *
 * @param char - Single character
 * @param fontFamily - Font family name
 * @param isCjk - Whether the character is CJK
 * @param fontWeight - Font weight (default: 400)
 * @returns Width ratio relative to font size
 */
export function getCharWidth(
  char: string,
  fontFamily: string | undefined,
  isCjk: boolean,
  fontWeight: number = 400,
): number {
  const metrics = getFontMetrics(fontFamily);
  const scale = metrics.widthScale ?? 1.0;
  const isBold = fontWeight >= 700;
  const boldScale = isBold ? (metrics.boldWidthScale ?? DEFAULT_BOLD_WIDTH_SCALE) : 1.0;

  // CJK characters are typically full-width
  if (isCjk) {
    return metrics.cjkAverage * scale * boldScale;
  }

  // Check for specific character width
  if (char in metrics.charWidths) {
    return metrics.charWidths[char] * scale * boldScale;
  }

  // Use average width for unknown characters
  return metrics.latinAverage * scale * boldScale;
}

/**
 * Get kerning adjustment for a character pair.
 *
 * @param pair - Two-character string (e.g., "AV")
 * @param fontFamily - Font family name
 * @returns Kerning adjustment in em units (negative = tighter)
 */
export function getKerningAdjustment(pair: string, fontFamily: string | undefined): number {
  if (pair.length !== 2) {
    return 0;
  }

  const metrics = getFontMetrics(fontFamily);

  // Check for specific kerning pair
  if (pair in metrics.kerning) {
    return metrics.kerning[pair];
  }

  return 0;
}

/**
 * Calculate kerning adjustments for a text string.
 * Returns an array of adjustments for each character position (0 for first char).
 *
 * @param text - Text string
 * @param fontFamily - Font family name
 * @returns Array of kerning adjustments (index 0 is always 0)
 */
export function getKerningForText(text: string, fontFamily: string | undefined): number[] {
  const chars = Array.from(text);
  const adjustments: number[] = new Array(chars.length).fill(0);

  for (let i = 1; i < chars.length; i++) {
    const pair = chars[i - 1] + chars[i];
    adjustments[i] = getKerningAdjustment(pair, fontFamily);
  }

  return adjustments;
}

// =============================================================================
// Ascender Ratio
// =============================================================================

/**
 * Default ascender ratios for common fonts.
 * Ascender ratio determines baseline position: baseline = fontSize * ascenderRatio
 */
const ASCENDER_RATIOS: Record<string, number> = {
  calibri: 0.75,
  arial: 0.75,
  helvetica: 0.75,
  "times new roman": 0.8,
  georgia: 0.8,
  verdana: 0.72,
  tahoma: 0.72,
  "segoe ui": 0.75,
  consolas: 0.8,
  "courier new": 0.8,
  // Japanese fonts frequently used in embedded-PDF conversions.
  // These ratios were measured from embedded font metrics (ascender/unitsPerEm).
  "ms-pgothic": 0.8594,
  hgmarugothicmpro: 0.8594,
};

/**
 * Get ascender ratio for a font.
 * This determines where the baseline is positioned relative to the font size.
 *
 * @param fontFamily - Font family name
 * @returns Ascender ratio (typically 0.7-0.85)
 */
export function getAscenderRatio(fontFamily: string | undefined): number {
  if (fontFamily === undefined) {
    return 0.8; // Default
  }

  const primary = fontFamily.split(",")[0]?.trim() ?? fontFamily;
  const normalized = primary.toLowerCase().replace(/["']/g, "").trim();

  // Check font-specific metrics first
  const metrics = getFontMetrics(fontFamily);
  if (metrics.ascenderRatio !== undefined) {
    return metrics.ascenderRatio;
  }

  // Check legacy ascender ratios
  if (normalized in ASCENDER_RATIOS) {
    return ASCENDER_RATIOS[normalized];
  }

  // Partial match
  for (const [key, ratio] of Object.entries(ASCENDER_RATIOS)) {
    if (normalized.includes(key)) {
      return ratio;
    }
  }

  return 0.8; // Default
}
