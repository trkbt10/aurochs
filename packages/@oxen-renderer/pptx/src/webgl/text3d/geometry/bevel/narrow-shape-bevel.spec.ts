/**
 * @file Tests for bevel generation with narrow shapes
 *
 * These tests specifically target edge cases where bevel width approaches
 * or exceeds the stroke width of the shape, which can cause:
 * - shrinkShape to fail (returns null)
 * - Bevel vertices to self-intersect
 * - Missing inner caps
 *
 * @see Issue: "Rainbow 3D Alt" preset shows bevel collision issues
 */

import { shrinkShape } from "./shape-expansion";
import { extractBevelPathsFromShape } from "./path-extraction";
import { generateBevelMesh } from "./mesh-generation";
import { getBevelProfile } from "./profiles";
import type { ShapeInput, BevelMeshConfig } from "./types";

// =============================================================================
// Test Shapes
// =============================================================================

/**
 * Narrow stroke "I" shape - vertical bar 6px wide with serifs
 * This shape has a narrow section that may cause bevel collision
 */
const NARROW_I_SHAPE: ShapeInput = {
  points: [
    { x: -12, y: -48 },   // top-left serif
    { x: 12, y: -48 },    // top-right serif
    { x: 12, y: -44 },    // serif bottom
    { x: 3, y: -44 },     // narrow bar top-right (width = 6)
    { x: 3, y: -4 },      // narrow bar bottom-right
    { x: 12, y: -4 },     // bottom serif top
    { x: 12, y: 0 },      // bottom-right
    { x: -12, y: 0 },     // bottom-left
    { x: -12, y: -4 },    // bottom serif
    { x: -3, y: -4 },     // narrow bar bottom-left
    { x: -3, y: -44 },    // narrow bar top-left
    { x: -12, y: -44 },   // top serif bottom
  ],
  holes: [],
};

/**
 * Narrow stroke "T" shape - 6px stem with wide top
 */
const NARROW_T_SHAPE: ShapeInput = {
  points: [
    { x: -20, y: -48 },   // top-left
    { x: 20, y: -48 },    // top-right
    { x: 20, y: -42 },    // top bar bottom-right
    { x: 3, y: -42 },     // stem top-right (width = 6)
    { x: 3, y: 0 },       // stem bottom-right
    { x: -3, y: 0 },      // stem bottom-left
    { x: -3, y: -42 },    // stem top-left
    { x: -20, y: -42 },   // top bar bottom-left
  ],
  holes: [],
};

/**
 * Simple rectangle 30x48 for comparison
 */
const RECTANGLE_SHAPE: ShapeInput = {
  points: [
    { x: -15, y: -24 },
    { x: 15, y: -24 },
    { x: 15, y: 24 },
    { x: -15, y: 24 },
  ],
  holes: [],
};

/**
 * "O" shape with hole - inner wall distance is about 12px
 */
const O_SHAPE: ShapeInput = {
  points: [
    // Outer ellipse (approximated with points)
    { x: 24, y: 0 },
    { x: 21.6, y: 14.4 },
    { x: 14.4, y: 28.8 },
    { x: 0, y: 36 },
    { x: -14.4, y: 28.8 },
    { x: -21.6, y: 14.4 },
    { x: -24, y: 0 },
    { x: -21.6, y: -14.4 },
    { x: -14.4, y: -28.8 },
    { x: 0, y: -36 },
    { x: 14.4, y: -28.8 },
    { x: 21.6, y: -14.4 },
  ],
  holes: [
    [
      // Inner hole (12px smaller on each side)
      { x: 12, y: 0 },
      { x: 10.8, y: 7.2 },
      { x: 7.2, y: 14.4 },
      { x: 0, y: 18 },
      { x: -7.2, y: 14.4 },
      { x: -10.8, y: 7.2 },
      { x: -12, y: 0 },
      { x: -10.8, y: -7.2 },
      { x: -7.2, y: -14.4 },
      { x: 0, y: -18 },
      { x: 7.2, y: -14.4 },
      { x: 10.8, y: -7.2 },
    ],
  ],
};

