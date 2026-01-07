/**
 * @file Test the current contour implementation (scaling method)
 *
 * The renderer currently uses createContourMesh which scales geometry.
 * This test exposes issues with scaling vs shape expansion.
 */

import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { createContourMesh } from "../effects/contour";
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

function getGeometryBounds(geometry: THREE.BufferGeometry) {
  const positions = geometry.attributes.position?.array as Float32Array;
  if (!positions || positions.length === 0) {
    return null;
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

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
    size: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ },
  };
}

describe("Contour scaling method issues", () => {
  const testDepths = [1, 2, 5, 10, 20];
  const contourWidth = 5;

  describe("Scaling method distortion with different extrusion depths", () => {
    testDepths.forEach(depth => {
      it(`shows contour offset distortion at extrusion ${depth}px`, () => {
        const shape = createSquareShape(100);

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

        const baseBounds = getGeometryBounds(baseGeometry);

        // Create contour using CURRENT method (scaling)
        const contourMesh = createContourMesh(baseGeometry, {
          width: contourWidth,
          color: "#000000",
        });

        const contourBounds = getGeometryBounds(contourMesh.geometry);

        if (!baseBounds || !contourBounds) {
          expect(baseBounds).not.toBeNull();
          expect(contourBounds).not.toBeNull();
          return;
        }

        // Calculate actual expansion
        const xExpansion = (contourBounds.size.x - baseBounds.size.x) / 2;
        const yExpansion = (contourBounds.size.y - baseBounds.size.y) / 2;
        const zExpansion = (contourBounds.size.z - baseBounds.size.z) / 2;

        console.log(`\nExtrusion ${depth}px:`);
        console.log(`  Base size: ${baseBounds.size.x.toFixed(2)} x ${baseBounds.size.y.toFixed(2)} x ${baseBounds.size.z.toFixed(2)}`);
        console.log(`  Contour size: ${contourBounds.size.x.toFixed(2)} x ${contourBounds.size.y.toFixed(2)} x ${contourBounds.size.z.toFixed(2)}`);
        console.log(`  Expansion: X=${xExpansion.toFixed(2)}, Y=${yExpansion.toFixed(2)}, Z=${zExpansion.toFixed(2)}`);
        console.log(`  Expected uniform expansion: ${contourWidth}`);

        // Calculate distortion ratio (how much Z expansion differs from X/Y)
        const avgXY = (xExpansion + yExpansion) / 2;
        const zDistortion = Math.abs(zExpansion - avgXY);
        console.log(`  Z distortion from X/Y average: ${zDistortion.toFixed(2)}`);

        // Scaling method causes Z to scale proportionally, not uniformly
        // For deeper extrusion, Z expansion will be larger than X/Y
        expect(contourBounds.size.x).toBeGreaterThan(baseBounds.size.x);
      });
    });
  });

  describe("Why scaling breaks with larger extrusion", () => {
    it("demonstrates the mathematical issue", () => {
      const shape = createSquareShape(100);

      // Create geometries with different extrusion depths
      const depths = [1, 5, 20];

      depths.forEach(depth => {
        const bevelConfig = getBevelConfig({
          width: px(5),
          height: px(5),
          preset: "circle",
        });

        const baseGeometry = createAsymmetricExtrudedGeometry(
          [shape],
          depth,
          { top: bevelConfig, bottom: undefined },
        );

        const baseBounds = getGeometryBounds(baseGeometry);
        if (!baseBounds) return;

        // The scaling method calculates scale factor as:
        // scaleFactor = 1 + (contourWidth / avgSize)
        // avgSize = (sizeX + sizeY + sizeZ) / 3

        const avgSize = (baseBounds.size.x + baseBounds.size.y + baseBounds.size.z) / 3;
        const scaleFactor = 1 + (contourWidth / avgSize);

        console.log(`\nDepth ${depth}px:`);
        console.log(`  Base dimensions: ${baseBounds.size.x.toFixed(2)} x ${baseBounds.size.y.toFixed(2)} x ${baseBounds.size.z.toFixed(2)}`);
        console.log(`  Average size: ${avgSize.toFixed(2)}`);
        console.log(`  Scale factor: ${scaleFactor.toFixed(4)}`);

        // Expected expansion per axis:
        const expectedXExpansion = baseBounds.size.x * (scaleFactor - 1) / 2;
        const expectedYExpansion = baseBounds.size.y * (scaleFactor - 1) / 2;
        const expectedZExpansion = baseBounds.size.z * (scaleFactor - 1) / 2;

        console.log(`  Expected X expansion: ${expectedXExpansion.toFixed(2)}`);
        console.log(`  Expected Y expansion: ${expectedYExpansion.toFixed(2)}`);
        console.log(`  Expected Z expansion: ${expectedZExpansion.toFixed(2)}`);
        console.log(`  Desired uniform expansion: ${contourWidth}`);

        // The problem: scaling gives proportional expansion, not uniform
        // For X/Y = 100, Z = depth + bevel
        // A small depth gives small Z, so scaling factor is dominated by X/Y
        // A large depth gives large Z, which dilutes the scale factor
      });

      expect(true).toBe(true); // Documentation test
    });
  });
});
