/**
 * @file Tests for from-contours-async.ts
 *
 * Ensures merged geometries preserve UV attributes for textured materials.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as THREE from "three";
import type { TextLayoutResult, ContourPath } from "../../../glyph";

// Mock only the glyph module for layoutTextAsync
// Note: Do NOT mock ./bevel - it causes test isolation issues
vi.mock("../../../glyph", () => ({
  layoutTextAsync: vi.fn(),
}));

import { layoutTextAsync } from "../../../glyph";
import { pathsToShapes } from "./from-contours-async";

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

  it("throws when no paths are returned for non-empty text", async () => {
    mockLayoutTextAsync.mockResolvedValue({
      glyphs: [],
      totalWidth: 0,
      ascent: 0,
      descent: 0,
      combinedPaths: [],
    } as TextLayoutResult);

    const { createTextGeometryAsync } = await import("./from-contours-async");

    await expect(createTextGeometryAsync({
      text: "A",
      fontFamily: "Arial",
      fontSize: 24,
      fontWeight: 400,
      fontStyle: "normal",
      extrusionDepth: 10,
    })).rejects.toThrow("No contour paths were generated for non-empty text.");
  });

  it("merges geometry attributes with mergeExtrudeGeometries", async () => {
    const { mergeExtrudeGeometries } = await import("./from-contours-async");

    const shapeA = new THREE.Shape()
      .moveTo(0, 0)
      .lineTo(10, 0)
      .lineTo(10, 10)
      .lineTo(0, 10)
      .closePath();
    const shapeB = new THREE.Shape()
      .moveTo(20, 0)
      .lineTo(30, 0)
      .lineTo(30, 10)
      .lineTo(20, 10)
      .closePath();

    const geomA = new THREE.ExtrudeGeometry(shapeA, { depth: 5, bevelEnabled: false });
    const geomB = new THREE.ExtrudeGeometry(shapeB, { depth: 5, bevelEnabled: false });

    const merged = mergeExtrudeGeometries(geomA, geomB);
    const position = merged.getAttribute("position");
    const normal = merged.getAttribute("normal");

    expect(position).toBeDefined();
    expect(normal).toBeDefined();
    expect(position.count).toBeGreaterThan(geomA.getAttribute("position").count);
  });

  it("scales geometry to fit within bounds", async () => {
    const { scaleGeometryToFit } = await import("./from-contours-async");

    const geometry = new THREE.BoxGeometry(10, 20, 5);
    scaleGeometryToFit(geometry, 5, 10);

    geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    geometry.boundingBox?.getSize(size);

    expect(size.x).toBeLessThanOrEqual(5);
    expect(size.y).toBeLessThanOrEqual(10);
  });

  it("assigns holes to the correct outer paths", () => {
    const outerA: ContourPath = {
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
      isHole: false,
    };
    const outerB: ContourPath = {
      points: [
        { x: 20, y: 0 },
        { x: 30, y: 0 },
        { x: 30, y: 10 },
        { x: 20, y: 10 },
      ],
      isHole: false,
    };
    const holeB: ContourPath = {
      points: [
        { x: 22, y: 2 },
        { x: 28, y: 2 },
        { x: 28, y: 8 },
        { x: 22, y: 8 },
      ],
      isHole: true,
    };

    const shapes = pathsToShapes([outerA, outerB, holeB]);

    expect(shapes).toHaveLength(2);
    expect(shapes[0].holes).toHaveLength(0);
    expect(shapes[1].holes).toHaveLength(1);
  });

  it("treats contained contours as holes even when hole flags are missing", () => {
    const outerA: ContourPath = {
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 14 },
        { x: 0, y: 14 },
      ],
      isHole: false,
    };
    const holeA: ContourPath = {
      points: [
        { x: 3, y: 4 },
        { x: 7, y: 4 },
        { x: 7, y: 10 },
        { x: 3, y: 10 },
      ],
      isHole: false,
    };
    const outerB: ContourPath = {
      points: [
        { x: 20, y: 0 },
        { x: 32, y: 0 },
        { x: 32, y: 14 },
        { x: 20, y: 14 },
      ],
      isHole: false,
    };
    const holeBTop: ContourPath = {
      points: [
        { x: 23, y: 2 },
        { x: 29, y: 2 },
        { x: 29, y: 6 },
        { x: 23, y: 6 },
      ],
      isHole: false,
    };
    const holeBBottom: ContourPath = {
      points: [
        { x: 23, y: 8 },
        { x: 29, y: 8 },
        { x: 29, y: 12 },
        { x: 23, y: 12 },
      ],
      isHole: false,
    };
    const outerD: ContourPath = {
      points: [
        { x: 40, y: 0 },
        { x: 52, y: 0 },
        { x: 52, y: 14 },
        { x: 40, y: 14 },
      ],
      isHole: false,
    };
    const holeD: ContourPath = {
      points: [
        { x: 43, y: 3 },
        { x: 49, y: 3 },
        { x: 49, y: 11 },
        { x: 43, y: 11 },
      ],
      isHole: false,
    };

    const shapes = pathsToShapes([
      outerA,
      holeA,
      outerB,
      holeBTop,
      holeBBottom,
      outerD,
      holeD,
    ]);

    expect(shapes).toHaveLength(3);
    expect(shapes[0].holes).toHaveLength(1);
    expect(shapes[1].holes).toHaveLength(2);
    expect(shapes[2].holes).toHaveLength(1);
  });
});
