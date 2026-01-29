/**
 * @file 3D Lighting setup for WebGL text rendering
 *
 * Maps ECMA-376 light rig presets to Three.js lighting configurations.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.30 (ST_LightRigType)
 * @see ECMA-376 Part 1, Section 20.1.10.29 (ST_LightRigDirection)
 */

import * as THREE from "three";
import type { LightRigDirection, LightRig, Rotation3d } from "@oxen-office/pptx/domain/index";

// =============================================================================
// Lighting Configuration Types
// =============================================================================

export type LightConfig = {
  /** Ambient light color and intensity */
  readonly ambient: { color: number; intensity: number };
  /** Primary directional/point lights */
  readonly lights: ReadonlyArray<{
    type: "directional" | "point" | "spot";
    color: number;
    intensity: number;
    position: THREE.Vector3;
  }>;
};

// =============================================================================
// Light Direction Vectors
// =============================================================================

/**
 * Get light direction vector from ECMA-376 direction preset
 *
 * @see ECMA-376 Part 1, Section 20.1.10.29
 */
function getDirectionVector(direction: LightRigDirection): THREE.Vector3 {
  switch (direction) {
    case "tl": return new THREE.Vector3(-1, 1, 1).normalize();
    case "t": return new THREE.Vector3(0, 1, 1).normalize();
    case "tr": return new THREE.Vector3(1, 1, 1).normalize();
    case "l": return new THREE.Vector3(-1, 0, 1).normalize();
    case "r": return new THREE.Vector3(1, 0, 1).normalize();
    case "bl": return new THREE.Vector3(-1, -1, 1).normalize();
    case "b": return new THREE.Vector3(0, -1, 1).normalize();
    case "br": return new THREE.Vector3(1, -1, 1).normalize();
    default: return new THREE.Vector3(0, 1, 1).normalize();
  }
}

/**
 * Apply rotation to direction vector
 */
function applyRotation(
  direction: THREE.Vector3,
  rotation: Rotation3d | undefined,
): THREE.Vector3 {
  if (!rotation) {return direction.clone();}

  const result = direction.clone();
  const euler = new THREE.Euler(
    ((rotation.latitude as number) * Math.PI) / 180,
    ((rotation.longitude as number) * Math.PI) / 180,
    ((rotation.revolution as number) * Math.PI) / 180,
  );
  result.applyEuler(euler);
  return result;
}

// =============================================================================
// Light Rig Presets
// =============================================================================

/**
 * Create lighting configuration from light rig preset
 *
 * @see ECMA-376 Part 1, Section 20.1.10.30
 */
export function createLightingConfig(lightRig: LightRig | undefined): LightConfig {
  if (!lightRig) {
    return createDefaultLighting();
  }

  const baseDirection = getDirectionVector(lightRig.direction);
  const direction = applyRotation(baseDirection, lightRig.rotation);
  const lightDistance = 10;
  const lightPosition = direction.clone().multiplyScalar(lightDistance);

  switch (lightRig.rig) {
    // =========================================================================
    // Modern Presets
    // =========================================================================
    case "threePt":
      return createThreePointLighting(lightPosition);

    case "twoPt":
      return createTwoPointLighting(lightPosition);

    case "balanced":
      return createBalancedLighting(lightPosition);

    case "soft":
      return createSoftLighting(lightPosition);

    case "harsh":
      return createHarshLighting(lightPosition);

    case "flood":
      return createFloodLighting(lightPosition);

    case "contrasting":
      return createContrastingLighting(lightPosition);

    case "morning":
      return createMorningLighting(lightPosition);

    case "sunrise":
      return createSunriseLighting(lightPosition);

    case "sunset":
      return createSunsetLighting(lightPosition);

    case "chilly":
      return createChillyLighting(lightPosition);

    case "freezing":
      return createFreezingLighting(lightPosition);

    case "flat":
      return createFlatLighting();

    case "glow":
      return createGlowLighting(lightPosition);

    case "brightRoom":
      return createBrightRoomLighting(lightPosition);

    // =========================================================================
    // Legacy Presets
    // =========================================================================
    case "legacyFlat1":
    case "legacyFlat2":
    case "legacyFlat3":
    case "legacyFlat4":
      return createFlatLighting();

    case "legacyNormal1":
    case "legacyNormal2":
    case "legacyNormal3":
    case "legacyNormal4":
      return createThreePointLighting(lightPosition);

    case "legacyHarsh1":
    case "legacyHarsh2":
    case "legacyHarsh3":
    case "legacyHarsh4":
      return createHarshLighting(lightPosition);

    default:
      return createDefaultLighting();
  }
}

