/**
 * @file Pure Geometry Module
 *
 * Renderer-agnostic geometry utilities. All functions in this module
 * are independent of any rendering library (Three.js, WebGPU, etc.).
 *
 * ## Usage
 *
 * ```typescript
 * import {
 *   // Types
 *   Point2D, Point3D, ShapeData, GeometryData,
 *   // Shape operations
 *   expandShapeData, createExpandedShapesForContour,
 *   // Geometry operations
 *   mergeGeometries, computeBoundingBox,
 * } from './pure';
 * ```
 *
 * ## Conversion to Renderer Types
 *
 * For Three.js, use the adapter functions in `../three-adapter.ts`:
 * - `shapeDataToThreeShape()` - ShapeData → THREE.Shape
 * - `geometryDataToThreeGeometry()` - GeometryData → THREE.BufferGeometry
 *
 * @see ECMA-376 Part 1, Section 20.1.5 (3D Properties)
 */

// =============================================================================
// Types
// =============================================================================

export type {
  Point2D,
  Point3D,
  ShapeData,
  GeometryData,
  BoundingBox3D,
  ExtendedGeometryData,
} from "./types";

export {
  point2d,
  point3d,
  emptyShape,
  shapeFromPoints,
  shapeWithHoles,
  emptyGeometry,
  getVertexCount,
  getTriangleCount,
  isGeometryEmpty,
  computeBoundingBox,
  getBoundingBoxSize,
  getBoundingBoxCenter,
  extendGeometry,
} from "./types";

// =============================================================================
// Geometry Merging
// =============================================================================

export {
  mergeGeometries,
  mergeExtendedGeometries,
} from "./merge";

// =============================================================================
// Shape Operations
// =============================================================================

export {
  expandContourPoints,
  expandShapeData,
  createExpandedShapesForContour,
  isValidWinding,
  reverseWinding,
  normalizeShapeWinding,
} from "./shape-offset";
