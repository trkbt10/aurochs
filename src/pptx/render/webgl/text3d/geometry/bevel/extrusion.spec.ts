/**
 * @file Extrusion Generator Test
 *
 * Tests for the Three.js independent extrusion generator.
 * Verifies that caps can be selectively omitted to prevent
 * overlap with bevel surfaces.
 */

import { describe, it, expect } from "vitest";
import { generateExtrusion, mergeExtrusionGeometries } from "./extrusion";
import type { ShapeInput } from "./types";

// =============================================================================
// Test Fixtures
// =============================================================================

function createSquareShape(size = 100): ShapeInput {
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

function createShapeWithHole(): ShapeInput {
  return {
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ],
    holes: [
      [
        { x: 25, y: 25 },
        { x: 75, y: 25 },
        { x: 75, y: 75 },
        { x: 25, y: 75 },
      ],
    ],
  };
}

function createTriangleShape(): ShapeInput {
  return {
    points: [
      { x: 50, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ],
    holes: [],
  };
}

// =============================================================================
// Geometry Analysis Utilities
// =============================================================================

type FaceInfo = {
  readonly avgZ: number;
  readonly normalZ: number;
};

function extractFaces(
  positions: Float32Array,
  indices: Uint32Array,
): FaceInfo[] {
  const faces: FaceInfo[] = [];

  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i];
    const i1 = indices[i + 1];
    const i2 = indices[i + 2];

    const v0 = {
      x: positions[i0 * 3],
      y: positions[i0 * 3 + 1],
      z: positions[i0 * 3 + 2],
    };
    const v1 = {
      x: positions[i1 * 3],
      y: positions[i1 * 3 + 1],
      z: positions[i1 * 3 + 2],
    };
    const v2 = {
      x: positions[i2 * 3],
      y: positions[i2 * 3 + 1],
      z: positions[i2 * 3 + 2],
    };

    const avgZ = (v0.z + v1.z + v2.z) / 3;

    // Compute face normal via cross product
    const edge1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
    const edge2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
    const cross = {
      x: edge1.y * edge2.z - edge1.z * edge2.y,
      y: edge1.z * edge2.x - edge1.x * edge2.z,
      z: edge1.x * edge2.y - edge1.y * edge2.x,
    };
    const len = Math.sqrt(cross.x ** 2 + cross.y ** 2 + cross.z ** 2);
    const normalZ = len > 0.0001 ? cross.z / len : 0;

    faces.push({ avgZ, normalZ });
  }

  return faces;
}

function countFacesAtZ(
  faces: readonly FaceInfo[],
  targetZ: number,
  tolerance = 0.1,
): { frontFacing: number; backFacing: number; sideFacing: number } {
  let frontFacing = 0;
  let backFacing = 0;
  let sideFacing = 0;

  for (const face of faces) {
    if (Math.abs(face.avgZ - targetZ) < tolerance) {
      if (face.normalZ > 0.5) {
        frontFacing++;
      } else if (face.normalZ < -0.5) {
        backFacing++;
      } else {
        sideFacing++;
      }
    }
  }

  return { frontFacing, backFacing, sideFacing };
}

// =============================================================================
// Tests
// =============================================================================

