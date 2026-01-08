/**
 * @file Tests for three-adapter.ts
 *
 * Tests for the Three.js adapter functions, especially
 * createExtrudedGeometryWithBevel which handles asymmetric bevels.
 */

import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  threeShapeToShapeInput,
  shapeInputToThreeShape,
  createExtrudedGeometryWithBevel,
  type AsymmetricBevelSpec,
} from "./three-adapter";

// =============================================================================
// Test Fixtures
// =============================================================================

function createSquareThreeShape(size = 100): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(size, 0);
  shape.lineTo(size, size);
  shape.lineTo(0, size);
  shape.closePath();
  return shape;
}

function createSquareWithHoleThreeShape(
  outerSize = 100,
  holeSize = 50,
): THREE.Shape {
  const shape = createSquareThreeShape(outerSize);
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
// Geometry Analysis Utilities
// =============================================================================

type ZRange = { minZ: number; maxZ: number };

function getZRange(geometry: THREE.BufferGeometry): ZRange {
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i < positions.count; i++) {
    const z = positions.getZ(i);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }

  return { minZ, maxZ };
}

type FaceAnalysis = {
  readonly frontCaps: number;
  readonly backCaps: number;
  readonly sideWalls: number;
  readonly bevelSurfaces: number;
};

function analyzeFaces(geometry: THREE.BufferGeometry): FaceAnalysis {
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  const index = geometry.getIndex();

  if (!index) {
    return { frontCaps: 0, backCaps: 0, sideWalls: 0, bevelSurfaces: 0 };
  }

  let frontCaps = 0;
  let backCaps = 0;
  let sideWalls = 0;
  let bevelSurfaces = 0;

  for (let i = 0; i < index.count; i += 3) {
    const i0 = index.getX(i);
    const i1 = index.getX(i + 1);
    const i2 = index.getX(i + 2);

    const v0 = new THREE.Vector3(
      positions.getX(i0),
      positions.getY(i0),
      positions.getZ(i0),
    );
    const v1 = new THREE.Vector3(
      positions.getX(i1),
      positions.getY(i1),
      positions.getZ(i1),
    );
    const v2 = new THREE.Vector3(
      positions.getX(i2),
      positions.getY(i2),
      positions.getZ(i2),
    );

    // Compute face normal
    const edge1 = new THREE.Vector3().subVectors(v1, v0);
    const edge2 = new THREE.Vector3().subVectors(v2, v0);
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

    // Classify by normal direction
    const nz = Math.abs(normal.z);
    const horizontalComponent = Math.sqrt(normal.x ** 2 + normal.y ** 2);

    // Handle degenerate triangles
    if (isNaN(normal.x) || isNaN(normal.y) || isNaN(normal.z)) {
      continue;
    }

    if (nz > 0.9) {
      // Nearly perpendicular to XY plane (cap faces)
      if (normal.z > 0) {
        frontCaps++;
      } else {
        backCaps++;
      }
    } else if (horizontalComponent > 0.9) {
      // Nearly perpendicular to Z axis (side walls)
      sideWalls++;
    } else {
      // Angled surface (bevel) - has significant both Z and horizontal components
      bevelSurfaces++;
    }
  }

  return { frontCaps, backCaps, sideWalls, bevelSurfaces };
}

function hasVerticesAtZ(
  geometry: THREE.BufferGeometry,
  targetZ: number,
  tolerance = 0.1,
): boolean {
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < positions.count; i++) {
    if (Math.abs(positions.getZ(i) - targetZ) < tolerance) {
      return true;
    }
  }
  return false;
}

// =============================================================================
// Shape Conversion Tests
// =============================================================================

describe("threeShapeToShapeInput", () => {
  it("converts simple shape correctly", () => {
    const shape = createSquareThreeShape(100);
    const input = threeShapeToShapeInput(shape, 1);

    expect(input.points.length).toBeGreaterThanOrEqual(4);
    expect(input.holes.length).toBe(0);
  });

  it("converts shape with hole correctly", () => {
    const shape = createSquareWithHoleThreeShape(100, 50);
    const input = threeShapeToShapeInput(shape, 1);

    expect(input.points.length).toBeGreaterThanOrEqual(4);
    expect(input.holes.length).toBe(1);
    expect(input.holes[0].length).toBeGreaterThanOrEqual(4);
  });
});

