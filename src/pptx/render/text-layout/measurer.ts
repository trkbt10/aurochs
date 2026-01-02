/**
 * @file Text width measurement
 * Estimates text width using statistical font metrics and kerning tables
 *
 * @see src/text/font-metrics.ts - Font metrics data
 */

import type { LayoutSpan, MeasuredSpan } from "./types";
import type { Pixels, Points } from "../../domain/types";
import { px } from "../../domain/types";
import { PT_TO_PX } from "../../core/units/conversion";
import { isCjkCodePoint } from "../../../text/cjk";
import { getCharWidth, getKerningAdjustment, isMonospace } from "../../../text/font-metrics";

// =============================================================================
// Character Width Calculation
// =============================================================================

/**
 * Result of character width calculation with kerning
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
 * @returns Character width result with kerning adjustment
 */
export function calculateCharWidth(
  char: string,
  prevChar: string | undefined,
  fontSize: Points,
  fontFamily: string,
): CharWidthResult {
  const charCode = char.charCodeAt(0);
  const fontSizePx = (fontSize as number) * PT_TO_PX;
  const isCjk = isCjkCodePoint(charCode);

  // Get base character width from font metrics
  const widthRatio = getCharWidth(char, fontFamily, isCjk);
  const width = fontSizePx * widthRatio;

  // Calculate kerning adjustment
  const kerningAdjust = resolveKerningAdjust(prevChar, char, fontSizePx, fontFamily);

  return {
    width: px(width),
    kerningAdjust: px(kerningAdjust),
    totalWidth: px(width + kerningAdjust),
  };
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
 * @returns Width in pixels
 */
export function estimateTextWidth(
  text: string,
  fontSize: Points,
  letterSpacing: Pixels,
  fontFamily: string,
): Pixels {
  const chars = Array.from(text);
  const letterSpacingNum = letterSpacing as number;

  const width = chars.reduce((acc, char, index) => {
    const prevChar = index > 0 ? chars[index - 1] : undefined;
    const charResult = calculateCharWidth(char, prevChar, fontSize, fontFamily);
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
  const width = span.isBreak ? px(0) : estimateTextWidth(span.text, span.fontSize, span.letterSpacing, span.fontFamily);

  return {
    ...span,
    width,
  };
}

/**
 * Measure all spans in an array
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
// Detailed Measurement (for kerning)
// =============================================================================

/**
 * Detailed span measurement with per-character data
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
 * @returns Detailed measurement with per-character data
 */
export function measureTextDetailed(
  text: string,
  fontSize: Points,
  letterSpacing: Pixels,
  fontFamily: string,
): DetailedMeasurement {
  const chars = Array.from(text);
  const letterSpacingNum = letterSpacing as number;

  const measurement = chars.reduce(
    (acc, char, index) => {
      const prevChar = index > 0 ? chars[index - 1] : undefined;
      const charResult = calculateCharWidth(char, prevChar, fontSize, fontFamily);
      const spacing = index > 0 ? letterSpacingNum : 0;

      acc.positions.push(px(acc.totalWidth));
      acc.charWidths.push(charResult);
      acc.totalWidth += (charResult.totalWidth as number) + spacing;
      return acc;
    },
    { totalWidth: 0, charWidths: [] as CharWidthResult[], positions: [] as Pixels[] }
  );

  return {
    totalWidth: px(measurement.totalWidth),
    charWidths: measurement.charWidths,
    positions: measurement.positions,
  };
}

function resolveKerningAdjust(
  prevChar: string | undefined,
  char: string,
  fontSizePx: number,
  fontFamily: string
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