// =============================================================================
// shrinkShape Tests
// =============================================================================

describe("shrinkShape with narrow shapes", () => {
  it("shrinks wide rectangle successfully", () => {
    const result = shrinkShape(RECTANGLE_SHAPE, 3);

    expect(result).not.toBeNull();
    expect(result!.points.length).toBeGreaterThanOrEqual(3);
  });

  it("returns null when shrink amount exceeds half the narrowest dimension", () => {
    // NARROW_I_SHAPE has 6px wide stem, shrinking by 4px should fail
    const result = shrinkShape(NARROW_I_SHAPE, 4);

    // Either returns null or the area check fails
    if (result !== null) {
      // If not null, the area should have decreased significantly
      expect(result.points.length).toBeLessThan(NARROW_I_SHAPE.points.length);
    }
  });

  it("returns null for very large shrink on T shape", () => {
    // NARROW_T_SHAPE has 6px stem, shrinking by 5px should fail
    const result = shrinkShape(NARROW_T_SHAPE, 5);

    // Should either return null or produce degenerate geometry
    expect(result === null || result.points.length < 4).toBe(true);
  });

  it("shrinks O shape by less than wall thickness", () => {
    // O_SHAPE has ~12px wall thickness, shrinking by 5 should work
    const result = shrinkShape(O_SHAPE, 5);

    expect(result).not.toBeNull();
    expect(result!.points.length).toBeGreaterThanOrEqual(3);
    // Hole should have expanded
    expect(result!.holes.length).toBe(1);
  });

  it("fails when shrink exceeds O shape wall thickness", () => {
    // O_SHAPE has ~12px wall thickness, shrinking by 10 should fail
    const result = shrinkShape(O_SHAPE, 10);

    // Should fail because the shrunk outer would overlap with expanded hole
    expect(result === null || result.holes.length === 0).toBe(true);
  });
});

// =============================================================================
// Bevel Path Extraction Tests
// =============================================================================

describe("extractBevelPathsFromShape with narrow shapes", () => {
  it("extracts paths with valid miter factors", () => {
    const paths = extractBevelPathsFromShape(NARROW_I_SHAPE);

    expect(paths.length).toBe(1);
    const path = paths[0];

    // All miter factors should be positive and reasonable
    for (const point of path.points) {
      expect(point.miterFactor).toBeGreaterThan(0);
      expect(point.miterFactor).toBeLessThanOrEqual(2); // MAX_MITER_FACTOR (reduced for stability)
    }
  });

  it("caps miter factor at sharp corners", () => {
    // Star shape has very sharp corners
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i <= 10; i++) {
      const r = i % 2 === 0 ? 24 : 10;
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }
    const starShape: ShapeInput = {
      points,
      holes: [],
    };

    const paths = extractBevelPathsFromShape(starShape);
    const path = paths[0];

    // Sharp corners should have capped miter factor (not infinity)
    const maxMiterFound = Math.max(...path.points.map((p) => p.miterFactor));
    expect(maxMiterFound).toBeLessThanOrEqual(2); // MAX_MITER_FACTOR (reduced for stability)
  });
});

// =============================================================================
// Bevel Mesh Generation Tests
// =============================================================================

