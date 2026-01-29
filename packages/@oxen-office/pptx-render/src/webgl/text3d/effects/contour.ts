/**
 * @file 3D Text Contour Effect
 *
 * Implements the contour (outline shell) effect for 3D extruded text.
 * Contour creates a 3D offset shell around the extruded geometry.
 *
 * ## Implementation Approaches
 *
 * 1. **Shape Expansion (Correct)**: Expand 2D shape before extrusion.
 *    Creates proper uniform contour with bevels preserved.
 *    Use `createContourFromShapes` for this approach.
 *
 * 2. **Uniform Scaling (Legacy)**: Scale 3D geometry uniformly.
 *    Distorts bevels and gives non-uniform contour width.
 *    Kept for backwards compatibility.
 *
 * 3. **Normal Expansion (Approximate)**: Expand along vertex normals.
 *    Better than scaling but still not uniform for complex geometry.
 *
 * @see ECMA-376 Part 1, Section 20.1.5.9 (sp3d contourW/contourClr)
 */

import * as THREE from "three";
// Use Three.js independent shape expansion from bevel module
import { expandShapesForContour } from "../geometry/bevel/shape-expansion";
import {
  threeShapeToShapeInput,
  shapeInputsToThreeShapes,
  createExtrudedGeometryWithBevel,
  type AsymmetricBevelSpec,
} from "../geometry/bevel/three-adapter";
import { type AsymmetricBevelConfig } from "../geometry/bevel";

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
 * Coordinate scale factor used by the main mesh for unit conversion.
 * Contour mesh must use the same scale to appear correctly.
 *
 * @param geometry - Source geometry to create contour for
 * @param config - Contour configuration
 * @param coordinateScale - Scale factor applied to main mesh (default 1/96)
 * @returns Contour mesh positioned behind the main mesh
 */
