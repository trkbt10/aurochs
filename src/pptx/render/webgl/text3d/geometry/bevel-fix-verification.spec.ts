/**
 * @file Bevel Fix Verification Test
 *
 * Verifies that the fix for extrusion+bevel z-fighting is correctly applied
 * through the rendering pipeline (from-contours-async.ts).
 *
 * The root cause was: THREE.ExtrudeGeometry creates front/back caps that
 * overlap with bevel surfaces at Z=0, causing visual artifacts.
 *
 * The fix: Use Three.js independent extrusion generator that omits caps
 * when bevels are present.
 */

import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  createExtrudedGeometryWithBevel,
  threeShapeToShapeInput,
  type AsymmetricBevelSpec,
} from "./bevel/three-adapter";
import { generateExtrusion } from "./bevel/extrusion";

// =============================================================================
// Test Fixtures
// =============================================================================

function createSquareShape(size = 100): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(size, 0);
  shape.lineTo(size, size);
  shape.lineTo(0, size);
  shape.closePath();
  return shape;
}

// =============================================================================
// Tests
// =============================================================================

describe("Bevel Fix Verification", () => {
  describe("Extrusion cap omission (core fix)", () => {
    it("generateExtrusion correctly omits front cap when specified", () => {
      const shape = threeShapeToShapeInput(createSquareShape(100));

      // With front cap
      const withCap = generateExtrusion(shape, {
        depth: 10,
        includeFrontCap: true,
        includeBackCap: true,
      });

      // Without front cap
      const withoutCap = generateExtrusion(shape, {
        depth: 10,
        includeFrontCap: false, // KEY: cap omitted
        includeBackCap: true,
      });

      // Geometry without cap should have fewer vertices
      const withCapVertices = withCap.positions.length / 3;
      const withoutCapVertices = withoutCap.positions.length / 3;

      console.log(`With cap: ${withCapVertices} vertices`);
      console.log(`Without cap: ${withoutCapVertices} vertices`);

      expect(withoutCapVertices).toBeLessThan(withCapVertices);
    });

    it("generateExtrusion correctly omits back cap when specified", () => {
      const shape = threeShapeToShapeInput(createSquareShape(100));

      // With back cap
      const withCap = generateExtrusion(shape, {
        depth: 10,
        includeFrontCap: true,
        includeBackCap: true,
      });

      // Without back cap
      const withoutCap = generateExtrusion(shape, {
        depth: 10,
        includeFrontCap: true,
        includeBackCap: false, // KEY: cap omitted
      });

      const withCapVertices = withCap.positions.length / 3;
      const withoutCapVertices = withoutCap.positions.length / 3;

      expect(withoutCapVertices).toBeLessThan(withCapVertices);
    });
  });

  describe("createExtrudedGeometryWithBevel integration", () => {
    it("geometry with bevel has different vertex count than without", () => {
      const shape = createSquareShape(100);

      // Without bevel
      const noBevel = createExtrudedGeometryWithBevel([shape], 10, {
        top: undefined,
        bottom: undefined,
      });

      // With top bevel
      const withBevel = createExtrudedGeometryWithBevel([shape], 10, {
        top: { width: 5, height: 5, preset: "circle" },
        bottom: undefined,
      });

      const noBevelVertices = noBevel.attributes.position.count;
      const withBevelVertices = withBevel.attributes.position.count;

      console.log(`No bevel: ${noBevelVertices} vertices`);
      console.log(`With bevel: ${withBevelVertices} vertices`);

      // With bevel should have MORE vertices (bevel surface added)
      // but DIFFERENT structure (cap removed, bevel added)
      expect(withBevelVertices).not.toBe(noBevelVertices);
    });

    it("generated geometry has valid structure", () => {
      const shape = createSquareShape(100);
      const geometry = createExtrudedGeometryWithBevel([shape], 10, {
        top: { width: 5, height: 5, preset: "circle" },
        bottom: undefined,
      });

      expect(geometry.attributes.position).toBeDefined();
      expect(geometry.attributes.normal).toBeDefined();
      expect(geometry.attributes.uv).toBeDefined();
      expect(geometry.index).toBeDefined();

      const positions = geometry.attributes.position as THREE.BufferAttribute;
      const normals = geometry.attributes.normal as THREE.BufferAttribute;
      const uvs = geometry.attributes.uv as THREE.BufferAttribute;

      // Verify array lengths match
      expect(normals.count).toBe(positions.count);
      expect(uvs.count).toBe(positions.count);
    });

    it("geometry bounds are correct", () => {
      const shape = createSquareShape(100);
      const depth = 10;
      const geometry = createExtrudedGeometryWithBevel([shape], depth, {
        top: { width: 5, height: 5, preset: "circle" },
        bottom: undefined,
      });

      geometry.computeBoundingBox();
      const box = geometry.boundingBox!;

      // After translate(-depth), Z range should be approximately:
      // Front (0) to back (-depth)
      expect(box.min.z).toBeLessThan(0);
      expect(box.max.z).toBeLessThanOrEqual(0.1); // Front face at Z≈0

      // XY should cover the shape
      expect(box.min.x).toBeGreaterThanOrEqual(-1);
      expect(box.max.x).toBeLessThanOrEqual(101);
      expect(box.min.y).toBeGreaterThanOrEqual(-1);
      expect(box.max.y).toBeLessThanOrEqual(101);
    });
  });

  describe("No excessive duplicate vertices at bevel junction (Z=0)", () => {
    it("with bevel has fewer or equal duplicates than without bevel (FIX VERIFIED)", () => {
      const shape = createSquareShape(100);

      // Without bevel (has cap at Z=0)
      const noBevelGeom = createExtrudedGeometryWithBevel([shape], 10, {
        top: undefined,
        bottom: undefined,
      });

      // With bevel (cap omitted at Z=0)
      const withBevelGeom = createExtrudedGeometryWithBevel([shape], 10, {
        top: { width: 5, height: 5, preset: "circle" },
        bottom: undefined,
      });

      const noBevelPositions = noBevelGeom.attributes.position.array as Float32Array;
      const withBevelPositions = withBevelGeom.attributes.position.array as Float32Array;

      const noBevelDuplicates = countDuplicateVerticesAtZ(noBevelPositions, 0, 0.1);
      const withBevelDuplicates = countDuplicateVerticesAtZ(withBevelPositions, 0, 0.1);

      console.log(`\n=== FIX VERIFICATION ===`);
      console.log(`No bevel - duplicates at Z=0: ${noBevelDuplicates}`);
      console.log(`With bevel - duplicates at Z=0: ${withBevelDuplicates}`);

      // KEY VERIFICATION: With bevel should have FEWER or equal duplicates
      // because the overlapping cap is removed
      // If withBevel had MORE duplicates, it would indicate cap+bevel overlap
      expect(withBevelDuplicates).toBeLessThanOrEqual(noBevelDuplicates);
    });
  });

  describe("Different extrusion depths work correctly", () => {
    const depths = [2, 5, 10, 20];

    depths.forEach((depth) => {
      it(`depth ${depth}px: geometry is valid`, () => {
        const shape = createSquareShape(100);
        const geometry = createExtrudedGeometryWithBevel([shape], depth, {
          top: { width: 5, height: 5, preset: "circle" },
          bottom: undefined,
        });

        expect(geometry.attributes.position).toBeDefined();
        expect(geometry.attributes.position.count).toBeGreaterThan(0);

        geometry.computeBoundingBox();
        const box = geometry.boundingBox!;

        // Z range should span from 0 to approximately -depth
        const zRange = box.max.z - box.min.z;
        expect(zRange).toBeGreaterThan(depth * 0.5); // At least half the depth
      });
    });
  });

  describe("Asymmetric bevel configurations", () => {
    it("both bevels: geometry is valid", () => {
      const shape = createSquareShape(100);
      const geometry = createExtrudedGeometryWithBevel([shape], 10, {
        top: { width: 5, height: 5, preset: "circle" },
        bottom: { width: 3, height: 3, preset: "angle" },
      });

      expect(geometry.attributes.position).toBeDefined();
      expect(geometry.attributes.position.count).toBeGreaterThan(0);
    });

    it("only bottom bevel: geometry is valid", () => {
      const shape = createSquareShape(100);
      const geometry = createExtrudedGeometryWithBevel([shape], 10, {
        top: undefined,
        bottom: { width: 3, height: 3, preset: "circle" },
      });

      expect(geometry.attributes.position).toBeDefined();
      expect(geometry.attributes.position.count).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Utilities
// =============================================================================

function countDuplicateVerticesAtZ(
  positions: Float32Array,
  targetZ: number,
  tolerance: number,
): number {
  // Find all vertices at target Z
  const verticesAtZ: Array<{ x: number; y: number; index: number }> = [];
  const vertexCount = positions.length / 3;

  for (let i = 0; i < vertexCount; i++) {
    const z = positions[i * 3 + 2];
    if (Math.abs(z - targetZ) < tolerance) {
      verticesAtZ.push({
        x: positions[i * 3],
        y: positions[i * 3 + 1],
        index: i,
      });
    }
  }

  // Count duplicates (same XY position)
  let duplicateCount = 0;
  for (let i = 0; i < verticesAtZ.length; i++) {
    for (let j = i + 1; j < verticesAtZ.length; j++) {
      const dx = Math.abs(verticesAtZ[i].x - verticesAtZ[j].x);
      const dy = Math.abs(verticesAtZ[i].y - verticesAtZ[j].y);
      if (dx < 0.01 && dy < 0.01) {
        duplicateCount++;
      }
    }
  }

  return duplicateCount;
}
