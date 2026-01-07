/**
 * @file Extrusion Rendering Measurement Test
 *
 * Systematically measures geometry properties at various extrusion depths
 * to identify where rendering breaks down.
 *
 * Measurement targets:
 * 1. Geometry validity (vertices, indices, normals)
 * 2. Bevel application (present/absent, dimensions)
 * 3. Z coordinate bounds
 * 4. Normal directions
 * 5. Contour expansion uniformity
 */

import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { createAsymmetricExtrudedGeometry, getBevelConfig } from "./bevel";
import { px } from "../../../../domain/types";

// =============================================================================
// Measurement Utilities
// =============================================================================

type GeometryMeasurement = {
  readonly valid: boolean;
  readonly vertexCount: number;
  readonly indexCount: number;
  readonly hasNormals: boolean;
  readonly hasUVs: boolean;
  readonly bounds: {
    readonly min: { x: number; y: number; z: number };
    readonly max: { x: number; y: number; z: number };
    readonly size: { x: number; y: number; z: number };
  } | null;
  readonly hasInvalidVertices: boolean;
  readonly invalidVertexIndices: number[];
  readonly normalStats: {
    readonly avgLength: number;
    readonly minLength: number;
    readonly maxLength: number;
    readonly degenerateCount: number;
  } | null;
};

function measureGeometry(geometry: THREE.BufferGeometry): GeometryMeasurement {
  const positions = geometry.attributes.position?.array as Float32Array | undefined;
  const normals = geometry.attributes.normal?.array as Float32Array | undefined;
  const uvs = geometry.attributes.uv?.array as Float32Array | undefined;
  const indices = geometry.index?.array as Uint32Array | undefined;

  if (!positions || positions.length === 0) {
    return {
      valid: false,
      vertexCount: 0,
      indexCount: 0,
      hasNormals: false,
      hasUVs: false,
      bounds: null,
      hasInvalidVertices: true,
      invalidVertexIndices: [],
      normalStats: null,
    };
  }

  const vertexCount = positions.length / 3;
  const indexCount = indices?.length ?? 0;

  // Check for invalid vertices
  const invalidVertexIndices: number[] = [];
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (let i = 0; i < vertexCount; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];

    if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
      invalidVertexIndices.push(i);
      continue;
    }

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }

  // Measure normals
  let normalStats: GeometryMeasurement["normalStats"] = null;
  if (normals && normals.length > 0) {
    let totalLength = 0;
    let minLength = Infinity;
    let maxLength = -Infinity;
    let degenerateCount = 0;

    for (let i = 0; i < vertexCount; i++) {
      const nx = normals[i * 3];
      const ny = normals[i * 3 + 1];
      const nz = normals[i * 3 + 2];
      const length = Math.sqrt(nx * nx + ny * ny + nz * nz);

      if (!isFinite(length) || length < 0.001) {
        degenerateCount++;
      } else {
        totalLength += length;
        minLength = Math.min(minLength, length);
        maxLength = Math.max(maxLength, length);
      }
    }

    normalStats = {
      avgLength: totalLength / (vertexCount - degenerateCount),
      minLength: minLength === Infinity ? 0 : minLength,
      maxLength: maxLength === -Infinity ? 0 : maxLength,
      degenerateCount,
    };
  }

  return {
    valid: invalidVertexIndices.length === 0,
    vertexCount,
    indexCount,
    hasNormals: normals !== undefined && normals.length > 0,
    hasUVs: uvs !== undefined && uvs.length > 0,
    bounds: {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
      size: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ },
    },
    hasInvalidVertices: invalidVertexIndices.length > 0,
    invalidVertexIndices,
    normalStats,
  };
}

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
// Test Configurations
// =============================================================================

const EXTRUSION_DEPTHS = [0.1, 0.5, 1, 2, 3, 5, 10, 20, 50];
const BEVEL_SIZES = [
  { width: 0, height: 0, label: "no bevel" },
  { width: 1, height: 1, label: "1px bevel" },
  { width: 5, height: 5, label: "5px bevel" },
  { width: 10, height: 10, label: "10px bevel" },
];

// =============================================================================
// Tests
// =============================================================================

