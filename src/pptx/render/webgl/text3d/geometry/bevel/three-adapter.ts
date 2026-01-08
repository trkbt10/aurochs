/**
 * @file Three.js Adapter for Bevel Geometry
 *
 * Provides conversion functions between Three.js types and the
 * Three.js-independent bevel geometry types.
 *
 * This is the only file in the bevel/ directory that depends on Three.js.
 */

import * as THREE from "three";
import type {
  Vector2,
  ShapeInput,
  BevelGeometryData,
  BevelMeshConfig,
  BevelProfile,
} from "./types";
import { vec2 } from "./types";
import { generateExtrusion, mergeExtrusionGeometries, generateCapAtZ } from "./extrusion";
import { extractBevelPathsFromShape } from "./path-extraction";
import { generateBevelMesh, mergeBevelGeometries } from "./mesh-generation";
import { getBevelProfile } from "./profiles";
import { shrinkShape } from "./shape-expansion";

// =============================================================================
// THREE.Shape → ShapeInput Conversion
// =============================================================================

/**
 * Convert a THREE.Shape to a ShapeInput.
 *
 * Extracts points from the shape and its holes using the specified
 * number of curve divisions.
 *
 * @param shape - Three.js Shape to convert
 * @param divisions - Number of divisions per curve segment (default: 12)
 * @returns ShapeInput with extracted points
 */
export function threeShapeToShapeInput(
  shape: THREE.Shape,
  divisions = 12,
): ShapeInput {
  const points = threeVector2ArrayToVector2Array(shape.getPoints(divisions));

  const holes = shape.holes.map((hole) =>
    threeVector2ArrayToVector2Array(hole.getPoints(divisions)),
  );

  return { points, holes };
}

/**
 * Convert array of THREE.Vector2 to array of Vector2
 */
function threeVector2ArrayToVector2Array(
  points: THREE.Vector2[],
): readonly Vector2[] {
  return points.map((p) => vec2(p.x, p.y));
}

// =============================================================================
// BevelGeometryData → THREE.BufferGeometry Conversion
// =============================================================================

/**
 * Convert BevelGeometryData to THREE.BufferGeometry.
 *
 * Creates a BufferGeometry with position, normal, and uv attributes.
 *
 * @param data - Raw geometry data
 * @returns Three.js BufferGeometry
 */
export function bevelGeometryDataToThreeGeometry(
  data: BevelGeometryData,
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(data.positions, 3),
  );
  geometry.setAttribute(
    "normal",
    new THREE.BufferAttribute(data.normals, 3),
  );
  geometry.setAttribute(
    "uv",
    new THREE.BufferAttribute(data.uvs, 2),
  );

  if (data.indices.length > 0) {
    geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
  }

  return geometry;
}

// =============================================================================
// ShapeInput → THREE.Shape Conversion
// =============================================================================

/**
 * Convert a ShapeInput back to THREE.Shape.
 *
 * Useful for converting expanded shapes back to Three.js format
 * for use with ExtrudeGeometry or other Three.js operations.
 *
 * @param input - ShapeInput to convert
 * @returns Three.js Shape
 */
export function shapeInputToThreeShape(input: ShapeInput): THREE.Shape {
  const shape = new THREE.Shape();

  if (input.points.length > 0) {
    shape.moveTo(input.points[0].x, input.points[0].y);
    for (let i = 1; i < input.points.length; i++) {
      shape.lineTo(input.points[i].x, input.points[i].y);
    }
    shape.closePath();
  }

  for (const holePoints of input.holes) {
    if (holePoints.length > 0) {
      const hole = new THREE.Path();
      hole.moveTo(holePoints[0].x, holePoints[0].y);
      for (let i = 1; i < holePoints.length; i++) {
        hole.lineTo(holePoints[i].x, holePoints[i].y);
      }
      hole.closePath();
      shape.holes.push(hole);
    }
  }

  return shape;
}

/**
 * Convert multiple ShapeInputs to THREE.Shapes.
 *
 * @param inputs - Array of ShapeInputs to convert
 * @returns Array of Three.js Shapes
 */
