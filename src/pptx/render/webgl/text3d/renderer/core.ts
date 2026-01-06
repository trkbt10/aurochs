/**
 * @file WebGL 3D Text Renderer
 *
 * Main rendering logic for 3D text using Three.js.
 *
 * @see ECMA-376 Part 1, Section 20.1.5 (3D Properties)
 */

import * as THREE from "three";
import type { Scene3d, Shape3d, LightRig, PresetCameraType } from "../../../../domain/index";
import { createCameraConfig, createCamera, type CameraConfig } from "../scene/camera";
import { createLightingConfig, addLightsToScene, type LightConfig } from "../scene/lighting";
import {
  createMaterialConfig,
  createMaterial,
  createExtrusionMaterial,
  createBevelMaterial,
  parseColor,
} from "../scene/materials";
import { getBevelConfig } from "../geometry/bevel";
import {
  createTextGeometryFromCanvas,
  scaleGeometryToFit,
} from "../geometry/from-contours";
import {
  createTextGeometryAsync,
  scaleGeometryToFit as scaleGeometryToFitAsync,
} from "../geometry/from-contours-async";

// =============================================================================
// Renderer Types
// =============================================================================

/**
 * Configuration for a single text run with its styling.
 * Each run can have different font properties and color.
 */
export type Text3DRunConfig = {
  /** Text content */
  readonly text: string;
  /** Text color (hex string with #) */
  readonly color: string;
  /** Font size in pixels */
  readonly fontSize: number;
  /** Font family */
  readonly fontFamily: string;
  /** Font weight */
  readonly fontWeight: number;
  /** Font style */
  readonly fontStyle: "normal" | "italic";
};

export type Text3DRenderConfig = {
  /** Text runs to render - supports mixed styles */
  readonly runs: readonly Text3DRunConfig[];
  /** 3D scene configuration */
  readonly scene3d?: Scene3d;
  /** 3D shape configuration */
  readonly shape3d?: Shape3d;
  /** Render width in pixels */
  readonly width: number;
  /** Render height in pixels */
  readonly height: number;
  /** Device pixel ratio */
  readonly pixelRatio: number;
};

export type Text3DRenderer = {
  /** Render a frame */
  render(): void;
  /** Update configuration */
  update(config: Partial<Text3DRenderConfig>): void;
  /** Dispose resources */
  dispose(): void;
  /** Get the canvas element */
  getCanvas(): HTMLCanvasElement;
};

// =============================================================================
// Renderer Implementation
// =============================================================================

/**
 * Create a WebGL 3D text renderer
 */
