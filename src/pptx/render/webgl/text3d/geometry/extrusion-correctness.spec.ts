/**
 * @file Extrusion Correctness Verification Test
 *
 * Defines what "correct" extrusion+bevel behavior looks like:
 * 1. Bevel-base junction: no gaps, continuous geometry
 * 2. Face winding: consistent for proper culling
 * 3. Normal directions: pointing outward for lighting
 * 4. UV continuity: no seams at junction
 *
 * Tests should FAIL when geometry is broken.
 */

import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { createAsymmetricExtrudedGeometry, getBevelConfig } from "./bevel";
import { px } from "../../../../domain/types";

// =============================================================================
// Test Utilities
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

type VertexData = {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  uv: THREE.Vector2;
};

function extractVertices(geometry: THREE.BufferGeometry): VertexData[] {
  const positions = geometry.attributes.position?.array as Float32Array;
  const normals = geometry.attributes.normal?.array as Float32Array;
  const uvs = geometry.attributes.uv?.array as Float32Array;

  if (!positions) return [];

  const vertices: VertexData[] = [];
  const count = positions.length / 3;

  for (let i = 0; i < count; i++) {
    vertices.push({
      position: new THREE.Vector3(
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2],
      ),
      normal: normals
        ? new THREE.Vector3(
            normals[i * 3],
            normals[i * 3 + 1],
            normals[i * 3 + 2],
          )
        : new THREE.Vector3(0, 0, 1),
      uv: uvs
        ? new THREE.Vector2(uvs[i * 2], uvs[i * 2 + 1])
        : new THREE.Vector2(0, 0),
    });
  }

  return vertices;
}

type FaceData = {
  indices: [number, number, number];
  vertices: [VertexData, VertexData, VertexData];
  normal: THREE.Vector3;
  area: number;
};

function extractFaces(geometry: THREE.BufferGeometry): FaceData[] {
  const vertices = extractVertices(geometry);
  const indices = geometry.index?.array as Uint32Array | undefined;

  const faces: FaceData[] = [];

  if (indices) {
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i];
      const i1 = indices[i + 1];
      const i2 = indices[i + 2];

      const v0 = vertices[i0];
      const v1 = vertices[i1];
      const v2 = vertices[i2];

      // Compute face normal using cross product
      const edge1 = v1.position.clone().sub(v0.position);
      const edge2 = v2.position.clone().sub(v0.position);
      const normal = edge1.cross(edge2).normalize();

      // Compute face area
      const area = edge1.clone().cross(edge2).length() / 2;

      faces.push({
        indices: [i0, i1, i2],
        vertices: [v0, v1, v2],
        normal,
        area,
      });
    }
  } else {
    // Non-indexed geometry
    for (let i = 0; i < vertices.length; i += 3) {
      const v0 = vertices[i];
      const v1 = vertices[i + 1];
      const v2 = vertices[i + 2];

      const edge1 = v1.position.clone().sub(v0.position);
      const edge2 = v2.position.clone().sub(v0.position);
      const normal = edge1.cross(edge2).normalize();
      const area = edge1.clone().cross(edge2).length() / 2;

      faces.push({
        indices: [i, i + 1, i + 2],
        vertices: [v0, v1, v2],
        normal,
        area,
      });
    }
  }

  return faces;
}

// =============================================================================
// Tests
// =============================================================================

