/**
 * @file Tests for 3D Backdrop
 *
 * Tests backdrop plane creation and positioning.
 *
 * @see ECMA-376 Part 1, Section 20.1.5.3 (backdrop)
 */

import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  createBackdropMesh,
  createDefaultBackdrop,
  createGradientBackdrop,
  createBackdropFromDomain,
  updateBackdropColor,
  updateBackdropOpacity,
  updateBackdropPosition,
  disposeBackdrop,
  addBackdropToScene,
  type BackdropConfig,
} from "./backdrop";

// =============================================================================
// Test Helpers
// =============================================================================

function createBasicBackdropConfig(): BackdropConfig {
  return {
    anchor: { x: 0, y: 0, z: -100 },
    normal: { x: 0, y: 0, z: 1 },
    up: { x: 0, y: 1, z: 0 },
    size: 200,
    color: "#ffffff",
    opacity: 1,
    receiveShadow: true,
  };
}

// =============================================================================
// createBackdropMesh Tests
// =============================================================================

describe("createBackdropMesh", () => {
  it("creates a valid backdrop state", () => {
    const config = createBasicBackdropConfig();

    const backdrop = createBackdropMesh(config);

    expect(backdrop.mesh).toBeInstanceOf(THREE.Mesh);
    expect(backdrop.plane).toBeInstanceOf(THREE.Plane);
  });

  it("names the mesh 'backdrop'", () => {
    const config = createBasicBackdropConfig();

    const backdrop = createBackdropMesh(config);

    expect(backdrop.mesh.name).toBe("backdrop");
  });

  it("uses PlaneGeometry", () => {
    const config = createBasicBackdropConfig();

    const backdrop = createBackdropMesh(config);

    expect(backdrop.mesh.geometry).toBeInstanceOf(THREE.PlaneGeometry);
  });

  it("positions mesh at anchor point", () => {
    const config: BackdropConfig = {
      anchor: { x: 100, y: 200, z: -300 },
      normal: { x: 0, y: 0, z: 1 },
      up: { x: 0, y: 1, z: 0 },
    };

    const backdrop = createBackdropMesh(config);

    // Position is scaled by COORDINATE_SCALE (1/96)
    expect(backdrop.mesh.position.x).toBeCloseTo(100 / 96, 4);
    expect(backdrop.mesh.position.y).toBeCloseTo(200 / 96, 4);
    expect(backdrop.mesh.position.z).toBeCloseTo(-300 / 96, 4);
  });

  it("enables shadow receiving by default", () => {
    const config = createBasicBackdropConfig();

    const backdrop = createBackdropMesh(config);

    expect(backdrop.mesh.receiveShadow).toBe(true);
  });

  it("can disable shadow receiving", () => {
    const config: BackdropConfig = {
      ...createBasicBackdropConfig(),
      receiveShadow: false,
    };

    const backdrop = createBackdropMesh(config);

    expect(backdrop.mesh.receiveShadow).toBe(false);
  });

  it("applies custom color", () => {
    const config: BackdropConfig = {
      ...createBasicBackdropConfig(),
      color: "#ff0000",
    };

    const backdrop = createBackdropMesh(config);
    const material = backdrop.mesh.material as THREE.MeshStandardMaterial;

    expect(material.color.getHexString()).toBe("ff0000");
  });

  it("applies custom opacity", () => {
    const config: BackdropConfig = {
      ...createBasicBackdropConfig(),
      opacity: 0.5,
    };

    const backdrop = createBackdropMesh(config);
    const material = backdrop.mesh.material as THREE.MeshStandardMaterial;

    expect(material.opacity).toBe(0.5);
    expect(material.transparent).toBe(true);
  });

  it("orients plane based on normal vector", () => {
    // Backdrop facing upward (floor)
    const config: BackdropConfig = {
      anchor: { x: 0, y: -100, z: 0 },
      normal: { x: 0, y: 1, z: 0 },
      up: { x: 0, y: 0, z: 1 },
    };

    const backdrop = createBackdropMesh(config);

    // Plane should be oriented based on normal
    expect(backdrop.plane.normal.y).toBeCloseTo(1, 5);
  });
});

// =============================================================================
// createDefaultBackdrop Tests
// =============================================================================

describe("createDefaultBackdrop", () => {
  it("creates a backdrop behind the scene", () => {
    const backdrop = createDefaultBackdrop();

    expect(backdrop.mesh).toBeInstanceOf(THREE.Mesh);
    // Z should be negative (behind origin)
    expect(backdrop.mesh.position.z).toBeLessThan(0);
  });

  it("uses custom depth", () => {
    const backdrop = createDefaultBackdrop(10);

    // Position should be at -depth
    expect(backdrop.mesh.position.z).toBeCloseTo(-10, 4);
  });

  it("uses custom size", () => {
    const backdrop = createDefaultBackdrop(5, 30);
    const geometry = backdrop.mesh.geometry as THREE.PlaneGeometry;

    // Geometry should have parameters matching size
    expect(geometry.parameters.width).toBe(30);
    expect(geometry.parameters.height).toBe(30);
  });

  it("uses custom color", () => {
    const backdrop = createDefaultBackdrop(5, 20, "#00ff00");
    const material = backdrop.mesh.material as THREE.MeshStandardMaterial;

    expect(material.color.getHexString()).toBe("00ff00");
  });
});