export function shapeInputsToThreeShapes(inputs: readonly ShapeInput[]): THREE.Shape[] {
  return inputs.map(shapeInputToThreeShape);
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Convert a single THREE.Vector2 to Vector2
 */
export function threeVector2ToVector2(v: THREE.Vector2): Vector2 {
  return vec2(v.x, v.y);
}

/**
 * Convert a Vector2 to THREE.Vector2
 */
export function vector2ToThreeVector2(v: Vector2): THREE.Vector2 {
  return new THREE.Vector2(v.x, v.y);
}

// =============================================================================
// Asymmetric Extrusion with Bevel (Three.js Independent Core)
// =============================================================================

/**
 * Bevel configuration for extrusion
 * @see ECMA-376 Part 1, Section 20.1.5.1 (bevelT/bevelB)
 */
export type BevelSpec = {
  /** Bevel width (inset amount) */
  readonly width: number;
  /** Bevel height (depth amount) */
  readonly height: number;
  /** Bevel preset type for profile selection */
  readonly preset: string;
};

/**
 * Asymmetric bevel configuration for ECMA-376 compliant extrusion.
 * Supports separate top (front) and bottom (back) bevels.
 * @see ECMA-376 Part 1, Section 20.1.5.9 (sp3d)
 */
export type AsymmetricBevelSpec = {
  /** Front face bevel (bevelT in ECMA-376) */
  readonly top?: BevelSpec;
  /** Back face bevel (bevelB in ECMA-376) */
  readonly bottom?: BevelSpec;
};

/**
 * Create extruded 3D geometry with asymmetric bevels.
 *
 * Uses Three.js independent core to avoid the z-fighting issue that occurred
 * with THREE.ExtrudeGeometry (which always created front/back caps that
 * overlapped with bevel surfaces).
 *
 * Key behavior: When bevel is present on a face, the corresponding cap is
 * OMITTED from the extrusion, and a bevel surface is generated instead.
 *
 * @param shapes - Three.js shapes to extrude
 * @param extrusionDepth - Depth of extrusion
 * @param bevel - Asymmetric bevel configuration
 * @returns Three.js BufferGeometry
 */
export function createExtrudedGeometryWithBevel(
  shapes: THREE.Shape[],
  extrusionDepth: number,
  bevel: AsymmetricBevelSpec,
): THREE.BufferGeometry {
  if (shapes.length === 0) {
    return new THREE.BufferGeometry();
  }

  const geometryDataList: BevelGeometryData[] = [];

  // Clamp bevel heights to prevent exceeding extrusion depth
  const maxBevelRatio = bevel.top && bevel.bottom ? 0.45 : 0.9;
  const maxBevelHeight = extrusionDepth * maxBevelRatio;

  const topBevelHeight = bevel.top
    ? Math.min(bevel.top.height, maxBevelHeight)
    : 0;
  const bottomBevelHeight = bevel.bottom
    ? Math.min(bevel.bottom.height, maxBevelHeight)
    : 0;

  // Process each shape
  for (const shape of shapes) {
    const shapeInput = threeShapeToShapeInput(shape);

    // Generate extrusion with selective cap omission
    // - Omit front cap if top bevel is present (front cap would overlap with bevel)
    // - Omit back cap if bottom bevel is present
    const extrusionData = generateExtrusion(shapeInput, {
      depth: extrusionDepth,
      includeFrontCap: !bevel.top, // Omit if bevel present
      includeBackCap: !bevel.bottom,
    });

    geometryDataList.push(extrusionData);

    // Generate top bevel (front face, at Z=depth)
    if (bevel.top && topBevelHeight > 0) {
      const topProfile = getBevelProfile(bevel.top.preset) ?? getBevelProfile("circle")!;
      const topPaths = extractBevelPathsFromShape(shapeInput);

      const topBevelConfig: BevelMeshConfig = {
        width: bevel.top.width,
        height: topBevelHeight,
        profile: topProfile,
        zPosition: extrusionDepth, // Start at front face
        zDirection: -1, // Bevel goes inward (-Z direction)
      };

      const topBevelData = generateBevelMesh(topPaths, topBevelConfig);
      geometryDataList.push(topBevelData);

      // Generate inner cap at recessed position (after bevel inset)
      // This covers the flat face inside the bevel
      const shrunkShape = shrinkShape(shapeInput, bevel.top.width);
      if (shrunkShape && shrunkShape.points.length >= 3) {
        const innerCapZ = extrusionDepth - topBevelHeight;
        const innerCapData = generateCapAtZ(shrunkShape, {
          zPosition: innerCapZ,
          normalDirection: 1, // Front-facing (+Z)
        });
        geometryDataList.push(innerCapData);
      }
    }

    // Generate bottom bevel (back face, at Z=0)
    if (bevel.bottom && bottomBevelHeight > 0) {
      const bottomProfile = getBevelProfile(bevel.bottom.preset) ?? getBevelProfile("circle")!;
      const bottomPaths = extractBevelPathsFromShape(shapeInput);

      const bottomBevelConfig: BevelMeshConfig = {
        width: bevel.bottom.width,
        height: bottomBevelHeight,
        profile: bottomProfile,
        zPosition: 0, // Start at back face
        zDirection: 1, // Bevel goes outward (+Z direction)
      };

      const bottomBevelData = generateBevelMesh(bottomPaths, bottomBevelConfig);
      geometryDataList.push(bottomBevelData);

      // Generate inner cap at recessed position (after bevel inset)
      // This covers the flat face inside the bevel
      const shrunkShape = shrinkShape(shapeInput, bevel.bottom.width);
      if (shrunkShape && shrunkShape.points.length >= 3) {
        const innerCapZ = bottomBevelHeight;
        const innerCapData = generateCapAtZ(shrunkShape, {
          zPosition: innerCapZ,
          normalDirection: -1, // Back-facing (-Z)
        });
        geometryDataList.push(innerCapData);
      }
    }
  }

  // Merge all geometry data
  const mergedData = mergeBevelGeometries(geometryDataList);

  // Convert to Three.js BufferGeometry
  const geometry = bevelGeometryDataToThreeGeometry(mergedData);

  // Translate so front face is at Z=0 (matching old behavior)
  const translateZ = -(extrusionDepth);
  translateGeometryZ(geometry, translateZ);

  return geometry;
}

/**
 * Translate geometry along Z axis
 */
function translateGeometryZ(geometry: THREE.BufferGeometry, z: number): void {
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  if (!positions) return;

  for (let i = 0; i < positions.count; i++) {
    positions.setZ(i, positions.getZ(i) + z);
  }

  positions.needsUpdate = true;
}
