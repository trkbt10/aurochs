/**
 * @file 3D Camera setup for WebGL text rendering
 *
 * Maps ECMA-376 camera presets to Three.js camera configurations.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.47 (ST_PresetCameraType)
 */

import * as THREE from "three";
import type { Degrees, Percent } from "@oxen-office/ooxml/domain/units";
import type { PresetCameraType } from "@oxen-office/pptx/domain/index";

// =============================================================================
// Camera Configuration Types
// =============================================================================

export type CameraConfig = {
  /** Camera position in 3D space */
  readonly position: THREE.Vector3;
  /** Point the camera looks at */
  readonly lookAt: THREE.Vector3;
  /** Camera up vector */
  readonly up: THREE.Vector3;
  /** Field of view in degrees (for perspective camera) */
  readonly fov: number;
  /** Whether to use orthographic projection */
  readonly orthographic: boolean;
  /** Orthographic scale factor */
  readonly orthoScale: number;
};

// =============================================================================
// Camera Preset Configurations
// =============================================================================

/**
 * Camera distance from target (normalized)
 */
const CAMERA_DISTANCE = 5;

/**
 * Default field of view
 */
const DEFAULT_FOV = 45;

/**
 * Create camera configuration from preset
 *
 * @see ECMA-376 Part 1, Section 20.1.10.47
 */