export function createText3DRenderer(config: Text3DRenderConfig): Text3DRenderer {
  // Create Three.js scene
  const scene = new THREE.Scene();
  scene.background = null; // Transparent background

  // Create renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(config.width, config.height);
  renderer.setPixelRatio(config.pixelRatio);
  renderer.setClearColor(0x000000, 0);

  // Create camera
  const cameraPreset: PresetCameraType = config.scene3d?.camera?.preset ?? "orthographicFront";
  const cameraConfig = createCameraConfig(
    cameraPreset,
    config.scene3d?.camera?.fov,
    config.scene3d?.camera?.zoom,
  );
  let camera = createCamera(cameraConfig, config.width, config.height);

  // Setup lighting
  const lightingConfig = createLightingConfig(config.scene3d?.lightRig);
  addLightsToScene(scene, lightingConfig);

  // Create 3D text mesh
  let textMesh = createTextMesh(config);
  scene.add(textMesh);

  // Position camera to fit text
  fitCameraToObject(camera, textMesh, cameraConfig);

  // Render function
  function render() {
    renderer.render(scene, camera);
  }

  // Update function
  function update(newConfig: Partial<Text3DRenderConfig>) {
    const mergedConfig = { ...config, ...newConfig };

    // Update size if changed
    if (
      newConfig.width !== undefined ||
      newConfig.height !== undefined ||
      newConfig.pixelRatio !== undefined
    ) {
      renderer.setSize(mergedConfig.width, mergedConfig.height);
      renderer.setPixelRatio(mergedConfig.pixelRatio);

      // Update camera aspect
      const newCameraConfig = createCameraConfig(
        mergedConfig.scene3d?.camera?.preset ?? "orthographicFront",
        mergedConfig.scene3d?.camera?.fov,
        mergedConfig.scene3d?.camera?.zoom,
      );
      camera = createCamera(newCameraConfig, mergedConfig.width, mergedConfig.height);
      fitCameraToObject(camera, textMesh, newCameraConfig);
    }

    // Recreate mesh if runs or shape3d changed
    if (newConfig.runs !== undefined || newConfig.shape3d !== undefined) {
      scene.remove(textMesh);
      disposeGroup(textMesh);

      textMesh = createTextMesh(mergedConfig);
      scene.add(textMesh);
      fitCameraToObject(camera, textMesh, cameraConfig);
    }

    // Update lighting if changed
    if (newConfig.scene3d?.lightRig !== undefined) {
      // Remove existing lights
      scene.children
        .filter((child) => child instanceof THREE.Light)
        .forEach((light) => scene.remove(light));

      // Add new lights
      const newLightingConfig = createLightingConfig(mergedConfig.scene3d?.lightRig);
      addLightsToScene(scene, newLightingConfig);
    }

    // Update camera if changed
    if (newConfig.scene3d?.camera !== undefined) {
      const newCameraConfig = createCameraConfig(
        mergedConfig.scene3d?.camera?.preset ?? "orthographicFront",
        mergedConfig.scene3d?.camera?.fov,
        mergedConfig.scene3d?.camera?.zoom,
      );
      camera = createCamera(newCameraConfig, mergedConfig.width, mergedConfig.height);
      fitCameraToObject(camera, textMesh, newCameraConfig);
    }

    Object.assign(config, newConfig);
  }

  // Dispose function
  function dispose() {
    scene.remove(textMesh);
    disposeGroup(textMesh);
    renderer.dispose();
  }

  return {
    render,
    update,
    dispose,
    getCanvas: () => renderer.domElement,
  };
}

/**
 * Create a WebGL 3D text renderer (async - uses Web Worker for glyph extraction)
 *
 * This version offloads heavy canvas processing to a Web Worker to avoid
 * blocking the main thread.
 */
export async function createText3DRendererAsync(
  config: Text3DRenderConfig,
): Promise<Text3DRenderer> {
  // Create Three.js scene
  const scene = new THREE.Scene();
  scene.background = null;

  // Create renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(config.width, config.height);
  renderer.setPixelRatio(config.pixelRatio);
  renderer.setClearColor(0x000000, 0);

  // Create camera
  const cameraPreset: PresetCameraType = config.scene3d?.camera?.preset ?? "orthographicFront";
  const cameraConfig = createCameraConfig(
    cameraPreset,
    config.scene3d?.camera?.fov,
    config.scene3d?.camera?.zoom,
  );
  let camera = createCamera(cameraConfig, config.width, config.height);

  // Setup lighting
  const lightingConfig = createLightingConfig(config.scene3d?.lightRig);
  addLightsToScene(scene, lightingConfig);

  // Create 3D text mesh (async)
  let textMesh = await createTextMeshAsync(config);
  scene.add(textMesh);

  // Position camera to fit text
  fitCameraToObject(camera, textMesh, cameraConfig);

  function render() {
    renderer.render(scene, camera);
  }

  function update(newConfig: Partial<Text3DRenderConfig>) {
    // Note: update is sync for now, may need async version for text changes
    const mergedConfig = { ...config, ...newConfig };

    if (
      newConfig.width !== undefined ||
      newConfig.height !== undefined ||
      newConfig.pixelRatio !== undefined
    ) {
      renderer.setSize(mergedConfig.width, mergedConfig.height);
      renderer.setPixelRatio(mergedConfig.pixelRatio);

      const newCameraConfig = createCameraConfig(
        mergedConfig.scene3d?.camera?.preset ?? "orthographicFront",
        mergedConfig.scene3d?.camera?.fov,
        mergedConfig.scene3d?.camera?.zoom,
      );
      camera = createCamera(newCameraConfig, mergedConfig.width, mergedConfig.height);
      fitCameraToObject(camera, textMesh, newCameraConfig);
    }
  }

  function dispose() {
    scene.remove(textMesh);
    disposeGroup(textMesh);
    renderer.dispose();
  }

  return {
    render,
    update,
    dispose,
    getCanvas: () => renderer.domElement,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Dispose all geometry and materials in a THREE.Group
 */
function disposeGroup(group: THREE.Group): void {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else if (child.material) {
        child.material.dispose();
      }
    }
  });
}

