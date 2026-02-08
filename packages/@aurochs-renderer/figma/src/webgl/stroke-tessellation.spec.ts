import { describe, it, expect } from "vitest";
import {
  tessellateRectStroke,
  tessellateEllipseStroke,
  tessellatePathStroke,
} from "./stroke-tessellation";
import type { PathContour } from "../scene-graph/types";

describe("tessellateRectStroke", () => {
  it("produces triangles for a simple rectangle", () => {
    const verts = tessellateRectStroke(100, 80, 0, 2);
    // Should produce non-empty triangle data (multiples of 6 floats = 3 vertices * 2 coords)
    expect(verts.length).toBeGreaterThan(0);
    expect(verts.length % 6).toBe(0);
  });

  it("produces triangles for a rounded rectangle", () => {
    const verts = tessellateRectStroke(100, 80, 10, 2);
    expect(verts.length).toBeGreaterThan(0);
    expect(verts.length % 6).toBe(0);
  });

  it("handles zero stroke width", () => {
    const verts = tessellateRectStroke(100, 80, 0, 0);
    // Zero-width stroke should produce degenerate (empty or zero-area) geometry
    // Inner rect equals outer rect, so the ring has no area
    expect(verts.length).toBe(0);
  });

  it("handles stroke wider than shape", () => {
    // Stroke width 200 > shape width 100 → inner rect has negative dimensions
    const verts = tessellateRectStroke(100, 80, 0, 200);
    // Should still produce geometry (fills the outer shape)
    expect(verts.length).toBeGreaterThan(0);
  });

  it("vertices are within expected bounds", () => {
    const w = 100;
    const h = 80;
    const sw = 4;
    const hw = sw / 2;
    const verts = tessellateRectStroke(w, h, 0, sw);

    for (let i = 0; i < verts.length; i += 2) {
      expect(verts[i]).toBeGreaterThanOrEqual(-hw - 0.01);
      expect(verts[i]).toBeLessThanOrEqual(w + hw + 0.01);
      expect(verts[i + 1]).toBeGreaterThanOrEqual(-hw - 0.01);
      expect(verts[i + 1]).toBeLessThanOrEqual(h + hw + 0.01);
    }
  });
});

describe("tessellateEllipseStroke", () => {
  it("produces triangles for an ellipse stroke", () => {
    const verts = tessellateEllipseStroke(50, 40, 30, 20, 2);
    expect(verts.length).toBeGreaterThan(0);
    expect(verts.length % 6).toBe(0);
  });

  it("handles zero stroke width", () => {
    const verts = tessellateEllipseStroke(50, 40, 30, 20, 0);
    expect(verts.length).toBe(0);
  });

  it("handles stroke wider than ellipse radii", () => {
    // Stroke width 100 > rx=30 → inner radii become 0
    const verts = tessellateEllipseStroke(50, 40, 30, 20, 100);
    expect(verts.length).toBeGreaterThan(0);
  });
});

describe("tessellatePathStroke", () => {
  it("produces triangles for a simple path", () => {
    const contour: PathContour = {
      commands: [
        { type: "M", x: 0, y: 0 },
        { type: "L", x: 100, y: 0 },
        { type: "L", x: 100, y: 80 },
        { type: "L", x: 0, y: 80 },
        { type: "Z" },
      ],
      windingRule: "nonzero",
    };

    const verts = tessellatePathStroke([contour], 2);
    expect(verts.length).toBeGreaterThan(0);
    expect(verts.length % 6).toBe(0);
  });

  it("returns empty for too-short path", () => {
    const contour: PathContour = {
      commands: [{ type: "M", x: 0, y: 0 }],
      windingRule: "nonzero",
    };

    const verts = tessellatePathStroke([contour], 2);
    expect(verts.length).toBe(0);
  });

  it("handles multiple contours", () => {
    const contours: PathContour[] = [
      {
        commands: [
          { type: "M", x: 0, y: 0 },
          { type: "L", x: 50, y: 0 },
          { type: "L", x: 50, y: 50 },
          { type: "Z" },
        ],
        windingRule: "nonzero",
      },
      {
        commands: [
          { type: "M", x: 100, y: 100 },
          { type: "L", x: 150, y: 100 },
          { type: "L", x: 150, y: 150 },
          { type: "Z" },
        ],
        windingRule: "nonzero",
      },
    ];

    const verts = tessellatePathStroke(contours, 2);
    expect(verts.length).toBeGreaterThan(0);
  });

  it("handles curved path", () => {
    const contour: PathContour = {
      commands: [
        { type: "M", x: 0, y: 0 },
        { type: "C", x1: 30, y1: 0, x2: 50, y2: 20, x: 50, y: 50 },
        { type: "L", x: 0, y: 50 },
        { type: "Z" },
      ],
      windingRule: "nonzero",
    };

    const verts = tessellatePathStroke([contour], 3);
    expect(verts.length).toBeGreaterThan(0);
  });
});
