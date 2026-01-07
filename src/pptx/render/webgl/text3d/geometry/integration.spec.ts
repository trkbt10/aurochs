/**
 * @file Integration tests for Extrusion + Bevel + Contour coexistence
 *
 * Tests that all 3D geometry features work correctly together.
 */

import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  createAsymmetricExtrudedGeometry,
  type AsymmetricBevelConfig,
} from "./bevel";
import {
  createContourMesh,
  createContourMeshExpanded,
  type ContourConfig,
} from "../effects/contour";

// =============================================================================
// Test Helpers
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

function getGeometryZRange(geometry: THREE.BufferGeometry): { min: number; max: number } {
  const positions = geometry.attributes.position.array as Float32Array;
  let min = Infinity;
  let max = -Infinity;

  for (let i = 2; i < positions.length; i += 3) {
    min = Math.min(min, positions[i]);
    max = Math.max(max, positions[i]);
  }

  return { min, max };
}

function getGeometryXYRange(geometry: THREE.BufferGeometry): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  const positions = geometry.attributes.position.array as Float32Array;
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (let i = 0; i < positions.length; i += 3) {
    minX = Math.min(minX, positions[i]);
    maxX = Math.max(maxX, positions[i]);
    minY = Math.min(minY, positions[i + 1]);
    maxY = Math.max(maxY, positions[i + 1]);
  }

  return { minX, maxX, minY, maxY };
}

// =============================================================================
// Extrusion Only Tests
// =============================================================================

describe("Extrusion Only", () => {
  it("creates geometry with correct Z range", () => {
    const shape = createSquareShape(100);
    const extrusionDepth = 20;

    const geometry = createAsymmetricExtrudedGeometry(
      [shape],
      extrusionDepth,
      { top: undefined, bottom: undefined },
    );

    const { min, max } = getGeometryZRange(geometry);

    // After Z-orientation fix:
    // - Front face at Z=0
    // - Back face at Z=-extrusionDepth
    expect(max).toBeCloseTo(0, 0);
    expect(min).toBeCloseTo(-extrusionDepth, 0);
  });
});

// =============================================================================
// Extrusion + Bevel Tests
// =============================================================================

