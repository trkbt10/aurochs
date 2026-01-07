/**
 * @file Comprehensive tests for geometry merging
 *
 * Tests the unified geometry merge function that handles:
 * - Position, normal, UV attributes
 * - Index buffers with proper offset adjustment
 * - Edge cases (empty arrays, single geometry, missing attributes)
 * - ECMA-376 compliance for gradient fills (UV preservation)
 *
 * @see ECMA-376 Part 1, Section 20.1.8.33 (gradFill - requires proper UVs)
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";

// Import the function we'll create
import {
  mergeBufferGeometries,
  type MergeGeometriesOptions,
} from "./merge-geometries";

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a simple box geometry with known vertex count
 */
function createTestBoxGeometry(
  width: number = 1,
  height: number = 1,
  depth: number = 1,
): THREE.BufferGeometry {
  return new THREE.BoxGeometry(width, height, depth);
}

/**
 * Create a simple plane geometry
 */
function createTestPlaneGeometry(
  width: number = 1,
  height: number = 1,
): THREE.BufferGeometry {
  return new THREE.PlaneGeometry(width, height);
}

/**
 * Create geometry without UV attribute
 */
function createGeometryWithoutUVs(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0.5, 1, 0]);
  const normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setIndex([0, 1, 2]);
  return geometry;
}

/**
 * Create geometry with custom attributes
 */
function createCustomGeometry(options: {
  vertexCount: number;
  hasUV?: boolean;
  hasNormal?: boolean;
  hasIndex?: boolean;
  basePosition?: [number, number, number];
}): THREE.BufferGeometry {
  const { vertexCount, hasUV = true, hasNormal = true, hasIndex = true, basePosition = [0, 0, 0] } = options;

  const geometry = new THREE.BufferGeometry();

  // Positions
  const positions = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    positions[i * 3] = basePosition[0] + i;
    positions[i * 3 + 1] = basePosition[1] + i;
    positions[i * 3 + 2] = basePosition[2];
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  // Normals
  if (hasNormal) {
    const normals = new Float32Array(vertexCount * 3);
    for (let i = 0; i < vertexCount; i++) {
      normals[i * 3] = 0;
      normals[i * 3 + 1] = 0;
      normals[i * 3 + 2] = 1;
    }
    geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  }

  // UVs
  if (hasUV) {
    const uvs = new Float32Array(vertexCount * 2);
    for (let i = 0; i < vertexCount; i++) {
      uvs[i * 2] = i / (vertexCount - 1);
      uvs[i * 2 + 1] = i / (vertexCount - 1);
    }
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  }

  // Indices (simple triangle fan for testing)
  if (hasIndex && vertexCount >= 3) {
    const indices: number[] = [];
    for (let i = 1; i < vertexCount - 1; i++) {
      indices.push(0, i, i + 1);
    }
    geometry.setIndex(indices);
  }

  return geometry;
}

// =============================================================================
// Basic Merge Tests
// =============================================================================

