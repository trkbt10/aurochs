/**
 * @file Glyph module
 *
 * Character glyph contour extraction and text layout.
 */

// Types
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

// Extraction
export { extractGlyphContour, extractGlyphContours } from "./extraction/glyph";
export { clearGlyphCache, getGlyphCacheStats } from "./extraction/glyph-cache";

// Layout
export { layoutText, measureTextWidth, getTextBounds } from "./layout/text";
export { layoutTextAsync } from "./layout/text-async";
