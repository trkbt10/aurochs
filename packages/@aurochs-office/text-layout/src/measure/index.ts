/**
 * @file Text measurement and line breaking
 *
 * Provides text width measurement and line breaking for OOXML documents.
 * Wraps @aurochs/glyph functions with OOXML-specific types (Pixels, Points).
 */

export {
  calculateCharWidth,
  estimateTextWidth,
  measureTextWidth,
  measureSpan,
  measureSpans,
  estimateBulletWidth,
  measureTextDetailed,
  measureSpanTextWidth,
  getCharIndexAtOffset,
} from "./measurer";
export type { CharWidthResult, DetailedMeasurement } from "./measurer";

export {
  breakIntoLines,
  getLineWidth,
  getLineMaxFontSize,
  getLineMaxFontInfo,
  getLineTextLength,
} from "./line-breaker";
export type { LineBreakResult, LineFontInfo } from "./line-breaker";