// =============================================================================
// Lighting Preset Implementations
// =============================================================================

function createDefaultLighting(): LightConfig {
  return {
    ambient: { color: 0x404040, intensity: 0.5 },
    lights: [
      {
        type: "directional",
        color: 0xffffff,
        intensity: 0.8,
        position: new THREE.Vector3(1, 1, 1).normalize().multiplyScalar(10),
      },
    ],
  };
}

function createThreePointLighting(primaryPosition: THREE.Vector3): LightConfig {
  // Key light, fill light, back light
  const fillPosition = primaryPosition.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  const backPosition = primaryPosition.clone().negate();

  return {
    ambient: { color: 0x202020, intensity: 0.3 },
    lights: [
      { type: "directional", color: 0xffffff, intensity: 1.0, position: primaryPosition },
      { type: "directional", color: 0xaaccff, intensity: 0.4, position: fillPosition },
      { type: "directional", color: 0xffffcc, intensity: 0.3, position: backPosition },
    ],
  };
}

function createTwoPointLighting(primaryPosition: THREE.Vector3): LightConfig {
  const fillPosition = primaryPosition.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);

  return {
    ambient: { color: 0x303030, intensity: 0.4 },
    lights: [
      { type: "directional", color: 0xffffff, intensity: 0.9, position: primaryPosition },
      { type: "directional", color: 0xaaaaff, intensity: 0.5, position: fillPosition },
    ],
  };
}

function createBalancedLighting(primaryPosition: THREE.Vector3): LightConfig {
  return {
    ambient: { color: 0x404040, intensity: 0.6 },
    lights: [
      { type: "directional", color: 0xffffff, intensity: 0.6, position: primaryPosition },
      { type: "directional", color: 0xffffff, intensity: 0.4, position: primaryPosition.clone().negate() },
    ],
  };
}

function createSoftLighting(primaryPosition: THREE.Vector3): LightConfig {
  return {
    ambient: { color: 0x505050, intensity: 0.7 },
    lights: [
      { type: "directional", color: 0xffffff, intensity: 0.5, position: primaryPosition },
    ],
  };
}

function createHarshLighting(primaryPosition: THREE.Vector3): LightConfig {
  return {
    ambient: { color: 0x101010, intensity: 0.2 },
    lights: [
      { type: "directional", color: 0xffffff, intensity: 1.2, position: primaryPosition },
    ],
  };
}

function createFloodLighting(primaryPosition: THREE.Vector3): LightConfig {
  return {
    ambient: { color: 0x606060, intensity: 0.8 },
    lights: [
      { type: "directional", color: 0xffffff, intensity: 0.6, position: primaryPosition },
      { type: "directional", color: 0xffffff, intensity: 0.4, position: new THREE.Vector3(0, 1, 0) },
    ],
  };
}

function createContrastingLighting(primaryPosition: THREE.Vector3): LightConfig {
  return {
    ambient: { color: 0x202020, intensity: 0.2 },
    lights: [
      { type: "directional", color: 0xffffff, intensity: 1.0, position: primaryPosition },
      { type: "directional", color: 0x4444ff, intensity: 0.3, position: primaryPosition.clone().negate() },
    ],
  };
}