describe("mergeBufferGeometries", () => {
  describe("basic merging", () => {
    it("should merge two geometries with all attributes", () => {
      const geomA = createTestBoxGeometry();
      const geomB = createTestBoxGeometry();

      const posCountA = geomA.attributes.position.count;
      const posCountB = geomB.attributes.position.count;

      const merged = mergeBufferGeometries([geomA, geomB]);

      expect(merged.attributes.position).toBeDefined();
      expect(merged.attributes.position.count).toBe(posCountA + posCountB);
      expect(merged.attributes.normal).toBeDefined();
      expect(merged.attributes.uv).toBeDefined();
    });

    it("should merge three or more geometries", () => {
      const geometries = [
        createTestBoxGeometry(),
        createTestPlaneGeometry(),
        createTestBoxGeometry(2, 2, 2),
      ];

      const totalVertices = geometries.reduce(
        (sum, g) => sum + g.attributes.position.count,
        0,
      );

      const merged = mergeBufferGeometries(geometries);

      expect(merged.attributes.position.count).toBe(totalVertices);
    });

    it("should return empty geometry for empty array", () => {
      const merged = mergeBufferGeometries([]);

      expect(merged.attributes.position).toBeDefined();
      expect(merged.attributes.position.count).toBe(0);
    });

    it("should return clone of single geometry", () => {
      const geom = createTestBoxGeometry();
      const posCount = geom.attributes.position.count;

      const merged = mergeBufferGeometries([geom]);

      expect(merged.attributes.position.count).toBe(posCount);
      // Should be a new geometry, not the same reference
      expect(merged).not.toBe(geom);
    });
  });

  // ===========================================================================
  // Position Attribute Tests
  // ===========================================================================

  describe("position attribute handling", () => {
    it("should preserve exact position values", () => {
      const geomA = createCustomGeometry({ vertexCount: 3, basePosition: [0, 0, 0] });
      const geomB = createCustomGeometry({ vertexCount: 3, basePosition: [10, 10, 0] });

      const merged = mergeBufferGeometries([geomA, geomB]);
      const positions = merged.attributes.position.array as Float32Array;

      // First geometry positions
      expect(positions[0]).toBe(0); // x of vertex 0
      expect(positions[1]).toBe(0); // y of vertex 0
      expect(positions[3]).toBe(1); // x of vertex 1

      // Second geometry positions (offset by vertex count)
      expect(positions[9]).toBe(10); // x of first vertex in geomB
      expect(positions[10]).toBe(10); // y of first vertex in geomB
    });

    it("should handle geometries with different vertex counts", () => {
      const geomA = createCustomGeometry({ vertexCount: 4 });
      const geomB = createCustomGeometry({ vertexCount: 8 });
      const geomC = createCustomGeometry({ vertexCount: 2 });

      const merged = mergeBufferGeometries([geomA, geomB, geomC]);

      expect(merged.attributes.position.count).toBe(4 + 8 + 2);
    });
  });

  // ===========================================================================
  // Normal Attribute Tests
  // ===========================================================================

  describe("normal attribute handling", () => {
    it("should merge normal attributes correctly", () => {
      const geomA = createTestBoxGeometry();
      const geomB = createTestPlaneGeometry();

      const merged = mergeBufferGeometries([geomA, geomB]);

      expect(merged.attributes.normal).toBeDefined();
      expect(merged.attributes.normal.count).toBe(
        geomA.attributes.position.count + geomB.attributes.position.count,
      );
    });

    it("should handle geometry without normals", () => {
      const geomA = createCustomGeometry({ vertexCount: 3, hasNormal: true });
      const geomB = createCustomGeometry({ vertexCount: 3, hasNormal: false });

      const merged = mergeBufferGeometries([geomA, geomB]);

      // Should still have normals from geomA, zeros for geomB
      expect(merged.attributes.normal).toBeDefined();
    });
  });

  // ===========================================================================
  // UV Attribute Tests (Critical for ECMA-376 gradFill)
  // ===========================================================================

  describe("UV attribute handling (ECMA-376 gradFill compliance)", () => {
    it("should preserve UV coordinates when all geometries have UVs", () => {
      const geomA = createCustomGeometry({ vertexCount: 3, hasUV: true });
      const geomB = createCustomGeometry({ vertexCount: 3, hasUV: true });

      const merged = mergeBufferGeometries([geomA, geomB]);

      expect(merged.attributes.uv).toBeDefined();
      expect(merged.attributes.uv.count).toBe(6);
    });

    it("should preserve exact UV values", () => {
      const geomA = createCustomGeometry({ vertexCount: 3, hasUV: true });
      const geomB = createCustomGeometry({ vertexCount: 3, hasUV: true });

      const uvA = geomA.attributes.uv.array as Float32Array;
      const uvB = geomB.attributes.uv.array as Float32Array;

      const merged = mergeBufferGeometries([geomA, geomB]);
      const mergedUVs = merged.attributes.uv.array as Float32Array;

      // Check first geometry UVs preserved
      expect(mergedUVs[0]).toBe(uvA[0]);
      expect(mergedUVs[1]).toBe(uvA[1]);

      // Check second geometry UVs preserved (offset by first geometry's UV count)
      expect(mergedUVs[6]).toBe(uvB[0]);
      expect(mergedUVs[7]).toBe(uvB[1]);
    });

    it("should omit UVs if any geometry lacks UVs", () => {
      const geomA = createCustomGeometry({ vertexCount: 3, hasUV: true });
      const geomB = createGeometryWithoutUVs();

      const merged = mergeBufferGeometries([geomA, geomB]);

      // When any geometry lacks UVs, the merged result should not have UVs
      // to maintain consistency (can't apply gradient to partial mesh)
      expect(merged.attributes.uv).toBeUndefined();
    });

    it("should handle all geometries without UVs", () => {
      const geomA = createGeometryWithoutUVs();
      const geomB = createGeometryWithoutUVs();

      const merged = mergeBufferGeometries([geomA, geomB]);

      expect(merged.attributes.uv).toBeUndefined();
    });
  });

  // ===========================================================================
  // Index Buffer Tests
  // ===========================================================================

  describe("index buffer handling", () => {
    it("should merge and offset indices correctly", () => {
      const geomA = createCustomGeometry({ vertexCount: 4, hasIndex: true });
      const geomB = createCustomGeometry({ vertexCount: 4, hasIndex: true });

      const indexA = geomA.index!.array;
      const indexB = geomB.index!.array;

      const merged = mergeBufferGeometries([geomA, geomB]);

      expect(merged.index).toBeDefined();
      const mergedIndex = merged.index!.array;

      // First geometry indices unchanged
      expect(mergedIndex[0]).toBe(indexA[0]);
      expect(mergedIndex[1]).toBe(indexA[1]);
      expect(mergedIndex[2]).toBe(indexA[2]);

      // Second geometry indices offset by geomA vertex count
      const offset = geomA.attributes.position.count;
      const secondGeomStartIndex = indexA.length;
      expect(mergedIndex[secondGeomStartIndex]).toBe(indexB[0] + offset);
    });

    it("should handle mix of indexed and non-indexed geometries", () => {
      const geomA = createCustomGeometry({ vertexCount: 4, hasIndex: true });
      const geomB = createCustomGeometry({ vertexCount: 4, hasIndex: false });

      const merged = mergeBufferGeometries([geomA, geomB]);

      // When mixing indexed and non-indexed, result should handle gracefully
      expect(merged.attributes.position.count).toBe(8);
    });

    it("should handle all non-indexed geometries", () => {
      const geomA = createCustomGeometry({ vertexCount: 3, hasIndex: false });
      const geomB = createCustomGeometry({ vertexCount: 3, hasIndex: false });

      const merged = mergeBufferGeometries([geomA, geomB]);

      expect(merged.index).toBeNull();
      expect(merged.attributes.position.count).toBe(6);
    });
  });

  // ===========================================================================
  // Options Tests
  // ===========================================================================

  describe("merge options", () => {
    it("should dispose input geometries when disposeInputs is true", () => {
      const geomA = createTestBoxGeometry();
      const geomB = createTestBoxGeometry();

      // Spy on dispose
      const disposeA = vi.spyOn(geomA, "dispose");
      const disposeB = vi.spyOn(geomB, "dispose");

      mergeBufferGeometries([geomA, geomB], { disposeInputs: true });

      expect(disposeA).toHaveBeenCalled();
      expect(disposeB).toHaveBeenCalled();
    });

    it("should not dispose input geometries by default", () => {
      const geomA = createTestBoxGeometry();
      const geomB = createTestBoxGeometry();

      const disposeA = vi.spyOn(geomA, "dispose");
      const disposeB = vi.spyOn(geomB, "dispose");

      mergeBufferGeometries([geomA, geomB]);

      expect(disposeA).not.toHaveBeenCalled();
      expect(disposeB).not.toHaveBeenCalled();
    });

    it("should preserve custom attributes when preserveCustomAttributes is true", () => {
      const geomA = createCustomGeometry({ vertexCount: 3 });
      const geomB = createCustomGeometry({ vertexCount: 3 });

      // Add custom attribute
      const customA = new Float32Array([1, 2, 3]);
      const customB = new Float32Array([4, 5, 6]);
      geomA.setAttribute("customAttr", new THREE.BufferAttribute(customA, 1));
      geomB.setAttribute("customAttr", new THREE.BufferAttribute(customB, 1));

      const merged = mergeBufferGeometries([geomA, geomB], {
        preserveCustomAttributes: true,
      });

      expect(merged.attributes.customAttr).toBeDefined();
      expect(merged.attributes.customAttr.count).toBe(6);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe("edge cases", () => {
    it("should handle geometry with zero vertices", () => {
      const empty = new THREE.BufferGeometry();
      empty.setAttribute("position", new THREE.BufferAttribute(new Float32Array(0), 3));
      const geomB = createCustomGeometry({ vertexCount: 3 });

      const merged = mergeBufferGeometries([empty, geomB]);

      expect(merged.attributes.position.count).toBe(3);
    });

    it("should handle very large geometries efficiently", () => {
      const largeA = createCustomGeometry({ vertexCount: 10000 });
      const largeB = createCustomGeometry({ vertexCount: 10000 });

      const start = performance.now();
      const merged = mergeBufferGeometries([largeA, largeB]);
      const elapsed = performance.now() - start;

      expect(merged.attributes.position.count).toBe(20000);
      // Should complete in reasonable time (< 100ms)
      expect(elapsed).toBeLessThan(100);
    });

    it("should maintain Float32Array type for attributes", () => {
      const geomA = createTestBoxGeometry();
      const geomB = createTestBoxGeometry();

      const merged = mergeBufferGeometries([geomA, geomB]);

      expect(merged.attributes.position.array).toBeInstanceOf(Float32Array);
      expect(merged.attributes.normal.array).toBeInstanceOf(Float32Array);
      if (merged.attributes.uv) {
        expect(merged.attributes.uv.array).toBeInstanceOf(Float32Array);
      }
    });
  });

  // ===========================================================================
  // ECMA-376 Compliance Tests
  // ===========================================================================

  describe("ECMA-376 compliance", () => {
    /**
     * ECMA-376 Part 1, Section 20.1.8.33 (gradFill)
     * Gradient fills require proper UV coordinates to map correctly.
     */
    it("should preserve UVs for gradient fill compatibility", () => {
      // Simulate ExtrudeGeometry which has UVs
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(10, 0);
      shape.lineTo(10, 10);
      shape.lineTo(0, 10);
      shape.closePath();

      const geomA = new THREE.ExtrudeGeometry(shape, { depth: 5 });
      const geomB = new THREE.ExtrudeGeometry(shape, { depth: 5 });

      const merged = mergeBufferGeometries([geomA, geomB]);

      // UVs must be preserved for ECMA-376 gradient fills
      expect(merged.attributes.uv).toBeDefined();
      expect(merged.attributes.uv.count).toBe(
        geomA.attributes.uv.count + geomB.attributes.uv.count,
      );
    });

    /**
     * ECMA-376 Part 1, Section 20.1.5.1 (bevelT/bevelB)
     * 3D text with bevels should maintain geometry integrity after merge.
     */
    it("should maintain bounding box integrity for camera fitting", () => {
      const geomA = createTestBoxGeometry(1, 1, 1);
      const geomB = createTestBoxGeometry(1, 1, 1);

      // Offset geomB
      const posB = geomB.attributes.position.array as Float32Array;
      for (let i = 0; i < posB.length; i += 3) {
        posB[i] += 2; // Move 2 units in X
      }
      geomB.attributes.position.needsUpdate = true;

      const merged = mergeBufferGeometries([geomA, geomB]);
      merged.computeBoundingBox();

      // Bounding box should encompass both geometries
      expect(merged.boundingBox).toBeDefined();
      expect(merged.boundingBox!.min.x).toBeLessThan(0.1);
      expect(merged.boundingBox!.max.x).toBeGreaterThan(2);
    });

    /**
     * ECMA-376 Part 1, Section 20.1.5.9 (sp3d)
     * Shape 3D properties including extrusion and contour.
     */
    it("should preserve normals for proper lighting (sp3d)", () => {
      const geomA = createTestBoxGeometry();
      const geomB = createTestBoxGeometry();

      const normalCountA = geomA.attributes.normal.count;
      const normalCountB = geomB.attributes.normal.count;

      const merged = mergeBufferGeometries([geomA, geomB]);

      expect(merged.attributes.normal.count).toBe(normalCountA + normalCountB);

      // Verify normals are normalized (length ≈ 1)
      const normals = merged.attributes.normal.array as Float32Array;
      for (let i = 0; i < normals.length; i += 3) {
        const length = Math.sqrt(
          normals[i] ** 2 + normals[i + 1] ** 2 + normals[i + 2] ** 2,
        );
        // Some tolerance for floating point
        expect(length).toBeCloseTo(1, 1);
      }
    });
  });
});

// =============================================================================
// Import vi for spying
// =============================================================================
import { vi } from "vitest";
