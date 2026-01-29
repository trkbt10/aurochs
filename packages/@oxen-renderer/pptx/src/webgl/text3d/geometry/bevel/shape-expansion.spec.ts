/**
 * @file Tests for shape-expansion.ts
 */

import { expandShape, expandShapesForContour, shrinkShape, calculateMinWallThickness, calculateSafeBevelWidth } from "./shape-expansion";
import type { ShapeInput, Vector2 } from "./types";

function createSquareShape(size: number): ShapeInput {
  return {
    points: [
      { x: 0, y: 0 },
      { x: size, y: 0 },
      { x: size, y: size },
      { x: 0, y: size },
    ],
    holes: [],
  };
}

function createSquareWithHole(outerSize: number, holeSize: number): ShapeInput {
  const holeOffset = (outerSize - holeSize) / 2;
  return {
    points: [
      { x: 0, y: 0 },
      { x: outerSize, y: 0 },
      { x: outerSize, y: outerSize },
      { x: 0, y: outerSize },
    ],
    holes: [
      [
        { x: holeOffset, y: holeOffset },
        { x: holeOffset + holeSize, y: holeOffset },
        { x: holeOffset + holeSize, y: holeOffset + holeSize },
        { x: holeOffset, y: holeOffset + holeSize },
      ],
    ],
  };
}

