/**
 * @file Three.js Adapter for Shape Offset/Expansion
 *
 * Provides Three.js Shape API for the pure shape expansion module.
 * This is the adapter layer that converts between Three.js types and
 * the renderer-agnostic pure geometry types.
 *
 * ## Architecture
 *
 * - Pure logic: `./pure/shape-offset.ts` (no dependencies)
 * - This file: Three.js adapter (converts THREE.Shape ↔ ShapeData)
 *
 * @see ECMA-376 Part 1, Section 20.1.5.9 (sp3d contourW)
 */

import * as THREE from "three";
import type { ShapeData } from "./pure/types";
import { point2d, shapeWithHoles } from "./pure/types";
import {
  expandShapeData,
  createExpandedShapesForContour as createExpandedShapesForContourPure,
} from "./pure/shape-offset";

// =============================================================================
// Type Conversion: THREE.Shape ↔ ShapeData
// =============================================================================

/**
 * Convert THREE.Shape to ShapeData
 *
 * @param shape - Three.js Shape
 * @param divisions - Number of curve divisions (default: 12)
 * @returns Pure ShapeData
 */
export function threeShapeToShapeData(
  shape: THREE.Shape,
  divisions = 12,
): ShapeData {
  const points = shape.getPoints(divisions).map((p) => point2d(p.x, p.y));
  const holes = shape.holes.map((hole) =>
    hole.getPoints(divisions).map((p) => point2d(p.x, p.y))
  );
  return shapeWithHoles(points, holes);
}

/**
 * Convert ShapeData to THREE.Shape
 *
 * @param data - Pure ShapeData
 * @returns Three.js Shape
 */
export function shapeDataToThreeShape(data: ShapeData): THREE.Shape {
  const shape = new THREE.Shape();

  if (data.points.length > 0) {
    shape.moveTo(data.points[0].x, data.points[0].y);
    for (let i = 1; i < data.points.length; i++) {
      shape.lineTo(data.points[i].x, data.points[i].y);
    }
    shape.closePath();
  }

  for (const holePoints of data.holes) {
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

// =============================================================================
// Three.js API (uses pure module internally)
// =============================================================================

/**
 * Expand a THREE.Shape outward by a specified distance.
 *
 * Uses the pure shape expansion algorithm internally.
 *
 * @param shape - The original shape to expand
 * @param distance - Distance to expand outward (contour width)
 * @returns Expanded shape, or null if expansion fails
 */
export function expandShape(
  shape: THREE.Shape,
  distance: number,
): THREE.Shape | null {
  // Convert to pure type
  const shapeData = threeShapeToShapeData(shape);

  // Use pure expansion
  const expandedData = expandShapeData(shapeData, distance);

  if (!expandedData) {
    return null;
  }

  // Convert back to Three.js
  return shapeDataToThreeShape(expandedData);
}

/**
 * Create expanded THREE.Shapes for contour effect.
 *
 * This creates proper contour shapes by:
 * 1. Expanding the 2D shape by contour width
 * 2. Shrinking holes by the same amount
 *
 * @param shapes - Original shapes
 * @param contourWidth - Width of the contour in pixels
 * @returns Array of expanded shapes ready for extrusion
 */
export function createExpandedShapesForContour(
  shapes: THREE.Shape[],
  contourWidth: number,
): THREE.Shape[] {
  // Convert to pure types
  const shapeDataArray = shapes.map((s) => threeShapeToShapeData(s));

  // Use pure expansion
  const expandedDataArray = createExpandedShapesForContourPure(shapeDataArray, contourWidth);

  // Convert back to Three.js
  return expandedDataArray.map(shapeDataToThreeShape);
}

// =============================================================================
// Re-exports from pure module (for direct pure usage)
// =============================================================================

export {
  expandContourPoints,
  expandShapeData,
  isValidWinding,
  reverseWinding,
  normalizeShapeWinding,
} from "./pure/shape-offset";
