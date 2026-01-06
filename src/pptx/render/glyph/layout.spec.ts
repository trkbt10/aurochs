/**
 * @file Tests for layout.ts
 *
 * Tests text layout with character positioning and kerning.
 * Uses vi.mock with inline factory function to avoid hoisting issues.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { clearAllGlyphCache, setKerningTable } from "./cache";
import type { GlyphContour, TextLayoutConfig } from "./types";

// Mock extractor with pure inline factory (no external variable references)
vi.mock("./extractor", () => ({
  extractGlyphContour: vi.fn((char: string, _fontFamily: string, _style: unknown): GlyphContour => {
    const width = char === " " ? 8 : 16;
    const minX = char === "V" ? 4 : 0;
    const maxX = minX + width;
    return {
      char,
      paths:
        char === " "
          ? []
          : [
              {
                points: [
                  { x: minX, y: 0 },
                  { x: maxX, y: 0 },
                  { x: maxX, y: 20 },
                  { x: minX, y: 20 },
                ],
                isHole: false,
              },
            ],
      bounds: { minX, minY: 0, maxX, maxY: 20 },
      metrics: {
        advanceWidth: width,
        leftBearing: 1,
        ascent: 18,
        descent: 4,
      },
    };
  }),
}));

import { layoutText, getTextBounds, measureTextWidth, splitTextIntoLines } from "./layout";

describe("text-layout-3d", () => {
  const defaultConfig: TextLayoutConfig = {
    fontFamily: "Arial",
    fontSize: 24,
    fontWeight: 400,
    fontStyle: "normal",
  };

  beforeEach(() => {
    clearAllGlyphCache();
  });

  describe("layoutText", () => {
    it("should return empty result for empty text", () => {
      const result = layoutText("", defaultConfig);

      expect(result.glyphs).toHaveLength(0);
      expect(result.totalWidth).toBe(0);
      expect(result.ascent).toBe(0);
      expect(result.descent).toBe(0);
      expect(result.combinedPaths).toHaveLength(0);
    });

    it("should layout single character", () => {
      const result = layoutText("A", defaultConfig);

      expect(result.glyphs).toHaveLength(1);
      expect(result.glyphs[0].glyph.char).toBe("A");
      expect(result.glyphs[0].x).toBe(0);
      expect(result.glyphs[0].y).toBe(0);
      expect(result.totalWidth).toBe(16); // advanceWidth from mock
    });

    it("should layout multiple characters with correct positions", () => {
      const result = layoutText("AB", defaultConfig);

      expect(result.glyphs).toHaveLength(2);
      expect(result.glyphs[0].x).toBe(0);
      expect(result.glyphs[1].x).toBe(16); // A's advanceWidth
    });

    it("should handle whitespace correctly", () => {
      const result = layoutText("A B", defaultConfig);

      expect(result.glyphs).toHaveLength(3);
      // Space should have no paths but advance cursor
      expect(result.glyphs[1].glyph.paths).toHaveLength(0);
      expect(result.glyphs[2].x).toBe(16 + 8); // A width + space width
    });

    it("should apply letter spacing", () => {
      const configWithSpacing: TextLayoutConfig = {
        ...defaultConfig,
        letterSpacing: 5,
      };
      const result = layoutText("AB", configWithSpacing);

      expect(result.glyphs[1].x).toBe(16 + 5); // A width + letter spacing
    });

    it("should apply kerning adjustments", () => {
      setKerningTable("Arial", {
        pairs: new Map([["AV", -3]]),
      });

      const result = layoutText("AV", { ...defaultConfig, enableKerning: true });

      // Second glyph should be shifted by kerning
      expect(result.glyphs[1].x).toBe(16 - 3); // A width + kerning
    });

    it("should apply optical kerning when enabled", () => {
      const result = layoutText("AV", { ...defaultConfig, opticalKerning: true });

      expect(result.glyphs[1].x).toBe(12); // A maxX (16) - V minX (4)
    });

    it("should skip kerning when disabled", () => {
      setKerningTable("Arial", {
        pairs: new Map([["AV", -3]]),
      });

      const result = layoutText("AV", { ...defaultConfig, enableKerning: false });

      expect(result.glyphs[1].x).toBe(16); // No kerning applied
    });

    it("should track max ascent and descent", () => {
      const result = layoutText("ABC", defaultConfig);

      expect(result.ascent).toBe(18);
      expect(result.descent).toBe(4);
    });

    it("should generate combined paths with correct offsets", () => {
      const result = layoutText("AB", defaultConfig);

      // Should have paths from both characters
      expect(result.combinedPaths.length).toBeGreaterThan(0);

      // First path should be at x=0 (from A)
      const firstPath = result.combinedPaths[0];
      expect(firstPath.points[0].x).toBe(0);

      // Second character's path should be offset by A's width
      const secondPath = result.combinedPaths[1];
      expect(secondPath.points[0].x).toBe(16);
    });
  });

  describe("getTextBounds", () => {
    it("should return zero bounds for empty text", () => {
      const bounds = getTextBounds("", defaultConfig);

      expect(bounds.width).toBe(0);
      expect(bounds.height).toBe(0);
    });

    it("should return correct bounds", () => {
      const bounds = getTextBounds("AB", defaultConfig);

      expect(bounds.width).toBe(32); // 16 + 16
      expect(bounds.height).toBe(22); // ascent 18 + descent 4
      expect(bounds.ascent).toBe(18);
      expect(bounds.descent).toBe(4);
    });
  });

  describe("measureTextWidth", () => {
    it("should return zero for empty text", () => {
      const width = measureTextWidth("", defaultConfig);
      expect(width).toBe(0);
    });

    it("should measure single character width", () => {
      const width = measureTextWidth("A", defaultConfig);
      expect(width).toBe(16);
    });

    it("should include letter spacing", () => {
      const width = measureTextWidth("AB", { ...defaultConfig, letterSpacing: 5 });
      expect(width).toBe(16 + 16 + 5); // Two chars + one spacing
    });

    it("should include kerning", () => {
      setKerningTable("Arial", {
        pairs: new Map([["AV", -3]]),
      });

      const width = measureTextWidth("AV", { ...defaultConfig, enableKerning: true });
      expect(width).toBe(16 + 16 - 3); // Two chars + kerning
    });

    it("should include optical kerning", () => {
      const width = measureTextWidth("AV", { ...defaultConfig, opticalKerning: true });
      expect(width).toBe(16 + 16 - 4);
    });
  });

  describe("splitTextIntoLines", () => {
    it("should split on newlines", () => {
      const lines = splitTextIntoLines("Hello\nWorld", 1000, defaultConfig);
      expect(lines).toEqual(["Hello", "World"]);
    });

    it("should handle single line", () => {
      const lines = splitTextIntoLines("Hello", 1000, defaultConfig);
      expect(lines).toEqual(["Hello"]);
    });

    it("should handle empty text", () => {
      const lines = splitTextIntoLines("", 1000, defaultConfig);
      expect(lines).toEqual([""]);
    });
  });
});
