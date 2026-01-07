/**
 * @file Tests for 3D Shadow Effects
 *
 * Tests inner shadow, outer shadow, and shadow mapping functionality.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.40 (innerShdw)
 * @see ECMA-376 Part 1, Section 20.1.8.49 (outerShdw)
 */

import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  createDropShadowMesh,
  createInnerShadowMesh,
  createInnerShadowShader,
  createShadowLight,
  enableMeshShadows,
  enableGroupShadows,
  createShadowPlane,
  disposeShadow,
  type ShadowConfig,
} from "./shadow";

// =============================================================================
// Test Helpers
// =============================================================================

function createTestGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(10, 10, 10);
  geometry.computeVertexNormals();
  return geometry;
}

function createBasicShadowConfig(): ShadowConfig {
  return {
    type: "outer",
    color: "#000000",
    blurRadius: 10,
    distance: 5,
    direction: 45,
    opacity: 0.5,
  };
}

function createInnerShadowConfig(): ShadowConfig {
  return {
    type: "inner",
    color: "#000000",
    blurRadius: 5,
    distance: 3,
    direction: 135,
    opacity: 0.4,
  };
}

// =============================================================================
// createDropShadowMesh Tests
// Note: These tests require browser environment with document/canvas APIs.
// They are skipped in Node.js environment.
// =============================================================================

describe("createDropShadowMesh", () => {
  const hasBrowserAPIs = typeof document !== "undefined";

  it.skipIf(!hasBrowserAPIs)("creates a valid mesh", () => {
    const geometry = createTestGeometry();
    const config = createBasicShadowConfig();

    const shadowMesh = createDropShadowMesh(geometry, config);

    expect(shadowMesh).toBeInstanceOf(THREE.Mesh);
    expect(shadowMesh.name).toBe("text-shadow");
  });

  it.skipIf(!hasBrowserAPIs)("positions shadow based on direction and distance", () => {
    const geometry = createTestGeometry();
    const config = createBasicShadowConfig();

    const shadowMesh = createDropShadowMesh(geometry, config);

    // Position should be offset based on direction (45°) and distance
    expect(shadowMesh.position.x).not.toBe(0);
    expect(shadowMesh.position.y).not.toBe(0);
  });

  it.skipIf(!hasBrowserAPIs)("applies scale based on ECMA-376 scaleX/scaleY", () => {
    const geometry = createTestGeometry();
    const config: ShadowConfig = {
      ...createBasicShadowConfig(),
      scaleX: 150,
      scaleY: 80,
    };

    const shadowMesh = createDropShadowMesh(geometry, config);

    // Scale should be non-uniform based on scaleX/scaleY
    expect(shadowMesh.scale.x).not.toBe(shadowMesh.scale.y);
  });

  it.skipIf(!hasBrowserAPIs)("uses default opacity when not specified", () => {
    const geometry = createTestGeometry();
    const config: ShadowConfig = {
      type: "outer",
      color: "#333333",
      blurRadius: 10,
      distance: 5,
      direction: 0,
    };

    const shadowMesh = createDropShadowMesh(geometry, config);
    const material = shadowMesh.material as THREE.MeshBasicMaterial;

    expect(material.opacity).toBe(0.3); // Default opacity
  });
});

// =============================================================================
// createInnerShadowMesh Tests
// =============================================================================

describe("createInnerShadowMesh", () => {
  it("creates a valid mesh", () => {
    const geometry = createTestGeometry();
    const config = createInnerShadowConfig();

    const shadowMesh = createInnerShadowMesh(geometry, config);

    expect(shadowMesh).toBeInstanceOf(THREE.Mesh);
    expect(shadowMesh.name).toBe("text-inner-shadow");
  });

  it("flips normals for inside rendering", () => {
    const geometry = createTestGeometry();
    const originalNormals = geometry.getAttribute("normal").array.slice();

    const config = createInnerShadowConfig();
    const shadowMesh = createInnerShadowMesh(geometry, config);

    const shadowNormals = shadowMesh.geometry.getAttribute("normal").array;

    // Normals should be inverted
    for (let i = 0; i < Math.min(originalNormals.length, 6); i++) {
      expect(shadowNormals[i]).toBe(-originalNormals[i]);
    }
  });

  it("uses BackSide rendering", () => {
    const geometry = createTestGeometry();
    const config = createInnerShadowConfig();

    const shadowMesh = createInnerShadowMesh(geometry, config);
    const material = shadowMesh.material as THREE.MeshBasicMaterial;

    expect(material.side).toBe(THREE.BackSide);
  });

  it("uses multiply blending for realistic inner shadow", () => {
    const geometry = createTestGeometry();
    const config = createInnerShadowConfig();

    const shadowMesh = createInnerShadowMesh(geometry, config);
    const material = shadowMesh.material as THREE.MeshBasicMaterial;

    expect(material.blending).toBe(THREE.MultiplyBlending);
  });

  it("scales down slightly for inset effect", () => {
    const geometry = createTestGeometry();
    const config = createInnerShadowConfig();

    const shadowMesh = createInnerShadowMesh(geometry, config);

    // Scale should be less than 1 for inset
    expect(shadowMesh.scale.x).toBeLessThanOrEqual(1);
    expect(shadowMesh.scale.y).toBeLessThanOrEqual(1);
    expect(shadowMesh.scale.z).toBeLessThanOrEqual(1);
  });
});

