/**
 * @file Integration test for glyph pipeline
 *
 * Tests the full pipeline WITHOUT mocks to verify actual behavior.
 */
import { clearGlyphCache } from "./extraction/glyph-cache";

// Note: This test runs in Node/Bun environment without real canvas.
// It validates error paths for glyph extraction.

describe("glyph integration", () => {
  beforeEach(() => {
    clearGlyphCache();
  });

  describe("extractor", () => {
    it("should throw in non-browser environment", async () => {
      const { extractGlyphContour } = await import("./extraction/glyph");

      expect(() => extractGlyphContour("A", "Arial", {
        fontSize: 24,
        fontWeight: 400,
        fontStyle: "normal",
      })).toThrow("Glyph extraction requires a browser canvas environment.");
    });

    it("should throw for whitespace in non-browser environment", async () => {
      const { extractGlyphContour } = await import("./extraction/glyph");

      expect(() => extractGlyphContour(" ", "Arial", {
        fontSize: 24,
        fontWeight: 400,
        fontStyle: "normal",
      })).toThrow("Glyph extraction requires a browser canvas environment.");
    });
  });

  describe("layout", () => {
    it("should throw when layout needs glyph extraction in non-browser environment", async () => {
      const { layoutText } = await import("./layout/text");

      expect(() => layoutText("AB", {
        fontFamily: "Arial",
        fontSize: 24,
        fontWeight: 400,
        fontStyle: "normal",
      })).toThrow("Glyph extraction requires a browser canvas environment.");
    });

    it("should handle empty text", async () => {
      const { layoutText } = await import("./layout/text");

      const result = layoutText("", {
        fontFamily: "Arial",
        fontSize: 24,
        fontWeight: 400,
        fontStyle: "normal",
      });

      expect(result.glyphs).toHaveLength(0);
      expect(result.combinedPaths).toHaveLength(0);
    });
  });

});
