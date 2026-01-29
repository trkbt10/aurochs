/**
 * @file Pure Shape Offset/Expansion
 *
 * Implements 2D shape expansion for ECMA-376 contour effect.
 * Completely renderer-agnostic - no Three.js dependencies.
 *
 * The contour is created by expanding the shape outline before extrusion,
 * NOT by scaling or expanding the 3D geometry after extrusion.
 *
 * @see ECMA-376 Part 1, Section 20.1.5.9 (sp3d contourW)
 */

import type { Point2D, ShapeData } from "./types";
import { point2d, shapeWithHoles } from "./types";

// =============================================================================
// Vector Operations
// =============================================================================

/**
 * Normalize a 2D vector to unit length
 */
function normalize(v: Point2D): Point2D {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len < 0.0001) {
    return point2d(0, 0);
  }
  return point2d(v.x / len, v.y / len);
}

/**
 * Compute signed area of a polygon (Shoelace formula).
 * Positive = CCW, Negative = CW
 */
function computeSignedArea(points: readonly Point2D[]): number {
  const n = points.length;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const current = points[i];
    const next = points[(i + 1) % n];
    total += current.x * next.y - next.x * current.y;
  }
  return total / 2;
}

/**
 * Compute miter length based on distance and dot product.
 * Handles nearly parallel edges by returning the base distance.
 */
function computeMiterLength(distance: number, dotProduct: number): number {
  if (Math.abs(dotProduct) > 0.1) {
    return distance / dotProduct;
  }
  return distance;
}

// =============================================================================
// Contour Expansion
// =============================================================================

/**
 * Expand a contour (closed polygon) by moving each vertex outward.
 *
 * Uses the miter join method at corners - vertices are moved
 * along the bisector of adjacent edge normals.
 *
 * @param points - Contour points (closed polygon)
 * @param distance - Expansion distance (positive = outward)
 * @param isHole - Whether this is a hole (reverses winding direction)
 * @returns Expanded points, or null if expansion fails
 */
export function expandContourPoints(
  points: readonly Point2D[],
  distance: number,
  isHole: boolean,
): Point2D[] | null {
  const n = points.length;
  if (n < 3) {
    return null;
  }

  // Determine winding direction (CCW = positive area for outer, CW for holes)
  const area = computeSignedArea(points);
  const isCCW = area > 0;

  // For holes, winding is typically CW (negative area)
  // Expansion direction depends on winding
  const normalSign = (isCCW !== isHole) ? 1 : -1;

  const expandedPoints: Point2D[] = [];

  for (let i = 0; i < n; i++) {
    const prevIdx = (i - 1 + n) % n;
    const nextIdx = (i + 1) % n;

    const prev = points[prevIdx];
    const curr = points[i];
    const next = points[nextIdx];

    // Compute edge vectors
    const edge1 = point2d(curr.x - prev.x, curr.y - prev.y);
    const edge2 = point2d(next.x - curr.x, next.y - curr.y);

    // Compute outward normals (perpendicular to edge)
    // For CCW winding, RIGHT perpendicular (90° CW rotation) is outward
    // Rotation 90° CW: (dx, dy) → (dy, -dx)
    const normal1 = normalize(point2d(edge1.y * normalSign, -edge1.x * normalSign));
    const normal2 = normalize(point2d(edge2.y * normalSign, -edge2.x * normalSign));

    // Compute bisector (average of normals)
    const bisector = normalize(point2d(
      normal1.x + normal2.x,
      normal1.y + normal2.y,
    ));

    // Miter length: distance / cos(half angle)
    // cos(half angle) = dot(normal1, bisector)
    const dotProduct = normal1.x * bisector.x + normal1.y * bisector.y;
    const miterLength = computeMiterLength(distance, dotProduct);

    // Clamp miter length to prevent spikes at sharp corners
    const maxMiterLength = distance * 4;
    const clampedMiter = Math.min(Math.abs(miterLength), maxMiterLength) * Math.sign(miterLength);

    expandedPoints.push(point2d(
      curr.x + bisector.x * clampedMiter,
      curr.y + bisector.y * clampedMiter,
    ));
  }

  return expandedPoints;
}

// =============================================================================
// Shape Expansion
// =============================================================================

/**
 * Expand a shape outward by a specified distance.
 *
 * Uses the shape's path points and computes outward normals to
 * offset each vertex. This creates a larger shape that when extruded
 * will form a shell around the original geometry.
 *
 * @param shape - The original shape to expand
 * @param distance - Distance to expand outward (contour width)
 * @returns Expanded shape, or null if expansion fails
 */
export function expandShapeData(
  shape: ShapeData,
  distance: number,
): ShapeData | null {
  if (distance <= 0) {
    // Return a copy
    return shapeWithHoles(
      [...shape.points],
      shape.holes.map(h => [...h]),
    );
  }

  if (shape.points.length < 3) {
    return null;
  }

  // Expand outer contour
  const expandedPoints = expandContourPoints(shape.points, distance, false);
  if (!expandedPoints || expandedPoints.length < 3) {
    return null;
  }

  // Handle holes - they need to be SHRUNK (expanded inward)
  const expandedHoles: Point2D[][] = [];
  for (const hole of shape.holes) {
    // Shrink holes (negative expansion = inward)
    const shrunkHolePoints = expandContourPoints(hole, -distance, true);
    if (shrunkHolePoints && shrunkHolePoints.length >= 3) {
      expandedHoles.push(shrunkHolePoints);
    }
  }

  return shapeWithHoles(expandedPoints, expandedHoles);
}

/**
 * Create expanded shapes for contour effect.
 *
 * This creates proper contour shapes by:
 * 1. Expanding the 2D shape by contour width
 * 2. Shrinking holes by the same amount
 *
 * The result is shapes ready for extrusion that will wrap
 * around the original geometry with uniform contour width.
 *
 * @param shapes - Original shapes
 * @param contourWidth - Width of the contour in pixels
 * @returns Array of expanded shapes ready for extrusion
 */
export function createExpandedShapesForContour(
  shapes: readonly ShapeData[],
  contourWidth: number,
): ShapeData[] {
  const expandedShapes: ShapeData[] = [];

  for (const shape of shapes) {
    const expanded = expandShapeData(shape, contourWidth);
    if (expanded) {
      expandedShapes.push(expanded);
    }
  }

  return expandedShapes;
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Check if a contour has valid winding (CCW for outer, CW for holes)
 */
export function isValidWinding(points: readonly Point2D[], isHole: boolean): boolean {
  const area = computeSignedArea(points);
  // Outer contours should be CCW (positive area)
  // Holes should be CW (negative area)
  return isHole ? area < 0 : area > 0;
}

/**
 * Reverse the winding order of points
 */
export function reverseWinding(points: readonly Point2D[]): Point2D[] {
  return [...points].reverse();
}

/**
 * Ensure correct winding order for a shape
 */
export function normalizeShapeWinding(shape: ShapeData): ShapeData {
  // Ensure outer contour is CCW
  const outerPoints = normalizeWinding(shape.points, false);

  // Ensure holes are CW
  const normalizedHoles = shape.holes.map((hole) => normalizeWinding(hole, true));

  return shapeWithHoles(outerPoints, normalizedHoles);
}

function normalizeWinding(points: readonly Point2D[], isHole: boolean): Point2D[] {
  if (isValidWinding(points, isHole)) {
    return [...points];
  }
  return reverseWinding(points);
}
