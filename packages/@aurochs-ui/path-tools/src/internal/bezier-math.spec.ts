/**
 * @file Bezier math utilities tests
 */

import { describe, it, expect } from "vitest";
import {
  lerp,
  lerpPoint,
  distance,
  vectorLength,
  normalizeVector,
  evaluateCubicBezier,
  evaluateCubicBezierDerivative,
  subdivideCubicBezier,
  cubicBezierBounds,
  nearestPointOnCubicBezier,
  constrainTo45Degrees,
  constrainVectorTo45Degrees,
  angleFromTo,
  areAnglesCollinear,
  mirrorHandle,
} from "./bezier-math";

describe("bezier-math", () => {
  describe("lerp", () => {
    it("returns a at t=0", () => {
      expect(lerp(10, 20, 0)).toBe(10);
    });

    it("returns b at t=1", () => {
      expect(lerp(10, 20, 1)).toBe(20);
    });

    it("returns midpoint at t=0.5", () => {
      expect(lerp(10, 20, 0.5)).toBe(15);
    });
  });

  describe("lerpPoint", () => {
    it("interpolates between two points", () => {
      const p0 = { x: 0, y: 0 };
      const p1 = { x: 10, y: 20 };
      const result = lerpPoint(p0, p1, 0.5);
      expect(result).toEqual({ x: 5, y: 10 });
    });
  });

  describe("distance", () => {
    it("calculates distance between two points", () => {
      const p0 = { x: 0, y: 0 };
      const p1 = { x: 3, y: 4 };
      expect(distance(p0, p1)).toBe(5);
    });

    it("returns 0 for same point", () => {
      const p = { x: 5, y: 5 };
      expect(distance(p, p)).toBe(0);
    });
  });

  describe("vectorLength", () => {
    it("calculates vector length", () => {
      expect(vectorLength(3, 4)).toBe(5);
    });

    it("returns 0 for zero vector", () => {
      expect(vectorLength(0, 0)).toBe(0);
    });
  });

  describe("normalizeVector", () => {
    it("normalizes a vector to unit length", () => {
      const result = normalizeVector(3, 4);
      expect(result.x).toBeCloseTo(0.6);
      expect(result.y).toBeCloseTo(0.8);
    });

    it("returns zero vector for zero input", () => {
      const result = normalizeVector(0, 0);
      expect(result).toEqual({ x: 0, y: 0 });
    });
  });

  describe("evaluateCubicBezier", () => {
    const p0 = { x: 0, y: 0 };
    const p1 = { x: 0, y: 100 };
    const p2 = { x: 100, y: 100 };
    const p3 = { x: 100, y: 0 };

    it("returns start point at t=0", () => {
      const result = evaluateCubicBezier({ p0, p1, p2, p3, t: 0 });
      expect(result.x).toBeCloseTo(0);
      expect(result.y).toBeCloseTo(0);
    });

    it("returns end point at t=1", () => {
      const result = evaluateCubicBezier({ p0, p1, p2, p3, t: 1 });
      expect(result.x).toBeCloseTo(100);
      expect(result.y).toBeCloseTo(0);
    });

    it("returns a point on the curve at t=0.5", () => {
      const result = evaluateCubicBezier({ p0, p1, p2, p3, t: 0.5 });
      expect(result.x).toBeCloseTo(50);
      expect(result.y).toBeCloseTo(75);
    });
  });

  describe("evaluateCubicBezierDerivative", () => {
    const p0 = { x: 0, y: 0 };
    const p1 = { x: 100, y: 0 };
    const p2 = { x: 100, y: 100 };
    const p3 = { x: 0, y: 100 };

    it("returns tangent vector at t=0", () => {
      const result = evaluateCubicBezierDerivative({ p0, p1, p2, p3, t: 0 });
      expect(result.x).toBe(300);
      expect(result.y).toBe(0);
    });
  });

  describe("subdivideCubicBezier", () => {
    const p0 = { x: 0, y: 0 };
    const p1 = { x: 0, y: 100 };
    const p2 = { x: 100, y: 100 };
    const p3 = { x: 100, y: 0 };

    it("subdivides at t=0.5", () => {
      const { left, right } = subdivideCubicBezier({ p0, p1, p2, p3, t: 0.5 });

      // Left segment starts at p0
      expect(left.start).toEqual(p0);
      // Right segment ends at p3
      expect(right.end).toEqual(p3);
      // They meet at the split point
      expect(left.end).toEqual(right.start);
    });
  });

  describe("cubicBezierBounds", () => {
    it("calculates bounding box for a simple curve", () => {
      const p0 = { x: 0, y: 0 };
      const p1 = { x: 50, y: 100 };
      const p2 = { x: 100, y: 100 };
      const p3 = { x: 100, y: 0 };

      const bounds = cubicBezierBounds({ p0, p1, p2, p3 });

      expect(bounds.x).toBe(0);
      expect(bounds.y).toBe(0);
      expect(bounds.width).toBe(100);
      expect(bounds.height).toBeGreaterThan(0);
    });
  });

  describe("nearestPointOnCubicBezier", () => {
    const p0 = { x: 0, y: 0 };
    const p1 = { x: 0, y: 100 };
    const p2 = { x: 100, y: 100 };
    const p3 = { x: 100, y: 0 };

    it("finds nearest point near the start", () => {
      const target = { x: -10, y: 0 };
      const result = nearestPointOnCubicBezier({ p0, p1, p2, p3, target });
      expect(result.t).toBeCloseTo(0, 1);
      expect(result.distance).toBeCloseTo(10, 0);
    });

    it("finds nearest point near the end", () => {
      const target = { x: 110, y: 0 };
      const result = nearestPointOnCubicBezier({ p0, p1, p2, p3, target });
      expect(result.t).toBeCloseTo(1, 1);
      expect(result.distance).toBeCloseTo(10, 0);
    });
  });

  describe("constrainTo45Degrees", () => {
    it("constrains 0 to 0", () => {
      expect(constrainTo45Degrees(0)).toBeCloseTo(0);
    });

    it("constrains 30 degrees to 45 degrees", () => {
      const input = (30 * Math.PI) / 180;
      const expected = Math.PI / 4; // 45 degrees
      expect(constrainTo45Degrees(input)).toBeCloseTo(expected);
    });

    it("constrains 80 degrees to 90 degrees", () => {
      const input = (80 * Math.PI) / 180;
      const expected = Math.PI / 2; // 90 degrees
      expect(constrainTo45Degrees(input)).toBeCloseTo(expected);
    });
  });

  describe("constrainVectorTo45Degrees", () => {
    it("preserves length while constraining direction", () => {
      const { dx, dy } = constrainVectorTo45Degrees(10, 0);
      expect(vectorLength(dx, dy)).toBeCloseTo(10);
    });

    it("returns zero for zero vector", () => {
      const result = constrainVectorTo45Degrees(0, 0);
      expect(result).toEqual({ dx: 0, dy: 0 });
    });
  });

  describe("angleFromTo", () => {
    it("calculates angle to the right", () => {
      const from = { x: 0, y: 0 };
      const to = { x: 10, y: 0 };
      expect(angleFromTo(from, to)).toBeCloseTo(0);
    });

    it("calculates angle upward", () => {
      const from = { x: 0, y: 0 };
      const to = { x: 0, y: 10 };
      expect(angleFromTo(from, to)).toBeCloseTo(Math.PI / 2);
    });
  });

  describe("areAnglesCollinear", () => {
    it("returns true for opposite angles", () => {
      expect(areAnglesCollinear(0, Math.PI)).toBe(true);
    });

    it("returns false for perpendicular angles", () => {
      expect(areAnglesCollinear(0, Math.PI / 2)).toBe(false);
    });
  });

  describe("mirrorHandle", () => {
    it("mirrors a handle across the anchor", () => {
      const anchor = { x: 50, y: 50 };
      const handle = { x: 60, y: 50 };
      const result = mirrorHandle(anchor, handle);
      expect(result).toEqual({ x: 40, y: 50 });
    });

    it("handles diagonal mirroring", () => {
      const anchor = { x: 0, y: 0 };
      const handle = { x: 10, y: 10 };
      const result = mirrorHandle(anchor, handle);
      expect(result).toEqual({ x: -10, y: -10 });
    });
  });
});