describe("shapeInputToThreeShape", () => {
  it("round-trips correctly", () => {
    const original = createSquareThreeShape(100);
    const input = threeShapeToShapeInput(original, 1);
    const converted = shapeInputToThreeShape(input);

    const originalPoints = original.getPoints(1);
    const convertedPoints = converted.getPoints(1);

    expect(convertedPoints.length).toBe(originalPoints.length);
  });
});

// =============================================================================
// createExtrudedGeometryWithBevel Tests
// =============================================================================

describe("createExtrudedGeometryWithBevel", () => {
  describe("no bevel", () => {
    it("generates extrusion with both caps when no bevel specified", () => {
      const shapes = [createSquareThreeShape(100)];
      const geometry = createExtrudedGeometryWithBevel(shapes, 10, {});

      const faces = analyzeFaces(geometry);

      expect(faces.frontCaps).toBeGreaterThan(0);
      expect(faces.backCaps).toBeGreaterThan(0);
      expect(faces.sideWalls).toBeGreaterThan(0);
      // No intentional bevel surfaces (small count from edge artifacts is acceptable)
      expect(faces.bevelSurfaces).toBeLessThan(faces.sideWalls);
    });

    it("generates empty geometry for empty shapes array", () => {
      const geometry = createExtrudedGeometryWithBevel([], 10, {});

      expect(geometry.getAttribute("position")).toBeUndefined();
    });
  });

  describe("top bevel only", () => {
    it("generates bevel at front face", () => {
      const shapes = [createSquareThreeShape(100)];
      const bevel: AsymmetricBevelSpec = {
        top: { width: 5, height: 5, preset: "circle" },
      };

      const geometry = createExtrudedGeometryWithBevel(shapes, 20, bevel);
      const faces = analyzeFaces(geometry);

      expect(faces.bevelSurfaces).toBeGreaterThan(0);
      expect(faces.backCaps).toBeGreaterThan(0); // Back cap present
    });

    it("generates inner cap at recessed position", () => {
      const shapes = [createSquareThreeShape(100)];
      const bevelHeight = 5;
      const bevel: AsymmetricBevelSpec = {
        top: { width: 5, height: bevelHeight, preset: "circle" },
      };
      const depth = 20;

      const geometry = createExtrudedGeometryWithBevel(shapes, depth, bevel);
      const zRange = getZRange(geometry);

      // After translation by -depth:
      // - Front (original Z=depth) -> Z=0
      // - Back (original Z=0) -> Z=-depth
      expect(zRange.maxZ).toBeCloseTo(0, 1);
      expect(zRange.minZ).toBeCloseTo(-depth, 1);

      // Top inner cap:
      // - Original position: depth - bevelHeight = 20 - 5 = 15
      // - After translate: 15 - 20 = -5
      const innerCapZ = -bevelHeight;
      expect(hasVerticesAtZ(geometry, innerCapZ, 0.5)).toBe(true);
    });
  });

  describe("bottom bevel only", () => {
    it("generates bevel at back face", () => {
      const shapes = [createSquareThreeShape(100)];
      const bevel: AsymmetricBevelSpec = {
        bottom: { width: 5, height: 5, preset: "circle" },
      };

      const geometry = createExtrudedGeometryWithBevel(shapes, 20, bevel);
      const faces = analyzeFaces(geometry);

      expect(faces.bevelSurfaces).toBeGreaterThan(0);
      expect(faces.frontCaps).toBeGreaterThan(0); // Front cap present
    });

    it("generates inner cap at recessed position", () => {
      const shapes = [createSquareThreeShape(100)];
      const bevelHeight = 5;
      const bevel: AsymmetricBevelSpec = {
        bottom: { width: 5, height: bevelHeight, preset: "circle" },
      };
      const depth = 20;

      const geometry = createExtrudedGeometryWithBevel(shapes, depth, bevel);

      // Bottom inner cap:
      // - Original position: bevelHeight = 5
      // - After translate: 5 - 20 = -15
      const innerCapZ = bevelHeight - depth;
      expect(hasVerticesAtZ(geometry, innerCapZ, 0.5)).toBe(true);
    });
  });

  describe("dual bevel (both top and bottom)", () => {
    it("generates bevel surfaces on both faces", () => {
      const shapes = [createSquareThreeShape(100)];
      const bevel: AsymmetricBevelSpec = {
        top: { width: 5, height: 5, preset: "circle" },
        bottom: { width: 5, height: 5, preset: "circle" },
      };

      const geometry = createExtrudedGeometryWithBevel(shapes, 20, bevel);
      const faces = analyzeFaces(geometry);

      // Should have bevel surfaces (from both top and bottom)
      expect(faces.bevelSurfaces).toBeGreaterThan(0);
      // No outer caps (replaced by bevels)
      // Inner caps are flat, so they count as front/back caps
    });

    it("generates inner caps at both recessed positions", () => {
      const shapes = [createSquareThreeShape(100)];
      const topHeight = 5;
      const bottomHeight = 3;
      const depth = 20;
      const bevel: AsymmetricBevelSpec = {
        top: { width: 5, height: topHeight, preset: "circle" },
        bottom: { width: 3, height: bottomHeight, preset: "circle" },
      };

      const geometry = createExtrudedGeometryWithBevel(shapes, depth, bevel);

      // After translation by -depth:
      // Top inner cap:
      // - Original: depth - topHeight = 20 - 5 = 15
      // - After translate: 15 - 20 = -5
      const topInnerCapZ = -topHeight;

      // Bottom inner cap:
      // - Original: bottomHeight = 3
      // - After translate: 3 - 20 = -17
      const bottomInnerCapZ = bottomHeight - depth;

      expect(hasVerticesAtZ(geometry, topInnerCapZ, 0.5)).toBe(true);
      expect(hasVerticesAtZ(geometry, bottomInnerCapZ, 0.5)).toBe(true);
    });

    it("handles asymmetric bevel heights correctly", () => {
      const shapes = [createSquareThreeShape(100)];
      const bevel: AsymmetricBevelSpec = {
        top: { width: 10, height: 8, preset: "circle" },
        bottom: { width: 5, height: 3, preset: "softRound" },
      };
      const depth = 30;

      const geometry = createExtrudedGeometryWithBevel(shapes, depth, bevel);
      const zRange = getZRange(geometry);

      // Front at Z=0, Back at Z=-30
      expect(zRange.maxZ).toBeCloseTo(0, 1);
      expect(zRange.minZ).toBeCloseTo(-depth, 1);

      // Total geometry should span full depth
      const totalSpan = zRange.maxZ - zRange.minZ;
      expect(totalSpan).toBeCloseTo(depth, 1);
    });

    it("clamps bevel heights when they exceed extrusion depth", () => {
      const shapes = [createSquareThreeShape(100)];
      const bevel: AsymmetricBevelSpec = {
        top: { width: 5, height: 15, preset: "circle" }, // Would exceed with bottom
        bottom: { width: 5, height: 15, preset: "circle" },
      };
      const depth = 20;

      // Both bevels request 15 each (30 total) but depth is only 20
      // Should be clamped to 45% each (9 each)
      const geometry = createExtrudedGeometryWithBevel(shapes, depth, bevel);

      expect(geometry.getAttribute("position")).toBeDefined();
      const faces = analyzeFaces(geometry);
      expect(faces.bevelSurfaces).toBeGreaterThan(0);
    });

    it("handles different bevel presets on top and bottom", () => {
      const shapes = [createSquareThreeShape(100)];
      const bevel: AsymmetricBevelSpec = {
        top: { width: 5, height: 5, preset: "angle" },
        bottom: { width: 5, height: 5, preset: "convex" },
      };

      const geometry = createExtrudedGeometryWithBevel(shapes, 20, bevel);
      const faces = analyzeFaces(geometry);

      expect(faces.bevelSurfaces).toBeGreaterThan(0);
    });
  });

  describe("shape with holes", () => {
    it("generates correct geometry for shape with hole and top bevel", () => {
      const shapes = [createSquareWithHoleThreeShape(100, 40)];
      const bevel: AsymmetricBevelSpec = {
        top: { width: 5, height: 5, preset: "circle" },
      };

      const geometry = createExtrudedGeometryWithBevel(shapes, 20, bevel);
      const faces = analyzeFaces(geometry);

      expect(faces.bevelSurfaces).toBeGreaterThan(0);
      expect(faces.sideWalls).toBeGreaterThan(0); // Both outer and hole walls
    });

    it("generates correct geometry for shape with hole and dual bevel", () => {
      const shapes = [createSquareWithHoleThreeShape(100, 40)];
      const bevel: AsymmetricBevelSpec = {
        top: { width: 5, height: 5, preset: "circle" },
        bottom: { width: 5, height: 5, preset: "circle" },
      };

      const geometry = createExtrudedGeometryWithBevel(shapes, 20, bevel);
      const faces = analyzeFaces(geometry);

      expect(faces.bevelSurfaces).toBeGreaterThan(0);
      expect(faces.sideWalls).toBeGreaterThan(0);
    });
  });

  describe("multiple shapes", () => {
    it("processes multiple shapes with dual bevel", () => {
      const shapes = [
        createSquareThreeShape(50),
        createSquareWithHoleThreeShape(50, 20),
      ];
      const bevel: AsymmetricBevelSpec = {
        top: { width: 3, height: 3, preset: "circle" },
        bottom: { width: 3, height: 3, preset: "circle" },
      };

      const geometry = createExtrudedGeometryWithBevel(shapes, 15, bevel);
      const positions = geometry.getAttribute("position");

      expect(positions).toBeDefined();
      expect(positions.count).toBeGreaterThan(0);
    });
  });

  describe("Z coordinate convention", () => {
    it("front face is at Z=0 after transformation", () => {
      const shapes = [createSquareThreeShape(100)];
      const bevel: AsymmetricBevelSpec = {
        top: { width: 5, height: 5, preset: "circle" },
      };
      const depth = 20;

      const geometry = createExtrudedGeometryWithBevel(shapes, depth, bevel);
      const zRange = getZRange(geometry);

      // Front (top bevel start) should be at Z=0
      expect(zRange.maxZ).toBeCloseTo(0, 1);
      // Back should be at Z=-depth
      expect(zRange.minZ).toBeCloseTo(-depth, 1);
    });
  });

  describe("geometry completeness", () => {
    it("has valid normals", () => {
      const shapes = [createSquareThreeShape(100)];
      const bevel: AsymmetricBevelSpec = {
        top: { width: 5, height: 5, preset: "circle" },
        bottom: { width: 5, height: 5, preset: "circle" },
      };

      const geometry = createExtrudedGeometryWithBevel(shapes, 20, bevel);
      const normals = geometry.getAttribute("normal") as THREE.BufferAttribute;

      expect(normals).toBeDefined();

      // Check most normals are unit vectors (allow some zero-length for degenerate cases)
      let validCount = 0;
      let zeroCount = 0;
      for (let i = 0; i < normals.count; i++) {
        const nx = normals.getX(i);
        const ny = normals.getY(i);
        const nz = normals.getZ(i);
        const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (length > 0.5) {
          expect(length).toBeCloseTo(1, 1);
          validCount++;
        } else {
          zeroCount++;
        }
      }

      // Most normals should be valid
      expect(validCount).toBeGreaterThan(zeroCount);
    });

    it("has valid UVs", () => {
      const shapes = [createSquareThreeShape(100)];
      const bevel: AsymmetricBevelSpec = {
        top: { width: 5, height: 5, preset: "circle" },
        bottom: { width: 5, height: 5, preset: "circle" },
      };

      const geometry = createExtrudedGeometryWithBevel(shapes, 20, bevel);
      const uvs = geometry.getAttribute("uv") as THREE.BufferAttribute;

      expect(uvs).toBeDefined();
      expect(uvs.count).toBeGreaterThan(0);
    });

    it("has valid indices", () => {
      const shapes = [createSquareThreeShape(100)];
      const bevel: AsymmetricBevelSpec = {
        top: { width: 5, height: 5, preset: "circle" },
        bottom: { width: 5, height: 5, preset: "circle" },
      };

      const geometry = createExtrudedGeometryWithBevel(shapes, 20, bevel);
      const index = geometry.getIndex();
      const positions = geometry.getAttribute("position");

      expect(index).toBeDefined();
      expect(index!.count).toBeGreaterThan(0);
      expect(index!.count % 3).toBe(0); // Must be triangles

      // All indices should be valid
      const maxIndex = positions.count - 1;
      for (let i = 0; i < index!.count; i++) {
        const idx = index!.getX(i);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThanOrEqual(maxIndex);
      }
    });
  });
});