/**
 * Create 3D text mesh from configuration
 *
 * Creates a group containing meshes for each text run.
 * Each run is rendered with its own styling (font, color, size).
 * Runs are positioned sequentially along the x-axis.
 *
 * Uses canvas-based contour extraction for universal font support.
 * Contours are cached by font namespace for performance.
 */
function createTextMesh(config: Text3DRenderConfig): THREE.Group {
  const group = new THREE.Group();

  if (config.runs.length === 0) {
    return group;
  }

  // Get base font size for extrusion depth calculation
  const baseFontSize = config.runs[0]?.fontSize ?? 24;
  const extrusionDepth = config.shape3d?.extrusionHeight
    ? (config.shape3d.extrusionHeight as number)
    : baseFontSize * 0.2;

  const isWireframe = config.shape3d?.preset === "legacyWireframe";
  let cursorX = 0;

  // Create mesh for each run
  for (const run of config.runs) {
    if (run.text.length === 0) {
      continue;
    }

    // Create geometry for this run
    const geometry = createTextGeometryFromCanvas({
      text: run.text,
      fontFamily: run.fontFamily,
      fontSize: run.fontSize,
      fontWeight: run.fontWeight,
      fontStyle: run.fontStyle,
      extrusionDepth,
      bevel: config.shape3d?.bevel,
    });

    // Get geometry bounds for positioning
    geometry.computeBoundingBox();
    const boundingBox = geometry.boundingBox;
    const runWidth = boundingBox ? boundingBox.max.x - boundingBox.min.x : 0;

    // Create material with run's color
    const baseColor = parseColor(run.color);
    const materialConfig = createMaterialConfig(config.shape3d?.preset, baseColor);
    const material = createMaterial(materialConfig, isWireframe);

    // Create mesh and position it
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = cursorX;

    group.add(mesh);

    // Advance cursor for next run
    cursorX += runWidth;
  }

  // Scale entire group to fit within bounds
  const maxDimension = (Math.min(config.width, config.height) * 0.8) / 96;
  scaleGroupToFit(group, maxDimension * 2, maxDimension);

  // Apply flatTextZ offset (ECMA-376 a:flatTx z attribute)
  if (config.scene3d?.flatTextZ !== undefined) {
    const zOffset = (config.scene3d.flatTextZ as number) / 96;
    group.position.z = zOffset;
  }

  return group;
}

/**
 * Scale a THREE.Group to fit within bounds
 */
function scaleGroupToFit(group: THREE.Group, maxWidth: number, maxHeight: number): void {
  // Compute bounding box of entire group
  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  box.getSize(size);

  if (size.x === 0 || size.y === 0) {
    return;
  }

  // Calculate scale factor
  const scaleX = maxWidth / size.x;
  const scaleY = maxHeight / size.y;
  const scale = Math.min(scaleX, scaleY);

  // Apply uniform scale
  group.scale.set(scale, scale, scale);

  // Center the group
  const center = new THREE.Vector3();
  box.getCenter(center);
  group.position.sub(center.multiplyScalar(scale));
}

/**
 * Create 3D text mesh from configuration (async - uses Web Worker)
 *
 * Creates a group containing meshes for each text run.
 * Each run is rendered with its own styling (font, color, size).
 * Uses Web Worker for parallel glyph extraction.
 */
