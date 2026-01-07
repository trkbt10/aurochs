/**
 * @file Soft Edge Post-Processing Effect
 *
 * Implements true blur-based soft edge effect using Three.js post-processing.
 * This provides accurate ECMA-376 soft edge rendering using GPU shaders.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.52/53 (softEdge)
 */

import * as THREE from "three";

// =============================================================================
// Types
// =============================================================================

/**
 * Post-processing soft edge configuration
 */
export type SoftEdgePostProcessConfig = {
  /** Blur radius in pixels */
  readonly radius: number;
  /** Number of blur passes (higher = smoother but slower) */
  readonly passes?: number;
  /** Blur quality (samples per pass) */
  readonly quality?: "low" | "medium" | "high";
};

/**
 * Soft edge composer state
 */
export type SoftEdgeComposerState = {
  /** Whether post-processing is active */
  readonly enabled: boolean;
  /** Current blur radius */
  readonly radius: number;
  /** Render target for blur */
  readonly renderTarget: THREE.WebGLRenderTarget;
  /** Blur material */
  readonly blurMaterial: THREE.ShaderMaterial;
  /** Output material */
  readonly outputMaterial: THREE.ShaderMaterial;
  /** Full-screen quad */
  readonly quad: THREE.Mesh;
  /** Dispose function */
  readonly dispose: () => void;
};

// =============================================================================
// Blur Shaders
// =============================================================================

/**
 * Gaussian blur vertex shader
 */
const blurVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Gaussian blur fragment shader (separable)
 */
const blurFragmentShader = `
  uniform sampler2D tDiffuse;
  uniform vec2 resolution;
  uniform vec2 direction;
  uniform float radius;

  varying vec2 vUv;

  // Gaussian weight calculation
  float gaussian(float x, float sigma) {
    return exp(-(x * x) / (2.0 * sigma * sigma));
  }

  void main() {
    vec2 texelSize = 1.0 / resolution;
    vec4 result = vec4(0.0);
    float weightSum = 0.0;

    // Adaptive sample count based on radius
    int samples = int(min(radius * 2.0, 32.0));
    float sigma = radius / 3.0;

    for (int i = -16; i <= 16; i++) {
      if (i < -samples / 2 || i > samples / 2) continue;

      float weight = gaussian(float(i), sigma);
      vec2 offset = direction * texelSize * float(i);
      result += texture2D(tDiffuse, vUv + offset) * weight;
      weightSum += weight;
    }

    gl_FragColor = result / weightSum;
  }
`;

/**
 * Alpha-based soft edge fragment shader
 * Applies blur only to alpha channel for edge softening
 */
const softEdgeFragmentShader = `
  uniform sampler2D tDiffuse;
  uniform sampler2D tBlurred;
  uniform float blendFactor;

  varying vec2 vUv;

  void main() {
    vec4 original = texture2D(tDiffuse, vUv);
    vec4 blurred = texture2D(tBlurred, vUv);

    // Blend original color with blurred alpha
    vec4 result = original;
    result.a = mix(original.a, blurred.a, blendFactor);

    // Also apply slight color blend at edges
    float edgeFactor = abs(original.a - blurred.a);
    result.rgb = mix(original.rgb, blurred.rgb, edgeFactor * blendFactor * 0.5);

    gl_FragColor = result;
  }
`;

// =============================================================================
// Post-Processing Implementation
// =============================================================================

/**
 * Create soft edge post-processing composer.
 *
 * This sets up a multi-pass blur effect that can be applied
 * to the rendered scene.
 *
 * @param renderer - Three.js WebGLRenderer
 * @param config - Soft edge configuration
 */
export function createSoftEdgeComposer(
  renderer: THREE.WebGLRenderer,
  config: SoftEdgePostProcessConfig,
): SoftEdgeComposerState {
  const size = renderer.getSize(new THREE.Vector2());

  // Create render targets for ping-pong blur
  const renderTargetParams: THREE.RenderTargetOptions = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType,
  };

  const renderTarget = new THREE.WebGLRenderTarget(
    size.x,
    size.y,
    renderTargetParams,
  );

  // Create blur material
  const blurMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      resolution: { value: new THREE.Vector2(size.x, size.y) },
      direction: { value: new THREE.Vector2(1, 0) },
      radius: { value: config.radius },
    },
    vertexShader: blurVertexShader,
    fragmentShader: blurFragmentShader,
    transparent: true,
  });

  // Create output material
  const outputMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      tBlurred: { value: null },
      blendFactor: { value: 1.0 },
    },
    vertexShader: blurVertexShader,
    fragmentShader: softEdgeFragmentShader,
    transparent: true,
  });

  // Create full-screen quad
  const quadGeometry = new THREE.PlaneGeometry(2, 2);
  const quad = new THREE.Mesh(quadGeometry, blurMaterial);

  // Dispose function
  const dispose = (): void => {
    renderTarget.dispose();
    blurMaterial.dispose();
    outputMaterial.dispose();
    quadGeometry.dispose();
  };

  return {
    enabled: true,
    radius: config.radius,
    renderTarget,
    blurMaterial,
    outputMaterial,
    quad,
    dispose,
  };
}

