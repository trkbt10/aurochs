/**
 * @file 3D Text Shadow Effect
 *
 * Implements shadow effects for 3D text using Three.js shadow mapping.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.49 (outerShdw)
 */

import * as THREE from "three";
import { createEffectCanvas } from "../utils/canvas";

// =============================================================================
// Shadow Types
// =============================================================================

/**
 * Shadow configuration for 3D text
 * @see ECMA-376 Part 1, Section 20.1.8.49 (outerShdw)
 */
export type ShadowConfig = {
  /** Shadow type (outer or inner) */
  readonly type: "outer" | "inner";
  /** Shadow color (hex string) */
  readonly color: string;
  /** Blur radius in pixels */
  readonly blurRadius: number;
  /** Distance from object in pixels */
  readonly distance: number;
  /** Direction in degrees (0 = right, 90 = down) */
  readonly direction: number;
  /** Shadow opacity (0-1) */
  readonly opacity?: number;
};

/**
 * Shadow state for renderer
 */
export type ShadowState = {
  readonly enabled: boolean;
  readonly mesh?: THREE.Mesh;
  readonly light?: THREE.DirectionalLight;
};

// =============================================================================
// Shadow Implementation
// =============================================================================

/**
 * Enable shadow mapping on renderer and configure shadow-casting lights.
 *
 * @param renderer - Three.js WebGLRenderer
 */
export function enableShadowMapping(renderer: THREE.WebGLRenderer): void {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

/**
 * Create a shadow-casting directional light based on shadow config.
 *
 * @param config - Shadow configuration
 * @param sceneSize - Approximate scene size for shadow camera
 */
export function createShadowLight(
  config: ShadowConfig,
  sceneSize: number = 10,
): THREE.DirectionalLight {
  const color = new THREE.Color(config.color);
  const light = new THREE.DirectionalLight(color, 0.5);

  // Position light based on direction and distance
  const angleRad = (config.direction * Math.PI) / 180;
  const normalizedDist = config.distance / 10; // Normalize to scene units

  light.position.set(
    -Math.cos(angleRad) * normalizedDist * 5,
    5, // Above the scene
    -Math.sin(angleRad) * normalizedDist * 5,
  );

  // Enable shadow casting
  light.castShadow = true;

  // Configure shadow map
  light.shadow.mapSize.width = 1024;
  light.shadow.mapSize.height = 1024;

  // Configure shadow camera
  light.shadow.camera.near = 0.1;
  light.shadow.camera.far = sceneSize * 4;
  light.shadow.camera.left = -sceneSize;
  light.shadow.camera.right = sceneSize;
  light.shadow.camera.top = sceneSize;
  light.shadow.camera.bottom = -sceneSize;

  // Configure blur based on blurRadius
  light.shadow.radius = Math.max(1, config.blurRadius / 5);

  return light;
}

/**
 * Create a drop shadow mesh (2D shadow plane beneath the object).
 *
 * This is a simpler approach than shadow mapping, suitable for
 * stylized shadows.
 *
 * @param geometry - Source geometry to create shadow for
 * @param config - Shadow configuration
 */
export function createDropShadowMesh(
  geometry: THREE.BufferGeometry,
  config: ShadowConfig,
): THREE.Mesh {
  // Compute bounding box
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const size = new THREE.Vector3();
  box.getSize(size);

  // Create shadow geometry (flattened version)
  const shadowGeometry = new THREE.PlaneGeometry(
    size.x * 1.2,
    size.y * 1.2,
  );

  // Parse color
  const color = new THREE.Color(config.color);

  // Create gradient texture for soft shadow
  const { canvas, ctx } = createEffectCanvas();

  // Create radial gradient for soft edges
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  const opacity = config.opacity ?? 0.3;
  gradient.addColorStop(0, `rgba(0, 0, 0, ${opacity})`);
  gradient.addColorStop(0.5, `rgba(0, 0, 0, ${opacity * 0.5})`);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const shadowTexture = new THREE.CanvasTexture(canvas);

  // Create shadow material
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    color: color,
    transparent: true,
    opacity: opacity,
    depthWrite: false,
  });

  // Create shadow mesh
  const shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
  shadowMesh.name = "text-shadow";

  // Position shadow based on direction and distance
  const angleRad = (config.direction * Math.PI) / 180;
  const normalizedDist = config.distance / 96; // Convert pixels to scene units

  shadowMesh.position.set(
    Math.cos(angleRad) * normalizedDist,
    -Math.sin(angleRad) * normalizedDist,
    -0.1, // Slightly behind/below
  );

  // Rotate to face camera (flat on XY plane by default)
  // Adjust based on scene orientation as needed

  return shadowMesh;
}

/**
 * Create an inner shadow effect (shadow inside the shape).
 *
 * Inner shadows are more complex in 3D and typically require
 * shader-based approaches.
 *
 * @param geometry - Source geometry
 * @param config - Shadow configuration
 */
export function createInnerShadowMesh(
  geometry: THREE.BufferGeometry,
  config: ShadowConfig,
): THREE.Mesh | null {
  // Inner shadows in 3D are complex and typically require:
  // 1. Inverted normals
  // 2. Custom shaders
  // 3. Screen-space effects

  // For now, return null - inner shadows would be implemented
  // as a post-processing effect
  console.warn("[3D Shadow] Inner shadows not yet implemented for 3D");
  return null;
}

// =============================================================================
// Shadow Utilities
// =============================================================================

/**
 * Configure mesh for shadow casting.
 */
export function enableMeshShadows(mesh: THREE.Mesh, cast: boolean = true, receive: boolean = true): void {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
}

/**
 * Configure group for shadow casting.
 */
export function enableGroupShadows(
  group: THREE.Group,
  cast: boolean = true,
  receive: boolean = true,
): void {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

/**
 * Create shadow receiving plane.
 *
 * @param size - Size of the plane
 * @param position - Position of the plane
 */
export function createShadowPlane(
  size: number = 20,
  position: THREE.Vector3 = new THREE.Vector3(0, -2, 0),
): THREE.Mesh {
  const planeGeometry = new THREE.PlaneGeometry(size, size);
  const planeMaterial = new THREE.ShadowMaterial({
    opacity: 0.3,
  });

  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.position.copy(position);
  plane.receiveShadow = true;
  plane.name = "shadow-plane";

  return plane;
}

/**
 * Dispose shadow resources.
 */
export function disposeShadow(shadow: THREE.Mesh | THREE.Light): void {
  if (shadow instanceof THREE.Mesh) {
    shadow.geometry.dispose();
    if (shadow.material instanceof THREE.Material) {
      shadow.material.dispose();
    }
  } else if (shadow instanceof THREE.DirectionalLight && shadow.shadow.map) {
    shadow.shadow.map.dispose();
  }
}
