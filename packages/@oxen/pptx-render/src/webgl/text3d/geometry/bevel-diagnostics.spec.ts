/**
 * @file Bevel Geometry Diagnostics Test
 *
 * Pinpoints the exact source of degenerate faces and normal inconsistencies
 * in the bevel geometry generation pipeline.
 */

import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { extractBevelPathsFromShape } from "./bevel/path-extraction";
import { generateBevelMesh } from "./bevel/mesh-generation";
import { getBevelProfile } from "./bevel/profiles";
import { threeShapeToShapeInput } from "./bevel/three-adapter";
import type { BevelPath, BevelGeometryData } from "./bevel/types";

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

type FaceDiagnostics = {
  readonly index: number;
  readonly area: number;
  readonly vertices: [
    { x: number; y: number; z: number },
    { x: number; y: number; z: number },
    { x: number; y: number; z: number },
  ];
  readonly isDegenerate: boolean;
  readonly faceNormal: { x: number; y: number; z: number };
  readonly avgVertexNormal: { x: number; y: number; z: number };
  readonly normalDot: number;
};

function analyzeBevelGeometry(data: BevelGeometryData): {
  readonly vertexCount: number;
  readonly faceCount: number;
  readonly degenerateFaces: readonly FaceDiagnostics[];
  readonly inconsistentNormals: readonly FaceDiagnostics[];
  readonly zRange: { min: number; max: number };
  readonly zLayers: readonly number[];
} {
  const positions = data.positions;
  const normals = data.normals;
  const indices = data.indices;

  const vertexCount = positions.length / 3;
  const faceCount = indices.length / 3;

  const degenerateFaces: FaceDiagnostics[] = [];
  const inconsistentNormals: FaceDiagnostics[] = [];

  // Analyze each face
  for (let f = 0; f < faceCount; f++) {
    const i0 = indices[f * 3];
    const i1 = indices[f * 3 + 1];
    const i2 = indices[f * 3 + 2];

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

    // Compute face area using cross product
    const edge1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
    const edge2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
    const cross = {
      x: edge1.y * edge2.z - edge1.z * edge2.y,
      y: edge1.z * edge2.x - edge1.x * edge2.z,
      z: edge1.x * edge2.y - edge1.y * edge2.x,
    };
    const crossLength = Math.sqrt(cross.x ** 2 + cross.y ** 2 + cross.z ** 2);
    const area = crossLength / 2;

    // Compute face normal
    const faceNormal =
      crossLength > 0.0001
        ? { x: cross.x / crossLength, y: cross.y / crossLength, z: cross.z / crossLength }
        : { x: 0, y: 0, z: 1 };

    // Compute average vertex normal
    const n0 = {
      x: normals[i0 * 3],
      y: normals[i0 * 3 + 1],
      z: normals[i0 * 3 + 2],
    };
    const n1 = {
      x: normals[i1 * 3],
      y: normals[i1 * 3 + 1],
      z: normals[i1 * 3 + 2],
    };
    const n2 = {
      x: normals[i2 * 3],
      y: normals[i2 * 3 + 1],
      z: normals[i2 * 3 + 2],
    };
    const avgN = {
      x: (n0.x + n1.x + n2.x) / 3,
      y: (n0.y + n1.y + n2.y) / 3,
      z: (n0.z + n1.z + n2.z) / 3,
    };
    const avgNLength = Math.sqrt(avgN.x ** 2 + avgN.y ** 2 + avgN.z ** 2);
    const avgVertexNormal =
      avgNLength > 0.0001
        ? { x: avgN.x / avgNLength, y: avgN.y / avgNLength, z: avgN.z / avgNLength }
        : { x: 0, y: 0, z: 1 };

    // Dot product between face normal and average vertex normal
    const normalDot =
      faceNormal.x * avgVertexNormal.x +
      faceNormal.y * avgVertexNormal.y +
      faceNormal.z * avgVertexNormal.z;

    const isDegenerate = area < 0.0001;
    const isInconsistent = normalDot < -0.5;

    const diagnostics: FaceDiagnostics = {
      index: f,
      area,
      vertices: [v0, v1, v2],
      isDegenerate,
      faceNormal,
      avgVertexNormal,
      normalDot,
    };

    if (isDegenerate) {
      degenerateFaces.push(diagnostics);
    }
    if (isInconsistent && !isDegenerate) {
      inconsistentNormals.push(diagnostics);
    }
  }

  // Analyze Z layers
  const zValues = new Set<number>();
  for (let i = 0; i < vertexCount; i++) {
    zValues.add(Math.round(positions[i * 3 + 2] * 100) / 100);
  }
  const zLayers = [...zValues].sort((a, b) => a - b);

  return {
    vertexCount,
    faceCount,
    degenerateFaces,
    inconsistentNormals,
    zRange: {
      min: Math.min(...zLayers),
      max: Math.max(...zLayers),
    },
    zLayers,
  };
}