// =============================================================================
// createInnerShadowShader Tests
// =============================================================================

describe("createInnerShadowShader", () => {
  it("creates a shader-based mesh", () => {
    const geometry = createTestGeometry();
    const config = createInnerShadowConfig();

    const shadowMesh = createInnerShadowShader(geometry, config);

    expect(shadowMesh).toBeInstanceOf(THREE.Mesh);
    expect(shadowMesh.name).toBe("text-inner-shadow-shader");
  });

  it("uses ShaderMaterial", () => {
    const geometry = createTestGeometry();
    const config = createInnerShadowConfig();

    const shadowMesh = createInnerShadowShader(geometry, config);

    expect(shadowMesh.material).toBeInstanceOf(THREE.ShaderMaterial);
  });

  it("has correct uniforms", () => {
    const geometry = createTestGeometry();
    const config = createInnerShadowConfig();

    const shadowMesh = createInnerShadowShader(geometry, config);
    const material = shadowMesh.material as THREE.ShaderMaterial;

    expect(material.uniforms.shadowColor).toBeDefined();
    expect(material.uniforms.shadowOpacity).toBeDefined();
    expect(material.uniforms.shadowDirection).toBeDefined();
    expect(material.uniforms.shadowDistance).toBeDefined();
    expect(material.uniforms.shadowBlur).toBeDefined();
  });

  it("sets opacity from config", () => {
    const geometry = createTestGeometry();
    const config: ShadowConfig = {
      ...createInnerShadowConfig(),
      opacity: 0.7,
    };

    const shadowMesh = createInnerShadowShader(geometry, config);
    const material = shadowMesh.material as THREE.ShaderMaterial;

    expect(material.uniforms.shadowOpacity.value).toBe(0.7);
  });
});

// =============================================================================
// createShadowLight Tests
// =============================================================================

describe("createShadowLight", () => {
  it("creates a DirectionalLight", () => {
    const config = createBasicShadowConfig();

    const light = createShadowLight(config);

    expect(light).toBeInstanceOf(THREE.DirectionalLight);
  });

  it("enables shadow casting", () => {
    const config = createBasicShadowConfig();

    const light = createShadowLight(config);

    expect(light.castShadow).toBe(true);
  });

  it("configures shadow map size", () => {
    const config = createBasicShadowConfig();

    const light = createShadowLight(config);

    expect(light.shadow.mapSize.width).toBe(1024);
    expect(light.shadow.mapSize.height).toBe(1024);
  });
});

// =============================================================================
// Utility Functions Tests
// =============================================================================

describe("enableMeshShadows", () => {
  it("enables shadow casting and receiving", () => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial(),
    );

    enableMeshShadows(mesh);

    expect(mesh.castShadow).toBe(true);
    expect(mesh.receiveShadow).toBe(true);
  });

  it("can disable specific shadow options", () => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial(),
    );

    enableMeshShadows(mesh, false, true);

    expect(mesh.castShadow).toBe(false);
    expect(mesh.receiveShadow).toBe(true);
  });
});

describe("enableGroupShadows", () => {
  it("enables shadows on all meshes in group", () => {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
    group.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));

    enableGroupShadows(group);

    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        expect(child.castShadow).toBe(true);
        expect(child.receiveShadow).toBe(true);
      }
    });
  });
});

describe("createShadowPlane", () => {
  it("creates a shadow-receiving plane", () => {
    const plane = createShadowPlane();

    expect(plane).toBeInstanceOf(THREE.Mesh);
    expect(plane.receiveShadow).toBe(true);
    expect(plane.name).toBe("shadow-plane");
  });

  it("uses ShadowMaterial", () => {
    const plane = createShadowPlane();

    expect(plane.material).toBeInstanceOf(THREE.ShadowMaterial);
  });
});

describe("disposeShadow", () => {
  const hasBrowserAPIs = typeof document !== "undefined";

  it.skipIf(!hasBrowserAPIs)("disposes mesh geometry and material", () => {
    const geometry = createTestGeometry();
    const config = createBasicShadowConfig();
    const shadowMesh = createDropShadowMesh(geometry, config);

    // Should not throw
    expect(() => disposeShadow(shadowMesh)).not.toThrow();
  });

  it("disposes light shadow map", () => {
    const config = createBasicShadowConfig();
    const light = createShadowLight(config);

    // Should not throw
    expect(() => disposeShadow(light)).not.toThrow();
  });
});
