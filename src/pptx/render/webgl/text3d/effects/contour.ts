/**
 * @file 3D Text Contour Effect
 *
 * Implements the contour (outline shell) effect for 3D extruded text.
 * Contour creates a 3D offset shell around the extruded geometry.
 *
 * @see ECMA-376 Part 1, Section 20.1.5.9 (sp3d contourW/contourClr)
 */

import * as THREE from "three";

// =============================================================================
// Types
// =============================================================================

/**
 * Contour configuration for 3D text
 * @see ECMA-376 Part 1, Section 20.1.5.9 (sp3d)
 */
export type ContourConfig = {
  /** Contour width in pixels */
  readonly width: number;
  /** Contour color (hex string) */
  readonly color: string;
};

// =============================================================================
// Contour Implementation
// =============================================================================

/**
 * Create a contour mesh by scaling the geometry outward.
 *
 * The contour in ECMA-376 is rendered as a shell around the extruded shape.
 * We achieve this by creating a scaled copy of the geometry rendered behind
 * the main mesh with the contour color.
 *
 * @param geometry - Source geometry to create contour for
 * @param config - Contour configuration
 * @returns Contour mesh positioned behind the main mesh
 */
export function createContourMesh(
  geometry: THREE.BufferGeometry,
  config: ContourConfig,
): THREE.Mesh {
  // Clone geometry for contour
  const contourGeometry = geometry.clone();

  // Calculate scale factor based on contour width
  // The contour width is in pixels, convert to relative scale
  contourGeometry.computeBoundingBox();
  const box = contourGeometry.boundingBox!;
  const size = new THREE.Vector3();
  box.getSize(size);

  // Scale factor: 1 + (contourWidth / averageSize)
  // This creates an outward offset proportional to the contour width
  const avgSize = (size.x + size.y + size.z) / 3;
  const scaleFactor = 1 + (config.width / avgSize);

  // Scale geometry uniformly outward from center
  const center = new THREE.Vector3();
  box.getCenter(center);

  // Translate to origin, scale, translate back
  contourGeometry.translate(-center.x, -center.y, -center.z);
  contourGeometry.scale(scaleFactor, scaleFactor, scaleFactor);
  contourGeometry.translate(center.x, center.y, center.z);

  // Create contour material
  const contourColor = new THREE.Color(config.color);
  const contourMaterial = new THREE.MeshStandardMaterial({
    color: contourColor,
    roughness: 0.5,
    metalness: 0.1,
    side: THREE.BackSide, // Render back faces so it appears behind main mesh
  });

  // Create contour mesh
  const contourMesh = new THREE.Mesh(contourGeometry, contourMaterial);
  contourMesh.name = "text-contour";

  // Render order: contour should render before main mesh
  contourMesh.renderOrder = -1;

  return contourMesh;
}

/**
 * Create a contour using edge expansion (alternative method).
 *
 * This method creates a more accurate contour by expanding edges
 * along their normals. More computationally expensive but more accurate.
 *
 * @param geometry - Source geometry
 * @param config - Contour configuration
 */
export function createContourMeshExpanded(
  geometry: THREE.BufferGeometry,
  config: ContourConfig,
): THREE.Mesh {
  // Clone and expand geometry along normals
  const contourGeometry = geometry.clone();

  // Get position and normal attributes
  const positions = contourGeometry.getAttribute("position");
  const normals = contourGeometry.getAttribute("normal");

  if (!positions || !normals) {
    // Fallback to scale method if normals not available
    return createContourMesh(geometry, config);
  }

  // Compute normals if not present
  contourGeometry.computeVertexNormals();
  const computedNormals = contourGeometry.getAttribute("normal");

  // Expand vertices along normals by contour width
  const expandedPositions = new Float32Array(positions.count * 3);
  const contourWidth = config.width / 96; // Convert pixels to scene units

  for (let i = 0; i < positions.count; i++) {
    const px = positions.getX(i);
    const py = positions.getY(i);
    const pz = positions.getZ(i);

    const nx = computedNormals.getX(i);
    const ny = computedNormals.getY(i);
    const nz = computedNormals.getZ(i);

    expandedPositions[i * 3] = px + nx * contourWidth;
    expandedPositions[i * 3 + 1] = py + ny * contourWidth;
    expandedPositions[i * 3 + 2] = pz + nz * contourWidth;
  }

  contourGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(expandedPositions, 3),
  );
  contourGeometry.computeVertexNormals();

  // Create contour material
  const contourColor = new THREE.Color(config.color);
  const contourMaterial = new THREE.MeshStandardMaterial({
    color: contourColor,
    roughness: 0.5,
    metalness: 0.1,
    side: THREE.BackSide,
  });

  const contourMesh = new THREE.Mesh(contourGeometry, contourMaterial);
  contourMesh.name = "text-contour-expanded";
  contourMesh.renderOrder = -1;

  return contourMesh;
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Update contour color
 */
export function updateContourColor(contourMesh: THREE.Mesh, color: string): void {
  const material = contourMesh.material as THREE.MeshStandardMaterial;
  material.color.set(color);
}

/**
 * Dispose contour resources
 */
export function disposeContour(contourMesh: THREE.Mesh): void {
  contourMesh.geometry.dispose();
  if (contourMesh.material instanceof THREE.Material) {
    contourMesh.material.dispose();
  }
}
