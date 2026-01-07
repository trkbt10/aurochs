/**
 * @file Character-level glyph contour cache
 *
 * Caches contours for individual characters, enabling:
 * - Efficient reuse of repeated characters
 * - Character-by-character text layout
 * - Kerning support through layout layer
 *
 * Architecture:
 * ```
 * FontNamespace (by fontFamily)
 *   └─ GlyphCache (by char + style key)
 *        └─ GlyphContour { paths, bounds, metrics }
 * ```
 */

import type { GlyphContour, GlyphStyleKey, KerningTable } from "./types";

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
 */
export function setCachedGlyph(
  fontFamily: string,
  char: string,
  style: GlyphStyleKey,
  glyph: GlyphContour,
): void {
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
 * Clear all glyph caches (includes kerning tables)
 */
export function clearAllGlyphCache(): void {
  fontCaches.clear();
  kerningTables.clear();
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

// =============================================================================
// Kerning Support
// =============================================================================

const kerningTables = new Map<string, KerningTable>();

/**
 * Set kerning table for a font
 */
export function setKerningTable(fontFamily: string, table: KerningTable): void {
  kerningTables.set(fontFamily, table);
}

/**
 * Get kerning adjustment for a character pair
 */
export function getKerningAdjustment(
  fontFamily: string,
  first: string,
  second: string,
): number {
  const table = kerningTables.get(fontFamily);
  if (!table) {
    return 0;
  }

  return table.pairs.get(first + second) ?? 0;
}

/**
 * Check if font has kerning table
 */
export function hasKerningTable(fontFamily: string): boolean {
  return kerningTables.has(fontFamily);
}
