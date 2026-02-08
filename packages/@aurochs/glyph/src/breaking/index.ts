/**
 * @file Line breaking module
 *
 * Provides line breaking and word wrapping for text layout.
 * All measurements use plain numbers (pixels for width, points for font size).
 *
 * For type-safe branded units, use @aurochs-office/text-layout which provides
 * OOXML-specific wrappers.
 */

// Types
export type { BreakableSpan, TextWrapping, LineBreakResult, LineFontInfo } from "./types";

// Line breaker
export {
  DEFAULT_FONT_SIZE_PT,
  breakIntoLines,
  getLineWidth,
  getLineMaxFontSize,
  getLineMaxFontInfo,
  getLineTextLength,
} from "./line-breaker";
