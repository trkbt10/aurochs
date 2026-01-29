/**
 * @file Custom Bevel Geometry Generation
 *
 * Implements ECMA-376 compliant bevel geometry without relying on
 * Three.js ExtrudeGeometry's bevel functionality.
 *
 * ## Why Custom Implementation?
 *
 * Three.js ExtrudeGeometry has limitations:
 * 1. bevelSize expands outward (ECMA-376 requires inset bevels)
 * 2. Negative bevelOffset causes artifacts with shapes containing holes
 * 3. Limited control over bevel profile curves
 * 4. Cannot have independent bevelT and bevelB configurations
 *
 * ## Architecture
 *
 * The core bevel logic is Three.js independent (see ./bevel/ directory):
 * - types.ts: Core type definitions
 * - profiles.ts: ECMA-376 bevel profile definitions
 * - path-extraction.ts: Path extraction with normals
 * - mesh-generation.ts: Mesh geometry generation
 * - three-adapter.ts: Three.js conversion layer
 *
 * This file provides the high-level API using the Three.js integration layer.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.9 (ST_BevelPresetType)
 * @see ECMA-376 Part 1, Section 20.1.5.1 (bevelT/bevelB)
 */

import * as THREE from "three";

// Re-export core types and profiles from Three.js independent modules
export type {
  BevelProfilePoint,
  BevelProfile,
  BevelMeshConfig,
} from "./bevel/types";

export {
  ANGLE_PROFILE,
  CIRCLE_PROFILE,
  SOFT_ROUND_PROFILE,
  CONVEX_PROFILE,
  RELAXED_INSET_PROFILE,
  SLOPE_PROFILE,
  HARD_EDGE_PROFILE,
  CROSS_PROFILE,
  ART_DECO_PROFILE,
  DIVOT_PROFILE,
  RIBLET_PROFILE,
  COOL_SLANT_PROFILE,
  BEVEL_PROFILES,
  getBevelProfile,
} from "./bevel/profiles";

// Import Three.js independent modules
import { extractBevelPathsFromShape } from "./bevel/path-extraction";
import { generateBevelMesh, mergeBevelGeometries } from "./bevel/mesh-generation";
import type { BevelGeometryData } from "./bevel/types";
import { threeShapeToShapeInput, bevelGeometryDataToThreeGeometry } from "./bevel/three-adapter";
import { getBevelProfile } from "./bevel/profiles";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Merge multiple geometry datas or return single.
 */
function getMergedGeometryData(datas: BevelGeometryData[]): BevelGeometryData {
  if (datas.length === 1) {
    return datas[0];
  }
  return mergeBevelGeometries(datas);
}

// =============================================================================
// High-Level API
// =============================================================================

/**
 * Create complete bevel geometry for a shape with front and/or back bevels.
 *
 * This is the main entry point for custom bevel generation.
 * Uses the Three.js independent bevel modules with adapter layer.
 *
 * **Coordinate system note:**
 * The geometry created here will be translated by -extrusionDepth in
 * createAsymmetricExtrudedGeometry to fix Z orientation. Therefore:
 * - Front bevel is created at Z=extrusionDepth (becomes Z=0 after translate)
 * - Back bevel is created at Z=0 (becomes Z=-extrusionDepth after translate)
 *
 * After translate(-extrusionDepth):
 * - Front face is at Z=0 (closest to camera)
 * - Back face is at Z=-extrusionDepth (farthest from camera)
 * - Front bevel extends from Z=0 towards positive Z (towards camera)
 * - Back bevel extends from Z=-extrusionDepth towards negative Z (away from camera)
 *
 * This approach provides:
 * - True inset bevels (no shape expansion)
 * - Independent bevelT/bevelB configurations
 * - Full ECMA-376 preset profile support
 * - No artifacts with shapes containing holes
 * - Automatic clamping to prevent oversize bevels
 *
 * @param shape - THREE.Shape to generate bevel for
 * @param options - Bevel options
 * @returns Combined BufferGeometry for front and back bevels
 *
 * @see ECMA-376 Part 1, Section 20.1.5.1 (bevelT/bevelB)
 */
export function createCustomBevelGeometry(
  shape: THREE.Shape,
  options: {
    /** Front bevel (bevelT) configuration */
    readonly front?: {
      readonly width: number;
      readonly height: number;
      readonly preset: string;
    };
    /** Back bevel (bevelB) configuration */
    readonly back?: {
      readonly width: number;
      readonly height: number;
      readonly preset: string;
    };
    /** Total extrusion depth */
    readonly extrusionDepth: number;
  },
): THREE.BufferGeometry {
  // Convert THREE.Shape to Three.js independent ShapeInput
  const shapeInput = threeShapeToShapeInput(shape);

  // Extract paths using Three.js independent module
  const paths = extractBevelPathsFromShape(shapeInput);

  if (paths.length === 0) {
    return new THREE.BufferGeometry();
  }

  const geometryDatas = [];

  // Front bevel (bevelT):
  // Created at Z=extrusionDepth, going towards +Z
  // After translate(-extrusionDepth): Z=0, going towards +Z (towards camera)
  if (options.front) {
    const frontData = generateBevelMesh(paths, {
      width: options.front.width,
      height: options.front.height,
      profile: getBevelProfile(options.front.preset),
      zPosition: options.extrusionDepth,
      zDirection: 1,
    });
    geometryDatas.push(frontData);
  }

  // Back bevel (bevelB):
  // Created at Z=0, going towards -Z
  // After translate(-extrusionDepth): Z=-extrusionDepth, going towards -Z (away from camera)
  if (options.back) {
    const backData = generateBevelMesh(paths, {
      width: options.back.width,
      height: options.back.height,
      profile: getBevelProfile(options.back.preset),
      zPosition: 0,
      zDirection: -1,
    });
    geometryDatas.push(backData);
  }

  if (geometryDatas.length === 0) {
    return new THREE.BufferGeometry();
  }

  // Merge geometry data if multiple bevels
  const mergedData = getMergedGeometryData(geometryDatas);

  // Convert to Three.js BufferGeometry
  return bevelGeometryDataToThreeGeometry(mergedData);
}
