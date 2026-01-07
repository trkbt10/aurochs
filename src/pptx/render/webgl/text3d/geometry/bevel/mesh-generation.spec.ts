/**
 * @file Tests for bevel mesh generation (Three.js independent)
 */

import { describe, it, expect } from "vitest";
import { generateBevelMesh, mergeBevelGeometries } from "./mesh-generation";
import type { BevelPath, BevelMeshConfig, BevelGeometryData } from "./types";
import { vec2, emptyGeometryData } from "./types";
import { ANGLE_PROFILE, CIRCLE_PROFILE } from "./profiles";

// =============================================================================
// Test Fixtures
// =============================================================================

function createSquarePath(isHole: boolean): BevelPath {
  return {
    points: [
      { position: vec2(0, 0), normal: vec2(0.707, 0.707) },
      { position: vec2(10, 0), normal: vec2(-0.707, 0.707) },
      { position: vec2(10, 10), normal: vec2(-0.707, -0.707) },
      { position: vec2(0, 10), normal: vec2(0.707, -0.707) },
    ],
    isHole,
    isClosed: true,
  };
}

function createTrianglePath(): BevelPath {
  return {
    points: [
      { position: vec2(0, 0), normal: vec2(0, 1) },
      { position: vec2(10, 0), normal: vec2(-0.866, -0.5) },
      { position: vec2(5, 8.66), normal: vec2(0.866, -0.5) },
    ],
    isHole: false,
    isClosed: true,
  };
}

const defaultConfig: BevelMeshConfig = {
  width: 2,
  height: 1,
  profile: ANGLE_PROFILE,
  zPosition: 0,
  zDirection: 1,
};

// =============================================================================
// generateBevelMesh Tests
// =============================================================================

