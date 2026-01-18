/**
 * @file Text width measurement
 *
 * Estimates text width using statistical font metrics and kerning tables.
 * Shared implementation for PPTX and DOCX text layout.
 *
 * @see src/text/font-metrics.ts - Font metrics data
 */

import type { LayoutSpan, MeasuredSpan } from "./types";
import type { Pixels, Points } from "../ooxml/domain/units";
import { px } from "../ooxml/domain/units";
import { isCjkCodePoint } from "../text/cjk";
import { getCharWidth, getKerningAdjustment } from "../text/font-metrics";
import { isMonospace } from "../text/fonts";

// =============================================================================
// Constants
// =============================================================================

/**
 * Points to pixels conversion factor at 96 DPI.
 * 1 inch = 72 points (typographic standard)
 * At 96 DPI: 1pt = 96/72 px ≈ 1.333px
 */
export const PT_TO_PX = 96 / 72;

// =============================================================================
// Character Width Calculation
// =============================================================================

/**
 * Result of character width calculation with kerning.
 */
export type CharWidthResult = {
  /** Character width in pixels */
  readonly width: Pixels;
  /** Kerning adjustment from previous character (negative = tighter) */
  readonly kerningAdjust: Pixels;
  /** Total width including kerning adjustment */
  readonly totalWidth: Pixels;
};

/**
 * Calculate the width of a single character with kerning context.
 *
 * @param char - Current character
 * @param prevChar - Previous character (for kerning)
 * @param fontSize - Font size in points
 * @param fontFamily - Font family name
 * @param fontWeight - Font weight (default: 400)
 * @returns Character width result with kerning adjustment
 */
export function calculateCharWidth(
  char: string,
  prevChar: string | undefined,
  fontSize: Points,
  fontFamily: string,
  fontWeight: number = 400,
): CharWidthResult {
  const charCode = char.charCodeAt(0);
  const fontSizePx = (fontSize as number) * PT_TO_PX;
  const isCjk = isCjkCodePoint(charCode);

  // Get base character width from font metrics (with bold adjustment)
  const widthRatio = getCharWidth(char, fontFamily, isCjk, fontWeight);
  const width = fontSizePx * widthRatio;

  // Calculate kerning adjustment
  const kerningAdjust = resolveKerningAdjust(prevChar, char, fontSizePx, fontFamily);

  return {
    width: px(width),
    kerningAdjust: px(kerningAdjust),
    totalWidth: px(width + kerningAdjust),
  };
}

/**
 * Resolve kerning adjustment for a character pair.
 */
function resolveKerningAdjust(
  prevChar: string | undefined,
  char: string,
  fontSizePx: number,
  fontFamily: string,
): number {
  if (prevChar === undefined) {
    return 0;
  }
  if (isMonospace(fontFamily)) {
    return 0;
  }
  const pair = prevChar + char;
  const kerningEm = getKerningAdjustment(pair, fontFamily);
  return fontSizePx * kerningEm;
}

// =============================================================================
// Text Width Estimation
// =============================================================================

/**
 * Estimate the width of a text string with font-aware metrics and kerning.
 *
 * @param text - Text to measure
 * @param fontSize - Font size in points
 * @param letterSpacing - Additional letter spacing in pixels
 * @param fontFamily - Font family for metrics lookup
 * @param fontWeight - Font weight (default: 400)
 * @returns Width in pixels
 */
export function estimateTextWidth(
  text: string,
  fontSize: Points,
  letterSpacing: Pixels,
  fontFamily: string,
  fontWeight: number = 400,
): Pixels {
  const chars = Array.from(text);
  const letterSpacingNum = letterSpacing as number;

  const width = chars.reduce((acc, char, index) => {
    const prevChar = index > 0 ? chars[index - 1] : undefined;
    const charResult = calculateCharWidth(char, prevChar, fontSize, fontFamily, fontWeight);
    const spacing = index > 0 ? letterSpacingNum : 0;
    return acc + (charResult.totalWidth as number) + spacing;
  }, 0);

  return px(width);
}

// =============================================================================
// Span Measurement
// =============================================================================

/**
 * Measure a single span and return MeasuredSpan.
 * Uses font-aware metrics and kerning for accurate width estimation.
 */
export function measureSpan(span: LayoutSpan): MeasuredSpan {
  let width = px(0);
  if (!span.isBreak) {
    width = estimateTextWidth(
      span.text,
      span.fontSize,
      span.letterSpacing,
      span.fontFamily,
      span.fontWeight,
    );
  }

  return {
    ...span,
    width,
  };
}

