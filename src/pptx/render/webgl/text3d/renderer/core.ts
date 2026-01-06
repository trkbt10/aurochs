/**
 * @file WebGL 3D Text Renderer
 *
 * Main rendering logic for 3D text using Three.js.
 *
 * @see ECMA-376 Part 1, Section 20.1.5 (3D Properties)
 */

import * as THREE from "three";
import type { Scene3d, Shape3d, PresetCameraType } from "../../../../domain/index";
import type { Pixels } from "../../../../domain/types";
import type { PositionedSpan } from "../../../text-layout/types";
import { createCameraConfig, createCamera, type CameraConfig } from "../scene/camera";
import { createLightingConfig, addLightsToScene } from "../scene/lighting";
import { createMaterialFromFill, type Material3DFill } from "../scene/materials";
import { createTextGeometryFromCanvas } from "../geometry/from-contours";
import { createTextGeometryAsync } from "../geometry/from-contours-async";
import { applyTextWarp } from "../geometry/text-warp";
import type { TextWarp } from "../../../../domain/text";
// Effects imports
import {
  applyAllEffects,
  needsShadowMapping,
  type ContourConfig,
  type OutlineConfig,
  type ShadowConfig,
  type GlowConfig,
  type ReflectionConfig,
  type SoftEdgeConfig,
} from "./apply-effects";
import { enableShadowMapping } from "../effects/shadow";
// WebGL context management
import { acquireRenderer, releaseRenderer } from "../utils/webgl-context";

// =============================================================================
// Renderer Types
// =============================================================================

/**
 * Configuration for a single text run with its styling and position.
 * Each run can have different font properties and color.
 *
 * Derived from:
 * - PositionedSpan (text-layout/types.ts) - text, color, fontSize, fontFamily, fontWeight, fontStyle, width
 * - LayoutLine (text-layout/types.ts) - x, y position
 *
 * The fontSize is converted from Points to Pixels via PT_TO_PX during extraction.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.3.9 (a:r - text run)
 * @see ECMA-376 Part 1, Section 21.1.2.3.9 (sz - font size in 100ths of point)
 * @see ECMA-376 Part 1, Section 21.1.2.3.7 (a:latin - Latin font)
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 */
export type Text3DRunConfig = {
  /**
   * Text content from a:t element.
   * @see ECMA-376 Part 1, Section 21.1.2.3.12 (a:t)
   */
  readonly text: PositionedSpan["text"];
  /**
   * Resolved text color (hex string with #).
   * Derived from a:solidFill in a:rPr, resolved via ColorContext.
   * @see ECMA-376 Part 1, Section 20.1.2.3.32 (srgbClr)
   * @deprecated Use `fill` property for full ECMA-376 support
   */
  readonly color: PositionedSpan["color"];
  /**
   * Fill specification for the text run.
   * Supports solid colors and gradients per ECMA-376.
   * If not provided, `color` is used as solid fill.
   * @see ECMA-376 Part 1, Section 20.1.8.33 (gradFill)
   * @see ECMA-376 Part 1, Section 20.1.8.54 (solidFill)
   */
  readonly fill?: Material3DFill;
  /**
   * Font size in pixels.
   * Converted from Points (ECMA-376 sz attribute in 100ths of point) via PT_TO_PX.
   * @see ECMA-376 Part 1, Section 21.1.2.3.9 (sz attribute)
   */
  readonly fontSize: Pixels;
  /**
   * Font family name (resolved from theme if +mj-lt/+mn-lt).
   * @see ECMA-376 Part 1, Section 21.1.2.3.7 (a:latin typeface)
   */
  readonly fontFamily: PositionedSpan["fontFamily"];
  /**
   * Font weight (400=normal, 700=bold).
   * Derived from b attribute in a:rPr.
   * @see ECMA-376 Part 1, Section 21.1.2.3.9 (b attribute)
   */
  readonly fontWeight: PositionedSpan["fontWeight"];
  /**
   * Font style (normal/italic).
   * Derived from i attribute in a:rPr.
   * @see ECMA-376 Part 1, Section 21.1.2.3.9 (i attribute)
   */
  readonly fontStyle: PositionedSpan["fontStyle"];
  /**
   * X position in pixels from LayoutLine.
   * Calculated by layout engine based on paragraph margins, indents, alignment.
   * @see ECMA-376 Part 1, Section 21.1.2.2.7 (marL, indent)
   */
  readonly x: Pixels;
  /**
   * Y position (baseline) in pixels from LayoutLine.
   * Calculated by layout engine based on line spacing, space before/after.
   * @see ECMA-376 Part 1, Section 21.1.2.2.7 (a:lnSpc, a:spcBef, a:spcAft)
   */
  readonly y: Pixels;
  /**
   * Width in pixels from MeasuredSpan.
   * Measured by text measurement engine.
   */
  readonly width: PositionedSpan["width"];
  /**
   * Outline (stroke) configuration for text.
   * @see ECMA-376 Part 1, Section 20.1.2.2.24 (ln)
   */
  readonly outline?: OutlineConfig;
  /**
   * Shadow effect configuration.
   * @see ECMA-376 Part 1, Section 20.1.8.49 (outerShdw)
   */
  readonly shadow?: ShadowConfig;
  /**
   * Glow effect configuration.
   * @see ECMA-376 Part 1, Section 20.1.8.32 (glow)
   */
  readonly glow?: GlowConfig;
  /**
   * Reflection effect configuration.
   * @see ECMA-376 Part 1, Section 20.1.8.50 (reflection)
   */
  readonly reflection?: ReflectionConfig;
  /**
   * Soft edge effect configuration.
   * @see ECMA-376 Part 1, Section 20.1.8.53 (softEdge)
   */
  readonly softEdge?: SoftEdgeConfig;
};