async function createTextMeshAsync(config: Text3DRenderConfig): Promise<THREE.Group> {
  const group = new THREE.Group();

  if (config.runs.length === 0) {
    return group;
  }

  // Get base font size for extrusion depth calculation
  const baseFontSize = config.runs[0]?.fontSize ?? 24;
  const extrusionDepth = config.shape3d?.extrusionHeight
    ? (config.shape3d.extrusionHeight as number)
    : baseFontSize * 0.2;

  const isWireframe = config.shape3d?.preset === "legacyWireframe";

  // Create geometry for all runs in parallel
  const geometryPromises = config.runs.map((run) =>
    run.text.length > 0
      ? createTextGeometryAsync({
          text: run.text,
          fontFamily: run.fontFamily,
          fontSize: run.fontSize,
          fontWeight: run.fontWeight,
          fontStyle: run.fontStyle,
          extrusionDepth,
          bevel: config.shape3d?.bevel,
        })
      : Promise.resolve(null),
  );

  const geometries = await Promise.all(geometryPromises);

  let cursorX = 0;

  // Create mesh for each run
  for (let i = 0; i < config.runs.length; i++) {
    const run = config.runs[i];
    const geometry = geometries[i];

    if (!geometry || run.text.length === 0) {
      continue;
    }

    // Get geometry bounds for positioning
    geometry.computeBoundingBox();
    const boundingBox = geometry.boundingBox;
    const runWidth = boundingBox ? boundingBox.max.x - boundingBox.min.x : 0;

    // Create material with run's color
    const baseColor = parseColor(run.color);
    const materialConfig = createMaterialConfig(config.shape3d?.preset, baseColor);
    const material = createMaterial(materialConfig, isWireframe);

    // Create mesh and position it
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = cursorX;

    group.add(mesh);

    // Advance cursor for next run
    cursorX += runWidth;
  }

  // Scale entire group to fit within bounds
  const maxDimension = (Math.min(config.width, config.height) * 0.8) / 96;
  scaleGroupToFit(group, maxDimension * 2, maxDimension);

  // Apply flatTextZ offset
  if (config.scene3d?.flatTextZ !== undefined) {
    const zOffset = (config.scene3d.flatTextZ as number) / 96;
    group.position.z = zOffset;
  }

  return group;
}

/**
 * Fit camera to object bounds
 */
function fitCameraToObject(
  camera: THREE.Camera,
  object: THREE.Object3D,
  config: CameraConfig,
): void {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  // Calculate distance to fit object
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = config.fov * (Math.PI / 180);
  let distance: number;

  if (camera instanceof THREE.PerspectiveCamera) {
    distance = maxDim / (2 * Math.tan(fov / 2));
  } else {
    // Orthographic camera
    distance = maxDim * 2;

    if (camera instanceof THREE.OrthographicCamera) {
      const aspect = (camera.right - camera.left) / (camera.top - camera.bottom);
      const viewHeight = maxDim * 1.5;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.left = (-viewHeight * aspect) / 2;
      camera.right = (viewHeight * aspect) / 2;
      camera.updateProjectionMatrix();
    }
  }

  // Position camera
  const direction = config.position.clone().normalize();
  camera.position.copy(center).add(direction.multiplyScalar(distance * 1.5));
  camera.lookAt(center);

  // Update projection matrix (both camera types have this method)
  if (camera instanceof THREE.PerspectiveCamera || camera instanceof THREE.OrthographicCamera) {
    camera.updateProjectionMatrix();
  }
}

/**
 * Check if 3D effects should be applied
 */
export function shouldUseWebGL3D(scene3d?: Scene3d, shape3d?: Shape3d): boolean {
  // Use WebGL if:
  // - There's significant extrusion depth
  // - There's bevel effect
  // - There's a non-flat material
  // - Camera is not orthographic front

  if (shape3d?.extrusionHeight && (shape3d.extrusionHeight as number) > 0) {
    return true;
  }

  if (shape3d?.bevel) {
    return true;
  }

  if (shape3d?.preset && shape3d.preset !== "flat") {
    return true;
  }

  if (scene3d?.camera?.preset && scene3d.camera.preset !== "orthographicFront") {
    return true;
  }

  return false;
}
