/**
 * @file Unit tests for the strokeGeometry → centerline reconstructor.
 */

import { describe, expect, it } from "vitest";
import { reconstructStrokeCenterline } from "./stroke-geometry-centerline";
import type { DecodedContour } from "./path";

/**
 * Fixture: a single 1px-wide horizontal stroke from (0,0) to (10,0). The
 * pre-expanded outline is the closed 6-vertex contour:
 *
 *   M (0,0) → A
 *   L (0,-0.5) → A+p
 *   L (10,-0.5) → B+p
 *   L (10,0) → B
 *   L (10,0.5) → B-p
 *   L (0,0.5) → A-p
 *   L (0,0) → A (close)
 */
const horizontalStroke: DecodedContour = {
  commands: [
    { type: "M", x: 0, y: 0 },
    { type: "L", x: 0, y: -0.5 },
    { type: "L", x: 10, y: -0.5 },
    { type: "L", x: 10, y: 0 },
    { type: "L", x: 10, y: 0.5 },
    { type: "L", x: 0, y: 0.5 },
    { type: "L", x: 0, y: 0 },
  ],
  windingRule: "nonzero",
};

describe("reconstructStrokeCenterline", () => {
  it("rebuilds a single-segment centerline from a 6-vertex stroke contour", () => {
    const result = reconstructStrokeCenterline([horizontalStroke], 1);
    expect(result).toBeDefined();
    expect(result).toHaveLength(1);
    const cmds = result![0].commands;
    expect(cmds).toHaveLength(2);
    expect(cmds[0]).toMatchObject({ type: "M", x: 0, y: 0 });
    expect(cmds[1]).toMatchObject({ type: "L", x: 10, y: 0 });
  });

  it("chains two segments sharing an endpoint into a 3-vertex polyline", () => {
    // Chevron-like: (0,0) → (10,10) → (0,20). Each segment is a 6-vertex
    // closed outline rectangle of width 1 (perpendicular offset 0.5/√2).
    const r = 0.5 / Math.SQRT2;
    const seg1: DecodedContour = {
      commands: [
        { type: "M", x: 0, y: 0 },
        { type: "L", x: r, y: -r },
        { type: "L", x: 10 + r, y: 10 - r },
        { type: "L", x: 10, y: 10 },
        { type: "L", x: 10 - r, y: 10 + r },
        { type: "L", x: -r, y: r },
        { type: "L", x: 0, y: 0 },
      ],
      windingRule: "nonzero",
    };
    const seg2: DecodedContour = {
      commands: [
        { type: "M", x: 10, y: 10 },
        { type: "L", x: 10 + r, y: 10 + r },
        { type: "L", x: r, y: 20 + r },
        { type: "L", x: 0, y: 20 },
        { type: "L", x: -r, y: 20 - r },
        { type: "L", x: 10 - r, y: 10 - r },
        { type: "L", x: 10, y: 10 },
      ],
      windingRule: "nonzero",
    };

    const result = reconstructStrokeCenterline([seg1, seg2], 1);
    expect(result).toBeDefined();
    expect(result).toHaveLength(1);
    const pts = result![0].commands;
    expect(pts).toHaveLength(3);
    const xs = pts.map((p) => "x" in p ? p.x : NaN).sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(0, 6);
    expect(xs[1]).toBeCloseTo(0, 6);
    expect(xs[2]).toBeCloseTo(10, 6);
  });

  it("rejects shapes that do not match the rectangular-stroke pattern", () => {
    // A regular triangle is not a valid stroke outline.
    const triangle: DecodedContour = {
      commands: [
        { type: "M", x: 0, y: 0 },
        { type: "L", x: 10, y: 0 },
        { type: "L", x: 5, y: 8.66 },
        { type: "L", x: 0, y: 0 },
      ],
      windingRule: "nonzero",
    };
    expect(reconstructStrokeCenterline([triangle], 1)).toBeUndefined();
  });

  it("rejects a 6-vertex contour whose corners are not at half-width offsets", () => {
    const wrongWidth: DecodedContour = {
      commands: [
        { type: "M", x: 0, y: 0 },
        { type: "L", x: 0, y: -2 },
        { type: "L", x: 10, y: -2 },
        { type: "L", x: 10, y: 0 },
        { type: "L", x: 10, y: 2 },
        { type: "L", x: 0, y: 2 },
        { type: "L", x: 0, y: 0 },
      ],
      windingRule: "nonzero",
    };
    expect(reconstructStrokeCenterline([wrongWidth], 1)).toBeUndefined();
  });

  it("returns undefined for empty input", () => {
    expect(reconstructStrokeCenterline([], 1)).toBeUndefined();
  });

  it("returns undefined when stroke weight is zero or negative", () => {
    expect(reconstructStrokeCenterline([horizontalStroke], 0)).toBeUndefined();
    expect(reconstructStrokeCenterline([horizontalStroke], -1)).toBeUndefined();
  });
});
