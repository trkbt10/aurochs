/**
 * @file Bevel Geometry Module - Public API
 *
 * This module provides ECMA-376 compliant bevel geometry generation.
 * The core logic is Three.js independent, with optional Three.js integration.
 *
 * ## Architecture
 *
 * - types.ts: Core type definitions (Three.js independent)
 * - profiles.ts: ECMA-376 bevel profile definitions (Three.js independent)
 * - path-extraction.ts: Path extraction with normals (Three.js independent)
 * - mesh-generation.ts: Mesh geometry generation (Three.js independent)
 * - three-adapter.ts: Three.js conversion functions
 *
 * ## Usage
 *
 * ### Three.js Independent
 * ```typescript
 * import { extractBevelPathsFromShape, generateBevelMesh, getBevelProfile } from './bevel';
 *
 * const paths = extractBevelPathsFromShape({ points, holes: [] });
 * const geometry = generateBevelMesh(paths, {
 *   width: 2,
 *   height: 1,
 *   profile: getBevelProfile('circle'),
 *   zPosition: 0,
 *   zDirection: 1,
 * });
 * ```
 *
 * ### With Three.js
 * ```typescript
 * import {
 *   threeShapeToShapeInput,
 *   bevelGeometryDataToThreeGeometry,
 *   extractBevelPathsFromShape,
 *   generateBevelMesh,
 * } from './bevel';
 *
 * const shapeInput = threeShapeToShapeInput(threeShape);
 * const paths = extractBevelPathsFromShape(shapeInput);
 * const geometryData = generateBevelMesh(paths, config);
 * const threeGeometry = bevelGeometryDataToThreeGeometry(geometryData);
 * ```
 *
 * @see ECMA-376 Part 1, Section 20.1.5.1 (bevelT/bevelB)
 * @see ECMA-376 Part 1, Section 20.1.10.9 (ST_BevelPresetType)
 */

// =============================================================================
// Core Types (Three.js Independent)
// =============================================================================

export type {
  Vector2,
  BevelPathPoint,
  BevelPath,
  BevelProfilePoint,
  BevelProfile,
  BevelMeshConfig,
  BevelGeometryData,
  ShapeInput,
} from "./types";

export { vec2, Vec2, emptyGeometryData } from "./types";

// =============================================================================
// Profiles (Three.js Independent)
// =============================================================================

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
} from "./profiles";

// =============================================================================
// Path Extraction (Three.js Independent)
// =============================================================================

export {
  computeSignedArea,
  extractPathPointsWithNormals,
  extractBevelPathsFromShape,
} from "./path-extraction";

// =============================================================================
// Mesh Generation (Three.js Independent)
// =============================================================================

export { generateBevelMesh, mergeBevelGeometries } from "./mesh-generation";

// =============================================================================
// Extrusion Generation (Three.js Independent)
// =============================================================================

export {
  generateExtrusion,
  mergeExtrusionGeometries,
  type ExtrusionConfig,
} from "./extrusion";

// =============================================================================
// Shape Expansion for Contour (Three.js Independent)
// =============================================================================

export { expandShape, expandShapesForContour } from "./shape-expansion";

// =============================================================================
// Three.js Adapter
// =============================================================================
// NOTE: Three.js adapter functions are NOT re-exported here to maintain
// Three.js independence. Import directly from "./three-adapter" when needed:
//
// import { threeShapeToShapeInput, bevelGeometryDataToThreeGeometry } from "./bevel/three-adapter";
//
