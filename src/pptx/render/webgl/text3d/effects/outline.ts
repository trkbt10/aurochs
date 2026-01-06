/**
 * @file 3D Text Outline Effect
 *
 * Implements text outline for 3D text using edge geometry.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.2.24 (ln)
 */

import * as THREE from "three";

// =============================================================================
// Outline Types
// =============================================================================

/**
 * Outline configuration for 3D text
 */
export type OutlineConfig = {
  /** Outline color (hex string) */
  readonly color: string;
  /** Outline width in pixels */
  readonly width: number;
  /** Whether outline is visible */
  readonly visible?: boolean;
};

// =============================================================================
// Outline Creation
// =============================================================================

/**
 * Create an outline mesh for the given geometry.
 *
 * Uses EdgesGeometry to find edges of the geometry and renders them
 * as a LineSegments mesh with the specified color.
 *
 * @param geometry - Source geometry to outline
 * @param config - Outline configuration
 */
export function createOutlineMesh(
  geometry: THREE.BufferGeometry,
  config: OutlineConfig,
): THREE.LineSegments {
  // Create edges geometry from the source
  const edgesGeometry = new THREE.EdgesGeometry(geometry, 15); // 15 degree threshold

  // Parse color
  const color = new THREE.Color(config.color);

  // Create line material
  const lineMaterial = new THREE.LineBasicMaterial({
    color: color,
    linewidth: config.width, // Note: linewidth > 1 only works on some platforms
    transparent: true,
    opacity: config.visible === false ? 0 : 1,
  });

  // Create line segments mesh
  const outline = new THREE.LineSegments(edgesGeometry, lineMaterial);
  outline.name = "text-outline";

  return outline;
}

/**
 * Create a back-face outline (renders only back faces scaled up).
 *
 * This technique creates a "halo" effect by rendering a slightly larger
 * version of the geometry with only back faces visible.
 *
 * @param geometry - Source geometry
 * @param config - Outline configuration
 * @param scale - Scale factor for the outline (default 1.03)
 */
export function createBackFaceOutline(
  geometry: THREE.BufferGeometry,
  config: OutlineConfig,
  scale: number = 1.03,
): THREE.Mesh {
  // Clone geometry
  const outlineGeometry = geometry.clone();

  // Scale slightly larger
  outlineGeometry.scale(scale, scale, scale);

  // Parse color
  const color = new THREE.Color(config.color);

  // Create material that only renders back faces
  const outlineMaterial = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.BackSide,
    transparent: true,
    opacity: config.visible === false ? 0 : 1,
  });

  // Create outline mesh
  const outlineMesh = new THREE.Mesh(outlineGeometry, outlineMaterial);
  outlineMesh.name = "text-outline-backface";

  return outlineMesh;
}

/**
 * Create a shader-based outline (requires custom shader).
 *
 * This is the most accurate method but requires WebGL2 and custom shaders.
 * Falls back to edge-based outline on older browsers.
 */
export function createShaderOutline(
  geometry: THREE.BufferGeometry,
  config: OutlineConfig,
): THREE.Mesh | THREE.LineSegments {
  // For now, use edge-based outline as fallback
  // Full shader implementation would require:
  // 1. Vertex shader that expands vertices along normals
  // 2. Fragment shader that renders solid color
  // 3. Proper normal calculation for extruded geometry

  return createOutlineMesh(geometry, config);
}

// =============================================================================
// Outline Utilities
// =============================================================================

/**
 * Add outline to an existing mesh group.
 *
 * @param group - Group containing text meshes
 * @param config - Outline configuration
 */
export function addOutlineToGroup(
  group: THREE.Group,
  config: OutlineConfig,
): void {
  // Traverse all meshes in the group
  const meshes: THREE.Mesh[] = [];
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      meshes.push(child);
    }
  });

  // Add outline to each mesh
  for (const mesh of meshes) {
    const outline = createBackFaceOutline(mesh.geometry, config);
    outline.position.copy(mesh.position);
    outline.rotation.copy(mesh.rotation);
    outline.scale.copy(mesh.scale);
    group.add(outline);
  }
}

/**
 * Update outline color.
 */
export function updateOutlineColor(
  outline: THREE.LineSegments | THREE.Mesh,
  color: string,
): void {
  const material = outline.material as THREE.LineBasicMaterial | THREE.MeshBasicMaterial;
  material.color.set(color);
}

/**
 * Update outline visibility.
 */
export function updateOutlineVisibility(
  outline: THREE.LineSegments | THREE.Mesh,
  visible: boolean,
): void {
  outline.visible = visible;
}

/**
 * Dispose outline resources.
 */
export function disposeOutline(outline: THREE.LineSegments | THREE.Mesh): void {
  outline.geometry.dispose();
  if (outline.material instanceof THREE.Material) {
    outline.material.dispose();
  }
}