describe("generateExtrusion", () => {
  describe("basic extrusion with both caps", () => {
    it("generates geometry for square shape", () => {
      const shape = createSquareShape(100);
      const result = generateExtrusion(shape, {
        depth: 10,
        includeFrontCap: true,
        includeBackCap: true,
      });

      expect(result.positions.length).toBeGreaterThan(0);
      expect(result.normals.length).toBe(result.positions.length);
      expect(result.uvs.length).toBe((result.positions.length / 3) * 2);
      expect(result.indices.length).toBeGreaterThan(0);
    });

    it("generates geometry for triangle shape", () => {
      const shape = createTriangleShape();
      const result = generateExtrusion(shape, {
        depth: 5,
        includeFrontCap: true,
        includeBackCap: true,
      });

      expect(result.positions.length).toBeGreaterThan(0);
      expect(result.indices.length).toBeGreaterThan(0);
    });

    it("front cap is at Z=depth", () => {
      const shape = createSquareShape(100);
      const depth = 10;
      const result = generateExtrusion(shape, {
        depth,
        includeFrontCap: true,
        includeBackCap: true,
      });

      const faces = extractFaces(result.positions, result.indices);
      const facesAtDepth = countFacesAtZ(faces, depth);

      // Front cap should have front-facing faces at Z=depth
      expect(facesAtDepth.frontFacing).toBeGreaterThan(0);
      expect(facesAtDepth.backFacing).toBe(0);
    });

    it("back cap is at Z=0", () => {
      const shape = createSquareShape(100);
      const result = generateExtrusion(shape, {
        depth: 10,
        includeFrontCap: true,
        includeBackCap: true,
      });

      const faces = extractFaces(result.positions, result.indices);
      const facesAtZero = countFacesAtZ(faces, 0);

      // Back cap should have back-facing faces at Z=0
      expect(facesAtZero.backFacing).toBeGreaterThan(0);
      expect(facesAtZero.frontFacing).toBe(0);
    });
  });

  describe("selective cap omission (KEY FIX)", () => {
    it("omitting front cap removes faces at Z=depth", () => {
      const shape = createSquareShape(100);
      const depth = 10;
      const result = generateExtrusion(shape, {
        depth,
        includeFrontCap: false, // OMIT front cap
        includeBackCap: true,
      });

      const faces = extractFaces(result.positions, result.indices);
      const facesAtDepth = countFacesAtZ(faces, depth);

      // NO front-facing cap faces at Z=depth
      expect(facesAtDepth.frontFacing).toBe(0);
      // Side walls may touch Z=depth but won't be front-facing
    });

    it("omitting back cap removes faces at Z=0", () => {
      const shape = createSquareShape(100);
      const result = generateExtrusion(shape, {
        depth: 10,
        includeFrontCap: true,
        includeBackCap: false, // OMIT back cap
      });

      const faces = extractFaces(result.positions, result.indices);
      const facesAtZero = countFacesAtZ(faces, 0);

      // NO back-facing cap faces at Z=0
      expect(facesAtZero.backFacing).toBe(0);
    });

    it("omitting both caps leaves only side walls", () => {
      const shape = createSquareShape(100);
      const depth = 10;
      const result = generateExtrusion(shape, {
        depth,
        includeFrontCap: false,
        includeBackCap: false,
      });

      const faces = extractFaces(result.positions, result.indices);

      // No front or back facing cap faces
      const facesAtDepth = countFacesAtZ(faces, depth);
      const facesAtZero = countFacesAtZ(faces, 0);

      expect(facesAtDepth.frontFacing).toBe(0);
      expect(facesAtZero.backFacing).toBe(0);

      // But we should still have geometry (side walls)
      expect(result.positions.length).toBeGreaterThan(0);
      expect(result.indices.length).toBeGreaterThan(0);
    });
  });

  describe("shape with holes", () => {
    it("generates geometry for shape with hole", () => {
      const shape = createShapeWithHole();
      const result = generateExtrusion(shape, {
        depth: 10,
        includeFrontCap: true,
        includeBackCap: true,
      });

      expect(result.positions.length).toBeGreaterThan(0);
      expect(result.indices.length).toBeGreaterThan(0);
    });

    it("hole side walls face inward", () => {
      const shape = createShapeWithHole();
      const result = generateExtrusion(shape, {
        depth: 10,
        includeFrontCap: false,
        includeBackCap: false,
      });

      // Should have side wall geometry for both outer and hole
      expect(result.positions.length).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("returns empty geometry for invalid shape (< 3 points)", () => {
      const shape: ShapeInput = {
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        holes: [],
      };

      const result = generateExtrusion(shape, {
        depth: 10,
        includeFrontCap: true,
        includeBackCap: true,
      });

      expect(result.positions.length).toBe(0);
      expect(result.indices.length).toBe(0);
    });

    it("handles zero depth", () => {
      const shape = createSquareShape(100);
      const result = generateExtrusion(shape, {
        depth: 0,
        includeFrontCap: true,
        includeBackCap: true,
      });

      // Should still have cap geometry even with 0 depth
      expect(result.positions.length).toBeGreaterThan(0);
    });
  });

  describe("normal directions", () => {
    it("front cap normals point +Z", () => {
      const shape = createSquareShape(100);
      const depth = 10;
      const result = generateExtrusion(shape, {
        depth,
        includeFrontCap: true,
        includeBackCap: false,
      });

      // Check vertex normals at front cap (Z=depth)
      for (let i = 0; i < result.positions.length / 3; i++) {
        const z = result.positions[i * 3 + 2];
        if (Math.abs(z - depth) < 0.1) {
          const nz = result.normals[i * 3 + 2];
          // Front cap normals should point +Z
          if (Math.abs(result.normals[i * 3]) < 0.1 && Math.abs(result.normals[i * 3 + 1]) < 0.1) {
            expect(nz).toBeCloseTo(1, 1);
          }
        }
      }
    });

    it("back cap normals point -Z", () => {
      const shape = createSquareShape(100);
      const result = generateExtrusion(shape, {
        depth: 10,
        includeFrontCap: false,
        includeBackCap: true,
      });

      // Check vertex normals at back cap (Z=0)
      for (let i = 0; i < result.positions.length / 3; i++) {
        const z = result.positions[i * 3 + 2];
        if (Math.abs(z) < 0.1) {
          const nz = result.normals[i * 3 + 2];
          // Back cap normals should point -Z
          if (Math.abs(result.normals[i * 3]) < 0.1 && Math.abs(result.normals[i * 3 + 1]) < 0.1) {
            expect(nz).toBeCloseTo(-1, 1);
          }
        }
      }
    });
  });
});

describe("mergeExtrusionGeometries", () => {
  it("merges multiple geometries", () => {
    const shape1 = createSquareShape(50);
    const shape2 = createTriangleShape();

    const geom1 = generateExtrusion(shape1, {
      depth: 5,
      includeFrontCap: true,
      includeBackCap: true,
    });
    const geom2 = generateExtrusion(shape2, {
      depth: 5,
      includeFrontCap: true,
      includeBackCap: true,
    });

    const merged = mergeExtrusionGeometries([geom1, geom2]);

    // Merged should have combined vertex count
    expect(merged.positions.length).toBe(
      geom1.positions.length + geom2.positions.length,
    );
    expect(merged.indices.length).toBe(
      geom1.indices.length + geom2.indices.length,
    );
  });

  it("returns empty for empty array", () => {
    const result = mergeExtrusionGeometries([]);
    expect(result.positions.length).toBe(0);
  });

  it("returns same geometry for single element", () => {
    const shape = createSquareShape(50);
    const geom = generateExtrusion(shape, {
      depth: 5,
      includeFrontCap: true,
      includeBackCap: true,
    });

    const merged = mergeExtrusionGeometries([geom]);

    expect(merged.positions.length).toBe(geom.positions.length);
    expect(merged.indices.length).toBe(geom.indices.length);
  });
});
