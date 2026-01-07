/**
 * @file Debug test for bevel geometry values
 *
 * Verifies actual geometry values, not just structure.
 */

import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { getBevelConfig, createAsymmetricExtrudedGeometry } from "./bevel";
import { createCustomBevelGeometry } from "./custom-bevel";
import { px } from "../../../../domain/types";
import type { Bevel3d } from "../../../../domain/three-d";

function createSquareShape(size = 100): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(size, 0);
  shape.lineTo(size, size);
  shape.lineTo(0, size);
  shape.closePath();
  return shape;
}

function analyzeGeometry(geometry: THREE.BufferGeometry, label: string) {
  const positions = geometry.attributes.position?.array as Float32Array | undefined;
  if (!positions || positions.length === 0) {
    console.log(`${label}: EMPTY GEOMETRY`);
    return { minZ: NaN, maxZ: NaN, vertexCount: 0 };
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (let i = 0; i < positions.length; i += 3) {
    minX = Math.min(minX, positions[i]);
    maxX = Math.max(maxX, positions[i]);
    minY = Math.min(minY, positions[i + 1]);
    maxY = Math.max(maxY, positions[i + 1]);
    minZ = Math.min(minZ, positions[i + 2]);
    maxZ = Math.max(maxZ, positions[i + 2]);
  }

  console.log(`${label}:`);
  console.log(`  Vertices: ${positions.length / 3}`);
  console.log(`  X: [${minX.toFixed(2)}, ${maxX.toFixed(2)}]`);
  console.log(`  Y: [${minY.toFixed(2)}, ${maxY.toFixed(2)}]`);
  console.log(`  Z: [${minZ.toFixed(2)}, ${maxZ.toFixed(2)}]`);

  return { minZ, maxZ, vertexCount: positions.length / 3 };
}

describe("Bevel Debug - Value Verification", () => {
  describe("Domain value flow", () => {
    it("traces Bevel3d → BevelConfig conversion", () => {
      const bevel: Bevel3d = {
        width: px(10),
        height: px(8),
        preset: "circle",
      };

      console.log("Input Bevel3d:");
      console.log(`  width: ${bevel.width}`);
      console.log(`  height: ${bevel.height}`);
      console.log(`  preset: ${bevel.preset}`);

      const config = getBevelConfig(bevel);

      console.log("Output BevelConfig:");
      console.log(`  size: ${config?.size}`);
      console.log(`  thickness: ${config?.thickness}`);
      console.log(`  offset: ${config?.offset}`);
      console.log(`  segments: ${config?.segments}`);
      console.log(`  preset: ${config?.preset}`);

      // Verify values are correctly mapped
      expect(config?.size).toBe(10); // width → size
      expect(config?.thickness).toBe(8); // height → thickness
      expect(config?.offset).toBe(-10); // -size for inset
      expect(config?.preset).toBe("circle");
    });
  });

  describe("Geometry generation", () => {
    it("creates custom bevel geometry with expected Z range", () => {
      const shape = createSquareShape(100);
      const extrusionDepth = 20;
      const bevelWidth = 10;
      const bevelHeight = 8;

      console.log(`\nInput: extrusion=${extrusionDepth}, bevelWidth=${bevelWidth}, bevelHeight=${bevelHeight}`);

      // Create custom bevel geometry directly
      const bevelGeometry = createCustomBevelGeometry(shape, {
        front: { width: bevelWidth, height: bevelHeight, preset: "circle" },
        extrusionDepth,
      });

      const stats = analyzeGeometry(bevelGeometry, "Custom bevel geometry (front only)");

      // Front bevel should be at Z=extrusionDepth going towards +Z
      // Expected: Z from extrusionDepth to extrusionDepth + bevelHeight
      console.log(`\nExpected Z range: [${extrusionDepth}, ${extrusionDepth + bevelHeight}]`);
      console.log(`Actual Z range: [${stats.minZ.toFixed(2)}, ${stats.maxZ.toFixed(2)}]`);

      expect(stats.vertexCount).toBeGreaterThan(0);
      expect(stats.minZ).toBeCloseTo(extrusionDepth, 0);
      expect(stats.maxZ).toBeCloseTo(extrusionDepth + bevelHeight, 0);
    });

    it("creates full geometry with extrusion + bevel", () => {
      const shape = createSquareShape(100);
      const extrusionDepth = 20;
      const bevelHeight = 8;

      console.log(`\nInput: extrusion=${extrusionDepth}, bevelHeight=${bevelHeight}`);

      const bevelConfig = getBevelConfig({
        width: px(10),
        height: px(bevelHeight),
        preset: "circle",
      });

      const geometry = createAsymmetricExtrudedGeometry(
        [shape],
        extrusionDepth,
        { top: bevelConfig, bottom: undefined },
      );

      const stats = analyzeGeometry(geometry, "Full geometry (extrusion + front bevel)");

      // After Z-translation (-extrusionDepth):
      // - Base geometry: Z from 0 to -extrusionDepth
      // - Front bevel: Z from 0 to +bevelHeight
      console.log(`\nExpected Z range after translate: [-${extrusionDepth}, ${bevelHeight}]`);
      console.log(`Actual Z range: [${stats.minZ.toFixed(2)}, ${stats.maxZ.toFixed(2)}]`);

      expect(stats.maxZ).toBeCloseTo(bevelHeight, 1);
      expect(stats.minZ).toBeCloseTo(-extrusionDepth, 1);
    });

    it("verifies bevel inset (X/Y bounds)", () => {
      const shapeSize = 100;
      const shape = createSquareShape(shapeSize);
      const extrusionDepth = 20;
      const bevelWidth = 15; // Significant inset

      console.log(`\nShape size: ${shapeSize}, bevelWidth: ${bevelWidth}`);

      const geometry = createAsymmetricExtrudedGeometry(
        [shape],
        extrusionDepth,
        {
          top: {
            size: bevelWidth,
            thickness: 8,
            offset: -bevelWidth,
            segments: 4,
            preset: "circle",
          },
        },
      );

      const positions = geometry.attributes.position.array as Float32Array;
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;

      for (let i = 0; i < positions.length; i += 3) {
        minX = Math.min(minX, positions[i]);
        maxX = Math.max(maxX, positions[i]);
        minY = Math.min(minY, positions[i + 1]);
        maxY = Math.max(maxY, positions[i + 1]);
      }

      console.log(`X bounds: [${minX.toFixed(2)}, ${maxX.toFixed(2)}]`);
      console.log(`Y bounds: [${minY.toFixed(2)}, ${maxY.toFixed(2)}]`);
      console.log(`Expected X/Y max: ${shapeSize} (no expansion)`);
      console.log(`Expected X/Y min with inset: around ${bevelWidth} at bevel top`);

      // Bevel should NOT expand beyond original shape bounds
      expect(maxX).toBeLessThanOrEqual(shapeSize + 0.1);
      expect(maxY).toBeLessThanOrEqual(shapeSize + 0.1);
      expect(minX).toBeGreaterThanOrEqual(-0.1);
      expect(minY).toBeGreaterThanOrEqual(-0.1);
    });
  });
});