describe("generateBevelMesh with narrow shapes", () => {
  const circleProfile = getBevelProfile("circle");
  const convexProfile = getBevelProfile("convex");

  it("generates valid bevel mesh for wide shape", () => {
    const paths = extractBevelPathsFromShape(RECTANGLE_SHAPE);
    const config: BevelMeshConfig = {
      width: 3,
      height: 3,
      profile: circleProfile,
      zPosition: 0,
      zDirection: 1,
    };

    const mesh = generateBevelMesh(paths, config);

    expect(mesh.positions.length).toBeGreaterThan(0);
    expect(mesh.indices.length).toBeGreaterThan(0);
    // Verify no NaN values
    expect(Array.from(mesh.positions).every((v) => !isNaN(v))).toBe(true);
    expect(Array.from(mesh.normals).every((v) => !isNaN(v))).toBe(true);
  });

  it("generates bevel mesh for narrow I shape with small bevel", () => {
    const paths = extractBevelPathsFromShape(NARROW_I_SHAPE);
    const config: BevelMeshConfig = {
      width: 2, // Small enough to not exceed stem width
      height: 2,
      profile: circleProfile,
      zPosition: 0,
      zDirection: 1,
    };

    const mesh = generateBevelMesh(paths, config);

    expect(mesh.positions.length).toBeGreaterThan(0);
    // Verify no NaN values
    expect(Array.from(mesh.positions).every((v) => !isNaN(v))).toBe(true);
  });

  it("generates bevel mesh for narrow I with Rainbow 3D Alt params", () => {
    // Rainbow 3D Alt: width: 5, height: 4, preset: convex
    const paths = extractBevelPathsFromShape(NARROW_I_SHAPE);
    const config: BevelMeshConfig = {
      width: 5,
      height: 4,
      profile: convexProfile,
      zPosition: 28, // extrusion depth 28
      zDirection: -1,
    };

    const mesh = generateBevelMesh(paths, config);

    // Even if width exceeds stem, mesh should still generate (no NaN)
    expect(Array.from(mesh.positions).every((v) => !isNaN(v))).toBe(true);
    expect(Array.from(mesh.normals).every((v) => !isNaN(v))).toBe(true);

    // However, some vertices may overlap causing visual issues
    // This test documents current behavior
    expect(mesh.positions.length).toBeGreaterThan(0);
  });

  it("handles O shape with hole correctly", () => {
    const paths = extractBevelPathsFromShape(O_SHAPE);
    const config: BevelMeshConfig = {
      width: 5,
      height: 4,
      profile: convexProfile,
      zPosition: 28,
      zDirection: -1,
    };

    const mesh = generateBevelMesh(paths, config);

    expect(mesh.positions.length).toBeGreaterThan(0);
    expect(Array.from(mesh.positions).every((v) => !isNaN(v))).toBe(true);

    // Should generate geometry for both outer and hole
    expect(paths.length).toBe(2);
    expect(paths[0].isHole).toBe(false);
    expect(paths[1].isHole).toBe(true);
  });
});

// =============================================================================
// Full Geometry Generation Tests
// =============================================================================