describe("Extrusion + Bevel", () => {
  it("front bevel extends towards positive Z", () => {
    const shape = createSquareShape(100);
    const extrusionDepth = 20;
    const bevelHeight = 5;

    const bevel: AsymmetricBevelConfig = {
      top: {
        thickness: bevelHeight,
        size: 5,
        offset: -5,
        segments: 2,
        preset: "angle",
      },
    };

    const geometry = createAsymmetricExtrudedGeometry([shape], extrusionDepth, bevel);
    const { min, max } = getGeometryZRange(geometry);

    console.log(`Front bevel only - Z range: [${min.toFixed(2)}, ${max.toFixed(2)}]`);

    // Front bevel should extend from Z=0 towards positive Z
    expect(max).toBeGreaterThan(0);
    expect(max).toBeCloseTo(bevelHeight, 1);
    expect(min).toBeCloseTo(-extrusionDepth, 1);
  });

  it("back bevel extends towards negative Z", () => {
    const shape = createSquareShape(100);
    const extrusionDepth = 20;
    const bevelHeight = 5;

    const bevel: AsymmetricBevelConfig = {
      bottom: {
        thickness: bevelHeight,
        size: 5,
        offset: -5,
        segments: 2,
        preset: "angle",
      },
    };

    const geometry = createAsymmetricExtrudedGeometry([shape], extrusionDepth, bevel);
    const { min, max } = getGeometryZRange(geometry);

    console.log(`Back bevel only - Z range: [${min.toFixed(2)}, ${max.toFixed(2)}]`);

    // Back bevel should extend from Z=-extrusionDepth towards negative Z
    expect(max).toBeCloseTo(0, 1);
    expect(min).toBeLessThan(-extrusionDepth);
    expect(min).toBeCloseTo(-extrusionDepth - bevelHeight, 1);
  });

  it("both bevels create correct Z range", () => {
    const shape = createSquareShape(100);
    const extrusionDepth = 20;
    const frontBevelHeight = 5;
    const backBevelHeight = 4;

    const bevel: AsymmetricBevelConfig = {
      top: {
        thickness: frontBevelHeight,
        size: 5,
        offset: -5,
        segments: 2,
        preset: "angle",
      },
      bottom: {
        thickness: backBevelHeight,
        size: 4,
        offset: -4,
        segments: 2,
        preset: "angle",
      },
    };

    const geometry = createAsymmetricExtrudedGeometry([shape], extrusionDepth, bevel);
    const { min, max } = getGeometryZRange(geometry);

    console.log(`Both bevels - Z range: [${min.toFixed(2)}, ${max.toFixed(2)}]`);

    // Front bevel extends towards +Z, back bevel extends towards -Z
    expect(max).toBeCloseTo(frontBevelHeight, 1);
    expect(min).toBeCloseTo(-extrusionDepth - backBevelHeight, 1);
  });

  it("bevel does not expand XY bounds (inset bevel)", () => {
    const shapeSize = 100;
    const shape = createSquareShape(shapeSize);
    const extrusionDepth = 20;

    const bevel: AsymmetricBevelConfig = {
      top: {
        thickness: 5,
        size: 10,
        offset: -10,
        segments: 4,
        preset: "circle",
      },
    };

    const geometry = createAsymmetricExtrudedGeometry([shape], extrusionDepth, bevel);
    const { minX, maxX, minY, maxY } = getGeometryXYRange(geometry);

    console.log(`XY bounds: X=[${minX.toFixed(2)}, ${maxX.toFixed(2)}], Y=[${minY.toFixed(2)}, ${maxY.toFixed(2)}]`);

    // Bevel should NOT expand beyond original shape bounds
    expect(maxX).toBeLessThanOrEqual(shapeSize + 0.1);
    expect(maxY).toBeLessThanOrEqual(shapeSize + 0.1);
    expect(minX).toBeGreaterThanOrEqual(-0.1);
    expect(minY).toBeGreaterThanOrEqual(-0.1);
  });
});

// =============================================================================
// Extrusion + Contour Tests
// =============================================================================

describe("Extrusion + Contour", () => {
  it("contour mesh is larger than base geometry", () => {
    const shape = createSquareShape(100);
    const extrusionDepth = 20;

    const baseGeometry = createAsymmetricExtrudedGeometry(
      [shape],
      extrusionDepth,
      { top: undefined, bottom: undefined },
    );

    const contourConfig: ContourConfig = {
      width: 5,
      color: "#000000",
    };

    const contourMesh = createContourMesh(baseGeometry, contourConfig);

    baseGeometry.computeBoundingBox();
    contourMesh.geometry.computeBoundingBox();

    const baseSize = new THREE.Vector3();
    const contourSize = new THREE.Vector3();
    baseGeometry.boundingBox!.getSize(baseSize);
    contourMesh.geometry.boundingBox!.getSize(contourSize);

    console.log(`Base size: ${baseSize.x.toFixed(2)} x ${baseSize.y.toFixed(2)} x ${baseSize.z.toFixed(2)}`);
    console.log(`Contour size: ${contourSize.x.toFixed(2)} x ${contourSize.y.toFixed(2)} x ${contourSize.z.toFixed(2)}`);

    // Contour should be larger in all dimensions
    expect(contourSize.x).toBeGreaterThan(baseSize.x);
    expect(contourSize.y).toBeGreaterThan(baseSize.y);
    expect(contourSize.z).toBeGreaterThan(baseSize.z);
  });
});

// =============================================================================
// Extrusion + Bevel + Contour Tests (Full Integration)
// =============================================================================