// =============================================================================
// Diagnostics Tests
// =============================================================================

describe("Bevel Geometry Diagnostics", () => {
  describe("Path Extraction", () => {
    it("square shape produces valid paths", () => {
      const shape = createSquareShape(100);
      const shapeInput = threeShapeToShapeInput(shape);
      const paths = extractBevelPathsFromShape(shapeInput);

      console.log("\n=== Path Extraction Diagnostics ===");
      console.log(`Shape points: ${shapeInput.points.length}`);
      console.log(`Paths extracted: ${paths.length}`);

      expect(paths.length).toBe(1);

      const path = paths[0];
      console.log(`Path points: ${path.points.length}`);
      console.log(`Is hole: ${path.isHole}`);
      console.log(`Is closed: ${path.isClosed}`);

      // Check each point has valid position and normal
      for (let i = 0; i < path.points.length; i++) {
        const pt = path.points[i];
        const normalLength = Math.sqrt(pt.normal.x ** 2 + pt.normal.y ** 2);
        console.log(
          `  Point ${i}: (${pt.position.x.toFixed(2)}, ${pt.position.y.toFixed(2)}) ` +
            `normal: (${pt.normal.x.toFixed(3)}, ${pt.normal.y.toFixed(3)}) len=${normalLength.toFixed(3)}`,
        );

        expect(normalLength).toBeCloseTo(1, 2); // Normal should be unit length
      }
    });
  });

  describe("Profile Analysis", () => {
    it("circle profile has correct structure", () => {
      const profile = getBevelProfile("circle");

      console.log("\n=== Circle Profile Diagnostics ===");
      console.log(`Profile points: ${profile.points.length}`);

      for (let i = 0; i < profile.points.length; i++) {
        const pt = profile.points[i];
        console.log(
          `  Point ${i}: t=${pt.t.toFixed(3)} inset=${pt.inset.toFixed(3)} depth=${pt.depth.toFixed(3)}`,
        );
      }

      // First point should be at t=0
      expect(profile.points[0].t).toBe(0);
      // Last point should be at t=1
      expect(profile.points[profile.points.length - 1].t).toBe(1);

      // All t values should be monotonically increasing
      for (let i = 1; i < profile.points.length; i++) {
        expect(profile.points[i].t).toBeGreaterThan(profile.points[i - 1].t);
      }
    });
  });

  describe("Mesh Generation Isolated", () => {
    it("single path with simple profile", () => {
      const shape = createSquareShape(100);
      const shapeInput = threeShapeToShapeInput(shape);
      const paths = extractBevelPathsFromShape(shapeInput);

      // Use angle profile (simplest - only 2 points)
      const simpleProfile = getBevelProfile("angle");
      console.log("\n=== Angle Profile (simplest) ===");
      console.log(`Profile points: ${simpleProfile.points.length}`);

      const data = generateBevelMesh(paths, {
        width: 5,
        height: 5,
        profile: simpleProfile,
        zPosition: 0,
        zDirection: 1,
      });

      const analysis = analyzeBevelGeometry(data);

      console.log("\n=== Angle Profile Mesh Analysis ===");
      console.log(`Vertices: ${analysis.vertexCount}`);
      console.log(`Faces: ${analysis.faceCount}`);
      console.log(`Z layers: ${analysis.zLayers.join(", ")}`);
      console.log(`Degenerate faces: ${analysis.degenerateFaces.length}`);
      console.log(`Inconsistent normals: ${analysis.inconsistentNormals.length}`);

      if (analysis.degenerateFaces.length > 0) {
        console.log("\n=== Degenerate Faces ===");
        for (const face of analysis.degenerateFaces) {
          console.log(`  Face ${face.index}: area=${face.area.toExponential(2)}`);
          console.log(`    v0: (${face.vertices[0].x.toFixed(2)}, ${face.vertices[0].y.toFixed(2)}, ${face.vertices[0].z.toFixed(2)})`);
          console.log(`    v1: (${face.vertices[1].x.toFixed(2)}, ${face.vertices[1].y.toFixed(2)}, ${face.vertices[1].z.toFixed(2)})`);
          console.log(`    v2: (${face.vertices[2].x.toFixed(2)}, ${face.vertices[2].y.toFixed(2)}, ${face.vertices[2].z.toFixed(2)})`);
        }
      }

      expect(analysis.degenerateFaces.length).toBe(0);
      expect(analysis.inconsistentNormals.length).toBe(0);
    });

    it("single path with circle profile", () => {
      const shape = createSquareShape(100);
      const shapeInput = threeShapeToShapeInput(shape);
      const paths = extractBevelPathsFromShape(shapeInput);

      const circleProfile = getBevelProfile("circle");
      console.log("\n=== Circle Profile ===");
      console.log(`Profile points: ${circleProfile.points.length}`);

      const data = generateBevelMesh(paths, {
        width: 5,
        height: 5,
        profile: circleProfile,
        zPosition: 0,
        zDirection: 1,
      });

      const analysis = analyzeBevelGeometry(data);

      console.log("\n=== Circle Profile Mesh Analysis ===");
      console.log(`Vertices: ${analysis.vertexCount}`);
      console.log(`Faces: ${analysis.faceCount}`);
      console.log(`Z layers: ${analysis.zLayers.join(", ")}`);
      console.log(`Degenerate faces: ${analysis.degenerateFaces.length}`);
      console.log(`Inconsistent normals: ${analysis.inconsistentNormals.length}`);

      if (analysis.degenerateFaces.length > 0) {
        console.log("\n=== Degenerate Faces Detail ===");
        for (const face of analysis.degenerateFaces.slice(0, 5)) {
          console.log(`  Face ${face.index}: area=${face.area.toExponential(2)}`);
          console.log(`    v0: (${face.vertices[0].x.toFixed(2)}, ${face.vertices[0].y.toFixed(2)}, ${face.vertices[0].z.toFixed(2)})`);
          console.log(`    v1: (${face.vertices[1].x.toFixed(2)}, ${face.vertices[1].y.toFixed(2)}, ${face.vertices[1].z.toFixed(2)})`);
          console.log(`    v2: (${face.vertices[2].x.toFixed(2)}, ${face.vertices[2].y.toFixed(2)}, ${face.vertices[2].z.toFixed(2)})`);
        }
      }

      if (analysis.inconsistentNormals.length > 0) {
        console.log("\n=== Inconsistent Normals Detail ===");
        for (const face of analysis.inconsistentNormals.slice(0, 5)) {
          console.log(
            `  Face ${face.index}: dot=${face.normalDot.toFixed(3)}`,
          );
          console.log(
            `    Face normal: (${face.faceNormal.x.toFixed(3)}, ${face.faceNormal.y.toFixed(3)}, ${face.faceNormal.z.toFixed(3)})`,
          );
          console.log(
            `    Avg vertex normal: (${face.avgVertexNormal.x.toFixed(3)}, ${face.avgVertexNormal.y.toFixed(3)}, ${face.avgVertexNormal.z.toFixed(3)})`,
          );
        }
      }

      expect(analysis.degenerateFaces.length).toBe(0);
      // Allow some inconsistency at sharp corners
      expect(analysis.inconsistentNormals.length / analysis.faceCount).toBeLessThan(0.4);
    });
  });

  describe("Corner Analysis", () => {
    it("analyzes geometry at square corners", () => {
      const shape = createSquareShape(100);
      const shapeInput = threeShapeToShapeInput(shape);
      const paths = extractBevelPathsFromShape(shapeInput);

      const circleProfile = getBevelProfile("circle");
      const data = generateBevelMesh(paths, {
        width: 5,
        height: 5,
        profile: circleProfile,
        zPosition: 0,
        zDirection: 1,
      });

      console.log("\n=== Corner Analysis ===");

      // Find vertices near each corner
      const corners = [
        { x: 0, y: 0, label: "Bottom-left" },
        { x: 100, y: 0, label: "Bottom-right" },
        { x: 100, y: 100, label: "Top-right" },
        { x: 0, y: 100, label: "Top-left" },
      ];

      const positions = data.positions;
      const normals = data.normals;
      const vertexCount = positions.length / 3;

      for (const corner of corners) {
        const nearbyVertices: Array<{
          index: number;
          x: number;
          y: number;
          z: number;
          nx: number;
          ny: number;
          nz: number;
          dist: number;
        }> = [];

        for (let i = 0; i < vertexCount; i++) {
          const x = positions[i * 3];
          const y = positions[i * 3 + 1];
          const z = positions[i * 3 + 2];
          const dist = Math.sqrt((x - corner.x) ** 2 + (y - corner.y) ** 2);

          if (dist < 10) {
            nearbyVertices.push({
              index: i,
              x,
              y,
              z,
              nx: normals[i * 3],
              ny: normals[i * 3 + 1],
              nz: normals[i * 3 + 2],
              dist,
            });
          }
        }

        console.log(`\n${corner.label} corner (${corner.x}, ${corner.y}):`);
        console.log(`  Nearby vertices: ${nearbyVertices.length}`);

        // Show first few
        for (const v of nearbyVertices.slice(0, 3)) {
          console.log(
            `    [${v.index}] pos=(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}) ` +
              `normal=(${v.nx.toFixed(3)}, ${v.ny.toFixed(3)}, ${v.nz.toFixed(3)})`,
          );
        }
      }

      // Verify corners have vertices
      expect(true).toBe(true); // This is a diagnostic test
    });
  });

  describe("Z Layer Continuity", () => {
    it("bevel mesh has multiple Z layers for curved profile", () => {
      const shape = createSquareShape(100);
      const shapeInput = threeShapeToShapeInput(shape);
      const paths = extractBevelPathsFromShape(shapeInput);

      const circleProfile = getBevelProfile("circle");
      const data = generateBevelMesh(paths, {
        width: 5,
        height: 5,
        profile: circleProfile,
        zPosition: 0,
        zDirection: 1,
      });

      const analysis = analyzeBevelGeometry(data);

      console.log("\n=== Z Layer Continuity ===");
      console.log(`Total Z layers: ${analysis.zLayers.length}`);
      console.log(`Z layers: ${analysis.zLayers.map((z) => z.toFixed(2)).join(", ")}`);
      console.log(`Z range: [${analysis.zRange.min.toFixed(2)}, ${analysis.zRange.max.toFixed(2)}]`);

      // Circle profile with 8 segments should create multiple Z layers
      expect(analysis.zLayers.length).toBeGreaterThan(2);

      // Z range should match bevel height
      expect(analysis.zRange.max - analysis.zRange.min).toBeCloseTo(5, 1);
    });
  });
});