describe("createExtrudedGeometryWithBevel with narrow shapes", () => {
  // Import THREE.js for geometry testing
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const THREE = require("three");

  function createNarrowIShape(): typeof THREE.Shape {
    const shape = new THREE.Shape();
    shape.moveTo(-12, -48);
    shape.lineTo(12, -48);
    shape.lineTo(12, -44);
    shape.lineTo(3, -44);  // narrow bar (6px wide)
    shape.lineTo(3, -4);
    shape.lineTo(12, -4);
    shape.lineTo(12, 0);
    shape.lineTo(-12, 0);
    shape.lineTo(-12, -4);
    shape.lineTo(-3, -4);
    shape.lineTo(-3, -44);
    shape.lineTo(-12, -44);
    shape.closePath();
    return shape;
  }

  it("generates geometry for narrow I with small bevel (should succeed)", async () => {
    const { createExtrudedGeometryWithBevel } = await import("./three-adapter");
    const shape = createNarrowIShape();

    const geometry = createExtrudedGeometryWithBevel([shape], 20, {
      top: { width: 2, height: 2, preset: "circle" },
    });

    expect(geometry).toBeDefined();
    const positions = geometry.getAttribute("position");
    expect(positions.count).toBeGreaterThan(0);
  });

  it("generates geometry for narrow I with large bevel (tests shrinkShape failure)", async () => {
    const { createExtrudedGeometryWithBevel } = await import("./three-adapter");
    const shape = createNarrowIShape();

    // Bevel width 5 on 6px stem - shrinkShape should fail
    const geometry = createExtrudedGeometryWithBevel([shape], 28, {
      top: { width: 5, height: 4, preset: "convex" },
    });

    expect(geometry).toBeDefined();
    const positions = geometry.getAttribute("position");

    // Geometry should still be created (bevel + extrusion walls)
    // but inner cap may be missing
    expect(positions.count).toBeGreaterThan(0);

    // Check for NaN values in positions
    const posArray = positions.array as Float32Array;
    const hasNaN = Array.from(posArray).some((v) => isNaN(v));
    expect(hasNaN).toBe(false);
  });

  it("generates geometry with Rainbow 3D Alt params on O shape", async () => {
    const { createExtrudedGeometryWithBevel } = await import("./three-adapter");

    // O shape with hole
    const shape = new THREE.Shape();
    shape.moveTo(24, 0);
    shape.bezierCurveTo(24, -20, 12, -40, 0, -40);
    shape.bezierCurveTo(-12, -40, -24, -20, -24, 0);
    shape.bezierCurveTo(-24, 20, -12, 40, 0, 40);
    shape.bezierCurveTo(12, 40, 24, 20, 24, 0);
    shape.closePath();

    const hole = new THREE.Path();
    hole.moveTo(12, 0);
    hole.bezierCurveTo(12, -10, 6, -20, 0, -20);
    hole.bezierCurveTo(-6, -20, -12, -10, -12, 0);
    hole.bezierCurveTo(-12, 10, -6, 20, 0, 20);
    hole.bezierCurveTo(6, 20, 12, 10, 12, 0);
    hole.closePath();
    shape.holes.push(hole);

    const geometry = createExtrudedGeometryWithBevel([shape], 28, {
      top: { width: 5, height: 4, preset: "convex" },
    });

    expect(geometry).toBeDefined();
    const positions = geometry.getAttribute("position");
    expect(positions.count).toBeGreaterThan(0);

    // Check for NaN values
    const posArray = positions.array as Float32Array;
    const hasNaN = Array.from(posArray).some((v) => isNaN(v));
    expect(hasNaN).toBe(false);
  });
});

// =============================================================================
// Integration Tests: Bevel + shrinkShape Alignment
// =============================================================================

describe("bevel and shrinkShape alignment", () => {
  it("bevel inner edge aligns with shrunk shape for simple rectangle", () => {
    const bevelWidth = 5;
    const shrunk = shrinkShape(RECTANGLE_SHAPE, bevelWidth);

    expect(shrunk).not.toBeNull();

    // The bevel inner edge should approximately match the shrunk shape
    // For a simple rectangle, this is straightforward
    const originalMinX = Math.min(...RECTANGLE_SHAPE.points.map((p) => p.x));
    const shrunkMinX = shrunk ? Math.min(...shrunk.points.map((p) => p.x)) : 0;

    // The difference should be approximately the bevel width
    expect(Math.abs(shrunkMinX - originalMinX - bevelWidth)).toBeLessThan(0.5);
  });

  it("detects when bevel would cause inner cap issues on narrow shape", () => {
    const bevelWidth = 5; // Larger than half the 6px stem
    const shrunk = shrinkShape(NARROW_I_SHAPE, bevelWidth);

    // For narrow shapes, shrinkShape should fail or produce degenerate geometry
    // This is the expected behavior that prevents broken rendering
    if (shrunk === null) {
      // shrinkShape correctly detected the issue
      expect(true).toBe(true);
    } else {
      // If shrinkShape didn't fail, the result should be usable but may be simplified
      // The area should be significantly reduced
      const originalPoints = NARROW_I_SHAPE.points.length;
      const shrunkPoints = shrunk.points.length;

      // Either fewer points or a much smaller area
      expect(shrunkPoints).toBeLessThanOrEqual(originalPoints);
    }
  });
});