describe("Extrusion + Bevel + Contour (Full Integration)", () => {
  it("all three features work together", () => {
    const shape = createSquareShape(100);
    const extrusionDepth = 20;
    const frontBevelHeight = 5;
    const backBevelHeight = 4;

    const bevel: AsymmetricBevelConfig = {
      top: {
        thickness: frontBevelHeight,
        size: 5,
        offset: -5,
        segments: 2,
        preset: "angle",
      },
      bottom: {
        thickness: backBevelHeight,
        size: 4,
        offset: -4,
        segments: 2,
        preset: "angle",
      },
    };

    // Create base geometry with extrusion and bevels
    const baseGeometry = createAsymmetricExtrudedGeometry([shape], extrusionDepth, bevel);

    // Create contour
    const contourConfig: ContourConfig = {
      width: 3,
      color: "#FF0000",
    };
    const contourMesh = createContourMesh(baseGeometry, contourConfig);

    // Verify base geometry
    const baseZRange = getGeometryZRange(baseGeometry);
    console.log(`Base with bevels - Z range: [${baseZRange.min.toFixed(2)}, ${baseZRange.max.toFixed(2)}]`);

    expect(baseZRange.max).toBeCloseTo(frontBevelHeight, 1);
    expect(baseZRange.min).toBeCloseTo(-extrusionDepth - backBevelHeight, 1);

    // Verify contour geometry is properly expanded
    const contourZRange = getGeometryZRange(contourMesh.geometry);
    console.log(`Contour - Z range: [${contourZRange.min.toFixed(2)}, ${contourZRange.max.toFixed(2)}]`);

    // Contour should encompass the base geometry plus expansion
    expect(contourZRange.max).toBeGreaterThan(baseZRange.max);
    expect(contourZRange.min).toBeLessThan(baseZRange.min);
  });

  it("contour preserves bevel shape", () => {
    const shape = createSquareShape(100);
    const extrusionDepth = 20;

    const bevel: AsymmetricBevelConfig = {
      top: {
        thickness: 8,
        size: 8,
        offset: -8,
        segments: 8,
        preset: "circle",
      },
    };

    const baseGeometry = createAsymmetricExtrudedGeometry([shape], extrusionDepth, bevel);

    const contourConfig: ContourConfig = {
      width: 2,
      color: "#0000FF",
    };
    const contourMesh = createContourMeshExpanded(baseGeometry, contourConfig);

    // Both geometries should have valid attributes
    expect(baseGeometry.attributes.position.count).toBeGreaterThan(0);
    expect(contourMesh.geometry.attributes.position.count).toBeGreaterThan(0);

    // Contour should have same number of vertices (expanded along normals)
    expect(contourMesh.geometry.attributes.position.count).toBe(
      baseGeometry.attributes.position.count,
    );
  });

  it("handles large contour width with bevels", () => {
    const shape = createSquareShape(100);
    const extrusionDepth = 20;

    const bevel: AsymmetricBevelConfig = {
      top: {
        thickness: 5,
        size: 5,
        offset: -5,
        segments: 4,
        preset: "circle",
      },
      bottom: {
        thickness: 5,
        size: 5,
        offset: -5,
        segments: 4,
        preset: "circle",
      },
    };

    const baseGeometry = createAsymmetricExtrudedGeometry([shape], extrusionDepth, bevel);

    // Large contour width
    const contourConfig: ContourConfig = {
      width: 10,
      color: "#00FF00",
    };
    const contourMesh = createContourMesh(baseGeometry, contourConfig);

    expect(contourMesh).toBeInstanceOf(THREE.Mesh);
    expect(contourMesh.geometry.attributes.position.count).toBeGreaterThan(0);

    // Verify contour is significantly larger
    baseGeometry.computeBoundingBox();
    contourMesh.geometry.computeBoundingBox();

    const baseSize = new THREE.Vector3();
    const contourSize = new THREE.Vector3();
    baseGeometry.boundingBox!.getSize(baseSize);
    contourMesh.geometry.boundingBox!.getSize(contourSize);

    console.log(`Large contour test - Base: ${baseSize.x.toFixed(2)}, Contour: ${contourSize.x.toFixed(2)}`);

    expect(contourSize.x).toBeGreaterThan(baseSize.x * 1.05); // At least 5% larger
  });
});
