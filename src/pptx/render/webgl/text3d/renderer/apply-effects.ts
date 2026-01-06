/**
 * @file Text3D Effects Application
 *
 * Applies ECMA-376 effects to 3D text meshes.
 * Separated from core.ts for maintainability.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Effects)
 */

import * as THREE from "three";
import {
  createContourMesh,
  type ContourConfig,
} from "../effects/contour";
import {
  createBackFaceOutline,
  type OutlineConfig,
} from "../effects/outline";
import {
  createDropShadowMesh,
  type ShadowConfig,
} from "../effects/shadow";
import {
  createLayeredGlow,
  type GlowConfig,
} from "../effects/glow";
import {
  createReflectionMesh,
  type ReflectionConfig,
} from "../effects/reflection";
import {
  applySoftEdgeToMesh,
  type SoftEdgeConfig,
} from "../effects/soft-edge";

// =============================================================================
// Types
// =============================================================================

/**
 * Effects configuration for a text run
 */
export type TextRunEffects = {
  /** 3D contour (shell around extruded shape) - ECMA-376 sp3d contourW/contourClr */
  readonly contour?: ContourConfig;
  readonly outline?: OutlineConfig;
  readonly shadow?: ShadowConfig;
  readonly glow?: GlowConfig;
  readonly reflection?: ReflectionConfig;
  readonly softEdge?: SoftEdgeConfig;
};

/**
 * Result of applying effects to a mesh
 */
export type AppliedEffects = {
  /** Contour mesh (if contour configured) */
  readonly contourMesh?: THREE.Mesh;
  /** Outline mesh (if outline configured) */
  readonly outlineMesh?: THREE.Mesh;
  /** Shadow mesh (if shadow configured) */
  readonly shadowMesh?: THREE.Mesh;
  /** Glow group (if glow configured) */
  readonly glowGroup?: THREE.Group;
  /** Reflection mesh (if reflection configured) */
  readonly reflectionMesh?: THREE.Mesh;
};

// =============================================================================
// Effect Application Functions
// =============================================================================

/**
 * Create contour mesh (3D shell around extruded shape)
 */
export function createContour(
  geometry: THREE.BufferGeometry,
  config: ContourConfig,
  position: THREE.Vector3,
): THREE.Mesh {
  const contourMesh = createContourMesh(geometry, config);
  contourMesh.position.copy(position);
  return contourMesh;
}

/**
 * Apply soft edge effect to mesh (modifies material in-place)
 */
export function applySoftEdge(
  mesh: THREE.Mesh,
  config: SoftEdgeConfig,
): void {
  applySoftEdgeToMesh(mesh, config);
}

/**
 * Create outline mesh for text
 */
export function createOutline(
  geometry: THREE.BufferGeometry,
  config: OutlineConfig,
  position: THREE.Vector3,
): THREE.Mesh | null {
  if (config.visible === false) {
    return null;
  }

  const outlineMesh = createBackFaceOutline(geometry, config);
  outlineMesh.position.copy(position);
  return outlineMesh;
}

/**
 * Create shadow mesh for text.
 *
 * The shadow position combines:
 * 1. The mesh position (where the text is)
 * 2. The shadow's direction/distance offset (from config)
 *
 * The shadow geometry is scaled to match the main text mesh.
 */
export function createShadow(
  geometry: THREE.BufferGeometry,
  config: ShadowConfig,
  position: THREE.Vector3,
  scale: THREE.Vector3,
): THREE.Mesh {
  const shadowMesh = createDropShadowMesh(geometry, config);

  // Scale shadow to match main mesh (shadow geometry is in pixel units)
  shadowMesh.scale.copy(scale);

  // Add mesh position to shadow's direction/distance offset
  // createDropShadowMesh already set the offset, we add the mesh position
  shadowMesh.position.x += position.x;
  shadowMesh.position.y += position.y;
  // Keep z offset from createDropShadowMesh (slightly behind)

  return shadowMesh;
}

/**
 * Create glow effect for text
 */
export function createGlow(
  geometry: THREE.BufferGeometry,
  config: GlowConfig,
  position: THREE.Vector3,
): THREE.Group {
  const glowGroup = createLayeredGlow(geometry, config);
  glowGroup.position.copy(position);
  return glowGroup;
}

/**
 * Create reflection effect for text
 */
export function createReflection(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  config: ReflectionConfig,
  position: THREE.Vector3,
): THREE.Mesh {
  const reflectionMesh = createReflectionMesh(geometry, material, config);
  reflectionMesh.position.x = position.x;
  reflectionMesh.position.y = position.y;
  return reflectionMesh;
}

// =============================================================================
// Unified Effect Application
// =============================================================================

/**
 * Apply all effects to a text mesh and add to group.
 *
 * @param group - Parent group to add effect meshes to
 * @param mesh - The main text mesh
 * @param geometry - Text geometry
 * @param material - Text material
 * @param effects - Effect configurations
 * @returns Applied effect objects for later manipulation
 */
export function applyAllEffects(
  group: THREE.Group,
  mesh: THREE.Mesh,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  effects: TextRunEffects,
): AppliedEffects {
  const result: AppliedEffects = {};

  // Apply soft edge first (modifies material)
  if (effects.softEdge) {
    applySoftEdge(mesh, effects.softEdge);
  }

  // Apply contour BEFORE main mesh (renders behind)
  // Contour is the 3D shell around the extruded shape (ECMA-376 sp3d contourW)
  if (effects.contour && effects.contour.width > 0) {
    const contourMesh = createContour(geometry, effects.contour, mesh.position);
    group.add(contourMesh);
    (result as { contourMesh: THREE.Mesh }).contourMesh = contourMesh;
  }

  // Add main mesh
  group.add(mesh);

  // Apply outline (2D stroke effect, different from 3D contour)
  if (effects.outline) {
    const outlineMesh = createOutline(geometry, effects.outline, mesh.position);
    if (outlineMesh) {
      group.add(outlineMesh);
      (result as { outlineMesh: THREE.Mesh }).outlineMesh = outlineMesh;
    }
  }

  // Apply shadow
  if (effects.shadow) {
    const shadowMesh = createShadow(geometry, effects.shadow, mesh.position, mesh.scale);
    group.add(shadowMesh);
    (result as { shadowMesh: THREE.Mesh }).shadowMesh = shadowMesh;
  }

  // Apply glow
  if (effects.glow) {
    const glowGroup = createGlow(geometry, effects.glow, mesh.position);
    group.add(glowGroup);
    (result as { glowGroup: THREE.Group }).glowGroup = glowGroup;
  }

  // Apply reflection
  if (effects.reflection) {
    const reflectionMesh = createReflection(
      geometry,
      material,
      effects.reflection,
      mesh.position,
    );
    group.add(reflectionMesh);
    (result as { reflectionMesh: THREE.Mesh }).reflectionMesh = reflectionMesh;
  }

  return result;
}

/**
 * Check if any effects are configured
 */
export function hasAnyEffects(effects: TextRunEffects): boolean {
  return !!(
    effects.contour ||
    effects.outline ||
    effects.shadow ||
    effects.glow ||
    effects.reflection ||
    effects.softEdge
  );
}

/**
 * Check if shadow mapping is needed for any runs
 */
export function needsShadowMapping(runs: readonly TextRunEffects[]): boolean {
  return runs.some((run) => run.shadow !== undefined);
}

// Re-export types for convenience
export type {
  ContourConfig,
  OutlineConfig,
  ShadowConfig,
  GlowConfig,
  ReflectionConfig,
  SoftEdgeConfig,
};
