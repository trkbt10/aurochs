/**
 * @file Tests for optical-kerning.ts
 *
 * Tests optical kerning calculations based on glyph contours.
 */

import type { GlyphContour } from "../types";
import {
  calculateOpticalAdvance,
  calculateOpticalKerningAdjustment,
} from "./kerning";

// =============================================================================
// Test Fixtures
// =============================================================================

function createGlyph(
  char: string,
  bounds: { minX: number; maxX: number },
  advanceWidth: number,
): GlyphContour {
  return {
    char,
    paths: [
      {
        points: [
          { x: bounds.minX, y: 0 },
          { x: bounds.maxX, y: 0 },
          { x: bounds.maxX, y: 20 },
          { x: bounds.minX, y: 20 },
        ],
        isHole: false,
      },
    ],
    bounds: {
      minX: bounds.minX,
      minY: 0,
      maxX: bounds.maxX,
      maxY: 20,
    },
    metrics: {
      advanceWidth,
      leftBearing: 0,
      ascent: 18,
      descent: 4,
    },
  };
}

function createWhitespaceGlyph(char: string, advanceWidth: number): GlyphContour {
  return {
    char,
    paths: [],
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    metrics: {
      advanceWidth,
      leftBearing: 0,
      ascent: 0,
      descent: 0,
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("optical-kerning", () => {
  describe("calculateOpticalAdvance", () => {
    it("should calculate advance based on glyph bounds", () => {
      const prevGlyph = createGlyph("A", { minX: 0, maxX: 16 }, 16);
      const nextGlyph = createGlyph("V", { minX: 4, maxX: 20 }, 16);
      const targetGap = 0;

      const advance = calculateOpticalAdvance(prevGlyph, nextGlyph, targetGap);

      // Expected: prevGlyph.maxX (16) - nextGlyph.minX (4) + gap (0) = 12
      expect(advance).toBe(12);
    });

    it("should include target gap in calculation", () => {
      const prevGlyph = createGlyph("A", { minX: 0, maxX: 16 }, 16);
      const nextGlyph = createGlyph("V", { minX: 4, maxX: 20 }, 16);
      const targetGap = 2;

      const advance = calculateOpticalAdvance(prevGlyph, nextGlyph, targetGap);

      // Expected: 16 - 4 + 2 = 14
      expect(advance).toBe(14);
    });

    it("should fall back to advance width for whitespace (no ink)", () => {
      const prevGlyph = createWhitespaceGlyph(" ", 8);
      const nextGlyph = createGlyph("A", { minX: 0, maxX: 16 }, 16);
      const targetGap = 0;

      const advance = calculateOpticalAdvance(prevGlyph, nextGlyph, targetGap);

      expect(advance).toBe(8); // prevGlyph.advanceWidth + targetGap
    });

    it("should fall back to advance width when next glyph has no ink", () => {
      const prevGlyph = createGlyph("A", { minX: 0, maxX: 16 }, 16);
      const nextGlyph = createWhitespaceGlyph(" ", 8);
      const targetGap = 0;

      const advance = calculateOpticalAdvance(prevGlyph, nextGlyph, targetGap);

      expect(advance).toBe(16); // prevGlyph.advanceWidth + targetGap
    });

    it("should return non-negative advance", () => {
      // Case where bounds would give negative advance
      const prevGlyph = createGlyph("A", { minX: 0, maxX: 5 }, 16);
      const nextGlyph = createGlyph("V", { minX: 10, maxX: 20 }, 16);
      const targetGap = 0;

      const advance = calculateOpticalAdvance(prevGlyph, nextGlyph, targetGap);

      // 5 - 10 + 0 = -5, but clamped to 0
      expect(advance).toBe(0);
    });
  });

  describe("calculateOpticalKerningAdjustment", () => {
    it("should return adjustment relative to default advance", () => {
      const prevGlyph = createGlyph("A", { minX: 0, maxX: 16 }, 16);
      const nextGlyph = createGlyph("V", { minX: 4, maxX: 20 }, 16);
      const letterSpacing = 0;

      const adjustment = calculateOpticalKerningAdjustment(
        prevGlyph,
        nextGlyph,
        letterSpacing,
      );

      // Optical advance = 12, default = 16 + 0 = 16
      // Adjustment = 12 - 16 = -4
      expect(adjustment).toBe(-4);
    });

    it("should account for letter spacing in adjustment", () => {
      const prevGlyph = createGlyph("A", { minX: 0, maxX: 16 }, 16);
      const nextGlyph = createGlyph("V", { minX: 4, maxX: 20 }, 16);
      const letterSpacing = 2;

      const adjustment = calculateOpticalKerningAdjustment(
        prevGlyph,
        nextGlyph,
        letterSpacing,
      );

      // Optical advance = 12 + 2 = 14, default = 16 + 2 = 18
      // Adjustment = 14 - 18 = -4
      expect(adjustment).toBe(-4);
    });

    it("should return zero adjustment for identical glyphs", () => {
      const glyph = createGlyph("O", { minX: 0, maxX: 16 }, 16);
      const letterSpacing = 0;

      const adjustment = calculateOpticalKerningAdjustment(glyph, glyph, letterSpacing);

      // Optical advance = 16 - 0 + 0 = 16, default = 16 + 0 = 16
      // Adjustment = 16 - 16 = 0
      expect(adjustment).toBe(0);
    });

    it("should handle whitespace glyphs gracefully", () => {
      const prevGlyph = createWhitespaceGlyph(" ", 8);
      const nextGlyph = createGlyph("A", { minX: 0, maxX: 16 }, 16);
      const letterSpacing = 0;

      const adjustment = calculateOpticalKerningAdjustment(
        prevGlyph,
        nextGlyph,
        letterSpacing,
      );

      // Falls back to advance width: 8 - (8 + 0) = 0
      expect(adjustment).toBe(0);
    });
  });
});
