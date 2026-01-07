/**
 * @file Tests for Custom Bevel Geometry Generation
 *
 * Tests the high-level Three.js API for ECMA-376 compliant bevel generation.
 * Core bevel logic tests are in the ./bevel/ module tests.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.9 (ST_BevelPresetType)
 */

import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  createCustomBevelGeometry,
  getBevelProfile,
  ANGLE_PROFILE,
  CIRCLE_PROFILE,
  SOFT_ROUND_PROFILE,
  BEVEL_PROFILES,
} from "./custom-bevel";

// =============================================================================
// Test Helpers
// =============================================================================

/** Create a simple square shape */
function createSquareShape(size = 100): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(size, 0);
  shape.lineTo(size, size);
  shape.lineTo(0, size);
  shape.closePath();
  return shape;
}

/** Create a square shape with a square hole */
function createSquareWithHole(outerSize = 100, holeSize = 40): THREE.Shape {
  const shape = createSquareShape(outerSize);

  // Add centered hole
  const holeOffset = (outerSize - holeSize) / 2;
  const hole = new THREE.Path();
  hole.moveTo(holeOffset, holeOffset);
  hole.lineTo(holeOffset + holeSize, holeOffset);
  hole.lineTo(holeOffset + holeSize, holeOffset + holeSize);
  hole.lineTo(holeOffset, holeOffset + holeSize);
  hole.closePath();

  shape.holes.push(hole);
  return shape;
}

// =============================================================================
// Profile Tests (Re-exported from bevel module)
// =============================================================================

describe("Bevel Profiles", () => {
  describe("ANGLE_PROFILE", () => {
    it("has start and end points", () => {
      expect(ANGLE_PROFILE.points.length).toBe(2);
      expect(ANGLE_PROFILE.points[0]).toEqual({ t: 0, inset: 0, depth: 0 });
      expect(ANGLE_PROFILE.points[1]).toEqual({ t: 1, inset: 1, depth: 1 });
    });

    it("represents a 45-degree chamfer", () => {
      // Linear progression from (0,0) to (1,1) = 45 degrees
      const start = ANGLE_PROFILE.points[0];
      const end = ANGLE_PROFILE.points[1];
      expect(end.inset - start.inset).toBe(1);
      expect(end.depth - start.depth).toBe(1);
    });
  });

  describe("CIRCLE_PROFILE", () => {
    it("has multiple segments for smooth curve", () => {
      expect(CIRCLE_PROFILE.points.length).toBeGreaterThan(2);
    });

    it("starts at origin and ends at (1, 1)", () => {
      const first = CIRCLE_PROFILE.points[0];
      const last = CIRCLE_PROFILE.points[CIRCLE_PROFILE.points.length - 1];

      expect(first.t).toBe(0);
      expect(first.inset).toBeCloseTo(0, 5);
      expect(first.depth).toBeCloseTo(0, 5);

      expect(last.t).toBe(1);
      expect(last.inset).toBeCloseTo(1, 5);
      expect(last.depth).toBeCloseTo(1, 5);
    });

    it("has quarter-circle shape (depth increases faster than inset initially)", () => {
      // Quarter circle: at t=0.5, inset ≈ 0.707, depth ≈ 0.293
      const midPoint = CIRCLE_PROFILE.points[Math.floor(CIRCLE_PROFILE.points.length / 2)];
      // The curve should bulge - inset advances faster than depth
      expect(midPoint.inset).toBeGreaterThan(midPoint.depth);
    });
  });

  describe("BEVEL_PROFILES registry", () => {
    it("contains all ECMA-376 preset profiles", () => {
      const expectedPresets = [
        "angle",
        "circle",
        "softRound",
        "convex",
        "relaxedInset",
        "slope",
        "hardEdge",
        "cross",
        "artDeco",
        "divot",
        "riblet",
        "coolSlant",
      ];

      for (const preset of expectedPresets) {
        expect(BEVEL_PROFILES.has(preset)).toBe(true);
      }
    });

    it("all profiles have valid structure", () => {
      for (const [name, profile] of BEVEL_PROFILES) {
        expect(profile.name).toBe(name);
        expect(profile.points.length).toBeGreaterThanOrEqual(2);

        // Check points are in order by t
        for (let i = 1; i < profile.points.length; i++) {
          expect(profile.points[i].t).toBeGreaterThanOrEqual(profile.points[i - 1].t);
        }

        // Check start and end
        expect(profile.points[0].t).toBe(0);
        expect(profile.points[profile.points.length - 1].t).toBe(1);
      }
    });
  });

  describe("getBevelProfile", () => {
    it("returns correct profile for known presets", () => {
      expect(getBevelProfile("angle")).toBe(ANGLE_PROFILE);
      expect(getBevelProfile("circle")).toBe(CIRCLE_PROFILE);
      expect(getBevelProfile("softRound")).toBe(SOFT_ROUND_PROFILE);
    });

    it("returns ANGLE_PROFILE as fallback for unknown presets", () => {
      expect(getBevelProfile("unknownPreset")).toBe(ANGLE_PROFILE);
      expect(getBevelProfile("")).toBe(ANGLE_PROFILE);
    });
  });
});

// =============================================================================
// High-Level API Tests
// =============================================================================

