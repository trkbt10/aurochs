/**
 * @file Test extrusion depth behavior
 *
 * User reports: "Extrusion 1px までは問題ないがそれ以上は破綻する"
 * (Extrusion works up to 1px but breaks beyond that)
 */

import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { createAsymmetricExtrudedGeometry, getBevelConfig } from "./bevel";
import { px } from "../../../../domain/types";

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
    return { minZ: NaN, maxZ: NaN, vertexCount: 0, valid: false };
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];

    if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
      console.log(`${label}: INVALID VERTEX at index ${i/3}: (${x}, ${y}, ${z})`);
      return { minX: NaN, maxX: NaN, minY: NaN, maxY: NaN, minZ: NaN, maxZ: NaN, vertexCount: positions.length / 3, valid: false };
    }

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }

  console.log(`${label}:`);
  console.log(`  Vertices: ${positions.length / 3}`);
  console.log(`  X: [${minX.toFixed(2)}, ${maxX.toFixed(2)}]`);
  console.log(`  Y: [${minY.toFixed(2)}, ${maxY.toFixed(2)}]`);
  console.log(`  Z: [${minZ.toFixed(2)}, ${maxZ.toFixed(2)}]`);

  return { minX, maxX, minY, maxY, minZ, maxZ, vertexCount: positions.length / 3, valid: true };
}

