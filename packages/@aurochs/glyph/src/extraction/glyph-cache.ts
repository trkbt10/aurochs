/**
 * @file Glyph contour extraction cache
 *
 * Caches extracted glyph contours for performance optimization.
 * Prevents redundant re-extraction of the same characters.
 *
 * Architecture:
 * ```
 * FontNamespace (by fontFamily)
 *   └─ GlyphCache (by char + style key)
 *        └─ GlyphContour { paths, bounds, metrics }
 * ```
 */

import type { GlyphContour, GlyphStyleKey } from "../types";

// =============================================================================
// Cache Implementation
// =============================================================================

type GlyphCacheEntry = Map<string, GlyphContour>; // styleKey -> GlyphContour
type FontGlyphCache = Map<string, GlyphCacheEntry>; // char -> entries

const fontCaches = new Map<string, FontGlyphCache>();

/**
 * Generate style key string
 */
function getStyleKeyString(key: GlyphStyleKey): string {
  return `${key.fontSize}|${key.fontWeight}|${key.fontStyle}`;
}

/**
 * Get or create font cache
 */
function getOrCreateFontCache(fontFamily: string): FontGlyphCache {
  const existing = fontCaches.get(fontFamily);
  if (existing) {
    return existing;
  }
  const cache = new Map<string, GlyphCacheEntry>();
  fontCaches.set(fontFamily, cache);
  return cache;
}

/**
 * Get cached glyph contour
 */
export function getCachedGlyph(
  fontFamily: string,
  char: string,
  style: GlyphStyleKey,
): GlyphContour | undefined {
  const fontCache = fontCaches.get(fontFamily);
  if (!fontCache) {
    return undefined;
  }

  const charCache = fontCache.get(char);
  if (!charCache) {
    return undefined;
  }

  return charCache.get(getStyleKeyString(style));
}

/**
 * Set cached glyph contour
 *
 * @param options - Options for caching
 * @param options.fontFamily - Font family name
 * @param options.char - Single character
 * @param options.style - Font style (size, weight, style)
 * @param options.glyph - Glyph contour data to cache
 */
export function setCachedGlyph({
  fontFamily,
  char,
  style,
  glyph,
}: {
  readonly fontFamily: string;
  readonly char: string;
  readonly style: GlyphStyleKey;
  readonly glyph: GlyphContour;
}): void {
  const fontCache = getOrCreateFontCache(fontFamily);
  const existingCharCache = fontCache.get(char);
  const charCache = existingCharCache ?? new Map<string, GlyphContour>();

  if (!existingCharCache) {
    fontCache.set(char, charCache);
  }

  charCache.set(getStyleKeyString(style), glyph);
}

/**
 * Check if glyph is cached
 */
export function hasGlyphCache(
  fontFamily: string,
  char: string,
  style: GlyphStyleKey,
): boolean {
  return getCachedGlyph(fontFamily, char, style) !== undefined;
}

/**
 * Clear cache for a specific font
 */
export function clearFontGlyphCache(fontFamily: string): void {
  fontCaches.delete(fontFamily);
}

/**
 * Clear all glyph caches
 */
export function clearGlyphCache(): void {
  fontCaches.clear();
}

/**
 * Get cache statistics
 */
export function getGlyphCacheStats(): {
  fonts: number;
  characters: number;
  totalGlyphs: number;
} {
  const stats = [...fontCaches.values()].reduce(
    (acc, fontCache) => {
      const glyphCount = [...fontCache.values()].reduce(
        (sum, charCache) => sum + charCache.size,
        0,
      );
      return {
        characters: acc.characters + fontCache.size,
        totalGlyphs: acc.totalGlyphs + glyphCount,
      };
    },
    { characters: 0, totalGlyphs: 0 },
  );

  return {
    fonts: fontCaches.size,
    ...stats,
  };
}