/**
 * Apply soft edge post-processing to a render.
 *
 * This performs a two-pass separable Gaussian blur on the rendered scene.
 *
 * @param renderer - Three.js WebGLRenderer
 * @param scene - Scene to render
 * @param camera - Camera to use
 * @param state - Soft edge composer state
 * @param outputTarget - Target to render final result (null for screen)
 */
export function applySoftEdgePostProcess(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  state: SoftEdgeComposerState,
  outputTarget: THREE.WebGLRenderTarget | null = null,
): void {
  if (!state.enabled || state.radius <= 0) {
    // No blur needed, render directly
    renderer.setRenderTarget(outputTarget);
    renderer.render(scene, camera);
    return;
  }

  const size = renderer.getSize(new THREE.Vector2());

  // Create temporary render targets
  const tempTarget1 = new THREE.WebGLRenderTarget(size.x, size.y, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  });

  const tempTarget2 = new THREE.WebGLRenderTarget(size.x, size.y, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  });

  // Step 1: Render scene to temp target
  renderer.setRenderTarget(tempTarget1);
  renderer.render(scene, camera);

  // Create orthographic camera for post-processing
  const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const postScene = new THREE.Scene();

  // Step 2: Horizontal blur
  state.blurMaterial.uniforms.tDiffuse.value = tempTarget1.texture;
  state.blurMaterial.uniforms.direction.value.set(1, 0);
  state.blurMaterial.uniforms.resolution.value.set(size.x, size.y);
  state.quad.material = state.blurMaterial;
  postScene.add(state.quad);

  renderer.setRenderTarget(tempTarget2);
  renderer.render(postScene, orthoCamera);

  // Step 3: Vertical blur
  state.blurMaterial.uniforms.tDiffuse.value = tempTarget2.texture;
  state.blurMaterial.uniforms.direction.value.set(0, 1);

  renderer.setRenderTarget(state.renderTarget);
  renderer.render(postScene, orthoCamera);

  // Step 4: Blend original with blurred
  state.outputMaterial.uniforms.tDiffuse.value = tempTarget1.texture;
  state.outputMaterial.uniforms.tBlurred.value = state.renderTarget.texture;
  state.quad.material = state.outputMaterial;

  renderer.setRenderTarget(outputTarget);
  renderer.render(postScene, orthoCamera);

  // Cleanup
  postScene.remove(state.quad);
  tempTarget1.dispose();
  tempTarget2.dispose();
}

/**
 * Update soft edge radius.
 */
export function updateSoftEdgePostProcessRadius(
  state: SoftEdgeComposerState,
  radius: number,
): SoftEdgeComposerState {
  state.blurMaterial.uniforms.radius.value = radius;

  return {
    ...state,
    radius,
  };
}

/**
 * Resize soft edge render targets.
 */
export function resizeSoftEdgePostProcess(
  state: SoftEdgeComposerState,
  width: number,
  height: number,
): void {
  state.renderTarget.setSize(width, height);
  state.blurMaterial.uniforms.resolution.value.set(width, height);
}

// =============================================================================
// Integration Helpers
// =============================================================================

/**
 * Create a simple soft edge effect for a specific mesh.
 *
 * This creates a blurred outline around the mesh edges.
 *
 * @param mesh - Mesh to apply soft edge to
 * @param radius - Blur radius
 */
export function createMeshSoftEdgeEffect(
  mesh: THREE.Mesh,
  radius: number,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "soft-edge-effect";

  // Clone mesh for blur layers
  const layers = Math.min(Math.ceil(radius / 3), 5);

  for (let i = 0; i < layers; i++) {
    const layer = mesh.clone();
    const scale = 1 + (radius / 100) * ((i + 1) / layers);
    layer.scale.multiplyScalar(scale);

    // Create transparent material
    const material = (mesh.material as THREE.Material).clone() as THREE.MeshStandardMaterial;
    material.transparent = true;
    material.opacity = 0.3 / (i + 1);
    material.depthWrite = false;
    layer.material = material;

    layer.renderOrder = -i;
    group.add(layer);
  }

  return group;
}

/**
 * Check if post-processing is supported.
 */
export function isSoftEdgePostProcessSupported(renderer: THREE.WebGLRenderer): boolean {
  const gl = renderer.getContext();

  // Check for required extensions
  const hasFloatTextures = gl.getExtension("OES_texture_float") !== null ||
    gl.getExtension("OES_texture_half_float") !== null;

  const hasRenderToFloat = gl.getExtension("WEBGL_color_buffer_float") !== null ||
    gl.getExtension("EXT_color_buffer_half_float") !== null;

  return hasFloatTextures || hasRenderToFloat;
}