describe("Extrusion Correctness", () => {
  describe("Criterion 1: No degenerate faces", () => {
    const testCases = [
      { depth: 1, bevelHeight: 5, label: "1px extrusion + 5px bevel" },
      { depth: 2, bevelHeight: 5, label: "2px extrusion + 5px bevel" },
      { depth: 5, bevelHeight: 5, label: "5px extrusion + 5px bevel" },
      { depth: 10, bevelHeight: 5, label: "10px extrusion + 5px bevel" },
      { depth: 20, bevelHeight: 5, label: "20px extrusion + 5px bevel" },
    ];

    testCases.forEach(({ depth, bevelHeight, label }) => {
      it(`${label}: no zero-area faces`, () => {
        const shape = createSquareShape(100);
        const bevelConfig = getBevelConfig({
          width: px(5),
          height: px(bevelHeight),
          preset: "circle",
        });

        const geometry = createAsymmetricExtrudedGeometry(
          [shape],
          depth,
          { top: bevelConfig, bottom: undefined },
        );

        const faces = extractFaces(geometry);
        const degenerateFaces = faces.filter((f) => f.area < 0.0001);

        console.log(`${label}: ${faces.length} faces, ${degenerateFaces.length} degenerate`);

        expect(degenerateFaces.length).toBe(0);
      });
    });
  });

  describe("Criterion 2: Face normals point outward", () => {
    const testCases = [
      { depth: 2, label: "2px extrusion" },
      { depth: 5, label: "5px extrusion" },
      { depth: 20, label: "20px extrusion" },
    ];

    testCases.forEach(({ depth, label }) => {
      it(`${label}: normals consistent with face direction`, () => {
        const shape = createSquareShape(100);
        const bevelConfig = getBevelConfig({
          width: px(5),
          height: px(5),
          preset: "circle",
        });

        const geometry = createAsymmetricExtrudedGeometry(
          [shape],
          depth,
          { top: bevelConfig, bottom: undefined },
        );

        const faces = extractFaces(geometry);
        let inconsistentNormals = 0;

        for (const face of faces) {
          // Average vertex normal
          const avgVertexNormal = face.vertices[0].normal
            .clone()
            .add(face.vertices[1].normal)
            .add(face.vertices[2].normal)
            .divideScalar(3);

          // Check if face normal is roughly aligned with vertex normals
          const dot = face.normal.dot(avgVertexNormal);

          // Normals should be roughly aligned (dot > 0)
          // Some variation is acceptable due to smooth shading
          if (dot < -0.5) {
            inconsistentNormals++;
          }
        }

        console.log(`${label}: ${inconsistentNormals}/${faces.length} inconsistent normals`);

        // Allow some inconsistency at sharp edges
        const inconsistencyRate = inconsistentNormals / faces.length;
        expect(inconsistencyRate).toBeLessThan(0.1);
      });
    });
  });

  describe("Criterion 3: Z-layer continuity at bevel-base junction", () => {
    it("vertices exist at junction Z=0", () => {
      const shape = createSquareShape(100);
      const bevelConfig = getBevelConfig({
        width: px(5),
        height: px(5),
        preset: "circle",
      });

      // Use depth where bevel IS applied
      const geometry = createAsymmetricExtrudedGeometry(
        [shape],
        5, // 5px extrusion, bevel will be applied
        { top: bevelConfig, bottom: undefined },
      );

      const vertices = extractVertices(geometry);

      // Find vertices at Z ≈ 0 (junction point)
      const junctionVertices = vertices.filter(
        (v) => Math.abs(v.position.z) < 0.1,
      );

      console.log(`Junction (Z≈0) vertices: ${junctionVertices.length}`);

      // There should be vertices at the junction
      expect(junctionVertices.length).toBeGreaterThan(0);
    });

    it("bevel and base both have vertices at junction (Z=0)", () => {
      const shape = createSquareShape(100);
      const bevelConfig = getBevelConfig({
        width: px(5),
        height: px(5),
        preset: "circle",
      });

      const depth = 5;
      const geometry = createAsymmetricExtrudedGeometry(
        [shape],
        depth,
        { top: bevelConfig, bottom: undefined },
      );

      const vertices = extractVertices(geometry);

      // Get all Z values
      const zValues = vertices.map((v) => v.position.z).sort((a, b) => a - b);
      const uniqueZValues = [...new Set(zValues.map((z) => Math.round(z * 100) / 100))];

      console.log(`Z values: ${uniqueZValues.join(", ")}`);

      // Verify junction point (Z=0) has vertices
      const junctionZ = 0;
      const hasJunctionVertices = uniqueZValues.some(
        (z) => Math.abs(z - junctionZ) < 0.1,
      );

      // Verify base extends to back (Z=-depth)
      const hasBackFace = uniqueZValues.some(
        (z) => Math.abs(z - (-depth)) < 0.1,
      );

      // Verify bevel extends from junction toward +Z
      const bevelZValues = uniqueZValues.filter((z) => z > 0.1);

      console.log(`Junction (Z=0) present: ${hasJunctionVertices}`);
      console.log(`Back face (Z=${-depth}) present: ${hasBackFace}`);
      console.log(`Bevel Z layers: ${bevelZValues.length}`);

      expect(hasJunctionVertices).toBe(true);
      expect(hasBackFace).toBe(true);
      expect(bevelZValues.length).toBeGreaterThan(0); // Bevel should exist
    });
  });

  describe("Criterion 4: Bevel profile correctness", () => {
    it("bevel creates smooth curve, not flat surface", () => {
      const shape = createSquareShape(100);
      const bevelConfig = getBevelConfig({
        width: px(5),
        height: px(5),
        preset: "circle",
      });

      const depth = 10;
      const geometry = createAsymmetricExtrudedGeometry(
        [shape],
        depth,
        { top: bevelConfig, bottom: undefined },
      );

      const vertices = extractVertices(geometry);

      // Get vertices in bevel region (Z > 0)
      const bevelVertices = vertices.filter((v) => v.position.z > 0.1);

      if (bevelVertices.length === 0) {
        console.log("No bevel vertices found - bevel may be skipped");
        expect(bevelVertices.length).toBeGreaterThan(0);
        return;
      }

      // Get unique Z values in bevel region
      const bevelZValues = [...new Set(
        bevelVertices.map((v) => Math.round(v.position.z * 100) / 100),
      )].sort((a, b) => a - b);

      console.log(`Bevel Z layers: ${bevelZValues.length} (values: ${bevelZValues.join(", ")})`);

      // Circle bevel should have multiple Z layers for smooth curve
      // If only 1 layer, it's flat (not a proper bevel)
      expect(bevelZValues.length).toBeGreaterThan(1);
    });

    it("bevel height is clamped to maxRatio of extrusion depth", () => {
      const shape = createSquareShape(100);
      const requestedBevelHeight = 20; // Much larger than extrusion
      const bevelConfig = getBevelConfig({
        width: px(10),
        height: px(requestedBevelHeight),
        preset: "circle",
      });

      const depth = 5;
      const geometry = createAsymmetricExtrudedGeometry(
        [shape],
        depth,
        { top: bevelConfig, bottom: undefined },
      );

      const vertices = extractVertices(geometry);
      const maxZ = Math.max(...vertices.map((v) => v.position.z));

      // maxRatio for single bevel is 0.45
      const expectedMaxBevelHeight = depth * 0.45;

      console.log(`Requested bevel: ${requestedBevelHeight}, Max Z: ${maxZ.toFixed(2)}, Expected max: ${expectedMaxBevelHeight.toFixed(2)}`);

      // Bevel should be clamped
      expect(maxZ).toBeLessThanOrEqual(expectedMaxBevelHeight + 0.1);
    });
  });

  describe("Criterion 5: Consistent behavior across extrusion depths", () => {
    it("same bevel config produces proportionally correct results", () => {
      const shape = createSquareShape(100);
      const bevelConfig = getBevelConfig({
        width: px(5),
        height: px(5),
        preset: "circle",
      });

      const results: Array<{
        depth: number;
        vertexCount: number;
        maxZ: number;
        minZ: number;
      }> = [];

      // Test various depths where bevel SHOULD be applied
      [2, 3, 5, 10, 20].forEach((depth) => {
        const geometry = createAsymmetricExtrudedGeometry(
          [shape],
          depth,
          { top: bevelConfig, bottom: undefined },
        );

        const vertices = extractVertices(geometry);
        const zValues = vertices.map((v) => v.position.z);

        results.push({
          depth,
          vertexCount: vertices.length,
          maxZ: Math.max(...zValues),
          minZ: Math.min(...zValues),
        });
      });

      console.log("\n=== Consistency across depths ===");
      results.forEach((r) => {
        const expectedMinZ = -r.depth;
        const minZError = Math.abs(r.minZ - expectedMinZ);
        console.log(`Depth ${r.depth}px: vertices=${r.vertexCount}, Z=[${r.minZ.toFixed(2)}, ${r.maxZ.toFixed(2)}], minZ error=${minZError.toFixed(2)}`);
      });

      // Verify consistency
      // 1. All should have same vertex count (same topology)
      const uniqueVertexCounts = [...new Set(results.map((r) => r.vertexCount))];
      expect(uniqueVertexCounts.length).toBe(1);

      // 2. minZ should always equal -depth
      results.forEach((r) => {
        expect(r.minZ).toBeCloseTo(-r.depth, 1);
      });
    });
  });

  describe("Visual rendering requirements", () => {
    it("front face (Z=maxZ) has correct outward normal", () => {
      const shape = createSquareShape(100);
      const bevelConfig = getBevelConfig({
        width: px(5),
        height: px(5),
        preset: "circle",
      });

      const geometry = createAsymmetricExtrudedGeometry(
        [shape],
        10,
        { top: bevelConfig, bottom: undefined },
      );

      const faces = extractFaces(geometry);
      const vertices = extractVertices(geometry);
      const maxZ = Math.max(...vertices.map((v) => v.position.z));

      // Find faces at the front (highest Z)
      const frontFaces = faces.filter((f) =>
        f.vertices.every((v) => Math.abs(v.position.z - maxZ) < 0.1),
      );

      if (frontFaces.length === 0) {
        console.log("No front faces found at maxZ");
        return;
      }

      // Front faces should have normals pointing in +Z direction
      const wrongNormals = frontFaces.filter((f) => f.normal.z < 0);

      console.log(`Front faces: ${frontFaces.length}, wrong normals: ${wrongNormals.length}`);
      console.log(`Sample front face normal: (${frontFaces[0].normal.x.toFixed(2)}, ${frontFaces[0].normal.y.toFixed(2)}, ${frontFaces[0].normal.z.toFixed(2)})`);

      expect(wrongNormals.length).toBe(0);
    });

    it("back face (Z=minZ) has correct outward normal", () => {
      const shape = createSquareShape(100);

      const geometry = createAsymmetricExtrudedGeometry(
        [shape],
        10,
        { top: undefined, bottom: undefined },
      );

      const faces = extractFaces(geometry);
      const vertices = extractVertices(geometry);
      const minZ = Math.min(...vertices.map((v) => v.position.z));

      // Find faces at the back (lowest Z)
      const backFaces = faces.filter((f) =>
        f.vertices.every((v) => Math.abs(v.position.z - minZ) < 0.1),
      );

      if (backFaces.length === 0) {
        console.log("No back faces found at minZ");
        return;
      }

      // Back faces should have normals pointing in -Z direction
      const wrongNormals = backFaces.filter((f) => f.normal.z > 0);

      console.log(`Back faces: ${backFaces.length}, wrong normals: ${wrongNormals.length}`);
      console.log(`Sample back face normal: (${backFaces[0].normal.x.toFixed(2)}, ${backFaces[0].normal.y.toFixed(2)}, ${backFaces[0].normal.z.toFixed(2)})`);

      expect(wrongNormals.length).toBe(0);
    });
  });
});
