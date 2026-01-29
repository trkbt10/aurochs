/**
 * @file 3D Text Reflection Effect
 *
 * Implements reflection effect for 3D text.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.50 (reflection)
 */

import * as THREE from "three";
import { createEffectCanvas } from "../utils/canvas";

// =============================================================================
// Reflection Types
// =============================================================================

/**
 * Reflection alignment values
 * @see ECMA-376 Part 1, Section 20.1.10.3 (ST_RectAlignment)
 */
export type ReflectionAlignment = "tl" | "t" | "tr" | "l" | "ctr" | "r" | "bl" | "b" | "br";

/**
 * Reflection configuration for 3D text
 * @see ECMA-376 Part 1, Section 20.1.8.50 (reflection)
 */
export type ReflectionConfig = {
  /** Blur radius of reflection */
  readonly blurRadius: number;
  /** Start opacity (0-100) @see ECMA-376 stA attribute */
  readonly startOpacity: number;
  /** Start position (0-100) where fade begins @see ECMA-376 stPos attribute */
  readonly startPosition: number;
  /** End opacity (0-100) @see ECMA-376 endA attribute */
  readonly endOpacity: number;
  /** End position (0-100) where fade ends @see ECMA-376 endPos attribute */
  readonly endPosition: number;
  /** Distance from object in pixels */
  readonly distance: number;
  /** Direction in degrees */
  readonly direction: number;
  /** Fade direction in degrees (default 90°) @see ECMA-376 fadeDir attribute */
  readonly fadeDirection: number;
  /** Scale X (percentage) */
  readonly scaleX: number;
  /** Scale Y (percentage) */
  readonly scaleY: number;
  /** Horizontal skew in degrees @see ECMA-376 kx attribute */
  readonly skewX?: number;
  /** Vertical skew in degrees @see ECMA-376 ky attribute */
  readonly skewY?: number;
  /** Reflection alignment (default "b") @see ECMA-376 algn attribute */
  readonly alignment?: ReflectionAlignment;
};

// =============================================================================
// Reflection Implementation
// =============================================================================

/**
 * Create a reflection mesh (mirrored and faded clone).
 *
 * @param geometry - Source geometry to reflect
 * @param material - Source material
 * @param config - Reflection configuration
 */
export function createReflectionMesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  config: ReflectionConfig,
): THREE.Mesh {
  // Clone geometry
  const reflectionGeometry = geometry.clone();

  // Mirror on Y axis (flip vertically)
  reflectionGeometry.scale(
    config.scaleX / 100,
    -config.scaleY / 100, // Negative to flip
    1,
  );

  // Clone and modify material for reflection
  let reflectionMaterial: THREE.Material;

  if (material instanceof THREE.MeshStandardMaterial) {
    reflectionMaterial = new THREE.MeshStandardMaterial({
      color: material.color,
      roughness: material.roughness,
      metalness: material.metalness,
      transparent: true,
      opacity: config.startOpacity / 100,
      side: THREE.DoubleSide,
    });
  } else {
    reflectionMaterial = new THREE.MeshBasicMaterial({
      color: (material as THREE.MeshBasicMaterial).color ?? 0x888888,
      transparent: true,
      opacity: config.startOpacity / 100,
      side: THREE.DoubleSide,
    });
  }

  // Create reflection mesh
  const reflectionMesh = new THREE.Mesh(reflectionGeometry, reflectionMaterial);
  reflectionMesh.name = "text-reflection";

  // Position below the original (offset by distance)
  const normalizedDist = config.distance / 96; // Convert pixels to scene units
  reflectionMesh.position.y = -normalizedDist;

  return reflectionMesh;
}

/**
 * Create a reflection with gradient fade effect.
 *
 * This creates a more realistic reflection by using a gradient
 * to fade the reflection from top to bottom.
 *
 * @param geometry - Source geometry
 * @param material - Source material
 * @param config - Reflection configuration
 */