describe("Extrusion Rendering Measurement", () => {
  describe("Baseline: Extrusion without bevel", () => {
    const results: Array<{
      depth: number;
      measurement: GeometryMeasurement;
    }> = [];

    EXTRUSION_DEPTHS.forEach((depth) => {
      it(`extrusion ${depth}px - measures geometry`, () => {
        const shape = createSquareShape(100);
        const geometry = createAsymmetricExtrudedGeometry(
          [shape],
          depth,
          { top: undefined, bottom: undefined },
        );

        const measurement = measureGeometry(geometry);
        results.push({ depth, measurement });

        console.log(`\nExtrusion ${depth}px (no bevel):`);
        console.log(`  Valid: ${measurement.valid}`);
        console.log(`  Vertices: ${measurement.vertexCount}`);
        console.log(`  Indices: ${measurement.indexCount}`);
        if (measurement.bounds) {
          console.log(`  Z range: [${measurement.bounds.min.z.toFixed(2)}, ${measurement.bounds.max.z.toFixed(2)}]`);
          console.log(`  Z size: ${measurement.bounds.size.z.toFixed(2)} (expected: ${depth})`);
        }

        expect(measurement.valid).toBe(true);
        expect(measurement.vertexCount).toBeGreaterThan(0);
      });
    });
  });

  describe("Extrusion with bevel", () => {
    BEVEL_SIZES.forEach((bevelSize) => {
      describe(`${bevelSize.label}`, () => {
        EXTRUSION_DEPTHS.forEach((depth) => {
          it(`extrusion ${depth}px + ${bevelSize.label}`, () => {
            const shape = createSquareShape(100);

            const bevelConfig = bevelSize.width > 0
              ? getBevelConfig({
                  width: px(bevelSize.width),
                  height: px(bevelSize.height),
                  preset: "circle",
                })
              : undefined;

            const geometry = createAsymmetricExtrudedGeometry(
              [shape],
              depth,
              { top: bevelConfig, bottom: undefined },
            );

            const measurement = measureGeometry(geometry);

            console.log(`\nExtrusion ${depth}px + ${bevelSize.label}:`);
            console.log(`  Valid: ${measurement.valid}`);
            console.log(`  Vertices: ${measurement.vertexCount}`);
            if (measurement.bounds) {
              const expectedMinZ = -depth;
              const actualMinZ = measurement.bounds.min.z;
              const actualMaxZ = measurement.bounds.max.z;

              console.log(`  Z range: [${actualMinZ.toFixed(2)}, ${actualMaxZ.toFixed(2)}]`);
              console.log(`  Expected Z min: ${expectedMinZ}`);
              console.log(`  Z deviation from expected: ${Math.abs(actualMinZ - expectedMinZ).toFixed(2)}`);

              // If bevel is present, maxZ should be > 0
              if (bevelSize.width > 0 && measurement.vertexCount > 36) {
                console.log(`  Bevel height (maxZ): ${actualMaxZ.toFixed(2)}`);
              }
            }
            if (measurement.normalStats) {
              console.log(`  Normal avg length: ${measurement.normalStats.avgLength.toFixed(4)}`);
              console.log(`  Degenerate normals: ${measurement.normalStats.degenerateCount}`);
            }

            expect(measurement.valid).toBe(true);
            expect(measurement.hasInvalidVertices).toBe(false);
          });
        });
      });
    });
  });

  describe("Critical: Bevel presence detection", () => {
    it("detects when bevel is applied vs skipped", () => {
      const shape = createSquareShape(100);
      const bevelConfig = getBevelConfig({
        width: px(5),
        height: px(5),
        preset: "circle",
      });

      console.log("\n=== Bevel Presence Detection ===");

      const results: Array<{
        depth: number;
        vertexCount: number;
        bevelApplied: boolean;
        maxZ: number;
      }> = [];

      EXTRUSION_DEPTHS.forEach((depth) => {
        const geometry = createAsymmetricExtrudedGeometry(
          [shape],
          depth,
          { top: bevelConfig, bottom: undefined },
        );

        const measurement = measureGeometry(geometry);

        // Heuristic: bevel adds vertices (36 = no bevel, >36 = bevel present)
        const bevelApplied = measurement.vertexCount > 36;
        const maxZ = measurement.bounds?.max.z ?? 0;

        results.push({
          depth,
          vertexCount: measurement.vertexCount,
          bevelApplied,
          maxZ,
        });

        console.log(`Depth ${depth}px: ${measurement.vertexCount} vertices, bevel=${bevelApplied}, maxZ=${maxZ.toFixed(2)}`);
      });

      // Find threshold where bevel starts being applied
      const firstWithBevel = results.find((r) => r.bevelApplied);
      const lastWithoutBevel = [...results].reverse().find((r) => !r.bevelApplied);

      console.log("\n=== Analysis ===");
      if (lastWithoutBevel) {
        console.log(`Bevel SKIPPED at depth ≤ ${lastWithoutBevel.depth}px`);
      }
      if (firstWithBevel) {
        console.log(`Bevel APPLIED at depth ≥ ${firstWithBevel.depth}px`);
      }

      // This test documents current behavior
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("Problem identification: Z coordinate behavior", () => {
    it("analyzes Z coordinate consistency across depths", () => {
      const shape = createSquareShape(100);
      const bevelConfig = getBevelConfig({
        width: px(5),
        height: px(5),
        preset: "circle",
      });

      console.log("\n=== Z Coordinate Analysis ===");
      console.log("Expected: Z should range from -depth to bevelHeight");
      console.log("         Front face at Z=0, bevel extends to +Z");
      console.log("         Back face at Z=-depth");
      console.log("");

      const problems: string[] = [];

      EXTRUSION_DEPTHS.forEach((depth) => {
        const geometry = createAsymmetricExtrudedGeometry(
          [shape],
          depth,
          { top: bevelConfig, bottom: undefined },
        );

        const measurement = measureGeometry(geometry);
        if (!measurement.bounds) return;

        const { min, max } = measurement.bounds;
        const expectedMinZ = -depth;

        // Check Z min matches expected
        const zMinError = Math.abs(min.z - expectedMinZ);
        if (zMinError > 0.1) {
          problems.push(`Depth ${depth}px: Z min = ${min.z.toFixed(2)}, expected ${expectedMinZ}`);
        }

        // Check if bevel height is reasonable (should be clamped)
        const maxBevelHeight = depth * 0.45; // Single bevel maxRatio
        if (max.z > maxBevelHeight + 0.1 && depth < 10) {
          problems.push(`Depth ${depth}px: Bevel height ${max.z.toFixed(2)} exceeds expected max ${maxBevelHeight.toFixed(2)}`);
        }

        console.log(`Depth ${depth}px: Z=[${min.z.toFixed(2)}, ${max.z.toFixed(2)}], expected min=${expectedMinZ}`);
      });

      if (problems.length > 0) {
        console.log("\n=== PROBLEMS FOUND ===");
        problems.forEach((p) => console.log(`  - ${p}`));
      }

      // Document problems found
      expect(problems.length).toBe(0);
    });
  });
});