// =============================================================================
// createGradientBackdrop Tests
// =============================================================================

describe("createGradientBackdrop", () => {
  it("creates a gradient backdrop", () => {
    const config: Omit<BackdropConfig, "color"> = {
      anchor: { x: 0, y: 0, z: -100 },
      normal: { x: 0, y: 0, z: 1 },
      up: { x: 0, y: 1, z: 0 },
      size: 100,
    };

    const backdrop = createGradientBackdrop(config, "#ffffff", "#000000");

    expect(backdrop.mesh).toBeInstanceOf(THREE.Mesh);
    expect(backdrop.mesh.name).toBe("backdrop-gradient");
  });

  it("uses vertex colors", () => {
    const config: Omit<BackdropConfig, "color"> = {
      anchor: { x: 0, y: 0, z: -100 },
      normal: { x: 0, y: 0, z: 1 },
      up: { x: 0, y: 1, z: 0 },
      size: 100,
    };

    const backdrop = createGradientBackdrop(config, "#ffffff", "#000000");
    const material = backdrop.mesh.material as THREE.MeshBasicMaterial;

    expect(material.vertexColors).toBe(true);
  });

  it("has color attribute on geometry", () => {
    const config: Omit<BackdropConfig, "color"> = {
      anchor: { x: 0, y: 0, z: -100 },
      normal: { x: 0, y: 0, z: 1 },
      up: { x: 0, y: 1, z: 0 },
      size: 100,
    };

    const backdrop = createGradientBackdrop(config, "#ff0000", "#0000ff");
    const geometry = backdrop.mesh.geometry;

    expect(geometry.getAttribute("color")).toBeDefined();
  });
});

// =============================================================================
// createBackdropFromDomain Tests
// =============================================================================

describe("createBackdropFromDomain", () => {
  it("creates backdrop from 2D domain type", () => {
    const domainBackdrop = {
      anchor: { x: 0, y: 0 },
      normal: { x: 0, y: 0 },
      up: { x: 0, y: 1 },
    };

    const backdrop = createBackdropFromDomain(domainBackdrop);

    expect(backdrop.mesh).toBeInstanceOf(THREE.Mesh);
  });

  it("applies additional options", () => {
    const domainBackdrop = {
      anchor: { x: 0, y: 0 },
      normal: { x: 0, y: 0 },
      up: { x: 0, y: 1 },
    };

    const backdrop = createBackdropFromDomain(domainBackdrop, {
      color: "#ff00ff",
      opacity: 0.8,
    });

    const material = backdrop.mesh.material as THREE.MeshStandardMaterial;
    expect(material.color.getHexString()).toBe("ff00ff");
    expect(material.opacity).toBe(0.8);
  });
});

// =============================================================================
// Update Functions Tests
// =============================================================================

describe("updateBackdropColor", () => {
  it("updates backdrop color", () => {
    const backdrop = createDefaultBackdrop();

    updateBackdropColor(backdrop, "#ff0000");

    const material = backdrop.mesh.material as THREE.MeshStandardMaterial;
    expect(material.color.getHexString()).toBe("ff0000");
  });
});

describe("updateBackdropOpacity", () => {
  it("updates backdrop opacity", () => {
    const backdrop = createDefaultBackdrop();

    updateBackdropOpacity(backdrop, 0.3);

    const material = backdrop.mesh.material as THREE.MeshStandardMaterial;
    expect(material.opacity).toBe(0.3);
    expect(material.transparent).toBe(true);
  });

  it("sets non-transparent for full opacity", () => {
    const backdrop = createDefaultBackdrop();
    updateBackdropOpacity(backdrop, 0.3);

    updateBackdropOpacity(backdrop, 1);

    const material = backdrop.mesh.material as THREE.MeshStandardMaterial;
    expect(material.transparent).toBe(false);
  });
});

describe("updateBackdropPosition", () => {
  it("updates backdrop position", () => {
    const backdrop = createDefaultBackdrop();

    updateBackdropPosition(backdrop, { x: 100, y: 200, z: -300 });

    expect(backdrop.mesh.position.x).toBeCloseTo(100 / 96, 4);
    expect(backdrop.mesh.position.y).toBeCloseTo(200 / 96, 4);
    expect(backdrop.mesh.position.z).toBeCloseTo(-300 / 96, 4);
  });
});

// =============================================================================
// Utility Functions Tests
// =============================================================================

describe("disposeBackdrop", () => {
  it("disposes mesh resources", () => {
    const backdrop = createDefaultBackdrop();

    // Should not throw
    expect(() => disposeBackdrop(backdrop)).not.toThrow();
  });
});

describe("addBackdropToScene", () => {
  it("adds backdrop to scene with negative render order", () => {
    const scene = new THREE.Scene();
    const backdrop = createDefaultBackdrop();

    addBackdropToScene(scene, backdrop);

    expect(scene.children).toContain(backdrop.mesh);
    expect(backdrop.mesh.renderOrder).toBe(-1000);
  });
});