export function createGradientReflection(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  config: ReflectionConfig,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "text-reflection-gradient";

  // Compute bounds
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const size = new THREE.Vector3();
  box.getSize(size);

  // Clone geometry and flip
  const reflectionGeometry = geometry.clone();
  reflectionGeometry.scale(
    config.scaleX / 100,
    -config.scaleY / 100,
    1,
  );

  // Get base color from material
  let baseColor = new THREE.Color(0x888888);
  if ("color" in material) {
    baseColor = (material as THREE.MeshStandardMaterial).color.clone();
  }

  // Create reflection material with vertex colors for gradient
  const reflectionMaterial = new THREE.MeshBasicMaterial({
    color: baseColor,
    transparent: true,
    opacity: config.startOpacity / 100,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // Create reflection mesh
  const reflectionMesh = new THREE.Mesh(reflectionGeometry, reflectionMaterial);

  // Position
  const normalizedDist = config.distance / 96;
  reflectionMesh.position.y = -normalizedDist;

  group.add(reflectionMesh);

  // Create fade plane overlay
  const fadePlane = createFadePlane(size, config);
  fadePlane.position.y = -normalizedDist - size.y * (config.scaleY / 100) / 2;
  group.add(fadePlane);

  return group;
}

/**
 * Create a fade plane for the reflection gradient.
 *
 * ECMA-376 reflection uses startPosition/endPosition to define the gradient range:
 * - stPos: where the fade gradient begins (0-100%)
 * - endPos: where the fade gradient ends (0-100%)
 * - stA: opacity at start position
 * - endA: opacity at end position
 *
 * @see ECMA-376 Part 1, Section 20.1.8.50 (reflection)
 */
function createFadePlane(
  size: THREE.Vector3,
  config: ReflectionConfig,
): THREE.Mesh {
  // Create gradient texture
  const { canvas, ctx } = createEffectCanvas();

  // Convert ECMA-376 positions (0-100) to gradient stops (0-1)
  const stPos = config.startPosition / 100;
  const endPos = config.endPosition / 100;
  const stA = config.startOpacity / 100;
  const endA = config.endOpacity / 100;

  // Create vertical gradient with ECMA-376 stPos/endPos
  // Note: Canvas gradient uses 0=top, 1=bottom
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);

  // Before startPosition: use startOpacity
  if (stPos > 0) {
    gradient.addColorStop(0, `rgba(255, 255, 255, ${1 - stA})`);
  }

  // At startPosition: startOpacity
  gradient.addColorStop(stPos, `rgba(255, 255, 255, ${1 - stA})`);

  // At endPosition: endOpacity
  gradient.addColorStop(endPos, `rgba(255, 255, 255, ${1 - endA})`);

  // After endPosition: use endOpacity
  if (endPos < 1) {
    gradient.addColorStop(1, `rgba(255, 255, 255, ${1 - endA})`);
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const fadeTexture = new THREE.CanvasTexture(canvas);

  // Create plane
  const planeGeometry = new THREE.PlaneGeometry(size.x * 1.5, size.y * (config.scaleY / 100));

  const planeMaterial = new THREE.MeshBasicMaterial({
    map: fadeTexture,
    transparent: true,
    blending: THREE.MultiplyBlending,
    depthWrite: false,
  });

  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.name = "reflection-fade";

  return plane;
}

/**
 * Create a floor plane that receives reflections.
 *
 * This creates a reflective floor surface using a render target.
 *
 * @param size - Size of the floor plane
 */
export function createReflectiveFloor(
  size: number = 10,
): THREE.Mesh {
  const planeGeometry = new THREE.PlaneGeometry(size, size);

  // Create simple reflective material
  const planeMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888,
    roughness: 0.2,
    metalness: 0.8,
    transparent: true,
    opacity: 0.5,
  });

  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -1;
  plane.receiveShadow = true;
  plane.name = "reflective-floor";

  return plane;
}

// =============================================================================
// Reflection Utilities
// =============================================================================

/**
 * Add reflection to a mesh group.
 */
export function addReflectionToGroup(
  group: THREE.Group,
  config: ReflectionConfig,
): void {
  const meshes: { mesh: THREE.Mesh; material: THREE.Material }[] = [];

  group.traverse((child) => {
    if (child instanceof THREE.Mesh && !child.name.startsWith("text-reflection")) {
      meshes.push({ mesh: child, material: child.material as THREE.Material });
    }
  });

  for (const { mesh, material } of meshes) {
    const reflection = createReflectionMesh(mesh.geometry, material, config);
    reflection.position.add(mesh.position);
    group.add(reflection);
  }
}

/**
 * Update reflection opacity.
 */
export function updateReflectionOpacity(
  reflection: THREE.Mesh | THREE.Group,
  startOpacity: number,
  _endOpacity: number,
): void {
  void _endOpacity;
  if (reflection instanceof THREE.Group) {
    reflection.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshBasicMaterial;
        mat.opacity = startOpacity / 100;
      }
    });
  } else {
    (reflection.material as THREE.MeshBasicMaterial).opacity = startOpacity / 100;
  }
}

/**
 * Dispose reflection resources.
 */
export function disposeReflection(reflection: THREE.Mesh | THREE.Group): void {
  if (reflection instanceof THREE.Group) {
    reflection.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
  } else {
    reflection.geometry.dispose();
    if (reflection.material instanceof THREE.Material) {
      reflection.material.dispose();
    }
  }
}
