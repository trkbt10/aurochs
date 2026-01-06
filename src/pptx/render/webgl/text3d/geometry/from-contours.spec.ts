/**
 * @file Tests for from-contours.ts
 *
 * Tests geometry generation from laid out text.
 * Mocks glyph layout to isolate geometry logic.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TextLayoutResult, ContourPath } from "../../../glyph";

// Mock glyph layout
vi.mock("../../../glyph", () => ({
  layoutText: vi.fn(),
}));

// Mock bevel config
vi.mock("./bevel", () => ({
  getBevelConfig: vi.fn((bevel) => {
    if (!bevel) return undefined;
    return { thickness: 0.1, size: 0.1, segments: 3 };
  }),
}));

import { layoutText } from "../../../glyph";

describe("from-contours", () => {
  const mockLayoutText = layoutText as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("pathsToShapes (internal logic)", () => {
    // Test the path conversion logic in isolation
    it("should handle empty paths", async () => {
      mockLayoutText.mockReturnValue({
        glyphs: [],
        totalWidth: 0,
        ascent: 0,
        descent: 0,
        combinedPaths: [],
      } as TextLayoutResult);

      const { createTextGeometryFromCanvas } = await import("./from-contours");

      const geometry = createTextGeometryFromCanvas({
        text: "",
        fontFamily: "Arial",
        fontSize: 24,
        fontWeight: 400,
        fontStyle: "normal",
        extrusionDepth: 10,
      });

      expect(geometry).toBeDefined();
    });

    it("should convert simple rectangular path to shape", async () => {
      const rectPath: ContourPath = {
        points: [
          { x: 0, y: 0 },
          { x: 20, y: 0 },
          { x: 20, y: 30 },
          { x: 0, y: 30 },
        ],
        isHole: false,
      };

      mockLayoutText.mockReturnValue({
        glyphs: [],
        totalWidth: 20,
        ascent: 24,
        descent: 6,
        combinedPaths: [rectPath],
      } as TextLayoutResult);

      const { createTextGeometryFromCanvas } = await import("./from-contours");

      const geometry = createTextGeometryFromCanvas({
        text: "A",
        fontFamily: "Arial",
        fontSize: 24,
        fontWeight: 400,
        fontStyle: "normal",
        extrusionDepth: 10,
      });

      expect(geometry).toBeDefined();
      // Geometry should have been created with proper attributes
      expect(geometry.attributes).toBeDefined();
    });

    it("should handle path with hole (like letter O)", async () => {
      // Outer path
      const outerPath: ContourPath = {
        points: [
          { x: 0, y: 0 },
          { x: 30, y: 0 },
          { x: 30, y: 40 },
          { x: 0, y: 40 },
        ],
        isHole: false,
      };

      // Inner hole
      const holePath: ContourPath = {
        points: [
          { x: 5, y: 5 },
          { x: 25, y: 5 },
          { x: 25, y: 35 },
          { x: 5, y: 35 },
        ],
        isHole: true,
      };

      mockLayoutText.mockReturnValue({
        glyphs: [],
        totalWidth: 30,
        ascent: 32,
        descent: 8,
        combinedPaths: [outerPath, holePath],
      } as TextLayoutResult);

      const { createTextGeometryFromCanvas } = await import("./from-contours");

      const geometry = createTextGeometryFromCanvas({
        text: "O",
        fontFamily: "Arial",
        fontSize: 24,
        fontWeight: 400,
        fontStyle: "normal",
        extrusionDepth: 10,
      });

      expect(geometry).toBeDefined();
    });

    it("should handle multiple separate paths (like letter i)", async () => {
      // Dot
      const dotPath: ContourPath = {
        points: [
          { x: 5, y: 30 },
          { x: 15, y: 30 },
          { x: 15, y: 40 },
          { x: 5, y: 40 },
        ],
        isHole: false,
      };

      // Stem
      const stemPath: ContourPath = {
        points: [
          { x: 5, y: 0 },
          { x: 15, y: 0 },
          { x: 15, y: 25 },
          { x: 5, y: 25 },
        ],
        isHole: false,
      };

      mockLayoutText.mockReturnValue({
        glyphs: [],
        totalWidth: 15,
        ascent: 32,
        descent: 8,
        combinedPaths: [dotPath, stemPath],
      } as TextLayoutResult);

      const { createTextGeometryFromCanvas } = await import("./from-contours");

      const geometry = createTextGeometryFromCanvas({
        text: "i",
        fontFamily: "Arial",
        fontSize: 24,
        fontWeight: 400,
        fontStyle: "normal",
        extrusionDepth: 10,
      });

      expect(geometry).toBeDefined();
    });

    it("should skip paths with less than 3 points", async () => {
      const invalidPath: ContourPath = {
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
        isHole: false,
      };

      const validPath: ContourPath = {
        points: [
          { x: 0, y: 0 },
          { x: 20, y: 0 },
          { x: 20, y: 30 },
          { x: 0, y: 30 },
        ],
        isHole: false,
      };

      mockLayoutText.mockReturnValue({
        glyphs: [],
        totalWidth: 20,
        ascent: 24,
        descent: 6,
        combinedPaths: [invalidPath, validPath],
      } as TextLayoutResult);

      const { createTextGeometryFromCanvas } = await import("./from-contours");

      const geometry = createTextGeometryFromCanvas({
        text: "A",
        fontFamily: "Arial",
        fontSize: 24,
        fontWeight: 400,
        fontStyle: "normal",
        extrusionDepth: 10,
      });

      expect(geometry).toBeDefined();
    });
  });

  describe("scaleGeometryToFit", () => {
    it("should be exported", async () => {
      const { scaleGeometryToFit } = await import("./from-contours");
      expect(scaleGeometryToFit).toBeDefined();
    });
  });
});
