/**
 * @file Extrusion Overlap Detection Test
 *
 * Tests for overlapping/duplicate geometry at Z=0 junction point
 * between base extrusion front cap and bevel surface.
 *
 * Hypothesis: The "破綻" (breakdown) at extrusion > 1px is caused by:
 * 1. Base extrusion has a front cap at Z=0
 * 2. Bevel surface also starts at Z=0
 * 3. These overlapping surfaces cause z-fighting or visual artifacts
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

type FaceAtZ = {
  readonly faceIndex: number;
  readonly avgZ: number;
  readonly vertices: readonly [
    { x: number; y: number; z: number },
    { x: number; y: number; z: number },
    { x: number; y: number; z: number },
  ];
  readonly normal: { x: number; y: number; z: number };
};

function extractFacesAtZ(
  geometry: THREE.BufferGeometry,
  targetZ: number,
  tolerance = 0.1,
): FaceAtZ[] {
  const positions = geometry.attributes.position?.array as Float32Array;
  const indices = geometry.index?.array as Uint32Array | undefined;

  if (!positions) return [];

  const faces: FaceAtZ[] = [];
  const vertexCount = positions.length / 3;

  // Handle indexed and non-indexed geometry
  const getTriangleIndices = (faceIndex: number): [number, number, number] => {
    if (indices) {
      return [
        indices[faceIndex * 3],
        indices[faceIndex * 3 + 1],
        indices[faceIndex * 3 + 2],
      ];
    }
    return [faceIndex * 3, faceIndex * 3 + 1, faceIndex * 3 + 2];
  };

  const faceCount = indices ? indices.length / 3 : vertexCount / 3;

  for (let f = 0; f < faceCount; f++) {
    const [i0, i1, i2] = getTriangleIndices(f);

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

    // Check if face is at target Z
    if (Math.abs(avgZ - targetZ) < tolerance) {
      // Compute face normal
      const edge1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
      const edge2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
      const cross = {
        x: edge1.y * edge2.z - edge1.z * edge2.y,
        y: edge1.z * edge2.x - edge1.x * edge2.z,
        z: edge1.x * edge2.y - edge1.y * edge2.x,
      };
      const len = Math.sqrt(cross.x ** 2 + cross.y ** 2 + cross.z ** 2);
      const normal =
        len > 0.0001
          ? { x: cross.x / len, y: cross.y / len, z: cross.z / len }
          : { x: 0, y: 0, z: 1 };

      faces.push({
        faceIndex: f,
        avgZ,
        vertices: [v0, v1, v2],
        normal,
      });
    }
  }

  return faces;
}

function countFacesByNormalDirection(faces: FaceAtZ[]): {
  frontFacing: number; // Normal pointing +Z
  backFacing: number; // Normal pointing -Z
  sideFacing: number; // Normal pointing XY
} {
  let frontFacing = 0;
  let backFacing = 0;
  let sideFacing = 0;

  for (const face of faces) {
    if (face.normal.z > 0.5) {
      frontFacing++;
    } else if (face.normal.z < -0.5) {
      backFacing++;
    } else {
      sideFacing++;
    }
  }

  return { frontFacing, backFacing, sideFacing };
}

// =============================================================================
// Tests
// =============================================================================

describe("Extrusion Overlap Detection", () => {
  describe("Base extrusion front cap analysis", () => {
    it("extrusion without bevel has front cap at Z=0", () => {
      const shape = createSquareShape(100);
      const depth = 5;

      const geometry = createAsymmetricExtrudedGeometry(
        [shape],
        depth,
        { top: undefined, bottom: undefined },
      );

      // After translate(-depth), front cap should be at Z=0
      const facesAtZ0 = extractFacesAtZ(geometry, 0);
      const normalCounts = countFacesByNormalDirection(facesAtZ0);

      console.log("\n=== Extrusion without bevel (depth=5) ===");
      console.log(`Faces at Z=0: ${facesAtZ0.length}`);
      console.log(`  Front-facing (+Z normal): ${normalCounts.frontFacing}`);
      console.log(`  Back-facing (-Z normal): ${normalCounts.backFacing}`);
      console.log(`  Side-facing (XY normal): ${normalCounts.sideFacing}`);

      // Should have front cap faces
      expect(normalCounts.frontFacing).toBeGreaterThan(0);
      // Should NOT have back-facing faces at Z=0
      expect(normalCounts.backFacing).toBe(0);
    });

    it("extrusion with bevel - check for overlapping front cap", () => {
      const shape = createSquareShape(100);
      const depth = 5;
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

      // Check faces at Z=0 (junction point)
      const facesAtZ0 = extractFacesAtZ(geometry, 0);
      const normalCounts = countFacesByNormalDirection(facesAtZ0);

      console.log("\n=== Extrusion WITH bevel (depth=5, bevel=5) ===");
      console.log(`Faces at Z=0: ${facesAtZ0.length}`);
      console.log(`  Front-facing (+Z normal): ${normalCounts.frontFacing}`);
      console.log(`  Back-facing (-Z normal): ${normalCounts.backFacing}`);
      console.log(`  Side-facing (XY normal): ${normalCounts.sideFacing}`);

      if (facesAtZ0.length > 0) {
        console.log("\nSample faces at Z=0:");
        for (const face of facesAtZ0.slice(0, 3)) {
          console.log(
            `  Face ${face.faceIndex}: normal=(${face.normal.x.toFixed(3)}, ${face.normal.y.toFixed(3)}, ${face.normal.z.toFixed(3)})`,
          );
        }
      }

      // CRITICAL: If there's a front cap AND bevel both at Z=0, we have overlap
      // The front cap should NOT exist when bevel is present
      // (or the bevel profile should start ABOVE Z=0)

      // This test documents current behavior - we'll analyze if this is the problem
    });
  });

  describe("Overlap detection at various depths", () => {
    const testCases = [
      { depth: 1, label: "1px (bevel skipped)" },
      { depth: 2, label: "2px (bevel applied)" },
      { depth: 5, label: "5px (bevel applied)" },
      { depth: 10, label: "10px (bevel applied)" },
    ];

    testCases.forEach(({ depth, label }) => {
      it(`${label}: analyze faces at Z=0`, () => {
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

        const facesAtZ0 = extractFacesAtZ(geometry, 0, 0.05);
        const normalCounts = countFacesByNormalDirection(facesAtZ0);

        console.log(`\n=== ${label} ===`);
        console.log(`Total faces at Z≈0: ${facesAtZ0.length}`);
        console.log(`  Front-facing: ${normalCounts.frontFacing}`);
        console.log(`  Side-facing: ${normalCounts.sideFacing}`);

        // At 1px depth, bevel is skipped, so there should be a front cap
        // At >1px depth, bevel is applied, front cap should NOT exist
        // (otherwise we have Z-fighting)

        if (depth <= 1) {
          // Bevel skipped - front cap expected
          expect(normalCounts.frontFacing).toBeGreaterThan(0);
        } else {
          // Bevel applied - front cap should NOT exist to avoid overlap
          // If this fails, it indicates the potential source of visual problems
          console.log(
            `  WARNING: ${normalCounts.frontFacing} front-facing faces at Z=0 with bevel present`,
          );
        }
      });
    });
  });

  describe("Duplicate vertex detection at Z=0", () => {
    it("checks for duplicate vertices at junction point", () => {
      const shape = createSquareShape(100);
      const depth = 5;
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

      const positions = geometry.attributes.position?.array as Float32Array;
      const vertexCount = positions.length / 3;

      // Find all vertices at Z≈0
      const verticesAtZ0: Array<{ x: number; y: number; index: number }> = [];
      for (let i = 0; i < vertexCount; i++) {
        const z = positions[i * 3 + 2];
        if (Math.abs(z) < 0.05) {
          verticesAtZ0.push({
            x: positions[i * 3],
            y: positions[i * 3 + 1],
            index: i,
          });
        }
      }

      // Check for duplicates (same XY position)
      const duplicates: Array<{ indices: number[]; x: number; y: number }> = [];
      for (let i = 0; i < verticesAtZ0.length; i++) {
        for (let j = i + 1; j < verticesAtZ0.length; j++) {
          const v1 = verticesAtZ0[i];
          const v2 = verticesAtZ0[j];
          const dx = Math.abs(v1.x - v2.x);
          const dy = Math.abs(v1.y - v2.y);
          if (dx < 0.01 && dy < 0.01) {
            // Check if already in duplicates list
            const existing = duplicates.find(
              (d) => Math.abs(d.x - v1.x) < 0.01 && Math.abs(d.y - v1.y) < 0.01,
            );
            if (existing) {
              if (!existing.indices.includes(v2.index)) {
                existing.indices.push(v2.index);
              }
            } else {
              duplicates.push({
                indices: [v1.index, v2.index],
                x: v1.x,
                y: v1.y,
              });
            }
          }
        }
      }

      console.log("\n=== Duplicate Vertex Analysis at Z=0 ===");
      console.log(`Total vertices at Z≈0: ${verticesAtZ0.length}`);
      console.log(`Duplicate positions found: ${duplicates.length}`);

      if (duplicates.length > 0) {
        console.log("\nDuplicate positions (first 5):");
        for (const dup of duplicates.slice(0, 5)) {
          console.log(
            `  (${dup.x.toFixed(2)}, ${dup.y.toFixed(2)}): ${dup.indices.length} vertices`,
          );
        }

        // Duplicates indicate potential T-junction or overlap issues
        console.log(
          "\nWARNING: Duplicate vertices at Z=0 may cause visual artifacts",
        );
      }
    });
  });

  describe("Geometry component analysis", () => {
    it("separates base extrusion from bevel geometry", () => {
      const shape = createSquareShape(100);
      const depth = 5;
      const bevelConfig = getBevelConfig({
        width: px(5),
        height: px(5),
        preset: "circle",
      });

      // Create without bevel (base only)
      const baseOnly = createAsymmetricExtrudedGeometry(
        [shape],
        depth,
        { top: undefined, bottom: undefined },
      );

      // Create with bevel (base + bevel merged)
      const withBevel = createAsymmetricExtrudedGeometry(
        [shape],
        depth,
        { top: bevelConfig, bottom: undefined },
      );

      const baseVertices = baseOnly.attributes.position.count;
      const totalVertices = withBevel.attributes.position.count;
      const bevelVertices = totalVertices - baseVertices;

      console.log("\n=== Geometry Component Analysis ===");
      console.log(`Base extrusion vertices: ${baseVertices}`);
      console.log(`Total with bevel vertices: ${totalVertices}`);
      console.log(`Bevel-only vertices: ${bevelVertices}`);

      // Analyze Z distribution
      const baseZ = new Set<number>();
      const totalZ = new Set<number>();

      const basePos = baseOnly.attributes.position.array as Float32Array;
      for (let i = 0; i < basePos.length; i += 3) {
        baseZ.add(Math.round(basePos[i + 2] * 100) / 100);
      }

      const totalPos = withBevel.attributes.position.array as Float32Array;
      for (let i = 0; i < totalPos.length; i += 3) {
        totalZ.add(Math.round(totalPos[i + 2] * 100) / 100);
      }

      console.log(`\nBase Z layers: ${[...baseZ].sort((a, b) => a - b).join(", ")}`);
      console.log(`Total Z layers: ${[...totalZ].sort((a, b) => a - b).join(", ")}`);

      // Key insight: If base has Z=0 faces and bevel also starts at Z=0,
      // the merged geometry has overlapping surfaces at Z=0
      const baseHasZ0 = baseZ.has(0);
      const bevelStartsAtZ0 = totalZ.has(0) && [...totalZ].some((z) => z > 0);

      console.log(`\nBase has Z=0: ${baseHasZ0}`);
      console.log(`Bevel starts at Z=0: ${bevelStartsAtZ0}`);

      if (baseHasZ0 && bevelStartsAtZ0) {
        console.log("\n⚠️ POTENTIAL ISSUE: Both base front cap and bevel exist at Z=0");
        console.log("This can cause z-fighting or visual artifacts");
      }
    });
  });
});