function getBounds(points: readonly Vector2[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
} {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

describe("expandShape", () => {
  it("returns same shape for zero distance", () => {
    const shape = createSquareShape(100);
    const result = expandShape(shape, 0);

    expect(result).toBe(shape);
  });

  it("returns null for insufficient points", () => {
    const shape: ShapeInput = {
      points: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      holes: [],
    };

    const result = expandShape(shape, 5);
    expect(result).toBeNull();
  });

  it("expands square outward by specified distance", () => {
    const shape = createSquareShape(100);
    const expandDistance = 5;

    const result = expandShape(shape, expandDistance);
    expect(result).not.toBeNull();
    expect(result!.points).toHaveLength(4);

    const originalBounds = getBounds(shape.points);
    const expandedBounds = getBounds(result!.points);

    // Width and height should increase by 2 * expandDistance
    expect(expandedBounds.width).toBeCloseTo(originalBounds.width + 2 * expandDistance, 1);
    expect(expandedBounds.height).toBeCloseTo(originalBounds.height + 2 * expandDistance, 1);
  });

  it("shrinks holes when expanding shape", () => {
    const shape = createSquareWithHole(100, 50);
    const expandDistance = 5;

    const result = expandShape(shape, expandDistance);
    expect(result).not.toBeNull();
    expect(result!.holes).toHaveLength(1);

    const originalHoleBounds = getBounds(shape.holes[0]);
    const expandedHoleBounds = getBounds(result!.holes[0]);

    // Hole should shrink by 2 * expandDistance
    expect(expandedHoleBounds.width).toBeCloseTo(originalHoleBounds.width - 2 * expandDistance, 1);
    expect(expandedHoleBounds.height).toBeCloseTo(originalHoleBounds.height - 2 * expandDistance, 1);
  });

  it("maintains correct winding direction", () => {
    const shape = createSquareShape(100);
    const result = expandShape(shape, 10);

    expect(result).not.toBeNull();

    // All expanded points should be outside original shape
    const expandedBounds = getBounds(result!.points);
    expect(expandedBounds.minX).toBeLessThan(0);
    expect(expandedBounds.minY).toBeLessThan(0);
    expect(expandedBounds.maxX).toBeGreaterThan(100);
    expect(expandedBounds.maxY).toBeGreaterThan(100);
  });
});

describe("expandShapesForContour", () => {
  it("expands multiple shapes", () => {
    const shapes: ShapeInput[] = [
      createSquareShape(100),
      {
        points: [
          { x: 200, y: 0 },
          { x: 250, y: 0 },
          { x: 250, y: 50 },
          { x: 200, y: 50 },
        ],
        holes: [],
      },
    ];

    const result = expandShapesForContour(shapes, 5);

    expect(result).toHaveLength(2);

    const bounds0 = getBounds(result[0].points);
    const bounds1 = getBounds(result[1].points);

    expect(bounds0.width).toBeCloseTo(110, 1);
    expect(bounds0.height).toBeCloseTo(110, 1);
    expect(bounds1.width).toBeCloseTo(60, 1);
    expect(bounds1.height).toBeCloseTo(60, 1);
  });

  it("filters out invalid shapes", () => {
    const shapes: ShapeInput[] = [
      createSquareShape(100),
      {
        points: [{ x: 0, y: 0 }], // Invalid - only 1 point
        holes: [],
      },
    ];

    const result = expandShapesForContour(shapes, 5);
    expect(result).toHaveLength(1);
  });
});

describe("contour uniform expansion verification", () => {
  it("provides uniform expansion in X and Y", () => {
    const shape = createSquareShape(100);
    const contourWidth = 5;

    const result = expandShape(shape, contourWidth);
    expect(result).not.toBeNull();

    const originalBounds = getBounds(shape.points);
    const expandedBounds = getBounds(result!.points);

    const xExpansion = (expandedBounds.width - originalBounds.width) / 2;
    const yExpansion = (expandedBounds.height - originalBounds.height) / 2;

    // Both should be close to contourWidth
    expect(xExpansion).toBeCloseTo(contourWidth, 1);
    expect(yExpansion).toBeCloseTo(contourWidth, 1);

    console.log(`Contour width: ${contourWidth}`);
    console.log(`X expansion: ${xExpansion.toFixed(2)}`);
    console.log(`Y expansion: ${yExpansion.toFixed(2)}`);
  });
});

describe("shrinkShape", () => {
  it("returns same shape for zero distance", () => {
    const shape = createSquareShape(100);
    const result = shrinkShape(shape, 0);

    expect(result).toBe(shape);
  });

  it("returns null for insufficient points", () => {
    const shape: ShapeInput = {
      points: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      holes: [],
    };

    const result = shrinkShape(shape, 5);
    expect(result).toBeNull();
  });

  it("shrinks outer contour by correct amount", () => {
    const shape = createSquareShape(100);
    const shrinkDistance = 10;

    const result = shrinkShape(shape, shrinkDistance);
    expect(result).not.toBeNull();

    const originalBounds = getBounds(shape.points);
    const shrunkBounds = getBounds(result!.points);

    // Width and height should decrease by 2 * shrinkDistance
    expect(shrunkBounds.width).toBeCloseTo(originalBounds.width - 2 * shrinkDistance, 1);
    expect(shrunkBounds.height).toBeCloseTo(originalBounds.height - 2 * shrinkDistance, 1);
  });

  it("expands holes when shrinking shape", () => {
    const shape = createSquareWithHole(100, 50);
    const shrinkDistance = 5;

    const result = shrinkShape(shape, shrinkDistance);
    expect(result).not.toBeNull();
    expect(result!.holes).toHaveLength(1);

    const originalHoleBounds = getBounds(shape.holes[0]);
    const shrunkHoleBounds = getBounds(result!.holes[0]);

    // Hole should expand by 2 * shrinkDistance (opposite of shrink)
    expect(shrunkHoleBounds.width).toBeCloseTo(originalHoleBounds.width + 2 * shrinkDistance, 1);
    expect(shrunkHoleBounds.height).toBeCloseTo(originalHoleBounds.height + 2 * shrinkDistance, 1);
  });

  it("is inverse of expandShape", () => {
    const shape = createSquareShape(100);
    const distance = 10;

    // Expand then shrink should give approximately original size
    const expanded = expandShape(shape, distance);
    expect(expanded).not.toBeNull();

    const shrunkBack = shrinkShape(expanded!, distance);
    expect(shrunkBack).not.toBeNull();

    const originalBounds = getBounds(shape.points);
    const roundTripBounds = getBounds(shrunkBack!.points);

    expect(roundTripBounds.width).toBeCloseTo(originalBounds.width, 1);
    expect(roundTripBounds.height).toBeCloseTo(originalBounds.height, 1);
  });

  it("handles extreme shrinking gracefully", () => {
    const shape = createSquareShape(20);
    const shrinkDistance = 15; // Shrinking by 15 on each side (30 total) would exceed size

    const result = shrinkShape(shape, shrinkDistance);

    if (result !== null && result.points.length >= 3) {
      // If a shape is returned, it should be very small or inverted
      const bounds = getBounds(result.points);
      // Bounds may be inverted or very small
      expect(bounds.width).toBeLessThan(shape.points[1].x);
    }
    // Either null or a degenerate shape is acceptable
  });
});

// =============================================================================
// Wall Thickness and Safe Bevel Width Tests
// =============================================================================

describe("calculateMinWallThickness", () => {
  it("returns shape width for shapes without holes", () => {
    const shape = createSquareShape(100);
    const thickness = calculateMinWallThickness(shape);

    // For a square without holes, min width should be close to 100
    expect(thickness).toBeGreaterThan(90);
    expect(thickness).toBeLessThanOrEqual(100);
  });

  it("calculates correct wall thickness for centered hole", () => {
    // Outer: 100x100, Hole: 60x60 centered → wall thickness = 20 on each side
    const shape = createSquareWithHole(100, 60);
    const thickness = calculateMinWallThickness(shape);

    // Wall thickness should be approximately 20 (distance from outer to hole)
    expect(thickness).toBeGreaterThan(15);
    expect(thickness).toBeLessThan(25);
  });

  it("calculates correct wall thickness for small hole", () => {
    // Outer: 100x100, Hole: 20x20 centered → wall thickness = 40 on each side
    const shape = createSquareWithHole(100, 20);
    const thickness = calculateMinWallThickness(shape);

    // Wall thickness should be approximately 40
    expect(thickness).toBeGreaterThan(35);
    expect(thickness).toBeLessThan(45);
  });

  it("handles narrow wall correctly", () => {
    // Outer: 100x100, Hole: 90x90 centered → wall thickness = 5 on each side
    const shape = createSquareWithHole(100, 90);
    const thickness = calculateMinWallThickness(shape);

    // Wall thickness should be approximately 5
    expect(thickness).toBeGreaterThan(3);
    expect(thickness).toBeLessThan(8);
  });
});

describe("calculateSafeBevelWidth", () => {
  it("returns requested width when wall is thick enough", () => {
    // Wall thickness = 20, requested bevel = 5
    // Safe max = 20/2 * 0.9 = 9, so 5 should be fine
    const shape = createSquareWithHole(100, 60);
    const safeWidth = calculateSafeBevelWidth(shape, 5);

    expect(safeWidth).toBe(5);
  });

  it("limits bevel width for narrow walls", () => {
    // Wall thickness ≈ 5, requested bevel = 10
    // Safe max = 5/2 * 0.9 = 2.25
    const shape = createSquareWithHole(100, 90);
    const safeWidth = calculateSafeBevelWidth(shape, 10);

    // Should be limited to less than half the wall thickness
    expect(safeWidth).toBeLessThan(5);
    expect(safeWidth).toBeGreaterThan(0);
  });

  it("returns requested width for shapes without holes", () => {
    const shape = createSquareShape(100);
    const safeWidth = calculateSafeBevelWidth(shape, 10);

    // No holes, so most widths should be safe
    expect(safeWidth).toBe(10);
  });

  it("ensures shrinkShape succeeds with safe width", () => {
    // This is the key integration test:
    // Using calculateSafeBevelWidth should always produce a width
    // that shrinkShape can handle
    const shape = createSquareWithHole(100, 90); // Very narrow wall
    const requestedWidth = 20; // Would definitely cause collision

    const safeWidth = calculateSafeBevelWidth(shape, requestedWidth);
    const shrunk = shrinkShape(shape, safeWidth);

    // With safe width, shrinkShape should succeed
    expect(shrunk).not.toBeNull();
    expect(shrunk!.points.length).toBeGreaterThanOrEqual(3);
    expect(shrunk!.holes.length).toBe(1); // Hole should be preserved
  });
});
