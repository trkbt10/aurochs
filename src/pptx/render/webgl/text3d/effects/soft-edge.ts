/**
 * @file 3D Text Soft Edge Effect
 *
 * Implements soft edge (blur) effect for 3D text.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.53 (softEdge)
 */

import * as THREE from "three";

// =============================================================================
// Soft Edge Types
// =============================================================================

/**
 * Soft edge configuration for 3D text
 * @see ECMA-376 Part 1, Section 20.1.8.53 (softEdge)
 */
export type SoftEdgeConfig = {
  /** Blur radius in pixels */
  readonly radius: number;
};

// =============================================================================
// Soft Edge Implementation
// =============================================================================

/**
 * Create a soft edge effect using transparent fading material.
 *
 * True soft edge blur requires post-processing, but this provides
 * a simpler approximation using transparency.
 *
 * @param geometry - Source geometry
 * @param material - Source material
 * @param config - Soft edge configuration
 */
export function createSoftEdgeMesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  config: SoftEdgeConfig,
): THREE.Mesh {
  // Clone geometry
  const softGeometry = geometry.clone();

  // Get color from material
  let color = new THREE.Color(0x888888);
  if ("color" in material) {
    color = (material as THREE.MeshStandardMaterial).color.clone();
  }

  // Calculate edge softness based on radius
  // Higher radius = more transparency/softness
  const softness = Math.min(config.radius / 50, 0.5);

  // Create material with soft edges using alpha
  const softMaterial = new THREE.MeshStandardMaterial({
    color: color,
    roughness: (material as THREE.MeshStandardMaterial).roughness ?? 0.5,
    metalness: (material as THREE.MeshStandardMaterial).metalness ?? 0,
    transparent: true,
    opacity: 1 - softness,
    alphaTest: 0.01,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(softGeometry, softMaterial);
  mesh.name = "text-soft-edge";

  return mesh;
}

/**
 * Create layered soft edge effect.
 *
 * Creates multiple layers of decreasing opacity to simulate blur.
 *
 * @param geometry - Source geometry
 * @param material - Source material
 * @param config - Soft edge configuration
 * @param layers - Number of layers (default 3)
 */
export function createLayeredSoftEdge(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  config: SoftEdgeConfig,
  layers: number = 3,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "text-soft-edge-layers";

  // Get color from material
  let color = new THREE.Color(0x888888);
  if ("color" in material) {
    color = (material as THREE.MeshStandardMaterial).color.clone();
  }

  const baseRadius = config.radius / 100;

  for (let i = 0; i < layers; i++) {
    const layerScale = 1 + baseRadius * (i + 1) / layers;
    const layerOpacity = 1 - (i + 1) / (layers + 1);

    const layerGeometry = geometry.clone();
    layerGeometry.scale(layerScale, layerScale, layerScale);

    const layerMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: layerOpacity * 0.5,
      side: THREE.FrontSide,
      depthWrite: i === 0,
    });

    const layerMesh = new THREE.Mesh(layerGeometry, layerMaterial);
    layerMesh.name = `text-soft-edge-layer-${i}`;
    layerMesh.renderOrder = -i; // Render outer layers first
    group.add(layerMesh);
  }

  return group;
}

/**
 * Apply soft edge effect by modifying the material's opacity based on normals.
 *
 * This is a simpler approach that makes edges more transparent.
 *
 * @param mesh - Mesh to apply soft edge to
 * @param config - Soft edge configuration
 */
export function applySoftEdgeToMesh(
  mesh: THREE.Mesh,
  config: SoftEdgeConfig,
): void {
  const material = mesh.material as THREE.MeshStandardMaterial;

  // Make material transparent
  material.transparent = true;

  // Reduce opacity based on radius
  const softness = Math.min(config.radius / 100, 0.3);
  material.opacity = 1 - softness;

  // Use alpha test to clean up very transparent areas
  material.alphaTest = 0.01;
}

// =============================================================================
// Post-Processing Soft Edge (Advanced)
// =============================================================================

/**
 * Configuration for post-processing blur.
 */
export type BlurPassConfig = {
  /** Horizontal blur amount */
  readonly blurX: number;
  /** Vertical blur amount */
  readonly blurY: number;
  /** Number of blur iterations */
  readonly iterations: number;
};

/**
 * Create blur pass configuration from soft edge config.
 *
 * This can be used with Three.js post-processing if available.
 */
export function createBlurPassConfig(config: SoftEdgeConfig): BlurPassConfig {
  const normalizedRadius = config.radius / 10;

  return {
    blurX: normalizedRadius,
    blurY: normalizedRadius,
    iterations: Math.min(Math.ceil(config.radius / 5), 5),
  };
}

/**
 * Note: Full post-processing blur requires:
 *
 * 1. Three.js post-processing addon (three/examples/jsm/postprocessing)
 * 2. EffectComposer setup
 * 3. HorizontalBlurShader and VerticalBlurShader
 *
 * Example setup (requires imports):
 *
 * ```typescript
 * import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
 * import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
 * import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
 * import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader';
 * import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader';
 *
 * function setupBlurPostProcessing(
 *   renderer: THREE.WebGLRenderer,
 *   scene: THREE.Scene,
 *   camera: THREE.Camera,
 *   config: BlurPassConfig,
 * ): EffectComposer {
 *   const composer = new EffectComposer(renderer);
 *   composer.addPass(new RenderPass(scene, camera));
 *
 *   const hBlur = new ShaderPass(HorizontalBlurShader);
 *   hBlur.uniforms.h.value = config.blurX / window.innerWidth;
 *   composer.addPass(hBlur);
 *
 *   const vBlur = new ShaderPass(VerticalBlurShader);
 *   vBlur.uniforms.v.value = config.blurY / window.innerHeight;
 *   composer.addPass(vBlur);
 *
 *   return composer;
 * }
 * ```
 */

// =============================================================================
// Soft Edge Utilities
// =============================================================================

/**
 * Add soft edge to a mesh group.
 */
export function addSoftEdgeToGroup(
  group: THREE.Group,
  config: SoftEdgeConfig,
): void {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh && !child.name.startsWith("text-soft-edge")) {
      applySoftEdgeToMesh(child, config);
    }
  });
}

/**
 * Update soft edge radius.
 */
export function updateSoftEdgeRadius(
  mesh: THREE.Mesh | THREE.Group,
  radius: number,
): void {
  const softness = Math.min(radius / 100, 0.3);

  if (mesh instanceof THREE.Group) {
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        mat.opacity = 1 - softness;
      }
    });
  } else {
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.opacity = 1 - softness;
  }
}

/**
 * Remove soft edge effect from mesh.
 */
export function removeSoftEdge(mesh: THREE.Mesh): void {
  const material = mesh.material as THREE.MeshStandardMaterial;
  material.transparent = false;
  material.opacity = 1;
  material.alphaTest = 0;
}

/**
 * Dispose soft edge resources (for layered approach).
 */
export function disposeSoftEdge(softEdge: THREE.Mesh | THREE.Group): void {
  if (softEdge instanceof THREE.Group) {
    softEdge.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
  } else {
    softEdge.geometry.dispose();
    if (softEdge.material instanceof THREE.Material) {
      softEdge.material.dispose();
    }
  }
}