describe("createCustomBevelGeometry", () => {
  describe("front bevel only", () => {
    it("creates geometry with front bevel", () => {
      const shape = createSquareShape(100);
      const geometry = createCustomBevelGeometry(shape, {
        front: { width: 10, height: 5, preset: "angle" },
        extrusionDepth: 20,
      });

      expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
      expect(geometry.attributes.position.count).toBeGreaterThan(0);
    });

    it("front bevel vertices are at correct Z position", () => {
      const shape = createSquareShape(100);
      const extrusionDepth = 20;
      const bevelHeight = 5;
      const geometry = createCustomBevelGeometry(shape, {
        front: { width: 10, height: bevelHeight, preset: "angle" },
        extrusionDepth,
      });

      const positions = geometry.attributes.position.array as Float32Array;
      let minZ = Infinity;
      let maxZ = -Infinity;

      for (let i = 2; i < positions.length; i += 3) {
        minZ = Math.min(minZ, positions[i]);
        maxZ = Math.max(maxZ, positions[i]);
      }

      // Front bevel is created at Z=extrusionDepth going towards +Z
      expect(minZ).toBeGreaterThanOrEqual(extrusionDepth - 1);
      expect(maxZ).toBeLessThanOrEqual(extrusionDepth + bevelHeight + 1);
    });
  });

  describe("back bevel only", () => {
    it("creates geometry with back bevel", () => {
      const shape = createSquareShape(100);
      const geometry = createCustomBevelGeometry(shape, {
        back: { width: 10, height: 5, preset: "angle" },
        extrusionDepth: 20,
      });

      expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
      expect(geometry.attributes.position.count).toBeGreaterThan(0);
    });

    it("back bevel vertices are at correct Z position", () => {
      const shape = createSquareShape(100);
      const bevelHeight = 5;
      const geometry = createCustomBevelGeometry(shape, {
        back: { width: 10, height: bevelHeight, preset: "angle" },
        extrusionDepth: 20,
      });

      const positions = geometry.attributes.position.array as Float32Array;
      let minZ = Infinity;
      let maxZ = -Infinity;

      for (let i = 2; i < positions.length; i += 3) {
        minZ = Math.min(minZ, positions[i]);
        maxZ = Math.max(maxZ, positions[i]);
      }

      // Back bevel is created at Z=0 going towards -Z
      expect(maxZ).toBeLessThanOrEqual(1);
      expect(minZ).toBeGreaterThanOrEqual(-bevelHeight - 1);
    });
  });

  describe("front and back bevels", () => {
    it("creates geometry with both bevels", () => {
      const shape = createSquareShape(100);
      const geometry = createCustomBevelGeometry(shape, {
        front: { width: 10, height: 5, preset: "angle" },
        back: { width: 8, height: 4, preset: "circle" },
        extrusionDepth: 20,
      });

      expect(geometry).toBeInstanceOf(THREE.BufferGeometry);

      // Should have more vertices than single bevel
      const frontOnlyGeometry = createCustomBevelGeometry(shape, {
        front: { width: 10, height: 5, preset: "angle" },
        extrusionDepth: 20,
      });

      expect(geometry.attributes.position.count).toBeGreaterThan(
        frontOnlyGeometry.attributes.position.count,
      );
    });

    it("supports different presets for front and back", () => {
      const shape = createSquareShape(100);

      // Should not throw
      const geometry = createCustomBevelGeometry(shape, {
        front: { width: 10, height: 5, preset: "circle" },
        back: { width: 10, height: 5, preset: "angle" },
        extrusionDepth: 20,
      });

      expect(geometry.attributes.position.count).toBeGreaterThan(0);
    });
  });

  describe("no bevel", () => {
    it("returns empty geometry when no bevels specified", () => {
      const shape = createSquareShape(100);
      const geometry = createCustomBevelGeometry(shape, {
        extrusionDepth: 20,
      });

      expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
      // Empty geometry has no position attribute or zero count
      const hasPositions = geometry.attributes.position?.count ?? 0;
      expect(hasPositions).toBe(0);
    });
  });

  describe("shapes with holes", () => {
    it("creates geometry for shape with hole", () => {
      const shape = createSquareWithHole(100, 40);
      const geometry = createCustomBevelGeometry(shape, {
        front: { width: 10, height: 5, preset: "angle" },
        extrusionDepth: 20,
      });

      expect(geometry.attributes.position.count).toBeGreaterThan(0);

      // Should have more vertices than simple shape (outer + hole)
      const simpleShape = createSquareShape(100);
      const simpleGeometry = createCustomBevelGeometry(simpleShape, {
        front: { width: 10, height: 5, preset: "angle" },
        extrusionDepth: 20,
      });

      expect(geometry.attributes.position.count).toBeGreaterThan(
        simpleGeometry.attributes.position.count,
      );
    });
  });

  describe("ECMA-376 compliance", () => {
    it("bevel does not expand shape outline (inset bevel)", () => {
      const shapeSize = 100;
      const bevelWidth = 10;
      const shape = createSquareShape(shapeSize);

      const geometry = createCustomBevelGeometry(shape, {
        front: { width: bevelWidth, height: 5, preset: "angle" },
        extrusionDepth: 20,
      });

      const positions = geometry.attributes.position.array as Float32Array;

      // Check that X and Y never exceed the original shape bounds
      // (they can only go inward, not outward)
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];

        // Allow small tolerance for floating point
        expect(x).toBeLessThanOrEqual(shapeSize + 0.1);
        expect(x).toBeGreaterThanOrEqual(-0.1);
        expect(y).toBeLessThanOrEqual(shapeSize + 0.1);
        expect(y).toBeGreaterThanOrEqual(-0.1);
      }
    });
  });
});