export function createContourMesh(
  geometry: THREE.BufferGeometry,
  config: ContourConfig,
  coordinateScale = 1 / 96,
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

  // Flip normals so lighting works correctly with FrontSide rendering
  // The expanded geometry faces outward, so normals should point outward
  contourGeometry.computeVertexNormals();

  // Create contour material
  const contourColor = new THREE.Color(config.color);
  const contourMaterial = new THREE.MeshStandardMaterial({
    color: contourColor,
    roughness: 0.5,
    metalness: 0.1,
    side: THREE.FrontSide, // Use FrontSide for correct lighting on outer shell
  });

  // Create contour mesh
  const contourMesh = new THREE.Mesh(contourGeometry, contourMaterial);
  contourMesh.name = "text-contour";

  // Apply same coordinate scale as main mesh
  contourMesh.scale.set(coordinateScale, coordinateScale, coordinateScale);

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
 * @param coordinateScale - Scale factor applied to main mesh (default 1/96)
 */
export function createContourMeshExpanded(
  geometry: THREE.BufferGeometry,
  config: ContourConfig,
  coordinateScale = 1 / 96,
): THREE.Mesh {
  // Clone and expand geometry along normals
  const contourGeometry = geometry.clone();

  // Get position and normal attributes
  const positions = contourGeometry.getAttribute("position");
  const normals = contourGeometry.getAttribute("normal");

  if (!positions || !normals) {
    // Fallback to scale method if normals not available
    return createContourMesh(geometry, config, coordinateScale);
  }

  // Compute normals if not present
  contourGeometry.computeVertexNormals();
  const computedNormals = contourGeometry.getAttribute("normal");

  // Expand vertices along normals by contour width
  // Note: contour width is in pixels (same as geometry), no conversion needed here
  const expandedPositions = new Float32Array(positions.count * 3);
  const contourWidth = config.width;

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
  // Recompute normals for expanded geometry
  contourGeometry.computeVertexNormals();

  // Create contour material with FrontSide for correct lighting
  const contourColor = new THREE.Color(config.color);
  const contourMaterial = new THREE.MeshStandardMaterial({
    color: contourColor,
    roughness: 0.5,
    metalness: 0.1,
    side: THREE.FrontSide,
  });

  const contourMesh = new THREE.Mesh(contourGeometry, contourMaterial);
  contourMesh.name = "text-contour-expanded";

  // Apply same coordinate scale as main mesh
  contourMesh.scale.set(coordinateScale, coordinateScale, coordinateScale);

  contourMesh.renderOrder = -1;

  return contourMesh;
}

// =============================================================================
// Shape Expansion Method (Correct)
// =============================================================================

/**
 * Configuration for shape-based contour creation.
 */
export type ContourFromShapesConfig = {
  /** Contour width in pixels */
  readonly width: number;
  /** Contour color (hex string) */
  readonly color: string;
  /** Extrusion depth (must match main geometry) */
  readonly extrusionDepth: number;
  /** Bevel configuration (must match main geometry) */
  readonly bevel?: AsymmetricBevelConfig;
};

/**
 * Create contour geometry by expanding 2D shapes before extrusion.
 *
 * This is the CORRECT method for creating contours with beveled geometry.
 * It expands the 2D shape outline by contourWidth, then extrudes with
 * the same bevel configuration as the main geometry.
 *
 * Uses Three.js independent shape expansion from bevel/shape-expansion.ts.
 *
 * Result: A shell that uniformly surrounds the original geometry with
 * consistent contour width on all surfaces including bevels.
 *
 * @param shapes - Original shapes (same as used for main geometry)
 * @param config - Contour configuration
 * @param coordinateScale - Scale factor for rendering
 * @returns Contour mesh ready for rendering
 */
export function createContourFromShapes(
  shapes: THREE.Shape[],
  config: ContourFromShapesConfig,
  coordinateScale = 1 / 96,
): THREE.Mesh {
  // Convert THREE.Shape to Three.js independent ShapeInput
  const shapeInputs = shapes.map((s) => threeShapeToShapeInput(s));

  // Expand shapes using Three.js independent implementation
  const expandedInputs = expandShapesForContour(shapeInputs, config.width);

  if (expandedInputs.length === 0) {
    // Fallback: return empty mesh
    return new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial(),
    );
  }

  // Convert back to THREE.Shape for extrusion
  const expandedShapes = shapeInputsToThreeShapes(expandedInputs);

  // Convert bevel config to new spec format
  const bevelSpec: AsymmetricBevelSpec = convertBevelConfigToSpec(config.bevel);

  // Create extruded geometry with same bevel as main geometry
  // Uses Three.js independent core to avoid z-fighting
  const contourGeometry = createExtrudedGeometryWithBevel(
    expandedShapes,
    config.extrusionDepth,
    bevelSpec,
  );

  // Create contour material
  const contourColor = new THREE.Color(config.color);
  const contourMaterial = new THREE.MeshStandardMaterial({
    color: contourColor,
    roughness: 0.5,
    metalness: 0.1,
    side: THREE.FrontSide,
  });

  // Create contour mesh
  const contourMesh = new THREE.Mesh(contourGeometry, contourMaterial);
  contourMesh.name = "text-contour-shape-expanded";

  // Apply coordinate scale
  contourMesh.scale.set(coordinateScale, coordinateScale, coordinateScale);

  // Render order: contour should render before main mesh
  contourMesh.renderOrder = -1;

  return contourMesh;
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Convert AsymmetricBevelConfig to AsymmetricBevelSpec.
 * The old config uses BevelConfig with thickness/size/segments,
 * while the new spec uses width/height/preset directly.
 */
function convertBevelConfigToSpec(
  bevel: AsymmetricBevelConfig | undefined,
): AsymmetricBevelSpec {
  if (!bevel) {
    return { top: undefined, bottom: undefined };
  }

  return {
    top: convertSingleBevelConfigToSpec(bevel.top),
    bottom: convertSingleBevelConfigToSpec(bevel.bottom),
  };
}

type SingleBevelConfig = NonNullable<AsymmetricBevelConfig["top"]>;
type SingleBevelSpec = NonNullable<AsymmetricBevelSpec["top"]>;

function convertSingleBevelConfigToSpec(bevel: SingleBevelConfig | undefined): SingleBevelSpec | undefined {
  if (!bevel) {
    return undefined;
  }
  // Note: BevelConfig has { thickness, size, segments }
  // BevelSpec expects { width, height, preset }
  // Since we don't have the original preset, we approximate using "circle"
  // and use the thickness as height, size as width
  return {
    width: bevel.size,
    height: bevel.thickness,
    preset: "circle",
  };
}

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
