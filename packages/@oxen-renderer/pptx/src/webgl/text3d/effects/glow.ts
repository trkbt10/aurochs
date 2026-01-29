/**
 * @file 3D Text Glow Effect
 *
 * Implements glow effect for 3D text using post-processing bloom.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.32 (glow)
 */

import * as THREE from "three";
import { createEffectCanvas } from "../utils/canvas";

// =============================================================================
// Glow Types
// =============================================================================

/**
 * Glow configuration for 3D text
 * @see ECMA-376 Part 1, Section 20.1.8.32 (glow)
 */
export type GlowConfig = {
  /** Glow color (hex string) */
  readonly color: string;
  /** Glow radius in pixels */
  readonly radius: number;
  /** Glow intensity (0-2) */
  readonly intensity?: number;
};

// =============================================================================
// Glow Implementation (Simple Approach)
// =============================================================================

/**
 * Create a simple glow mesh using emissive material.
 *
 * This creates a glowing effect by using an emissive material
 * on a slightly scaled clone of the geometry.
 *
 * @param geometry - Source geometry
 * @param config - Glow configuration
 */
export function createGlowMesh(
  geometry: THREE.BufferGeometry,
  config: GlowConfig,
): THREE.Mesh {
  // Clone geometry and scale up for glow
  const glowGeometry = geometry.clone();
  const scale = 1 + (config.radius / 100);
  glowGeometry.scale(scale, scale, scale);

  // Parse color
  const color = new THREE.Color(config.color);
  const intensity = config.intensity ?? 1;

  // Create emissive material
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.3 * intensity,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // Create glow mesh
  const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
  glowMesh.name = "text-glow";

  return glowMesh;
}

/**
 * Create multiple glow layers for a more realistic effect.
 *
 * @param geometry - Source geometry
 * @param config - Glow configuration
 * @param layers - Number of glow layers (default 3)
 */
export function createLayeredGlow(
  geometry: THREE.BufferGeometry,
  config: GlowConfig,
  layers: number = 3,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "text-glow-layers";

  const color = new THREE.Color(config.color);
  const baseRadius = config.radius / 100;
  const intensity = config.intensity ?? 1;

  for (let i = 0; i < layers; i++) {
    // Each layer is progressively larger and more transparent
    const layerScale = 1 + baseRadius * (i + 1) / layers;
    const layerOpacity = (0.4 / layers) * intensity;

    const glowGeometry = geometry.clone();
    glowGeometry.scale(layerScale, layerScale, layerScale);

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: layerOpacity,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.name = `text-glow-layer-${i}`;
    group.add(glowMesh);
  }

  return group;
}

/**
 * Create a sprite-based glow (camera-facing glow).
 *
 * @param config - Glow configuration
 * @param size - Size of the glow sprite
 */
export function createGlowSprite(
  config: GlowConfig,
  size: number = 2,
): THREE.Sprite {
  // Create glow texture
  const { canvas, ctx } = createEffectCanvas();

  // Parse color for gradient
  const color = new THREE.Color(config.color);
  const r = Math.floor(color.r * 255);
  const g = Math.floor(color.g * 255);
  const b = Math.floor(color.b * 255);

  // Create radial gradient
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  const intensity = config.intensity ?? 1;
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.8 * intensity})`);
  gradient.addColorStop(0.2, `rgba(${r}, ${g}, ${b}, ${0.4 * intensity})`);
  gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${0.2 * intensity})`);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const glowTexture = new THREE.CanvasTexture(canvas);

  // Create sprite material
  const spriteMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // Create sprite
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(size * (config.radius / 20), size * (config.radius / 20), 1);
  sprite.name = "text-glow-sprite";

  return sprite;
}

// =============================================================================
// Glow Utilities
// =============================================================================

/**
 * Add glow to a mesh group.
 */
export function addGlowToGroup(
  group: THREE.Group,
  config: GlowConfig,
): void {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh && !child.name.startsWith("text-glow")) {
      const glow = createGlowMesh(child.geometry, config);
      glow.position.copy(child.position);
      glow.rotation.copy(child.rotation);
      glow.scale.copy(child.scale);
      group.add(glow);
    }
  });
}

/**
 * Update glow color.
 */
export function updateGlowColor(
  glow: THREE.Mesh | THREE.Group | THREE.Sprite,
  color: string,
): void {
  const newColor = new THREE.Color(color);

  if (glow instanceof THREE.Group) {
    glow.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        (child.material as THREE.MeshBasicMaterial).color = newColor;
      }
    });
  } else if (glow instanceof THREE.Mesh) {
    (glow.material as THREE.MeshBasicMaterial).color = newColor;
  }
}

/**
 * Update glow intensity.
 */
export function updateGlowIntensity(
  glow: THREE.Mesh | THREE.Group,
  intensity: number,
): void {
  if (glow instanceof THREE.Group) {
    glow.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        (child.material as THREE.MeshBasicMaterial).opacity = 0.3 * intensity;
      }
    });
  } else {
    (glow.material as THREE.MeshBasicMaterial).opacity = 0.3 * intensity;
  }
}

/**
 * Dispose glow resources.
 */
export function disposeGlow(glow: THREE.Mesh | THREE.Group | THREE.Sprite): void {
  if (glow instanceof THREE.Group) {
    glow.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
  } else if (glow instanceof THREE.Mesh || glow instanceof THREE.Sprite) {
    if ("geometry" in glow) {
      glow.geometry.dispose();
    }
    if (glow.material instanceof THREE.Material) {
      glow.material.dispose();
    }
  }
}
