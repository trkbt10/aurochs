/**
 * @file Integration test for glyph pipeline
 *
 * Tests the full pipeline WITHOUT mocks to verify actual behavior.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { clearAllGlyphCache } from "./cache";

// Note: This test runs in Node/Bun environment without real canvas
// It will test the fallback behavior

describe("glyph integration", () => {
  beforeEach(() => {
    clearAllGlyphCache();
  });

  describe("extractor", () => {
    it("should return fallback glyph in non-browser environment", async () => {
      const { extractGlyphContour } = await import("./extractor");

      const glyph = extractGlyphContour("A", "Arial", {
        fontSize: 24,
        fontWeight: 400,
        fontStyle: "normal",
      });

      // Should return fallback (rectangular shape)
      expect(glyph).toBeDefined();
      expect(glyph.char).toBe("A");
      expect(glyph.paths.length).toBeGreaterThan(0);
      expect(glyph.metrics.advanceWidth).toBeGreaterThan(0);

      // Verify path structure
      const path = glyph.paths[0];
      expect(path.points).toBeDefined();
      expect(Array.isArray(path.points)).toBe(true);
      expect(path.points.length).toBeGreaterThanOrEqual(3);

      // Verify point structure
      const point = path.points[0];
      expect(typeof point.x).toBe("number");
      expect(typeof point.y).toBe("number");
    });

    it("should handle whitespace", async () => {
      const { extractGlyphContour } = await import("./extractor");

      const glyph = extractGlyphContour(" ", "Arial", {
        fontSize: 24,
        fontWeight: 400,
        fontStyle: "normal",
      });

      expect(glyph.char).toBe(" ");
      expect(glyph.paths).toHaveLength(0); // Whitespace has no paths
      expect(glyph.metrics.advanceWidth).toBeGreaterThan(0);
    });
  });

  describe("layout", () => {
    it("should layout text with fallback glyphs", async () => {
      const { layoutText } = await import("./layout");

      const result = layoutText("AB", {
        fontFamily: "Arial",
        fontSize: 24,
        fontWeight: 400,
        fontStyle: "normal",
      });

      expect(result.glyphs).toHaveLength(2);
      expect(result.glyphs[0].x).toBe(0);
      expect(result.glyphs[1].x).toBeGreaterThan(0);
      expect(result.totalWidth).toBeGreaterThan(0);
      expect(result.combinedPaths.length).toBeGreaterThan(0);

      // Verify combined paths structure
      for (const path of result.combinedPaths) {
        expect(path.points).toBeDefined();
        expect(Array.isArray(path.points)).toBe(true);
        for (const pt of path.points) {
          expect(typeof pt.x).toBe("number");
          expect(typeof pt.y).toBe("number");
          expect(Number.isFinite(pt.x)).toBe(true);
          expect(Number.isFinite(pt.y)).toBe(true);
        }
      }
    });

    it("should handle empty text", async () => {
      const { layoutText } = await import("./layout");

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

  describe("geometry (WebGL)", () => {
    it("should create geometry from text", async () => {
      const { createTextGeometryFromCanvas } = await import("../webgl/text3d/geometry/from-contours");

      const geometry = createTextGeometryFromCanvas({
        text: "A",
        fontFamily: "Arial",
        fontSize: 24,
        fontWeight: 400,
        fontStyle: "normal",
        extrusionDepth: 10,
      });

      expect(geometry).toBeDefined();
      expect(geometry.attributes).toBeDefined();
      expect(geometry.attributes.position).toBeDefined();
    });

    it("should handle multiple characters", async () => {
      const { createTextGeometryFromCanvas } = await import("../webgl/text3d/geometry/from-contours");

      const geometry = createTextGeometryFromCanvas({
        text: "ABC",
        fontFamily: "Arial",
        fontSize: 24,
        fontWeight: 400,
        fontStyle: "normal",
        extrusionDepth: 10,
      });

      expect(geometry).toBeDefined();
      expect(geometry.attributes.position.count).toBeGreaterThan(0);
    });
  });
});