export type Text3DRenderConfig = {
  /** Text runs to render - supports mixed styles */
  readonly runs: readonly Text3DRunConfig[];
  /** 3D scene configuration */
  readonly scene3d?: Scene3d;
  /** 3D shape configuration */
  readonly shape3d?: Shape3d;
  /**
   * Text warp configuration for curved/shaped text.
   * @see ECMA-376 Part 1, Section 21.1.2.1.28 (prstTxWarp)
   */
  readonly textWarp?: TextWarp;
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
// Renderer State (Internal)
// =============================================================================

/**
 * Internal state for Text3DRenderer instance.
 * Encapsulates all mutable state needed by the renderer.
 */
type RendererState = {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  poolId: string;
  camera: THREE.Camera;
  cameraConfig: CameraConfig;
  textMesh: THREE.Group;
  config: Text3DRenderConfig;
};

/**
 * Initialize renderer state (scene, WebGL renderer, camera, lighting).
 * This is the common setup shared by both sync and async versions.
 */
function initializeRendererState(
  config: Text3DRenderConfig,
): Omit<RendererState, "textMesh"> {
  // Create Three.js scene
  const scene = new THREE.Scene();
  scene.background = null;

  // Acquire renderer from pool (prevents "Too many active WebGL contexts" warnings)
  const { renderer, poolId } = acquireRenderer({
    width: config.width,
    height: config.height,
    pixelRatio: config.pixelRatio,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });

  // Enable shadow mapping if any run has shadow effect
  if (needsShadowMapping(config.runs)) {
    enableShadowMapping(renderer);
  }

  // Create camera
  const cameraPreset: PresetCameraType = config.scene3d?.camera?.preset ?? "orthographicFront";
  const cameraConfig = createCameraConfig(
    cameraPreset,
    config.scene3d?.camera?.fov,
    config.scene3d?.camera?.zoom,
  );
  const camera = createCamera(cameraConfig, config.width, config.height);

  // Setup lighting
  const lightingConfig = createLightingConfig(config.scene3d?.lightRig);
  addLightsToScene(scene, lightingConfig);

  return { scene, renderer, poolId, camera, cameraConfig, config };
}

/**
 * Build Text3DRenderer from initialized state.
 * Provides render/update/dispose methods.
 */
function buildRendererFromState(state: RendererState): Text3DRenderer {
  const { scene, renderer, poolId, config } = state;
  let { camera, cameraConfig, textMesh } = state;

  function render() {
    renderer.render(scene, camera);
  }

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

      const newCameraConfig = createCameraConfig(
        mergedConfig.scene3d?.camera?.preset ?? "orthographicFront",
        mergedConfig.scene3d?.camera?.fov,
        mergedConfig.scene3d?.camera?.zoom,
      );
      camera = createCamera(newCameraConfig, mergedConfig.width, mergedConfig.height);
      cameraConfig = newCameraConfig;
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
      scene.children
        .filter((child) => child instanceof THREE.Light)
        .forEach((light) => scene.remove(light));

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
      cameraConfig = newCameraConfig;
      fitCameraToObject(camera, textMesh, newCameraConfig);
    }

    Object.assign(config, newConfig);
  }

  function dispose() {
    scene.remove(textMesh);
    disposeGroup(textMesh);
    releaseRenderer(poolId, true);
  }

  return {
    render,
    update,
    dispose,
    getCanvas: () => renderer.domElement,
  };
}