function createMorningLighting(primaryPosition: THREE.Vector3): LightConfig {
  return {
    ambient: { color: 0x404050, intensity: 0.5 },
    lights: [
      { type: "directional", color: 0xffeedd, intensity: 0.8, position: primaryPosition },
    ],
  };
}

function createSunriseLighting(primaryPosition: THREE.Vector3): LightConfig {
  return {
    ambient: { color: 0x302020, intensity: 0.4 },
    lights: [
      { type: "directional", color: 0xffaa66, intensity: 0.9, position: primaryPosition },
      { type: "directional", color: 0xff6644, intensity: 0.3, position: primaryPosition.clone().negate() },
    ],
  };
}

function createSunsetLighting(primaryPosition: THREE.Vector3): LightConfig {
  return {
    ambient: { color: 0x302010, intensity: 0.3 },
    lights: [
      { type: "directional", color: 0xff8844, intensity: 0.9, position: primaryPosition },
      { type: "directional", color: 0x8844ff, intensity: 0.2, position: primaryPosition.clone().negate() },
    ],
  };
}

function createChillyLighting(primaryPosition: THREE.Vector3): LightConfig {
  return {
    ambient: { color: 0x304050, intensity: 0.5 },
    lights: [
      { type: "directional", color: 0xccddff, intensity: 0.8, position: primaryPosition },
    ],
  };
}

function createFreezingLighting(primaryPosition: THREE.Vector3): LightConfig {
  return {
    ambient: { color: 0x203040, intensity: 0.4 },
    lights: [
      { type: "directional", color: 0xaaccff, intensity: 0.9, position: primaryPosition },
      { type: "directional", color: 0x88aaff, intensity: 0.3, position: primaryPosition.clone().negate() },
    ],
  };
}

function createFlatLighting(): LightConfig {
  return {
    ambient: { color: 0x808080, intensity: 1.0 },
    lights: [],
  };
}

function createGlowLighting(primaryPosition: THREE.Vector3): LightConfig {
  return {
    ambient: { color: 0x404040, intensity: 0.6 },
    lights: [
      { type: "point", color: 0xffffff, intensity: 1.0, position: primaryPosition },
    ],
  };
}

function createBrightRoomLighting(primaryPosition: THREE.Vector3): LightConfig {
  // BrightRoom: Well-lit environment ideal for WordArt
  // - Strong front light to illuminate text face
  // - Fill light from above for depth
  // - Moderate ambient to prevent harsh shadows
  return {
    ambient: { color: 0x606060, intensity: 0.5 },
    lights: [
      // Key light from front-ish direction (strong)
      { type: "directional", color: 0xffffff, intensity: 1.0, position: new THREE.Vector3(0, 0.5, 1).normalize().multiplyScalar(10) },
      // Primary position light (based on rig direction)
      { type: "directional", color: 0xffffff, intensity: 0.6, position: primaryPosition },
      // Fill light from above
      { type: "directional", color: 0xffffff, intensity: 0.4, position: new THREE.Vector3(0, 1, 0.5).normalize().multiplyScalar(10) },
    ],
  };
}

// =============================================================================
// Scene Light Creation
// =============================================================================

/**
 * Add lights to a Three.js scene based on configuration
 */
export function addLightsToScene(scene: THREE.Scene, config: LightConfig): void {
  // Add ambient light
  const ambientLight = new THREE.AmbientLight(config.ambient.color, config.ambient.intensity);
  scene.add(ambientLight);

  // Add directional/point/spot lights
  for (const lightDef of config.lights) {
    let light: THREE.Light;

    switch (lightDef.type) {
      case "point":
        light = new THREE.PointLight(lightDef.color, lightDef.intensity);
        break;
      case "spot":
        light = new THREE.SpotLight(lightDef.color, lightDef.intensity);
        break;
      case "directional":
      default:
        light = new THREE.DirectionalLight(lightDef.color, lightDef.intensity);
        break;
    }

    light.position.copy(lightDef.position);
    scene.add(light);
  }
}
