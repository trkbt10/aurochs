/**
 * @file Integration test for Bevel + Contour coexistence in the rendering pipeline
 *
 * This test verifies that bevelTop, bevelBottom, and contourWidth work together
 * when passed through the full rendering pipeline.
 *
 * @see ECMA-376 Part 1, Section 20.1.5.1 (bevelT/bevelB)
 * @see ECMA-376 Part 1, Section 20.1.5.9 (sp3d contourW/contourClr)
 */

import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { getBevelConfig, createAsymmetricExtrudedGeometry } from "../geometry/bevel";
import { createContourMesh } from "../effects/contour";
import type { Bevel3d } from "../../../../domain/three-d";
import { px } from "../../../../domain/types";

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

// =============================================================================
// Rendering Pipeline Integration Tests
// =============================================================================

describe("Bevel + Contour Rendering Pipeline Integration", () => {
  describe("getBevelConfig conversion", () => {
    it("converts domain Bevel3d to BevelConfig correctly", () => {
      const bevel: Bevel3d = {
        width: px(10),
        height: px(8),
        preset: "circle",
      };

      const config = getBevelConfig(bevel);

      expect(config).toBeDefined();
      expect(config!.size).toBe(10);
      expect(config!.thickness).toBe(8);
      expect(config!.preset).toBe("circle");
      expect(config!.offset).toBe(-10); // Inset bevel
    });

    it("returns undefined for undefined input", () => {
      expect(getBevelConfig(undefined)).toBeUndefined();
    });
  });

  describe("full pipeline with bevel + contour", () => {
    it("creates geometry with both front bevel AND contour", () => {
      const shape = createSquareShape(100);
      const extrusionDepth = 20;

      // Define bevel (like from domain/Shape3d.bevelTop)
      const bevelTop: Bevel3d = {
        width: px(8),
        height: px(6),
        preset: "circle",
      };

      // Convert to BevelConfig
      const bevelConfig = getBevelConfig(bevelTop);
      expect(bevelConfig).toBeDefined();

      // Create geometry with bevel
      const geometry = createAsymmetricExtrudedGeometry(
        [shape],
        extrusionDepth,
        { top: bevelConfig, bottom: undefined },
      );

      // Verify geometry has bevel (front bevel extends to positive Z)
      const zRange = getGeometryZRange(geometry);
      console.log(`Geometry with front bevel - Z range: [${zRange.min.toFixed(2)}, ${zRange.max.toFixed(2)}]`);

      // Front bevel should extend from Z=0 towards positive Z
      expect(zRange.max).toBeGreaterThan(0);
      expect(zRange.max).toBeCloseTo(bevelConfig!.thickness, 1);

      // Create contour from beveled geometry
      const contourMesh = createContourMesh(geometry, { width: 5, color: "#FF0000" });

      // Verify contour was created
      expect(contourMesh).toBeInstanceOf(THREE.Mesh);
      expect(contourMesh.geometry.attributes.position.count).toBeGreaterThan(0);

      // Verify contour is larger than base geometry
      geometry.computeBoundingBox();
      contourMesh.geometry.computeBoundingBox();

      const baseSize = new THREE.Vector3();
      const contourSize = new THREE.Vector3();
      geometry.boundingBox!.getSize(baseSize);
      contourMesh.geometry.boundingBox!.getSize(contourSize);

      console.log(`Base geometry size: ${baseSize.x.toFixed(2)} x ${baseSize.y.toFixed(2)} x ${baseSize.z.toFixed(2)}`);
      console.log(`Contour mesh size: ${contourSize.x.toFixed(2)} x ${contourSize.y.toFixed(2)} x ${contourSize.z.toFixed(2)}`);

      expect(contourSize.x).toBeGreaterThan(baseSize.x);
      expect(contourSize.y).toBeGreaterThan(baseSize.y);
      expect(contourSize.z).toBeGreaterThan(baseSize.z);
    });

    it("creates geometry with both front AND back bevels AND contour", () => {
      const shape = createSquareShape(100);
      const extrusionDepth = 20;

      // Define both bevels
      const bevelTop: Bevel3d = {
        width: px(6),
        height: px(5),
        preset: "relaxedInset",
      };

      const bevelBottom: Bevel3d = {
        width: px(4),
        height: px(3),
        preset: "angle",
      };

      const topConfig = getBevelConfig(bevelTop);
      const bottomConfig = getBevelConfig(bevelBottom);

      // Create geometry with both bevels
      const geometry = createAsymmetricExtrudedGeometry(
        [shape],
        extrusionDepth,
        { top: topConfig, bottom: bottomConfig },
      );

      // Verify Z range includes both bevels
      const zRange = getGeometryZRange(geometry);
      console.log(`Geometry with both bevels - Z range: [${zRange.min.toFixed(2)}, ${zRange.max.toFixed(2)}]`);

      // Front bevel extends towards +Z, back bevel extends towards -Z
      expect(zRange.max).toBeGreaterThan(0);
      expect(zRange.max).toBeCloseTo(topConfig!.thickness, 1);
      expect(zRange.min).toBeLessThan(-extrusionDepth);
      expect(zRange.min).toBeCloseTo(-extrusionDepth - bottomConfig!.thickness, 1);

      // Create contour from doubly-beveled geometry
      const contourMesh = createContourMesh(geometry, { width: 3, color: "#0000FF" });

      // Verify contour encompasses entire beveled geometry
      const contourZRange = getGeometryZRange(contourMesh.geometry);
      console.log(`Contour - Z range: [${contourZRange.min.toFixed(2)}, ${contourZRange.max.toFixed(2)}]`);

      expect(contourZRange.max).toBeGreaterThan(zRange.max);
      expect(contourZRange.min).toBeLessThan(zRange.min);
    });

    it("supports all ECMA-376 bevel presets with contour", () => {
      const presets: Bevel3d["preset"][] = [
        "angle",
        "circle",
        "softRound",
        "convex",
        "relaxedInset",
        "slope",
        "hardEdge",
        "cross",
        "artDeco",
        "divot",
        "riblet",
        "coolSlant",
      ];

      const shape = createSquareShape(100);

      for (const preset of presets) {
        const bevel: Bevel3d = {
          width: px(5),
          height: px(4),
          preset,
        };

        const bevelConfig = getBevelConfig(bevel);
        expect(bevelConfig).toBeDefined();
        expect(bevelConfig!.preset).toBe(preset);

        // Create geometry
        const geometry = createAsymmetricExtrudedGeometry(
          [shape],
          20,
          { top: bevelConfig },
        );

        expect(geometry.attributes.position.count).toBeGreaterThan(0);

        // Create contour
        const contourMesh = createContourMesh(geometry, { width: 2, color: "#000000" });
        expect(contourMesh.geometry.attributes.position.count).toBeGreaterThan(0);

        // Cleanup
        geometry.dispose();
        contourMesh.geometry.dispose();
      }
    });
  });
});
