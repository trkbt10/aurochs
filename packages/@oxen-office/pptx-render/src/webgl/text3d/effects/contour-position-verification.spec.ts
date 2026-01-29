/**
 * @file Contour Position Verification Test
 *
 * Verifies that contour geometry is positioned correctly relative to
 * the main geometry when both use the same extrusion code.
 *
 * The contour should uniformly expand the shape by contourWidth in X/Y.
 */

import * as THREE from "three";
import { createContourFromShapes, type ContourFromShapesConfig } from "./contour";
import {
  createExtrudedGeometryWithBevel,
  type AsymmetricBevelSpec,
} from "../geometry/bevel/three-adapter";

// =============================================================================
// Test Fixtures
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

type BoundsInfo = {
  min: THREE.Vector3;
  max: THREE.Vector3;
  size: THREE.Vector3;
};

function getBounds(geometry: THREE.BufferGeometry): BoundsInfo {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const size = new THREE.Vector3();
  box.getSize(size);
  return {
    min: box.min.clone(),
    max: box.max.clone(),
    size,
  };
}

function getGeometryFromMesh(mesh: THREE.Mesh): THREE.BufferGeometry {
  // The geometry is already in original pixel units
  // The mesh.scale is applied at render time, not to the geometry itself
  return mesh.geometry;
}

// =============================================================================
// Tests
// =============================================================================