// =============================================================================
// Renderer Factory Functions
// =============================================================================

/**
 * Create a WebGL 3D text renderer (synchronous).
 */
export function createText3DRenderer(config: Text3DRenderConfig): Text3DRenderer {
  const state = initializeRendererState(config);

  // Create 3D text mesh (sync)
  const textMesh = createTextMesh(config);
  state.scene.add(textMesh);
  fitCameraToObject(state.camera, textMesh, state.cameraConfig);

  return buildRendererFromState({ ...state, textMesh });
}

/**
 * Create a WebGL 3D text renderer (async - uses Web Worker for glyph extraction).
 *
 * This version offloads heavy canvas processing to a Web Worker to avoid
 * blocking the main thread.
 */
export async function createText3DRendererAsync(
  config: Text3DRenderConfig,
): Promise<Text3DRenderer> {
  const state = initializeRendererState(config);

  // Create 3D text mesh (async with parallel geometry creation)
  const textMesh = await createTextMeshAsync(config);
  state.scene.add(textMesh);
  fitCameraToObject(state.camera, textMesh, state.cameraConfig);

  return buildRendererFromState({ ...state, textMesh });
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

// =============================================================================
// Text Mesh Building (Shared Logic)
// =============================================================================

/**
 * Configuration derived from Text3DRenderConfig for mesh building.
 */
type MeshBuildConfig = {
  readonly extrusionDepth: number;
  readonly isWireframe: boolean;
  readonly bevel?: Shape3d["bevel"];
  readonly textWarp?: TextWarp;
  readonly preset?: Shape3d["preset"];
  /** Contour configuration from sp3d contourW/contourClr */
  readonly contour?: ContourConfig;
};

/**
 * Calculate extrusion depth from config or use default based on font size.
 */
function getExtrusionDepth(config: Text3DRenderConfig): number {
  if (config.shape3d?.extrusionHeight) {
    const depth = config.shape3d.extrusionHeight as number;
    console.log("[3D Text] getExtrusionDepth - using provided:", depth);
    return depth;
  }
  const baseFontSize = config.runs[0]?.fontSize ?? 24;
  const defaultDepth = baseFontSize * 0.2;
  console.log("[3D Text] getExtrusionDepth - using default:", defaultDepth);
  return defaultDepth;
}

/**
 * Extract contour configuration from shape3d if available.
 */
function getContourConfig(shape3d: Shape3d | undefined): ContourConfig | undefined {
  if (!shape3d?.contourWidth || shape3d.contourWidth <= 0) {
    return undefined;
  }

  // Extract color from contourColor (which is a SolidFill)
  // Default to black if no color specified
  let color = "#000000";
  if (shape3d.contourColor?.type === "solidFill" && shape3d.contourColor.color) {
    const colorSpec = shape3d.contourColor.color.spec;
    // Handle srgb color type
    if (colorSpec.type === "srgb") {
      color = `#${colorSpec.value}`;
    }
  }

  return {
    width: shape3d.contourWidth,
    color,
  };
}

/**
 * Derive mesh build configuration from render config.
 */
function getMeshBuildConfig(config: Text3DRenderConfig): MeshBuildConfig {
  return {
    extrusionDepth: getExtrusionDepth(config),
    isWireframe: config.shape3d?.preset === "legacyWireframe",
    bevel: config.shape3d?.bevel,
    textWarp: config.textWarp,
    preset: config.shape3d?.preset,
    contour: getContourConfig(config.shape3d),
  };
}

/**
 * Process a single run with its geometry, adding mesh to group.
 */
function processRunWithGeometry(
  group: THREE.Group,
  run: Text3DRunConfig,
  geometry: THREE.BufferGeometry,
  buildConfig: MeshBuildConfig,
): void {
  // Apply text warp if configured
  if (buildConfig.textWarp) {
    applyTextWarp(geometry, buildConfig.textWarp);
  }

  // Create material (fill or solid color fallback)
  const fill: Material3DFill = run.fill ?? { type: "solid", color: run.color };
  const material = createMaterialFromFill(fill, buildConfig.preset, buildConfig.isWireframe);

  // Create mesh and position it (Y inverted: SVG Y grows down, Three.js Y grows up)
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.x = run.x / 96;
  mesh.position.y = -run.y / 96;

  // Apply all effects to mesh
  // Contour comes from shape3d (shape-level), other effects from run (run-level)
  applyAllEffects(group, mesh, geometry, material, {
    contour: buildConfig.contour,
    outline: run.outline,
    shadow: run.shadow,
    glow: run.glow,
    reflection: run.reflection,
    softEdge: run.softEdge,
  });
}

/**
 * Finalize text mesh group (scale and position).
 */
function finalizeTextMeshGroup(group: THREE.Group, config: Text3DRenderConfig): void {
  // Scale entire group to fit within bounds
  const maxDimension = (Math.min(config.width, config.height) * 0.8) / 96;
  scaleGroupToFit(group, maxDimension * 2, maxDimension);

  // Apply flatTextZ offset (ECMA-376 a:flatTx z attribute)
  if (config.scene3d?.flatTextZ !== undefined) {
    const zOffset = (config.scene3d.flatTextZ as number) / 96;
    group.position.z = zOffset;
  }
}

/**
 * Scale a THREE.Group to fit within bounds
 */
function scaleGroupToFit(group: THREE.Group, maxWidth: number, maxHeight: number): void {
  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  box.getSize(size);

  console.log("[3D Text] scaleGroupToFit - original size:", size.toArray());

  if (size.x === 0 || size.y === 0) {
    return;
  }

  const scaleX = maxWidth / size.x;
  const scaleY = maxHeight / size.y;
  const scale = Math.min(scaleX, scaleY);

  console.log("[3D Text] scaleGroupToFit - scale factor:", scale, "scaled Z:", size.z * scale);

  group.scale.set(scale, scale, scale);

  const center = new THREE.Vector3();
  box.getCenter(center);
  group.position.sub(center.multiplyScalar(scale));
}

// =============================================================================
// Text Mesh Factory Functions
// =============================================================================

/**
 * Create 3D text mesh from configuration (synchronous).
 * Creates geometries sequentially using canvas-based contour extraction.
 */
function createTextMesh(config: Text3DRenderConfig): THREE.Group {
  const group = new THREE.Group();

  if (config.runs.length === 0) {
    return group;
  }

  const buildConfig = getMeshBuildConfig(config);

  for (const run of config.runs) {
    if (run.text.length === 0) {
      continue;
    }

    const geometry = createTextGeometryFromCanvas({
      text: run.text,
      fontFamily: run.fontFamily,
      fontSize: run.fontSize,
      fontWeight: run.fontWeight,
      fontStyle: run.fontStyle,
      extrusionDepth: buildConfig.extrusionDepth,
      bevel: buildConfig.bevel,
    });

    processRunWithGeometry(group, run, geometry, buildConfig);
  }

  finalizeTextMeshGroup(group, config);
  return group;
}

/**
 * Create geometry for a run asynchronously, returns null for empty text.
 */
function createGeometryForRunAsync(
  run: Text3DRunConfig,
  buildConfig: MeshBuildConfig,
): Promise<THREE.BufferGeometry | null> {
  if (run.text.length === 0) {
    return Promise.resolve(null);
  }
  return createTextGeometryAsync({
    text: run.text,
    fontFamily: run.fontFamily,
    fontSize: run.fontSize,
    fontWeight: run.fontWeight,
    fontStyle: run.fontStyle,
    extrusionDepth: buildConfig.extrusionDepth,
    bevel: buildConfig.bevel,
  });
}

/**
 * Create 3D text mesh from configuration (async - uses Web Worker).
 * Creates geometries in parallel for better performance.
 */
async function createTextMeshAsync(config: Text3DRenderConfig): Promise<THREE.Group> {
  const group = new THREE.Group();

  if (config.runs.length === 0) {
    return group;
  }

  const buildConfig = getMeshBuildConfig(config);

  // Create geometry for all runs in parallel
  const geometries = await Promise.all(
    config.runs.map((run) => createGeometryForRunAsync(run, buildConfig)),
  );

  // Process runs with pre-created geometries
  for (let i = 0; i < config.runs.length; i++) {
    const run = config.runs[i];
    const geometry = geometries[i];

    if (!geometry) {
      continue;
    }

    processRunWithGeometry(group, run, geometry, buildConfig);
  }

  finalizeTextMeshGroup(group, config);
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
