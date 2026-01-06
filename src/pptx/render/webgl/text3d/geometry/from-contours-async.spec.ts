/**
 * @file Tests for from-contours-async.ts
 *
 * Ensures merged geometries preserve UV attributes for textured materials.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TextLayoutResult, ContourPath } from "../../../glyph";

vi.mock("../../../glyph", () => ({
  layoutTextAsync: vi.fn(),
}));

vi.mock("./bevel", () => ({
  getBevelConfig: vi.fn(() => undefined),
}));

import { layoutTextAsync } from "../../../glyph";

describe("from-contours-async", () => {
  const mockLayoutTextAsync = layoutTextAsync as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("merges UV attributes when combining multiple shapes", async () => {
    const pathA: ContourPath = {
      points: [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 30 },
        { x: 0, y: 30 },
      ],
      isHole: false,
    };
    const pathB: ContourPath = {
      points: [
        { x: 30, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 30 },
        { x: 30, y: 30 },
      ],
      isHole: false,
    };

    mockLayoutTextAsync.mockResolvedValue({
      glyphs: [],
      totalWidth: 50,
      ascent: 30,
      descent: 0,
      combinedPaths: [pathA, pathB],
    } as TextLayoutResult);

    const { createTextGeometryAsync } = await import("./from-contours-async");

    const geometry = await createTextGeometryAsync({
      text: "AB",
      fontFamily: "Arial",
      fontSize: 24,
      fontWeight: 400,
      fontStyle: "normal",
      extrusionDepth: 10,
    });

    const position = geometry.getAttribute("position");
    const uv = geometry.getAttribute("uv");

    expect(position).toBeDefined();
    expect(position.count).toBeGreaterThan(0);
    expect(uv).toBeDefined();
    expect(uv.count).toBe(position.count);
  });
});
