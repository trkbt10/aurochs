/**
 * @file Tests for pure shape offset/expansion
 */

import {
  expandContourPoints,
  expandShapeData,
  createExpandedShapesForContour,
  isValidWinding,
  reverseWinding,
  normalizeShapeWinding,
} from "./shape-offset";
import { point2d, shapeWithHoles, shapeFromPoints } from "./types";
import type { Point2D, ShapeData } from "./types";

// =============================================================================
// Test Fixtures
// =============================================================================

/** Create a CCW square (outer contour) */
function createSquareCCW(size = 100): readonly Point2D[] {
  return [
    point2d(0, 0),
    point2d(size, 0),
    point2d(size, size),
    point2d(0, size),
  ];
}

/** Create a CW square (hole) */
function createSquareCW(x: number, y: number, size: number): readonly Point2D[] {
  return [
    point2d(x, y),
    point2d(x, y + size),
    point2d(x + size, y + size),
    point2d(x + size, y),
  ];
}

/** Create a shape with a square hole */
function createShapeWithHole(): ShapeData {
  return shapeWithHoles(
    createSquareCCW(100),
    [createSquareCW(25, 25, 50)],
  );
}

// =============================================================================
// expandContourPoints Tests
// =============================================================================

describe("expandContourPoints", () => {
  describe("basic expansion", () => {
    it("expands CCW square outward", () => {
      const square = createSquareCCW(100);
      const expanded = expandContourPoints(square, 10, false);

      expect(expanded).not.toBeNull();
      expect(expanded!).toHaveLength(4);

      // Expanded square should be larger
      // Corner (0,0) should move to approximately (-10, -10)
      expect(expanded![0].x).toBeLessThan(0);
      expect(expanded![0].y).toBeLessThan(0);

      // Corner (100, 100) should move to approximately (110, 110)
      expect(expanded![2].x).toBeGreaterThan(100);
      expect(expanded![2].y).toBeGreaterThan(100);
    });

    it("shrinks CW hole inward (negative distance for outer)", () => {
      const hole = createSquareCW(25, 25, 50);
      const shrunk = expandContourPoints(hole, -5, true);

      expect(shrunk).not.toBeNull();
      expect(shrunk!).toHaveLength(4);

      // Shrunk hole should be smaller
      // All points should move toward center
    });

    it("returns null for less than 3 points", () => {
      const twoPoints = [point2d(0, 0), point2d(10, 0)];
      expect(expandContourPoints(twoPoints, 5, false)).toBeNull();
    });
  });

  describe("expansion distance", () => {
    it("larger distance = larger expansion", () => {
      const square = createSquareCCW(100);

      const small = expandContourPoints(square, 5, false)!;
      const large = expandContourPoints(square, 20, false)!;

      // Large expansion should have corner further from origin
      expect(large[0].x).toBeLessThan(small[0].x);
      expect(large[0].y).toBeLessThan(small[0].y);
    });

    it("zero distance returns original-like result", () => {
      const square = createSquareCCW(100);
      const zero = expandContourPoints(square, 0, false)!;

      // Points should be very close to original
      expect(Math.abs(zero[0].x - 0)).toBeLessThan(0.01);
      expect(Math.abs(zero[0].y - 0)).toBeLessThan(0.01);
    });
  });
});

// =============================================================================
// expandShapeData Tests
// =============================================================================

describe("expandShapeData", () => {
  it("expands simple shape", () => {
    const shape = shapeFromPoints(createSquareCCW(100));
    const expanded = expandShapeData(shape, 10);

    expect(expanded).not.toBeNull();
    expect(expanded!.points).toHaveLength(4);
    expect(expanded!.holes).toHaveLength(0);
  });

  it("expands shape with hole", () => {
    const shape = createShapeWithHole();
    const expanded = expandShapeData(shape, 10);

    expect(expanded).not.toBeNull();
    expect(expanded!.points).toHaveLength(4);
    expect(expanded!.holes).toHaveLength(1);
    expect(expanded!.holes[0]).toHaveLength(4);
  });

  it("returns copy for zero or negative distance", () => {
    const shape = createShapeWithHole();
    const same = expandShapeData(shape, 0);

    expect(same).not.toBeNull();
    expect(same!.points).toHaveLength(shape.points.length);
    expect(same!.holes).toHaveLength(shape.holes.length);
  });

  it("returns null for invalid shape", () => {
    const invalid = shapeFromPoints([point2d(0, 0), point2d(10, 0)]);
    expect(expandShapeData(invalid, 10)).toBeNull();
  });
});

// =============================================================================
// createExpandedShapesForContour Tests
// =============================================================================

describe("createExpandedShapesForContour", () => {
  it("expands multiple shapes", () => {
    const shapes = [
      shapeFromPoints(createSquareCCW(100)),
      shapeFromPoints(createSquareCCW(50)),
    ];

    const expanded = createExpandedShapesForContour(shapes, 5);

    expect(expanded).toHaveLength(2);
  });

  it("filters out failed expansions", () => {
    const shapes = [
      shapeFromPoints(createSquareCCW(100)),
      shapeFromPoints([point2d(0, 0)]), // Invalid - will fail
    ];

    const expanded = createExpandedShapesForContour(shapes, 5);

    expect(expanded).toHaveLength(1); // Only valid one included
  });
});

// =============================================================================
// Winding Utilities Tests
// =============================================================================

describe("isValidWinding", () => {
  it("CCW square is valid outer contour", () => {
    expect(isValidWinding(createSquareCCW(100), false)).toBe(true);
  });

  it("CW square is valid hole", () => {
    expect(isValidWinding(createSquareCW(0, 0, 100), true)).toBe(true);
  });

  it("CCW square is invalid hole", () => {
    expect(isValidWinding(createSquareCCW(100), true)).toBe(false);
  });

  it("CW square is invalid outer contour", () => {
    expect(isValidWinding(createSquareCW(0, 0, 100), false)).toBe(false);
  });
});

describe("reverseWinding", () => {
  it("reverses point order", () => {
    const points = [point2d(0, 0), point2d(1, 0), point2d(1, 1)];
    const reversed = reverseWinding(points);

    expect(reversed).toHaveLength(3);
    expect(reversed[0].x).toBe(1);
    expect(reversed[0].y).toBe(1);
    expect(reversed[2].x).toBe(0);
    expect(reversed[2].y).toBe(0);
  });

  it("does not modify original", () => {
    const points = [point2d(0, 0), point2d(1, 0)];
    reverseWinding(points);

    expect(points[0].x).toBe(0);
  });
});

describe("normalizeShapeWinding", () => {
  it("keeps correct winding unchanged", () => {
    const shape = createShapeWithHole();
    const normalized = normalizeShapeWinding(shape);

    // Outer should be CCW (positive area)
    expect(isValidWinding(normalized.points, false)).toBe(true);

    // Hole should be CW (negative area)
    expect(isValidWinding(normalized.holes[0], true)).toBe(true);
  });

  it("fixes incorrect outer winding", () => {
    // Create shape with CW outer (wrong)
    const wrongOuter = shapeFromPoints(createSquareCW(0, 0, 100));
    const normalized = normalizeShapeWinding(wrongOuter);

    expect(isValidWinding(normalized.points, false)).toBe(true);
  });
});
