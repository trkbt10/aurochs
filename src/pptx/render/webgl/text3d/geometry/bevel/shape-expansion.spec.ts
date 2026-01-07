/**
 * @file Tests for shape-expansion.ts
 */

import { describe, it, expect } from "vitest";
import { expandShape, expandShapesForContour } from "./shape-expansion";
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