describe("Contour Position Verification", () => {
  describe("Basic contour expansion (no bevel)", () => {
    it("contour should be exactly contourWidth larger in X/Y", () => {
      const shape = createSquareShape(100);
      const extrusionDepth = 10;
      const contourWidth = 5;

      // Create main geometry using NEW code
      const mainGeometry = createExtrudedGeometryWithBevel(
        [shape],
        extrusionDepth,
        { top: undefined, bottom: undefined },
      );

      // Create contour using NEW code
      const contourConfig: ContourFromShapesConfig = {
        width: contourWidth,
        color: "#000000",
        extrusionDepth,
        bevel: undefined,
      };
      const contourMesh = createContourFromShapes([shape], contourConfig, 1 / 96);
      const contourGeometry = getGeometryFromMesh(contourMesh);

      const mainBounds = getBounds(mainGeometry);
      const contourBounds = getBounds(contourGeometry);

      console.log("\n=== No Bevel: Contour Position ===");
      console.log(`Main bounds: X=[${mainBounds.min.x.toFixed(2)}, ${mainBounds.max.x.toFixed(2)}], Y=[${mainBounds.min.y.toFixed(2)}, ${mainBounds.max.y.toFixed(2)}], Z=[${mainBounds.min.z.toFixed(2)}, ${mainBounds.max.z.toFixed(2)}]`);
      console.log(`Contour bounds: X=[${contourBounds.min.x.toFixed(2)}, ${contourBounds.max.x.toFixed(2)}], Y=[${contourBounds.min.y.toFixed(2)}, ${contourBounds.max.y.toFixed(2)}], Z=[${contourBounds.min.z.toFixed(2)}, ${contourBounds.max.z.toFixed(2)}]`);

      // Calculate expansion
      const xExpansion = (contourBounds.size.x - mainBounds.size.x) / 2;
      const yExpansion = (contourBounds.size.y - mainBounds.size.y) / 2;

      console.log(`\nExpansion: X=${xExpansion.toFixed(2)}, Y=${yExpansion.toFixed(2)}`);
      console.log(`Expected: ${contourWidth}`);

      // Verify X/Y expansion is approximately contourWidth
      expect(xExpansion).toBeGreaterThan(contourWidth * 0.8);
      expect(xExpansion).toBeLessThan(contourWidth * 1.2);
      expect(yExpansion).toBeGreaterThan(contourWidth * 0.8);
      expect(yExpansion).toBeLessThan(contourWidth * 1.2);

      // Verify Z bounds are same (same extrusion depth)
      expect(Math.abs(mainBounds.size.z - contourBounds.size.z)).toBeLessThan(1);
    });
  });

  describe("Contour with bevel", () => {
    it("contour should expand uniformly even with bevel", () => {
      const shape = createSquareShape(100);
      const extrusionDepth = 20;
      const contourWidth = 8;

      const bevelSpec: AsymmetricBevelSpec = {
        top: { width: 5, height: 5, preset: "circle" },
        bottom: undefined,
      };

      // Create main geometry with bevel
      const mainGeometry = createExtrudedGeometryWithBevel(
        [shape],
        extrusionDepth,
        bevelSpec,
      );

      // Create contour with same bevel
      const contourConfig: ContourFromShapesConfig = {
        width: contourWidth,
        color: "#000000",
        extrusionDepth,
        bevel: {
          top: { thickness: 5, size: 5, segments: 8 },
          bottom: undefined,
        },
      };
      const contourMesh = createContourFromShapes([shape], contourConfig, 1 / 96);
      const contourGeometry = getGeometryFromMesh(contourMesh);

      const mainBounds = getBounds(mainGeometry);
      const contourBounds = getBounds(contourGeometry);

      console.log("\n=== With Bevel: Contour Position ===");
      console.log(`Main bounds: X=[${mainBounds.min.x.toFixed(2)}, ${mainBounds.max.x.toFixed(2)}], Y=[${mainBounds.min.y.toFixed(2)}, ${mainBounds.max.y.toFixed(2)}], Z=[${mainBounds.min.z.toFixed(2)}, ${mainBounds.max.z.toFixed(2)}]`);
      console.log(`Contour bounds: X=[${contourBounds.min.x.toFixed(2)}, ${contourBounds.max.x.toFixed(2)}], Y=[${contourBounds.min.y.toFixed(2)}, ${contourBounds.max.y.toFixed(2)}], Z=[${contourBounds.min.z.toFixed(2)}, ${contourBounds.max.z.toFixed(2)}]`);

      const xExpansion = (contourBounds.size.x - mainBounds.size.x) / 2;
      const yExpansion = (contourBounds.size.y - mainBounds.size.y) / 2;

      console.log(`\nExpansion: X=${xExpansion.toFixed(2)}, Y=${yExpansion.toFixed(2)}`);
      console.log(`Expected: ${contourWidth}`);

      // Verify expansion with some tolerance
      expect(xExpansion).toBeGreaterThan(contourWidth * 0.5);
      expect(yExpansion).toBeGreaterThan(contourWidth * 0.5);
    });
  });

  describe("Different contour widths", () => {
    const widths = [2, 5, 10, 20];

    widths.forEach((contourWidth) => {
      it(`contourWidth ${contourWidth}px expands correctly`, () => {
        const shape = createSquareShape(100);
        const extrusionDepth = 15;

        const mainGeometry = createExtrudedGeometryWithBevel(
          [shape],
          extrusionDepth,
          { top: undefined, bottom: undefined },
        );

        const contourConfig: ContourFromShapesConfig = {
          width: contourWidth,
          color: "#000000",
          extrusionDepth,
          bevel: undefined,
        };
        const contourMesh = createContourFromShapes([shape], contourConfig, 1 / 96);
        const contourGeometry = getGeometryFromMesh(contourMesh);

        const mainBounds = getBounds(mainGeometry);
        const contourBounds = getBounds(contourGeometry);

        const xExpansion = (contourBounds.size.x - mainBounds.size.x) / 2;
        const yExpansion = (contourBounds.size.y - mainBounds.size.y) / 2;

        console.log(`Width ${contourWidth}px: X expansion=${xExpansion.toFixed(2)}, Y expansion=${yExpansion.toFixed(2)}`);

        // Expansion should be approximately contourWidth
        expect(xExpansion).toBeGreaterThan(contourWidth * 0.7);
        expect(xExpansion).toBeLessThan(contourWidth * 1.3);
      });
    });
  });

  describe("Z position alignment", () => {
    it("main and contour should have same Z range", () => {
      const shape = createSquareShape(100);
      const extrusionDepth = 10;
      const contourWidth = 5;

      const mainGeometry = createExtrudedGeometryWithBevel(
        [shape],
        extrusionDepth,
        { top: undefined, bottom: undefined },
      );

      const contourConfig: ContourFromShapesConfig = {
        width: contourWidth,
        color: "#000000",
        extrusionDepth,
        bevel: undefined,
      };
      const contourMesh = createContourFromShapes([shape], contourConfig, 1 / 96);
      const contourGeometry = getGeometryFromMesh(contourMesh);

      const mainBounds = getBounds(mainGeometry);
      const contourBounds = getBounds(contourGeometry);

      console.log("\n=== Z Position Alignment ===");
      console.log(`Main Z: [${mainBounds.min.z.toFixed(2)}, ${mainBounds.max.z.toFixed(2)}]`);
      console.log(`Contour Z: [${contourBounds.min.z.toFixed(2)}, ${contourBounds.max.z.toFixed(2)}]`);

      // Both should have same Z range (same extrusion depth)
      expect(Math.abs(mainBounds.min.z - contourBounds.min.z)).toBeLessThan(1);
      expect(Math.abs(mainBounds.max.z - contourBounds.max.z)).toBeLessThan(1);
    });
  });
});