/**
 * Measure all spans in an array.
 */
export function measureSpans(spans: readonly LayoutSpan[]): MeasuredSpan[] {
  return spans.map(measureSpan);
}

// =============================================================================
// Bullet Measurement
// =============================================================================

/**
 * Estimate bullet character width.
 *
 * Per ECMA-376 21.1.2.2.7, the spacing between bullet and text is controlled
 * by the indent attribute, not by adding extra space to the bullet width.
 */
export function estimateBulletWidth(bulletChar: string, fontSize: Points, fontFamily: string): Pixels {
  return estimateTextWidth(bulletChar, fontSize, px(0), fontFamily);
}

// =============================================================================
// Partial Span Measurement (for cursor positioning)
// =============================================================================

/**
 * Measure the width of the first N characters of a span.
 * Used for accurate cursor positioning within a span.
 *
 * @param span - The layout span to measure
 * @param charCount - Number of characters from the start to measure
 * @returns Width in pixels
 */
export function measureSpanTextWidth(span: LayoutSpan, charCount: number): Pixels {
  if (charCount <= 0 || span.isBreak) {
    return px(0);
  }

  const text = span.text.slice(0, Math.min(charCount, span.text.length));
  return estimateTextWidth(text, span.fontSize, span.letterSpacing, span.fontFamily, span.fontWeight);
}

/**
 * Get the character index at a specific X offset within a span.
 * Used for click-to-cursor position mapping.
 *
 * @param span - The layout span
 * @param targetX - Target X offset from span start in pixels
 * @returns Character index (0-based)
 */
export function getCharIndexAtOffset(span: LayoutSpan, targetX: number): number {
  if (targetX <= 0 || span.isBreak || span.text.length === 0) {
    return 0;
  }

  const chars = Array.from(span.text);
  const letterSpacingNum = span.letterSpacing as number;
  let currentX = 0;

  for (let i = 0; i < chars.length; i++) {
    const prevChar = i > 0 ? chars[i - 1] : undefined;
    const charResult = calculateCharWidth(chars[i], prevChar, span.fontSize, span.fontFamily, span.fontWeight);
    const spacing = i > 0 ? letterSpacingNum : 0;
    const charWidth = (charResult.totalWidth as number) + spacing;

    // Check if target is before the midpoint of this character
    if (targetX < currentX + charWidth / 2) {
      return i;
    }
    currentX += charWidth;
  }

  return chars.length;
}

// =============================================================================
// Detailed Measurement (for kerning)
// =============================================================================

/**
 * Detailed span measurement with per-character data.
 */
export type DetailedMeasurement = {
  /** Total width in pixels */
  readonly totalWidth: Pixels;
  /** Per-character width data */
  readonly charWidths: readonly CharWidthResult[];
  /** Cumulative positions (x offset for each character) */
  readonly positions: readonly Pixels[];
};

/**
 * Calculate detailed character measurements for a text span.
 * Returns per-character width and position data for precise tspan placement.
 *
 * @param text - Text to measure
 * @param fontSize - Font size in points
 * @param letterSpacing - Additional letter spacing in pixels
 * @param fontFamily - Font family for metrics lookup
 * @param fontWeight - Font weight (default: 400)
 * @returns Detailed measurement with per-character data
 */
export function measureTextDetailed(
  text: string,
  fontSize: Points,
  letterSpacing: Pixels,
  fontFamily: string,
  fontWeight: number = 400,
): DetailedMeasurement {
  const chars = Array.from(text);
  const letterSpacingNum = letterSpacing as number;

  const measurement = chars.reduce(
    (acc, char, index) => {
      const prevChar = index > 0 ? chars[index - 1] : undefined;
      const charResult = calculateCharWidth(char, prevChar, fontSize, fontFamily, fontWeight);
      const spacing = index > 0 ? letterSpacingNum : 0;

      acc.positions.push(px(acc.totalWidth));
      acc.charWidths.push(charResult);
      acc.totalWidth += (charResult.totalWidth as number) + spacing;
      return acc;
    },
    { totalWidth: 0, charWidths: [] as CharWidthResult[], positions: [] as Pixels[] },
  );

  return {
    totalWidth: px(measurement.totalWidth),
    charWidths: measurement.charWidths,
    positions: measurement.positions,
  };
}
