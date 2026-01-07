/**
 * @file Tests for bevel path extraction (Three.js independent)
 */

import { describe, it, expect } from "vitest";
import {
  computeSignedArea,
  extractPathPointsWithNormals,
  extractBevelPathsFromShape,
} from "./path-extraction";
import type { Vector2, ShapeInput } from "./types";
import { vec2, Vec2 } from "./types";

describe("computeSignedArea", () => {
  it("returns positive for CCW square", () => {
    const ccwSquare: Vector2[] = [
      vec2(0, 0),
      vec2(1, 0),
      vec2(1, 1),
      vec2(0, 1),
    ];
    expect(computeSignedArea(ccwSquare)).toBe(1);
  });

  it("returns negative for CW square", () => {
    const cwSquare: Vector2[] = [
      vec2(0, 0),
      vec2(0, 1),
      vec2(1, 1),
      vec2(1, 0),
    ];
    expect(computeSignedArea(cwSquare)).toBe(-1);
  });

  it("returns 0 for degenerate polygon", () => {
    const line: Vector2[] = [
      vec2(0, 0),
      vec2(1, 0),
      vec2(2, 0),
    ];
    expect(computeSignedArea(line)).toBe(0);
  });

  it("calculates correct area for triangle", () => {
    const triangle: Vector2[] = [
      vec2(0, 0),
      vec2(2, 0),
      vec2(1, 1),
    ];
    // Area = 0.5 * base * height = 0.5 * 2 * 1 = 1
    expect(computeSignedArea(triangle)).toBe(1);
  });
});

describe("extractPathPointsWithNormals", () => {
  describe("outer contour (CCW winding)", () => {
    it("returns empty for less than 3 points", () => {
      expect(extractPathPointsWithNormals([], false)).toEqual([]);
      expect(extractPathPointsWithNormals([vec2(0, 0)], false)).toEqual([]);
      expect(extractPathPointsWithNormals([vec2(0, 0), vec2(1, 0)], false)).toEqual([]);
    });

    it("extracts points with inward normals for CCW square", () => {
      const ccwSquare: Vector2[] = [
        vec2(0, 0),
        vec2(1, 0),
        vec2(1, 1),
        vec2(0, 1),
      ];

      const result = extractPathPointsWithNormals(ccwSquare, false);

      expect(result).toHaveLength(4);

      // Verify positions match input
      expect(result[0].position).toEqual(vec2(0, 0));
      expect(result[1].position).toEqual(vec2(1, 0));
      expect(result[2].position).toEqual(vec2(1, 1));
      expect(result[3].position).toEqual(vec2(0, 1));

      // Verify normals point inward
      // Bottom-left corner: normal should point toward interior (roughly +x, +y)
      expect(result[0].normal.x).toBeGreaterThan(0);
      expect(result[0].normal.y).toBeGreaterThan(0);

      // Bottom-right corner: normal should point toward interior (roughly -x, +y)
      expect(result[1].normal.x).toBeLessThan(0);
      expect(result[1].normal.y).toBeGreaterThan(0);
    });

    it("handles CW winding by flipping normals", () => {
      const cwSquare: Vector2[] = [
        vec2(0, 0),
        vec2(0, 1),
        vec2(1, 1),
        vec2(1, 0),
      ];

      const result = extractPathPointsWithNormals(cwSquare, false);

      expect(result).toHaveLength(4);

      // Normals should still point inward
      // Bottom-left corner (first point): normal should point inward
      expect(result[0].normal.x).toBeGreaterThan(0);
      expect(result[0].normal.y).toBeGreaterThan(0);
    });
  });

  describe("hole (should have outward normals from hole center)", () => {
    it("extracts points with normals pointing away from hole center", () => {
      // A hole typically has CW winding
      const cwHole: Vector2[] = [
        vec2(0.25, 0.25),
        vec2(0.25, 0.75),
        vec2(0.75, 0.75),
        vec2(0.75, 0.25),
      ];

      const result = extractPathPointsWithNormals(cwHole, true);

      expect(result).toHaveLength(4);

      // For a hole, "inward" means toward the shape interior (outward from hole center)
      // Bottom-left of hole: normal should point away from hole center (roughly -x, -y)
      expect(result[0].normal.x).toBeLessThan(0);
      expect(result[0].normal.y).toBeLessThan(0);
    });
  });

  describe("edge cases", () => {
    it("handles collinear points gracefully", () => {
      // Triangle where one edge is very short
      const triangle: Vector2[] = [
        vec2(0, 0),
        vec2(1, 0),
        vec2(0.5, 0.001), // Almost collinear
      ];

      const result = extractPathPointsWithNormals(triangle, false);
      expect(result).toHaveLength(3);

      // Should not produce NaN or Infinity
      for (const point of result) {
        expect(Number.isFinite(point.normal.x)).toBe(true);
        expect(Number.isFinite(point.normal.y)).toBe(true);
      }
    });

    it("handles very small polygon", () => {
      const tiny: Vector2[] = [
        vec2(0, 0),
        vec2(0.001, 0),
        vec2(0.0005, 0.001),
      ];

      const result = extractPathPointsWithNormals(tiny, false);
      expect(result).toHaveLength(3);
    });
  });
});

describe("extractBevelPathsFromShape", () => {
  it("extracts outer contour only when no holes", () => {
    const shape: ShapeInput = {
      points: [
        vec2(0, 0),
        vec2(10, 0),
        vec2(10, 10),
        vec2(0, 10),
      ],
      holes: [],
    };

    const paths = extractBevelPathsFromShape(shape);

    expect(paths).toHaveLength(1);
    expect(paths[0].isHole).toBe(false);
    expect(paths[0].isClosed).toBe(true);
    expect(paths[0].points).toHaveLength(4);
  });

  it("extracts outer contour and holes", () => {
    const shape: ShapeInput = {
      points: [
        vec2(0, 0),
        vec2(10, 0),
        vec2(10, 10),
        vec2(0, 10),
      ],
      holes: [
        [
          vec2(2, 2),
          vec2(2, 4),
          vec2(4, 4),
          vec2(4, 2),
        ],
        [
          vec2(6, 6),
          vec2(6, 8),
          vec2(8, 8),
          vec2(8, 6),
        ],
      ],
    };

    const paths = extractBevelPathsFromShape(shape);

    expect(paths).toHaveLength(3);
    expect(paths[0].isHole).toBe(false);
    expect(paths[1].isHole).toBe(true);
    expect(paths[2].isHole).toBe(true);
  });

  it("skips contours with less than 3 points", () => {
    const shape: ShapeInput = {
      points: [
        vec2(0, 0),
        vec2(10, 0),
      ],
      holes: [],
    };

    const paths = extractBevelPathsFromShape(shape);
    expect(paths).toHaveLength(0);
  });

  it("skips holes with less than 3 points", () => {
    const shape: ShapeInput = {
      points: [
        vec2(0, 0),
        vec2(10, 0),
        vec2(10, 10),
        vec2(0, 10),
      ],
      holes: [
        [vec2(2, 2), vec2(4, 4)], // Only 2 points
      ],
    };

    const paths = extractBevelPathsFromShape(shape);

    expect(paths).toHaveLength(1);
    expect(paths[0].isHole).toBe(false);
  });
});
