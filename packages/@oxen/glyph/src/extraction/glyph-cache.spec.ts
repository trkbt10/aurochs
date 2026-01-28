/**
 * @file Tests for glyph-cache.ts
 *
 * Tests character-level glyph caching for extraction results.
 */
import {
  getCachedGlyph,
  setCachedGlyph,
  hasGlyphCache,
  clearFontGlyphCache,
  clearGlyphCache,
  getGlyphCacheStats,
} from "./glyph-cache";
import type { GlyphContour, GlyphStyleKey } from "../types";

describe("glyph-cache", () => {
  const testStyle: GlyphStyleKey = {
    fontSize: 24,
    fontWeight: 400,
    fontStyle: "normal",
  };

  const testGlyph: GlyphContour = {
    char: "A",
    paths: [
      {
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 20 },
          { x: 20, y: 0 },
        ],
        isHole: false,
      },
    ],
    bounds: { minX: 0, minY: 0, maxX: 20, maxY: 20 },
    metrics: {
      advanceWidth: 15,
      leftBearing: 1,
      ascent: 18,
      descent: 2,
    },
  };

  beforeEach(() => {
    clearGlyphCache();
  });

  describe("getCachedGlyph / setCachedGlyph", () => {
    it("should return undefined for uncached glyph", () => {
      const result = getCachedGlyph("Arial", "A", testStyle);
      expect(result).toBeUndefined();
    });

    it("should cache and retrieve glyph", () => {
      setCachedGlyph("Arial", "A", testStyle, testGlyph);
      const result = getCachedGlyph("Arial", "A", testStyle);

      expect(result).toEqual(testGlyph);
    });

    it("should cache different styles separately", () => {
      const boldStyle: GlyphStyleKey = { ...testStyle, fontWeight: 700 };
      const boldGlyph: GlyphContour = { ...testGlyph, char: "A-bold" };

      setCachedGlyph("Arial", "A", testStyle, testGlyph);
      setCachedGlyph("Arial", "A", boldStyle, boldGlyph);

      expect(getCachedGlyph("Arial", "A", testStyle)).toEqual(testGlyph);
      expect(getCachedGlyph("Arial", "A", boldStyle)).toEqual(boldGlyph);
    });

    it("should cache different fonts separately", () => {
      const timesGlyph: GlyphContour = { ...testGlyph, char: "A-times" };

      setCachedGlyph("Arial", "A", testStyle, testGlyph);
      setCachedGlyph("Times New Roman", "A", testStyle, timesGlyph);

      expect(getCachedGlyph("Arial", "A", testStyle)).toEqual(testGlyph);
      expect(getCachedGlyph("Times New Roman", "A", testStyle)).toEqual(timesGlyph);
    });

    it("should cache different characters separately", () => {
      const glyphB: GlyphContour = { ...testGlyph, char: "B" };

      setCachedGlyph("Arial", "A", testStyle, testGlyph);
      setCachedGlyph("Arial", "B", testStyle, glyphB);

      expect(getCachedGlyph("Arial", "A", testStyle)).toEqual(testGlyph);
      expect(getCachedGlyph("Arial", "B", testStyle)).toEqual(glyphB);
    });
  });

  describe("hasGlyphCache", () => {
    it("should return false for uncached glyph", () => {
      expect(hasGlyphCache("Arial", "A", testStyle)).toBe(false);
    });

    it("should return true for cached glyph", () => {
      setCachedGlyph("Arial", "A", testStyle, testGlyph);
      expect(hasGlyphCache("Arial", "A", testStyle)).toBe(true);
    });
  });

  describe("clearFontGlyphCache", () => {
    it("should clear cache for specific font only", () => {
      setCachedGlyph("Arial", "A", testStyle, testGlyph);
      setCachedGlyph("Times New Roman", "A", testStyle, testGlyph);

      clearFontGlyphCache("Arial");

      expect(getCachedGlyph("Arial", "A", testStyle)).toBeUndefined();
      expect(getCachedGlyph("Times New Roman", "A", testStyle)).toEqual(testGlyph);
    });
  });

  describe("clearGlyphCache", () => {
    it("should clear all caches", () => {
      setCachedGlyph("Arial", "A", testStyle, testGlyph);
      setCachedGlyph("Times New Roman", "B", testStyle, testGlyph);

      clearGlyphCache();

      expect(getCachedGlyph("Arial", "A", testStyle)).toBeUndefined();
      expect(getCachedGlyph("Times New Roman", "B", testStyle)).toBeUndefined();
    });
  });

  describe("getGlyphCacheStats", () => {
    it("should return zero stats for empty cache", () => {
      const stats = getGlyphCacheStats();
      expect(stats.fonts).toBe(0);
      expect(stats.characters).toBe(0);
      expect(stats.totalGlyphs).toBe(0);
    });

    it("should count fonts, characters, and glyphs correctly", () => {
      // 2 fonts
      setCachedGlyph("Arial", "A", testStyle, testGlyph);
      setCachedGlyph("Arial", "B", testStyle, testGlyph);
      setCachedGlyph("Times", "A", testStyle, testGlyph);

      // Add bold variant for Arial A
      const boldStyle: GlyphStyleKey = { ...testStyle, fontWeight: 700 };
      setCachedGlyph("Arial", "A", boldStyle, testGlyph);

      const stats = getGlyphCacheStats();
      expect(stats.fonts).toBe(2);
      expect(stats.characters).toBe(3); // Arial A, Arial B, Times A
      expect(stats.totalGlyphs).toBe(4); // Arial A normal, Arial A bold, Arial B, Times A
    });
  });
});
