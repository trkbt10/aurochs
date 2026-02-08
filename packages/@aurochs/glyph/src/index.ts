/**
 * @file Glyph module
 *
 * Character glyph contour extraction, text layout, and measurement.
 *
 * This module uses plain numbers for measurements.
 * For type-safe branded units (Pixels, Points), use @aurochs-office/text-layout
 * which wraps these functions with OOXML-specific types.
 */

// =============================================================================
// Glyph Types
// =============================================================================

export type {
  ContourPath,
  ContourPoint,
  GlyphMetrics,
  GlyphBounds,
  GlyphContour,
  GlyphStyleKey,
  KerningPair,
  KerningTable,
  PositionedGlyph,
  TextLayoutConfig,
  TextLayoutResult,
} from "./types";

// =============================================================================
// Glyph Extraction (Canvas required)
// =============================================================================

export { extractGlyphContour, extractGlyphContours } from "./extraction/glyph";
export { clearGlyphCache, getGlyphCacheStats } from "./extraction/glyph-cache";

// =============================================================================
// Glyph-based Layout (Canvas required)
// =============================================================================

export { layoutText, measureTextWidth as glyphMeasureTextWidth, getTextBounds } from "./layout/text";
export { layoutTextAsync } from "./layout/text-async";

// =============================================================================
// Metrics (statistical fallback, works anywhere)
// =============================================================================

export type { CharWidthMap, KerningPairMap, FontMetrics, FontCategory } from "./metrics/types";
export { isCjkChar, isCjkCodePoint } from "./metrics/cjk";
export { getCharWidth, getKerningAdjustment, getKerningForText, getAscenderRatio } from "./metrics/font-metrics";
export { getFontCategory, getFontMetrics, isMonospace } from "./metrics/fonts";

// =============================================================================
// Measurement (Canvas + fallback, plain numbers)
// =============================================================================

export { PT_TO_PX, PX_TO_PT, pointsToPixels, pixelsToPoints } from "./measure/units";
export type { CharWidthResult, DetailedMeasurement, TextMeasurer } from "./measure/measurer";
export {
  calculateCharWidth,
  measureTextWidth,
  estimateTextWidthFallback,
  measureTextDetailed,
  createTextMeasurer,
} from "./measure/measurer";

// =============================================================================
// Line Breaking (plain numbers)
// =============================================================================

export type { BreakableSpan, TextWrapping, LineBreakResult, LineFontInfo } from "./breaking/types";
export {
  DEFAULT_FONT_SIZE_PT,
  breakIntoLines,
  getLineWidth,
  getLineMaxFontSize,
  getLineMaxFontInfo,
  getLineTextLength,
} from "./breaking/line-breaker";