describe("generateBevelMesh", () => {
  describe("empty input", () => {
    it("returns empty geometry for empty paths array", () => {
      const result = generateBevelMesh([], defaultConfig);

      expect(result.positions).toHaveLength(0);
      expect(result.normals).toHaveLength(0);
      expect(result.uvs).toHaveLength(0);
      expect(result.indices).toHaveLength(0);
    });
  });

  describe("single path", () => {
    it("generates vertices for each path point × profile point", () => {
      const path = createSquarePath(false);
      const result = generateBevelMesh([path], defaultConfig);

      // 4 path points × 2 profile points = 8 vertices
      // Each vertex has 3 position components
      expect(result.positions.length / 3).toBe(8);
      expect(result.normals.length / 3).toBe(8);
      expect(result.uvs.length / 2).toBe(8);
    });

    it("generates triangles connecting adjacent path and profile points", () => {
      const path = createSquarePath(false);
      const result = generateBevelMesh([path], defaultConfig);

      // 4 path segments (closed) × 1 profile segment × 2 triangles × 3 indices
      expect(result.indices.length).toBe(4 * 1 * 2 * 3);
    });

    it("uses CIRCLE profile with more vertices", () => {
      const path = createSquarePath(false);
      const config: BevelMeshConfig = {
        ...defaultConfig,
        profile: CIRCLE_PROFILE,
      };
      const result = generateBevelMesh([path], config);

      // 4 path points × 9 profile points = 36 vertices
      expect(result.positions.length / 3).toBe(36);

      // 4 path segments × 8 profile segments × 2 triangles × 3 indices
      expect(result.indices.length).toBe(4 * 8 * 2 * 3);
    });
  });

  describe("geometry positions", () => {
    it("places first profile point at original position", () => {
      const path = createSquarePath(false);
      const result = generateBevelMesh([path], defaultConfig);

      // First vertex should be at (0, 0, 0) - first path point, first profile point
      expect(result.positions[0]).toBe(0);
      expect(result.positions[1]).toBe(0);
      expect(result.positions[2]).toBe(0);
    });

    it("applies inset along normal for last profile point", () => {
      const path: BevelPath = {
        points: [
          { position: vec2(0, 0), normal: vec2(1, 0) },
          { position: vec2(10, 0), normal: vec2(1, 0) },
          { position: vec2(10, 10), normal: vec2(1, 0) },
        ],
        isHole: false,
        isClosed: false,
      };

      const config: BevelMeshConfig = {
        width: 2,
        height: 1,
        profile: ANGLE_PROFILE,
        zPosition: 0,
        zDirection: 1,
      };

      const result = generateBevelMesh([path], config);

      // Second vertex (index 1) should be at profile end: inset by width along normal
      // Position + normal * width = (0, 0) + (1, 0) * 2 = (2, 0)
      expect(result.positions[3]).toBeCloseTo(2); // x
      expect(result.positions[4]).toBeCloseTo(0); // y
      expect(result.positions[5]).toBeCloseTo(1); // z = zPosition + depth * height = 0 + 1 * 1
    });

    it("applies zDirection correctly", () => {
      const path: BevelPath = {
        points: [
          { position: vec2(0, 0), normal: vec2(1, 0) },
          { position: vec2(10, 0), normal: vec2(1, 0) },
          { position: vec2(10, 10), normal: vec2(1, 0) },
        ],
        isHole: false,
        isClosed: false,
      };

      const backConfig: BevelMeshConfig = {
        width: 2,
        height: 1,
        profile: ANGLE_PROFILE,
        zPosition: 5,
        zDirection: -1,
      };

      const result = generateBevelMesh([path], backConfig);

      // First vertex Z = zPosition + depth * height * zDirection = 5 + 0 * 1 * -1 = 5
      expect(result.positions[2]).toBe(5);

      // Second vertex (profile end) Z = 5 + 1 * 1 * -1 = 4
      expect(result.positions[5]).toBe(4);
    });
  });

  describe("hole handling", () => {
    it("inverts profile direction for holes", () => {
      const outerPath = createSquarePath(false);
      const holePath = createSquarePath(true);

      const outerResult = generateBevelMesh([outerPath], defaultConfig);
      const holeResult = generateBevelMesh([holePath], defaultConfig);

      // The inset direction should be opposite for holes
      // This manifests as different vertex positions
      // We'll just verify that the geometries are different
      expect(outerResult.positions).not.toEqual(holeResult.positions);
    });

    it("uses different winding order for holes", () => {
      const outerPath = createSquarePath(false);
      const holePath = createSquarePath(true);

      const outerResult = generateBevelMesh([outerPath], defaultConfig);
      const holeResult = generateBevelMesh([holePath], defaultConfig);

      // Indices should be wound differently
      // For outer: (i0, i2, i1) pattern
      // For holes: (i0, i1, i2) pattern
      expect(outerResult.indices).not.toEqual(holeResult.indices);
    });
  });

  describe("multiple paths", () => {
    it("combines geometry from all paths", () => {
      const outer = createSquarePath(false);
      const hole: BevelPath = {
        points: [
          { position: vec2(3, 3), normal: vec2(-1, 0) },
          { position: vec2(7, 3), normal: vec2(0, -1) },
          { position: vec2(5, 7), normal: vec2(0.707, 0.707) },
        ],
        isHole: true,
        isClosed: true,
      };

      const result = generateBevelMesh([outer, hole], defaultConfig);

      // outer: 4 path points × 2 profile points = 8 vertices
      // hole: 3 path points × 2 profile points = 6 vertices
      // Total: 14 vertices
      expect(result.positions.length / 3).toBe(14);
    });

    it("adjusts indices for vertex offset", () => {
      const path1 = createTrianglePath();
      const path2 = createTrianglePath();

      const result = generateBevelMesh([path1, path2], defaultConfig);

      // First path indices start at 0
      // Second path indices start at 6 (3 path points × 2 profile points)
      const maxIndex = Math.max(...result.indices);
      expect(maxIndex).toBe(11); // 12 total vertices, 0-indexed
    });
  });

  describe("UV coordinates", () => {
    it("generates UVs in range [0, 1]", () => {
      const path = createSquarePath(false);
      const result = generateBevelMesh([path], defaultConfig);

      for (let i = 0; i < result.uvs.length; i++) {
        expect(result.uvs[i]).toBeGreaterThanOrEqual(0);
        expect(result.uvs[i]).toBeLessThanOrEqual(1);
      }
    });

    it("UV.u varies along path", () => {
      const path = createSquarePath(false);
      const result = generateBevelMesh([path], defaultConfig);

      // Check U values at first profile point of each path point
      const profileSize = ANGLE_PROFILE.points.length;
      const u0 = result.uvs[0 * profileSize * 2]; // First path point
      const u1 = result.uvs[1 * profileSize * 2]; // Second path point

      expect(u0).toBe(0);
      expect(u1).toBeGreaterThan(u0);
    });

    it("UV.v varies along profile", () => {
      const path = createSquarePath(false);
      const result = generateBevelMesh([path], defaultConfig);

      // Check V values at first path point
      const v0 = result.uvs[1]; // First profile point (u, v)
      const v1 = result.uvs[3]; // Second profile point (u, v)

      expect(v0).toBe(0);
      expect(v1).toBe(1);
    });
  });
});

