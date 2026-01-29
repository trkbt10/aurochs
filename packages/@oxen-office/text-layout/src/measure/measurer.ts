/**
 * @file Text width measurement for OOXML documents
 *
 * Wraps @oxen/glyph measurement functions with OOXML-specific types (Pixels, Points).
 * Provides type-safe text measurement for PPTX and DOCX text layout.
 *
 * @see @oxen/glyph/measure - Core measurement functions (plain numbers)
 */

import type { LayoutSpan, MeasuredSpan } from "../types";
import type { Pixels, Points } from "@oxen-office/ooxml/domain/units";
import { px } from "@oxen-office/ooxml/domain/units";
import {
  measureTextWidth as glyphMeasureTextWidth,
  calculateCharWidth as glyphCalculateCharWidth,
  measureTextDetailed as glyphMeasureTextDetailed,
} from "@oxen/glyph";

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
  ...args: [
    char: string,
    prevChar: string | undefined,
    fontSize: Points,
    fontFamily: string,
    fontWeight?: number,
  ]
): CharWidthResult {
  const [char, prevChar, fontSize, fontFamily, fontWeight = 400] = args;
  const result = glyphCalculateCharWidth(char, prevChar, fontSize as number, fontFamily, fontWeight);
  return {
    width: px(result.width),
    kerningAdjust: px(result.kerningAdjust),
    totalWidth: px(result.totalWidth),
  };
}

// =============================================================================
// Text Width Measurement
// =============================================================================

/**
 * Measure the width of a text string.
 * Uses Canvas API for accurate browser-consistent measurement.
 * Falls back to font-metrics estimation in non-browser environments.
 *
 * @param text - Text to measure
 * @param fontSize - Font size in points
 * @param letterSpacing - Additional letter spacing in pixels
 * @param fontFamily - Font family for metrics lookup
 * @param fontWeight - Font weight (default: 400)
 * @param fontStyle - Font style (default: "normal")
 * @returns Width in pixels
 */
export function measureTextWidth(
  ...args: [
    text: string,
    fontSize: Points,
    letterSpacing: Pixels,
    fontFamily: string,
    fontWeight?: number,
    fontStyle?: "normal" | "italic",
  ]
): Pixels {
  const [text, fontSize, letterSpacing, fontFamily, fontWeight = 400, fontStyle = "normal"] = args;
  const width = glyphMeasureTextWidth(
    text,
    fontSize as number,
    letterSpacing as number,
    fontFamily,
    fontWeight,
    fontStyle,
  );
  return px(width);
}

/**
 * @deprecated Use measureTextWidth instead
 */
export function estimateTextWidth(
  ...args: [text: string, fontSize: Points, letterSpacing: Pixels, fontFamily: string, fontWeight?: number]
): Pixels {
  const [text, fontSize, letterSpacing, fontFamily, fontWeight = 400] = args;
  return measureTextWidth(text, fontSize, letterSpacing, fontFamily, fontWeight);
}

// =============================================================================
// Text Transform
// =============================================================================

/**
 * Apply text transform (uppercase/lowercase) to text.
 * Must match the transform applied during rendering.
 */
function applyTextTransform(
  text: string,
  transform: "none" | "uppercase" | "lowercase" | undefined,
): string {
  if (transform === "uppercase") {
    return text.toUpperCase();
  }
  if (transform === "lowercase") {
    return text.toLowerCase();
  }
  return text;
}

// =============================================================================
// Span Measurement
// =============================================================================

/**
 * Measure a single span and return MeasuredSpan.
 * Uses Canvas API for accurate browser-consistent measurement.
 * Applies textTransform before measuring to match rendered width.
 * For inline images, uses the image width directly.
 */
export function measureSpan(span: LayoutSpan): MeasuredSpan {
  const width = measureSpanWidth(span);

  return {
    ...span,
    width,
  };
}

