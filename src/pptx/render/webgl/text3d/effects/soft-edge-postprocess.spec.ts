/**
 * @file Tests for Soft Edge Post-Processing
 *
 * Tests GPU-based blur soft edge effect.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.52/53 (softEdge)
 */

import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  createSoftEdgeComposer,
  updateSoftEdgePostProcessRadius,
  resizeSoftEdgePostProcess,
  createMeshSoftEdgeEffect,
  type SoftEdgePostProcessConfig,
} from "./soft-edge-postprocess";

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a mock WebGL renderer for testing.
 * Note: Full WebGL tests require a browser environment.
 */
function createMockRenderer(): THREE.WebGLRenderer {
  // Create a minimal canvas context mock
  const canvas = {
    getContext: () => ({
      getExtension: () => null,
      getParameter: () => 0,
      createTexture: () => ({}),
      bindTexture: () => {},
      texImage2D: () => {},
      texParameteri: () => {},
      createFramebuffer: () => ({}),
      bindFramebuffer: () => {},
      framebufferTexture2D: () => {},
      checkFramebufferStatus: () => 36053, // FRAMEBUFFER_COMPLETE
      viewport: () => {},
      clear: () => {},
      drawArrays: () => {},
      createProgram: () => ({}),
      createShader: () => ({}),
      shaderSource: () => {},
      compileShader: () => {},
      attachShader: () => {},
      linkProgram: () => {},
      useProgram: () => {},
      getUniformLocation: () => ({}),
      uniform1f: () => {},
      uniform2f: () => {},
      getShaderParameter: () => true,
      getProgramParameter: () => true,
    }),
    width: 800,
    height: 600,
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as HTMLCanvasElement;

  try {
    return new THREE.WebGLRenderer({ canvas });
  } catch {
    // If WebGL context fails (in Node.js), return a mock
    return {
      getSize: () => new THREE.Vector2(800, 600),
      setRenderTarget: () => {},
      render: () => {},
      getContext: () => ({
        getExtension: () => null,
      }),
    } as unknown as THREE.WebGLRenderer;
  }
}

function createBasicConfig(): SoftEdgePostProcessConfig {
  return {
    radius: 10,
    passes: 2,
    quality: "medium",
  };
}

// =============================================================================
// createSoftEdgeComposer Tests
// =============================================================================

describe("createSoftEdgeComposer", () => {
  it("creates a valid composer state", () => {
    const renderer = createMockRenderer();
    const config = createBasicConfig();

    const state = createSoftEdgeComposer(renderer, config);

    expect(state).toBeDefined();
    expect(state.enabled).toBe(true);
    expect(state.radius).toBe(10);
    expect(state.dispose).toBeInstanceOf(Function);
  });

  it("creates render target", () => {
    const renderer = createMockRenderer();
    const config = createBasicConfig();

    const state = createSoftEdgeComposer(renderer, config);

    expect(state.renderTarget).toBeInstanceOf(THREE.WebGLRenderTarget);
  });

  it("creates blur material with correct uniforms", () => {
    const renderer = createMockRenderer();
    const config = createBasicConfig();

    const state = createSoftEdgeComposer(renderer, config);

    expect(state.blurMaterial).toBeInstanceOf(THREE.ShaderMaterial);
    expect(state.blurMaterial.uniforms.tDiffuse).toBeDefined();
    expect(state.blurMaterial.uniforms.resolution).toBeDefined();
    expect(state.blurMaterial.uniforms.direction).toBeDefined();
    expect(state.blurMaterial.uniforms.radius).toBeDefined();
  });

  it("creates output material with correct uniforms", () => {
    const renderer = createMockRenderer();
    const config = createBasicConfig();

    const state = createSoftEdgeComposer(renderer, config);

    expect(state.outputMaterial).toBeInstanceOf(THREE.ShaderMaterial);
    expect(state.outputMaterial.uniforms.tDiffuse).toBeDefined();
    expect(state.outputMaterial.uniforms.tBlurred).toBeDefined();
    expect(state.outputMaterial.uniforms.blendFactor).toBeDefined();
  });

  it("creates full-screen quad", () => {
    const renderer = createMockRenderer();
    const config = createBasicConfig();

    const state = createSoftEdgeComposer(renderer, config);

    expect(state.quad).toBeInstanceOf(THREE.Mesh);
  });

  it("sets initial radius from config", () => {
    const renderer = createMockRenderer();
    const config: SoftEdgePostProcessConfig = {
      radius: 25,
    };

    const state = createSoftEdgeComposer(renderer, config);

    expect(state.blurMaterial.uniforms.radius.value).toBe(25);
  });

  it("dispose function cleans up resources", () => {
    const renderer = createMockRenderer();
    const config = createBasicConfig();

    const state = createSoftEdgeComposer(renderer, config);

    // Should not throw
    expect(() => state.dispose()).not.toThrow();
  });
});

// =============================================================================
// updateSoftEdgePostProcessRadius Tests
// =============================================================================

describe("updateSoftEdgePostProcessRadius", () => {
  it("updates radius in state", () => {
    const renderer = createMockRenderer();
    const config = createBasicConfig();
    const state = createSoftEdgeComposer(renderer, config);

    const updatedState = updateSoftEdgePostProcessRadius(state, 20);

    expect(updatedState.radius).toBe(20);
  });

  it("updates radius uniform in blur material", () => {
    const renderer = createMockRenderer();
    const config = createBasicConfig();
    const state = createSoftEdgeComposer(renderer, config);

    updateSoftEdgePostProcessRadius(state, 30);

    expect(state.blurMaterial.uniforms.radius.value).toBe(30);
  });
});

// =============================================================================
// resizeSoftEdgePostProcess Tests
// =============================================================================

describe("resizeSoftEdgePostProcess", () => {
  it("resizes render target", () => {
    const renderer = createMockRenderer();
    const config = createBasicConfig();
    const state = createSoftEdgeComposer(renderer, config);

    resizeSoftEdgePostProcess(state, 1920, 1080);

    expect(state.renderTarget.width).toBe(1920);
    expect(state.renderTarget.height).toBe(1080);
  });

  it("updates resolution uniform", () => {
    const renderer = createMockRenderer();
    const config = createBasicConfig();
    const state = createSoftEdgeComposer(renderer, config);

    resizeSoftEdgePostProcess(state, 1280, 720);

    const resolution = state.blurMaterial.uniforms.resolution.value as THREE.Vector2;
    expect(resolution.x).toBe(1280);
    expect(resolution.y).toBe(720);
  });
});

// =============================================================================
// createMeshSoftEdgeEffect Tests
// =============================================================================

describe("createMeshSoftEdgeEffect", () => {
  it("creates a group with layered effect", () => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(10, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xff0000 }),
    );

    const effect = createMeshSoftEdgeEffect(mesh, 10);

    expect(effect).toBeInstanceOf(THREE.Group);
    expect(effect.name).toBe("soft-edge-effect");
  });

  it("creates multiple layers for blur effect", () => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(10, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xff0000 }),
    );

    const effect = createMeshSoftEdgeEffect(mesh, 15);

    // Should have multiple child meshes
    expect(effect.children.length).toBeGreaterThan(1);
  });

  it("each layer has transparent material", () => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(10, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xff0000 }),
    );

    const effect = createMeshSoftEdgeEffect(mesh, 10);

    effect.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial;
        expect(material.transparent).toBe(true);
      }
    });
  });

  it("outer layers have decreasing opacity", () => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(10, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xff0000 }),
    );

    const effect = createMeshSoftEdgeEffect(mesh, 20);

    const opacities: number[] = [];
    effect.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial;
        opacities.push(material.opacity);
      }
    });

    // Opacities should decrease for outer layers
    for (let i = 1; i < opacities.length; i++) {
      expect(opacities[i]).toBeLessThanOrEqual(opacities[i - 1]);
    }
  });

  it("layers have increasing scale", () => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(10, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xff0000 }),
    );

    const effect = createMeshSoftEdgeEffect(mesh, 15);

    const scales: number[] = [];
    effect.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        scales.push(child.scale.x);
      }
    });

    // Scales should increase for outer layers
    for (let i = 1; i < scales.length; i++) {
      expect(scales[i]).toBeGreaterThan(scales[i - 1]);
    }
  });

  it("limits number of layers", () => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(10, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xff0000 }),
    );

    // Even with large radius, layers should be capped
    const effect = createMeshSoftEdgeEffect(mesh, 100);

    expect(effect.children.length).toBeLessThanOrEqual(5);
  });
});

// =============================================================================
// Shader Compilation Tests
// =============================================================================

describe("Shader Compilation", () => {
  it("blur material has valid vertex shader", () => {
    const renderer = createMockRenderer();
    const config = createBasicConfig();

    const state = createSoftEdgeComposer(renderer, config);

    expect(state.blurMaterial.vertexShader).toContain("void main()");
    expect(state.blurMaterial.vertexShader).toContain("gl_Position");
  });

  it("blur material has valid fragment shader", () => {
    const renderer = createMockRenderer();
    const config = createBasicConfig();

    const state = createSoftEdgeComposer(renderer, config);

    expect(state.blurMaterial.fragmentShader).toContain("void main()");
    expect(state.blurMaterial.fragmentShader).toContain("gl_FragColor");
  });

  it("output material has valid shaders", () => {
    const renderer = createMockRenderer();
    const config = createBasicConfig();

    const state = createSoftEdgeComposer(renderer, config);

    expect(state.outputMaterial.vertexShader).toContain("void main()");
    expect(state.outputMaterial.fragmentShader).toContain("void main()");
    expect(state.outputMaterial.fragmentShader).toContain("blendFactor");
  });
});