// =============================================================================
// mergeBevelGeometries Tests
// =============================================================================

describe("mergeBevelGeometries", () => {
  it("returns empty geometry for empty array", () => {
    const result = mergeBevelGeometries([]);

    expect(result.positions).toHaveLength(0);
    expect(result.normals).toHaveLength(0);
    expect(result.uvs).toHaveLength(0);
    expect(result.indices).toHaveLength(0);
  });

  it("returns same geometry for single element", () => {
    const geometry: BevelGeometryData = {
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
      uvs: new Float32Array([0, 0, 1, 0, 0.5, 1]),
      indices: new Uint32Array([0, 1, 2]),
    };

    const result = mergeBevelGeometries([geometry]);

    expect(result).toBe(geometry); // Same reference
  });

  it("combines positions from multiple geometries", () => {
    const geom1: BevelGeometryData = {
      positions: new Float32Array([0, 0, 0]),
      normals: new Float32Array([0, 0, 1]),
      uvs: new Float32Array([0, 0]),
      indices: new Uint32Array([0]),
    };

    const geom2: BevelGeometryData = {
      positions: new Float32Array([1, 1, 1]),
      normals: new Float32Array([1, 0, 0]),
      uvs: new Float32Array([1, 1]),
      indices: new Uint32Array([0]),
    };

    const result = mergeBevelGeometries([geom1, geom2]);

    expect(result.positions).toHaveLength(6);
    expect(result.positions[0]).toBe(0);
    expect(result.positions[3]).toBe(1);
  });

  it("offsets indices for merged geometries", () => {
    const geom1: BevelGeometryData = {
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
      uvs: new Float32Array([0, 0, 1, 0, 0.5, 1]),
      indices: new Uint32Array([0, 1, 2]),
    };

    const geom2: BevelGeometryData = {
      positions: new Float32Array([2, 0, 0, 3, 0, 0, 2, 1, 0]),
      normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
      uvs: new Float32Array([0, 0, 1, 0, 0.5, 1]),
      indices: new Uint32Array([0, 1, 2]),
    };

    const result = mergeBevelGeometries([geom1, geom2]);

    // First geometry indices unchanged
    expect(result.indices[0]).toBe(0);
    expect(result.indices[1]).toBe(1);
    expect(result.indices[2]).toBe(2);

    // Second geometry indices offset by 3 (number of vertices in first)
    expect(result.indices[3]).toBe(3);
    expect(result.indices[4]).toBe(4);
    expect(result.indices[5]).toBe(5);
  });
});