function measureSpanWidth(span: LayoutSpan): Pixels {
  // Inline images use their configured width
  if (span.inlineImage !== undefined) {
    return span.inlineImage.width;
  }
  if (span.breakType !== "none") {
    return px(0);
  }

  // Apply text transform before measuring (matches rendering)
  const transformedText = applyTextTransform(span.text, span.textTransform);
  return measureTextWidth(
    transformedText,
    span.fontSize,
    span.letterSpacing,
    span.fontFamily,
    span.fontWeight,
    span.fontStyle,
  );
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
 * Measure bullet character width.
 * Uses Canvas API for accurate browser-consistent measurement.
 *
 * Per ECMA-376 21.1.2.2.7, the spacing between bullet and text is controlled
 * by the indent attribute, not by adding extra space to the bullet width.
 */
export function estimateBulletWidth(bulletChar: string, fontSize: Points, fontFamily: string): Pixels {
  return measureTextWidth(bulletChar, fontSize, px(0), fontFamily);
}

// =============================================================================
// Partial Span Measurement (for cursor positioning)
// =============================================================================

/**
 * Measure the width of the first N characters of a span.
 * Uses Canvas API for accurate browser-consistent measurement.
 * Applies textTransform before measuring to match rendered width.
 *
 * @param span - The layout span to measure
 * @param charCount - Number of characters from the start to measure
 * @returns Width in pixels
 */
export function measureSpanTextWidth(span: LayoutSpan, charCount: number): Pixels {
  if (charCount <= 0 || span.breakType !== "none") {
    return px(0);
  }

  // Apply text transform before measuring (matches rendering)
  const transformedText = applyTextTransform(span.text, span.textTransform);
  const text = transformedText.slice(0, Math.min(charCount, transformedText.length));
  return measureTextWidth(text, span.fontSize, span.letterSpacing, span.fontFamily, span.fontWeight, span.fontStyle);
}

/**
 * Get the character index at a specific X offset within a span.
 * Uses Canvas API for accurate browser-consistent measurement.
 * Applies textTransform before calculating to match rendered width.
 *
 * @param span - The layout span
 * @param targetX - Target X offset from span start in pixels
 * @returns Character index (0-based)
 */
export function getCharIndexAtOffset(span: LayoutSpan, targetX: number): number {
  if (targetX <= 0 || span.breakType !== "none" || span.text.length === 0) {
    return 0;
  }

  // Apply text transform before calculating (matches rendering)
  const transformedText = applyTextTransform(span.text, span.textTransform);
  const chars = Array.from(transformedText);

  // Use binary search with Canvas measurement for efficiency
  const index = findCharIndexAtOffset(chars, span, targetX, 0, chars.length);
  return Math.min(index, chars.length);
}

function measureTextWidthAsNumber(text: string, span: LayoutSpan): number {
  return measureTextWidth(
    text,
    span.fontSize,
    span.letterSpacing,
    span.fontFamily,
    span.fontWeight,
    span.fontStyle,
  ) as number;
}

function findCharIndexAtOffset(
  ...args: [chars: readonly string[], span: LayoutSpan, targetX: number, low: number, high: number]
): number {
  const [chars, span, targetX, low, high] = args;
  if (low >= high) {
    return low;
  }

  const mid = Math.floor((low + high) / 2);
  const textUpToMid = chars.slice(0, mid + 1).join("");
  const widthUpToMid = measureTextWidthAsNumber(textUpToMid, span);

  const widthUpToPrev = getWidthUpToPreviousChar(chars, mid, span);

  const charMidpoint = (widthUpToPrev + widthUpToMid) / 2;
  if (targetX < charMidpoint) {
    return findCharIndexAtOffset(chars, span, targetX, low, mid);
  }
  return findCharIndexAtOffset(chars, span, targetX, mid + 1, high);
}

function getWidthUpToPreviousChar(chars: readonly string[], mid: number, span: LayoutSpan): number {
  if (mid <= 0) {
    return 0;
  }
  const textUpToPrev = chars.slice(0, mid).join("");
  return measureTextWidthAsNumber(textUpToPrev, span);
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
  ...args: [text: string, fontSize: Points, letterSpacing: Pixels, fontFamily: string, fontWeight?: number]
): DetailedMeasurement {
  const [text, fontSize, letterSpacing, fontFamily, fontWeight = 400] = args;
  const result = glyphMeasureTextDetailed(
    text,
    fontSize as number,
    letterSpacing as number,
    fontFamily,
    fontWeight,
  );
  return {
    totalWidth: px(result.totalWidth),
    charWidths: result.charWidths.map((cw) => ({
      width: px(cw.width),
      kerningAdjust: px(cw.kerningAdjust),
      totalWidth: px(cw.totalWidth),
    })),
    positions: result.positions.map((p) => px(p)),
  };
}
