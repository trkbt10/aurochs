/**
 * @file Tests for contour.ts
 *
 * Tests 3D contour (outline shell) effect for extruded text.
 * @see ECMA-376 Part 1, Section 20.1.5.9 (sp3d contourW/contourClr)
 */

import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  createContourMesh,
  createContourMeshExpanded,
  updateContourColor,
  disposeContour,
  type ContourConfig,
} from "./contour";

/**
 * Create a simple box geometry for testing
 */
function createTestGeometry(): THREE.BufferGeometry {
  return new THREE.BoxGeometry(100, 50, 20);
}

describe("contour", () => {
  describe("createContourMesh", () => {
    it("should create a contour mesh from geometry", () => {
      const geometry = createTestGeometry();
      const config: ContourConfig = {
        width: 5,
        color: "#FF0000",
      };

      const contourMesh = createContourMesh(geometry, config);

      expect(contourMesh).toBeInstanceOf(THREE.Mesh);
      expect(contourMesh.name).toBe("text-contour");
      expect(contourMesh.renderOrder).toBe(-1);
    });

    it("should clone geometry (not modify original)", () => {
      const geometry = createTestGeometry();
      geometry.computeBoundingBox();
      const originalBox = geometry.boundingBox!.clone();

      const config: ContourConfig = {
        width: 10,
        color: "#00FF00",
      };

      createContourMesh(geometry, config);

      // Original geometry should be unchanged
      geometry.computeBoundingBox();
      expect(geometry.boundingBox!.min.x).toBe(originalBox.min.x);
      expect(geometry.boundingBox!.max.x).toBe(originalBox.max.x);
    });

    it("should scale contour geometry larger than original", () => {
      const geometry = createTestGeometry();
      geometry.computeBoundingBox();
      const originalSize = new THREE.Vector3();
      geometry.boundingBox!.getSize(originalSize);

      const config: ContourConfig = {
        width: 10,
        color: "#0000FF",
      };

      const contourMesh = createContourMesh(geometry, config);
      contourMesh.geometry.computeBoundingBox();
      const contourSize = new THREE.Vector3();
      contourMesh.geometry.boundingBox!.getSize(contourSize);

      // Contour should be larger
      expect(contourSize.x).toBeGreaterThan(originalSize.x);
      expect(contourSize.y).toBeGreaterThan(originalSize.y);
      expect(contourSize.z).toBeGreaterThan(originalSize.z);
    });

    it("should apply correct color to material", () => {
      const geometry = createTestGeometry();
      const config: ContourConfig = {
        width: 5,
        color: "#FF5500",
      };

      const contourMesh = createContourMesh(geometry, config);
      const material = contourMesh.material as THREE.MeshStandardMaterial;

      expect(material.color.getHexString().toUpperCase()).toBe("FF5500");
    });

    it("should use FrontSide rendering for correct lighting", () => {
      const geometry = createTestGeometry();
      const config: ContourConfig = {
        width: 5,
        color: "#FFFFFF",
      };

      const contourMesh = createContourMesh(geometry, config);
      const material = contourMesh.material as THREE.MeshStandardMaterial;

      // FrontSide ensures proper lighting on the expanded outer shell
      expect(material.side).toBe(THREE.FrontSide);
    });

    it("should apply coordinate scale to mesh", () => {
      const geometry = createTestGeometry();
      const config: ContourConfig = {
        width: 5,
        color: "#FFFFFF",
      };

      const contourMesh = createContourMesh(geometry, config);

      // Default coordinate scale is 1/96
      const expectedScale = 1 / 96;
      expect(contourMesh.scale.x).toBeCloseTo(expectedScale, 6);
      expect(contourMesh.scale.y).toBeCloseTo(expectedScale, 6);
      expect(contourMesh.scale.z).toBeCloseTo(expectedScale, 6);
    });

    it("should handle zero width (no scaling)", () => {
      const geometry = createTestGeometry();
      geometry.computeBoundingBox();
      const originalSize = new THREE.Vector3();
      geometry.boundingBox!.getSize(originalSize);

      const config: ContourConfig = {
        width: 0,
        color: "#000000",
      };

      const contourMesh = createContourMesh(geometry, config);
      contourMesh.geometry.computeBoundingBox();
      const contourSize = new THREE.Vector3();
      contourMesh.geometry.boundingBox!.getSize(contourSize);

      // With zero width, scale factor is 1, so sizes should be equal
      expect(contourSize.x).toBeCloseTo(originalSize.x, 5);
      expect(contourSize.y).toBeCloseTo(originalSize.y, 5);
      expect(contourSize.z).toBeCloseTo(originalSize.z, 5);
    });

    it("should handle large contour width", () => {
      const geometry = createTestGeometry();
      const config: ContourConfig = {
        width: 50,
        color: "#123456",
      };

      // Should not throw
      const contourMesh = createContourMesh(geometry, config);
      expect(contourMesh).toBeInstanceOf(THREE.Mesh);
    });
  });

  describe("createContourMeshExpanded", () => {
    it("should create contour mesh using normal expansion", () => {
      const geometry = createTestGeometry();
      geometry.computeVertexNormals();

      const config: ContourConfig = {
        width: 5,
        color: "#AABBCC",
      };

      const contourMesh = createContourMeshExpanded(geometry, config);

      expect(contourMesh).toBeInstanceOf(THREE.Mesh);
      expect(contourMesh.name).toBe("text-contour-expanded");
    });

    it("should fall back to scale method if no normals", () => {
      // Create geometry without normals
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      // No normals attribute

      const config: ContourConfig = {
        width: 5,
        color: "#DDEEFF",
      };

      // Should fall back to createContourMesh
      const contourMesh = createContourMeshExpanded(geometry, config);

      expect(contourMesh).toBeInstanceOf(THREE.Mesh);
      // Falls back to scale method which uses "text-contour" name
      expect(contourMesh.name).toBe("text-contour");
    });
  });

  describe("updateContourColor", () => {
    it("should update contour material color", () => {
      const geometry = createTestGeometry();
      const config: ContourConfig = {
        width: 5,
        color: "#FF0000",
      };

      const contourMesh = createContourMesh(geometry, config);
      updateContourColor(contourMesh, "#00FF00");

      const material = contourMesh.material as THREE.MeshStandardMaterial;
      expect(material.color.getHexString().toUpperCase()).toBe("00FF00");
    });
  });

  describe("disposeContour", () => {
    it("should dispose geometry and material", () => {
      const geometry = createTestGeometry();
      const config: ContourConfig = {
        width: 5,
        color: "#FF0000",
      };

      const contourMesh = createContourMesh(geometry, config);

      // Track disposal
      const tracker = { geometryDisposed: false, materialDisposed: false };
      const originalGeometryDispose = contourMesh.geometry.dispose.bind(contourMesh.geometry);
      const originalMaterialDispose = (contourMesh.material as THREE.Material).dispose.bind(
        contourMesh.material as THREE.Material,
      );

      contourMesh.geometry.dispose = () => {
        tracker.geometryDisposed = true;
        originalGeometryDispose();
      };
      (contourMesh.material as THREE.Material).dispose = () => {
        tracker.materialDisposed = true;
        originalMaterialDispose();
      };

      disposeContour(contourMesh);

      expect(tracker.geometryDisposed).toBe(true);
      expect(tracker.materialDisposed).toBe(true);
    });
  });
});
