/**
 * @file Tests for pure geometry merging
 */

import { mergeGeometries, mergeExtendedGeometries } from "./merge";
import { extendGeometry } from "./types";
import type { GeometryData } from "./types";

// =============================================================================
// Test Fixtures
// =============================================================================

function createTriangleGeometry(offsetX = 0): GeometryData {
  return {
    positions: new Float32Array([
      offsetX + 0, 0, 0,
      offsetX + 1, 0, 0,
      offsetX + 0.5, 1, 0,
    ]),
    normals: new Float32Array([
      0, 0, 1,
      0, 0, 1,
      0, 0, 1,
    ]),
    uvs: new Float32Array([
      0, 0,
      1, 0,
      0.5, 1,
    ]),
    indices: new Uint32Array([0, 1, 2]),
  };
}

function createQuadGeometry(offsetX = 0): GeometryData {
  return {
    positions: new Float32Array([
      offsetX + 0, 0, 0,
      offsetX + 1, 0, 0,
      offsetX + 1, 1, 0,
      offsetX + 0, 1, 0,
    ]),
    normals: new Float32Array([
      0, 0, 1,
      0, 0, 1,
      0, 0, 1,
      0, 0, 1,
    ]),
    uvs: new Float32Array([
      0, 0,
      1, 0,
      1, 1,
      0, 1,
    ]),
    indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("mergeGeometries", () => {
  describe("empty input", () => {
    it("returns empty geometry for empty array", () => {
      const result = mergeGeometries([]);
      expect(result.positions).toHaveLength(0);
      expect(result.indices).toHaveLength(0);
    });
  });

  describe("single geometry", () => {
    it("returns copy of single geometry", () => {
      const geom = createTriangleGeometry();
      const result = mergeGeometries([geom]);

      expect(result.positions).toHaveLength(9);
      expect(result.positions).not.toBe(geom.positions); // Should be a copy
      expect(Array.from(result.positions)).toEqual(Array.from(geom.positions));
    });
  });

  describe("multiple geometries", () => {
    it("merges two triangles", () => {
      const geom1 = createTriangleGeometry(0);
      const geom2 = createTriangleGeometry(2);
      const result = mergeGeometries([geom1, geom2]);

      // 3 vertices * 2 geometries = 6 vertices * 3 components = 18
      expect(result.positions).toHaveLength(18);
      // 3 normals * 2 = 6 normals * 3 = 18
      expect(result.normals).toHaveLength(18);
      // 3 uvs * 2 = 6 uvs * 2 = 12
      expect(result.uvs).toHaveLength(12);
      // 3 indices * 2 = 6 indices
      expect(result.indices).toHaveLength(6);
    });

    it("correctly offsets indices", () => {
      const geom1 = createTriangleGeometry();
      const geom2 = createTriangleGeometry();
      const result = mergeGeometries([geom1, geom2]);

      // First triangle: 0, 1, 2
      // Second triangle: 3, 4, 5 (offset by 3)
      expect(Array.from(result.indices)).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it("merges triangle and quad", () => {
      const triangle = createTriangleGeometry();
      const quad = createQuadGeometry(2);
      const result = mergeGeometries([triangle, quad]);

      // 3 + 4 = 7 vertices
      expect(result.positions).toHaveLength(21);
      // 3 + 6 = 9 indices
      expect(result.indices).toHaveLength(9);
      // Check index offsets
      expect(Array.from(result.indices)).toEqual([
        0, 1, 2,        // triangle
        3, 4, 5, 3, 5, 6 // quad (offset by 3)
      ]);
    });
  });

  describe("UV handling", () => {
    it("preserves UVs when all geometries have them", () => {
      const geom1 = createTriangleGeometry();
      const geom2 = createQuadGeometry();
      const result = mergeGeometries([geom1, geom2]);

      expect(result.uvs).toHaveLength(14); // (3 + 4) * 2
    });

    it("drops UVs when any geometry lacks them", () => {
      const geom1 = createTriangleGeometry();
      const geomNoUV: GeometryData = {
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0.5, 1, 0]),
        normals: new Float32Array(9),
        uvs: new Float32Array(0), // No UVs
        indices: new Uint32Array([0, 1, 2]),
      };

      const result = mergeGeometries([geom1, geomNoUV]);
      expect(result.uvs).toHaveLength(0);
    });
  });

  describe("normal handling", () => {
    it("fills zeros for missing normals", () => {
      const geom1 = createTriangleGeometry();
      const geomNoNormals: GeometryData = {
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0.5, 1, 0]),
        normals: new Float32Array(0), // No normals
        uvs: new Float32Array(6),
        indices: new Uint32Array([0, 1, 2]),
      };

      const result = mergeGeometries([geom1, geomNoNormals]);
      expect(result.normals).toHaveLength(18);

      // First 9 should be from geom1
      expect(result.normals[2]).toBe(1); // z component of first normal

      // Next 9 should be zeros
      expect(result.normals[9]).toBe(0);
      expect(result.normals[10]).toBe(0);
      expect(result.normals[11]).toBe(0);
    });
  });
});

describe("mergeExtendedGeometries", () => {
  it("merges custom attributes", () => {
    const geom1 = extendGeometry(
      createTriangleGeometry(),
      { color: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]) },
      { color: 3 }
    );
    const geom2 = extendGeometry(
      createTriangleGeometry(),
      { color: new Float32Array([1, 1, 0, 1, 0, 1, 0, 1, 1]) },
      { color: 3 }
    );

    const result = mergeExtendedGeometries([geom1, geom2]);

    expect(result.customAttributes.color).toHaveLength(18);
    expect(result.customAttributeSizes.color).toBe(3);
  });

  it("only keeps common custom attributes", () => {
    const geom1 = extendGeometry(
      createTriangleGeometry(),
      {
        color: new Float32Array(9),
        extra: new Float32Array(3),
      },
      { color: 3, extra: 1 }
    );
    const geom2 = extendGeometry(
      createTriangleGeometry(),
      { color: new Float32Array(9) },
      { color: 3 }
    );

    const result = mergeExtendedGeometries([geom1, geom2]);

    expect(result.customAttributes.color).toBeDefined();
    expect(result.customAttributes.extra).toBeUndefined();
  });
});