describe("Extrusion Depth Behavior", () => {
  describe("Extrusion without bevel", () => {
    const testDepths = [0.5, 1, 2, 5, 10, 20, 50];

    testDepths.forEach(depth => {
      it(`works with extrusion depth ${depth}px`, () => {
        const shape = createSquareShape(100);

        const geometry = createAsymmetricExtrudedGeometry(
          [shape],
          depth,
          { top: undefined, bottom: undefined },
        );

        const stats = analyzeGeometry(geometry, `Extrusion ${depth}px (no bevel)`);

        expect(stats.valid).toBe(true);
        expect(stats.vertexCount).toBeGreaterThan(0);
        // After translate(-depth), Z should range from -depth to 0
        expect(stats.minZ).toBeCloseTo(-depth, 1);
        expect(stats.maxZ).toBeCloseTo(0, 1);
      });
    });
  });

  describe("Extrusion with bevel", () => {
    const testDepths = [0.5, 1, 2, 5, 10, 20, 50];
    const bevelHeight = 5;
    const bevelWidth = 5;

    testDepths.forEach(depth => {
      it(`works with extrusion depth ${depth}px + bevel`, () => {
        const shape = createSquareShape(100);

        const bevelConfig = getBevelConfig({
          width: px(bevelWidth),
          height: px(bevelHeight),
          preset: "circle",
        });

        console.log(`\nTesting extrusion=${depth}, bevel config:`, bevelConfig);

        const geometry = createAsymmetricExtrudedGeometry(
          [shape],
          depth,
          { top: bevelConfig, bottom: undefined },
        );

        const stats = analyzeGeometry(geometry, `Extrusion ${depth}px + bevel`);

        expect(stats.valid).toBe(true);
        expect(stats.vertexCount).toBeGreaterThan(0);

        // After translate(-depth):
        // - Base should go from -depth to 0
        // - Bevel should extend from 0 towards +Z (up to bevelHeight, but clamped)
        console.log(`  Expected Z min: -${depth}`);
        console.log(`  Actual Z min: ${stats.minZ?.toFixed(2)}`);
      });
    });
  });

  describe("Small extrusion edge cases", () => {
    it("handles extrusion depth smaller than bevel height", () => {
      const shape = createSquareShape(100);
      const extrusionDepth = 1; // Small extrusion
      const bevelHeight = 10; // Large bevel

      const bevelConfig = getBevelConfig({
        width: px(10),
        height: px(bevelHeight),
        preset: "circle",
      });

      console.log(`\nEdge case: extrusion=${extrusionDepth}, bevelHeight=${bevelHeight}`);
      console.log(`Bevel config:`, bevelConfig);

      const geometry = createAsymmetricExtrudedGeometry(
        [shape],
        extrusionDepth,
        { top: bevelConfig, bottom: undefined },
      );

      const stats = analyzeGeometry(geometry, `Small extrusion (${extrusionDepth}px) with large bevel`);

      expect(stats.valid).toBe(true);
      expect(stats.vertexCount).toBeGreaterThan(0);
    });

    it("handles very small extrusion with bevel", () => {
      const shape = createSquareShape(100);
      const extrusionDepth = 0.1;

      const bevelConfig = getBevelConfig({
        width: px(5),
        height: px(5),
        preset: "circle",
      });

      console.log(`\nVery small extrusion: ${extrusionDepth}px`);

      const geometry = createAsymmetricExtrudedGeometry(
        [shape],
        extrusionDepth,
        { top: bevelConfig, bottom: undefined },
      );

      const stats = analyzeGeometry(geometry, `Very small extrusion (${extrusionDepth}px)`);

      expect(stats.valid).toBe(true);
    });
  });

  describe("Bevel clamping behavior", () => {
    it("clamps bevel when it exceeds extrusion depth", () => {
      const shape = createSquareShape(100);
      const extrusionDepth = 5;
      const requestedBevelHeight = 20; // Much larger than extrusion

      const bevelConfig = getBevelConfig({
        width: px(10),
        height: px(requestedBevelHeight),
        preset: "circle",
      });

      console.log(`\nClamping test: extrusion=${extrusionDepth}, requestedBevel=${requestedBevelHeight}`);
      console.log(`Original bevel config:`, bevelConfig);

      const geometry = createAsymmetricExtrudedGeometry(
        [shape],
        extrusionDepth,
        { top: bevelConfig, bottom: undefined },
      );

      const stats = analyzeGeometry(geometry, `Clamped bevel test`);

      expect(stats.valid).toBe(true);

      // Bevel should be clamped, so maxZ should not exceed reasonable bounds
      // maxRatio is 0.45 for single bevel, so max thickness = 5 * 0.45 = 2.25
      const expectedMaxBevelThickness = extrusionDepth * 0.45;
      console.log(`  Expected max bevel thickness: ${expectedMaxBevelThickness}`);
      console.log(`  Actual Z range: [${stats.minZ?.toFixed(2)}, ${stats.maxZ?.toFixed(2)}]`);
    });
  });

  describe("Contour + Extrusion + Bevel integration", () => {
    const testDepths = [0.5, 1, 2, 5, 10, 20];

    testDepths.forEach(depth => {
      it(`contour works with extrusion depth ${depth}px`, async () => {
        const shape = createSquareShape(100);
        const contourWidth = 5;

        const bevelConfig = getBevelConfig({
          width: px(5),
          height: px(5),
          preset: "circle",
        });

        // Create base geometry
        const baseGeometry = createAsymmetricExtrudedGeometry(
          [shape],
          depth,
          { top: bevelConfig, bottom: undefined },
        );

        const baseStats = analyzeGeometry(baseGeometry, `Base (extrusion=${depth})`);

        // Create expanded shape for contour
        const { expandShape } = await import("./shape-offset");
        const expandedShape = expandShape(shape, contourWidth);

        if (!expandedShape) {
          console.log(`  Failed to expand shape for contour`);
          expect(expandedShape).not.toBeNull();
          return;
        }

        // Create contour geometry
        const contourGeometry = createAsymmetricExtrudedGeometry(
          [expandedShape],
          depth,
          { top: bevelConfig, bottom: undefined },
        );

        const contourStats = analyzeGeometry(contourGeometry, `Contour (extrusion=${depth})`);

        expect(contourStats.valid).toBe(true);
        expect(contourStats.vertexCount).toBeGreaterThan(0);

        // Contour should be larger in X/Y
        if (baseStats.valid && contourStats.valid) {
          const xExpansion = (contourStats.maxX! - contourStats.minX!) - (baseStats.maxX! - baseStats.minX!);
          const yExpansion = (contourStats.maxY! - contourStats.minY!) - (baseStats.maxY! - baseStats.minY!);
          console.log(`  X expansion: ${xExpansion.toFixed(2)} (expected: ${contourWidth * 2})`);
          console.log(`  Y expansion: ${yExpansion.toFixed(2)} (expected: ${contourWidth * 2})`);

          expect(xExpansion).toBeGreaterThan(0);
          expect(yExpansion).toBeGreaterThan(0);
        }
      });
    });
  });
});