export function createCameraConfig(
  preset: PresetCameraType,
  fov?: Degrees,
  zoom?: Percent,
): CameraConfig {
  const baseFov = fov !== undefined ? (fov as number) : DEFAULT_FOV;
  const zoomFactor = zoom !== undefined ? (zoom as number) / 100 : 1;
  const effectiveFov = baseFov / zoomFactor;

  switch (preset) {
    // =========================================================================
    // Orthographic Views
    // =========================================================================
    case "orthographicFront":
      return createOrthographicConfig(
        new THREE.Vector3(0, 0, CAMERA_DISTANCE),
        effectiveFov,
      );

    // =========================================================================
    // Isometric Views
    // =========================================================================
    case "isometricTopUp":
      return createIsometricConfig(45, 35.264, effectiveFov);

    case "isometricTopDown":
      return createIsometricConfig(45, -35.264, effectiveFov);

    case "isometricLeftUp":
      return createIsometricConfig(135, 35.264, effectiveFov);

    case "isometricLeftDown":
      return createIsometricConfig(135, -35.264, effectiveFov);

    case "isometricRightUp":
      return createIsometricConfig(-45, 35.264, effectiveFov);

    case "isometricRightDown":
      return createIsometricConfig(-45, -35.264, effectiveFov);

    case "isometricBottomUp":
      return createIsometricConfig(-135, 35.264, effectiveFov);

    case "isometricBottomDown":
      return createIsometricConfig(-135, -35.264, effectiveFov);

    case "isometricOffAxis1Left":
      return createIsometricConfig(150, 20, effectiveFov);

    case "isometricOffAxis1Right":
      return createIsometricConfig(-30, 20, effectiveFov);

    case "isometricOffAxis1Top":
      return createIsometricConfig(60, 45, effectiveFov);

    case "isometricOffAxis2Left":
      return createIsometricConfig(120, 20, effectiveFov);

    case "isometricOffAxis2Right":
      return createIsometricConfig(-60, 20, effectiveFov);

    case "isometricOffAxis2Top":
      return createIsometricConfig(30, 45, effectiveFov);

    case "isometricOffAxis3Left":
      return createIsometricConfig(150, -20, effectiveFov);

    case "isometricOffAxis3Right":
      return createIsometricConfig(-30, -20, effectiveFov);

    case "isometricOffAxis3Bottom":
      return createIsometricConfig(60, -45, effectiveFov);

    case "isometricOffAxis4Left":
      return createIsometricConfig(120, -20, effectiveFov);

    case "isometricOffAxis4Right":
      return createIsometricConfig(-60, -20, effectiveFov);

    case "isometricOffAxis4Bottom":
      return createIsometricConfig(30, -45, effectiveFov);

    // =========================================================================
    // Oblique Views
    // =========================================================================
    case "obliqueTop":
      return createObliqueConfig(0, 30, effectiveFov);

    case "obliqueBottom":
      return createObliqueConfig(0, -30, effectiveFov);

    case "obliqueLeft":
      return createObliqueConfig(90, 0, effectiveFov);

    case "obliqueRight":
      return createObliqueConfig(-90, 0, effectiveFov);

    case "obliqueTopLeft":
      return createObliqueConfig(45, 30, effectiveFov);

    case "obliqueTopRight":
      return createObliqueConfig(-45, 30, effectiveFov);

    case "obliqueBottomLeft":
      return createObliqueConfig(45, -30, effectiveFov);

    case "obliqueBottomRight":
      return createObliqueConfig(-45, -30, effectiveFov);

    // =========================================================================
    // Perspective Views
    // =========================================================================
    case "perspectiveFront":
      return createPerspectiveConfig(0, 0, effectiveFov);

    case "perspectiveAbove":
      return createPerspectiveConfig(0, 30, effectiveFov);

    case "perspectiveBelow":
      return createPerspectiveConfig(0, -30, effectiveFov);

    case "perspectiveLeft":
      return createPerspectiveConfig(30, 0, effectiveFov);

    case "perspectiveRight":
      return createPerspectiveConfig(-30, 0, effectiveFov);

    case "perspectiveAboveLeftFacing":
      return createPerspectiveConfig(20, 25, effectiveFov);

    case "perspectiveAboveRightFacing":
      return createPerspectiveConfig(-20, 25, effectiveFov);

    case "perspectiveContrastingLeftFacing":
      return createPerspectiveConfig(40, 15, effectiveFov);

    case "perspectiveContrastingRightFacing":
      return createPerspectiveConfig(-40, 15, effectiveFov);

    case "perspectiveHeroicLeftFacing":
      return createPerspectiveConfig(25, 10, effectiveFov);

    case "perspectiveHeroicRightFacing":
      return createPerspectiveConfig(-25, 10, effectiveFov);

    case "perspectiveHeroicExtremeLeftFacing":
      return createPerspectiveConfig(35, 15, effectiveFov);

    case "perspectiveHeroicExtremeRightFacing":
      return createPerspectiveConfig(-35, 15, effectiveFov);

    case "perspectiveRelaxed":
      return createPerspectiveConfig(10, 5, effectiveFov);

    case "perspectiveRelaxedModerately":
      return createPerspectiveConfig(15, 8, effectiveFov);

    // =========================================================================
    // Legacy Views
    // =========================================================================
    case "legacyObliqueFront":
    case "legacyPerspectiveFront":
      return createPerspectiveConfig(0, 0, effectiveFov);

    case "legacyObliqueTop":
    case "legacyPerspectiveTop":
      return createPerspectiveConfig(0, 45, effectiveFov);

    case "legacyObliqueBottom":
    case "legacyPerspectiveBottom":
      return createPerspectiveConfig(0, -45, effectiveFov);

    case "legacyObliqueLeft":
    case "legacyPerspectiveLeft":
      return createPerspectiveConfig(45, 0, effectiveFov);

    case "legacyObliqueRight":
    case "legacyPerspectiveRight":
      return createPerspectiveConfig(-45, 0, effectiveFov);

    case "legacyObliqueTopLeft":
    case "legacyPerspectiveTopLeft":
      return createPerspectiveConfig(30, 30, effectiveFov);

    case "legacyObliqueTopRight":
    case "legacyPerspectiveTopRight":
      return createPerspectiveConfig(-30, 30, effectiveFov);

    case "legacyObliqueBottomLeft":
    case "legacyPerspectiveBottomLeft":
      return createPerspectiveConfig(30, -30, effectiveFov);

    case "legacyObliqueBottomRight":
    case "legacyPerspectiveBottomRight":
      return createPerspectiveConfig(-30, -30, effectiveFov);

    default:
      // Default to front view
      return createPerspectiveConfig(0, 0, effectiveFov);
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create orthographic camera configuration
 */
function createOrthographicConfig(position: THREE.Vector3, fov: number): CameraConfig {
  return {
    position,
    lookAt: new THREE.Vector3(0, 0, 0),
    up: new THREE.Vector3(0, 1, 0),
    fov,
    orthographic: true,
    orthoScale: 1,
  };
}

/**
 * Create isometric camera configuration
 *
 * Isometric uses orthographic projection with specific angles
 */
function createIsometricConfig(azimuth: number, elevation: number, fov: number): CameraConfig {
  const position = calculatePositionFromAngles(azimuth, elevation, CAMERA_DISTANCE);

  return {
    position,
    lookAt: new THREE.Vector3(0, 0, 0),
    up: new THREE.Vector3(0, 1, 0),
    fov,
    orthographic: true,
    orthoScale: 1,
  };
}

/**
 * Create oblique camera configuration
 *
 * Oblique uses orthographic projection with skewed angles
 */
function createObliqueConfig(azimuth: number, elevation: number, fov: number): CameraConfig {
  const position = calculatePositionFromAngles(azimuth, elevation, CAMERA_DISTANCE);

  return {
    position,
    lookAt: new THREE.Vector3(0, 0, 0),
    up: new THREE.Vector3(0, 1, 0),
    fov,
    orthographic: true,
    orthoScale: 1,
  };
}

/**
 * Create perspective camera configuration
 */
function createPerspectiveConfig(azimuth: number, elevation: number, fov: number): CameraConfig {
  const position = calculatePositionFromAngles(azimuth, elevation, CAMERA_DISTANCE);

  return {
    position,
    lookAt: new THREE.Vector3(0, 0, 0),
    up: new THREE.Vector3(0, 1, 0),
    fov,
    orthographic: false,
    orthoScale: 1,
  };
}

/**
 * Calculate camera position from azimuth and elevation angles
 */
function calculatePositionFromAngles(
  azimuthDeg: number,
  elevationDeg: number,
  distance: number,
): THREE.Vector3 {
  const azimuth = (azimuthDeg * Math.PI) / 180;
  const elevation = (elevationDeg * Math.PI) / 180;

  const x = distance * Math.sin(azimuth) * Math.cos(elevation);
  const y = distance * Math.sin(elevation);
  const z = distance * Math.cos(azimuth) * Math.cos(elevation);

  return new THREE.Vector3(x, y, z);
}

/**
 * Create Three.js camera from configuration
 */
export function createCamera(
  config: CameraConfig,
  width: number,
  height: number,
): THREE.Camera {
  const aspect = width / height;

  if (config.orthographic) {
    const viewSize = config.orthoScale * 2;
    const camera = new THREE.OrthographicCamera(
      -viewSize * aspect,
      viewSize * aspect,
      viewSize,
      -viewSize,
      0.1,
      1000,
    );
    camera.position.copy(config.position);
    camera.up.copy(config.up);
    camera.lookAt(config.lookAt);
    return camera;
  }

  const camera = new THREE.PerspectiveCamera(config.fov, aspect, 0.1, 1000);
  camera.position.copy(config.position);
  camera.up.copy(config.up);
  camera.lookAt(config.lookAt);
  return camera;
}
