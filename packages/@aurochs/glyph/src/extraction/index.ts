/**
 * @file Glyph extraction module
 *
 * Character glyph contour extraction using canvas rendering.
 */

export { extractGlyphContour, extractGlyphContours } from "./glyph";
export { extractGlyphCore, createWhitespaceGlyphCore, type CanvasFactory } from "./extract-core";
export { extractContours, processContours, type ImageDataLike } from "./contour";
export { getCachedGlyph, setCachedGlyph, hasGlyphCache, clearFontGlyphCache, clearGlyphCache, getGlyphCacheStats } from "./glyph-cache";
export { createWhitespaceGlyph } from "./whitespace";
export { formatFontFamily, GENERIC_FONT_FAMILIES } from "./font-format";
