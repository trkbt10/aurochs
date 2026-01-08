/**
 * @file Tests for from-contours-async.ts
 *
 * Ensures merged geometries preserve UV attributes for textured materials.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as THREE from "three";
import type { TextLayoutResult, ContourPath } from "../../../glyph/types";

// Mock only the glyph module for layoutTextAsync
// Note: Do NOT mock ./bevel - it causes test isolation issues
vi.mock("../../../glyph/layout/text-async", () => ({
  layoutTextAsync: vi.fn(),
}));

import { layoutTextAsync } from "../../../glyph/layout/text-async";
import { pathsToShapes } from "./from-contours-async";

/**
 * Calculate signed area of a polygon using shoelace formula.
 * Positive = CW, Negative = CCW (in standard math coords where Y is up)
 */
function calculateShapeArea(points: THREE.Vector2[]): number {
  return points.reduce((sum, point, i) => {
    const next = points[(i + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0) / 2;
}

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

  it("produces correct winding for THREE.js (outer=positive area, holes=negative area)", () => {
    // O-shape: outer with hole
    // Points are in screen coordinates (Y down)
    // CW in screen coords = positive shoelace area
    const outer: ContourPath = {
      points: [
        { x: 0, y: 0 },
        { x: 30, y: 0 },
        { x: 30, y: 30 },
        { x: 0, y: 30 },
      ], // CW in screen coords
      isHole: false,
    };
    const hole: ContourPath = {
      points: [
        { x: 10, y: 10 },
        { x: 10, y: 20 },
        { x: 20, y: 20 },
        { x: 20, y: 10 },
      ], // CCW in screen coords
      isHole: true,
    };

    const shapes = pathsToShapes([outer, hole]);

    expect(shapes).toHaveLength(1);
    expect(shapes[0].holes).toHaveLength(1);

    // Get the points from the shape (after Y-flip + reversal in applyContourPoints)
    const shapePoints = shapes[0].getPoints();
    const holePoints = shapes[0].holes[0].getPoints();

    // Calculate areas using shoelace formula
    const shapeArea = calculateShapeArea(shapePoints);
    const holeArea = calculateShapeArea(holePoints);

    // After Y-flip + point reversal:
    // - Outer (CW in screen) → positive area (CCW in math = outer for THREE.js)
    // - Hole (CCW in screen) → negative area (CW in math = hole for THREE.js)
    // THREE.js ShapeUtils.isClockWise returns true for negative area (treats as hole)
    expect(shapeArea).toBeGreaterThan(0); // Outer: positive area
    expect(holeArea).toBeLessThan(0); // Hole: negative area
  });

  it("handles contours with opposite winding (CCW outer, CW hole)", () => {
    // This simulates what happens if contour extraction produces
    // contours with the OPPOSITE winding to normal:
    // - Outer: CCW in screen coords (instead of expected CW)
    // - Hole: CW in screen coords (instead of expected CCW)
    //
    // pathsToShapes uses geometric containment, not the isHole flag.
    // The Y-flip + reversal still applies, so winding is still transformed.

    // Outer: CCW in screen coords (negative area before transform)
    const outer: ContourPath = {
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 30 },
        { x: 30, y: 30 },
        { x: 30, y: 0 },
      ], // CCW in screen coords
      isHole: false,
    };
    // Hole: CW in screen coords (positive area before transform)
    const hole: ContourPath = {
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 10 },
        { x: 20, y: 20 },
        { x: 10, y: 20 },
      ], // CW in screen coords
      isHole: true,
    };

    const shapes = pathsToShapes([outer, hole]);

    expect(shapes).toHaveLength(1);
    expect(shapes[0].holes).toHaveLength(1);

    const shapePoints = shapes[0].getPoints();
    const holePoints = shapes[0].holes[0].getPoints();

    const shapeArea = calculateShapeArea(shapePoints);
    const holeArea = calculateShapeArea(holePoints);

    // After Y-flip + reversal:
    // - Original CCW outer → negative area (CW in math coords)
    // - Original CW hole → positive area (CCW in math coords)
    // This is OPPOSITE of normal, but the transformation is consistent
    expect(shapeArea).toBeLessThan(0); // Negative because original was CCW
    expect(holeArea).toBeGreaterThan(0); // Positive because original was CW
  });

  it("correctly handles contours with correct winding (like from actual extraction)", () => {
    // This simulates contours from actual extraction which produces:
    // - Outer: CW in screen coords (positive area before transform)
    // - Hole: CCW in screen coords (negative area before transform)

    // Outer: CW in screen coords - correct winding from extraction
    const outer: ContourPath = {
      points: [
        { x: 0, y: 0 },
        { x: 30, y: 0 },
        { x: 30, y: 30 },
        { x: 0, y: 30 },
      ], // CW in screen coords
      isHole: false,
    };
    // Hole: CCW in screen coords - correct winding from extraction
    const hole: ContourPath = {
      points: [
        { x: 10, y: 10 },
        { x: 10, y: 20 },
        { x: 20, y: 20 },
        { x: 20, y: 10 },
      ], // CCW in screen coords
      isHole: true,
    };

    const shapes = pathsToShapes([outer, hole]);

    expect(shapes).toHaveLength(1);
    expect(shapes[0].holes).toHaveLength(1);

    const shapePoints = shapes[0].getPoints();
    const holePoints = shapes[0].holes[0].getPoints();

    const shapeArea = calculateShapeArea(shapePoints);
    const holeArea = calculateShapeArea(holePoints);

    // After Y-flip + reversal:
    // - Original CW outer → positive area (CCW in math = outer for THREE.js)
    // - Original CCW hole → negative area (CW in math = hole for THREE.js)
    expect(shapeArea).toBeGreaterThan(0); // Positive for outer
    expect(holeArea).toBeLessThan(0); // Negative for hole
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
