/**
 * @file Shape Expansion for Contour (Three.js Independent)
 *
 * Implements 2D shape expansion for ECMA-376 contour effect.
 * The contour is created by expanding the shape outline before extrusion.
 *
 * This module is Three.js independent - it works with pure coordinate arrays.
 *
 * @see ECMA-376 Part 1, Section 20.1.5.9 (sp3d contourW)
 */

import type { Vector2, ShapeInput } from "./types";
import { Vec2 } from "./types";

// =============================================================================
// Shape Expansion
// =============================================================================

/**
 * Expand a shape outward by a specified distance.
 *
 * Uses miter join method at corners - vertices are moved along the
 * bisector of adjacent edge normals.
 *
 * @param shape - The original shape to expand
 * @param distance - Distance to expand outward (contour width)
 * @returns Expanded shape, or null if expansion fails
 */
export function expandShape(
  shape: ShapeInput,
  distance: number,
): ShapeInput | null {
  if (distance <= 0) {
    return shape;
  }

  const { points, holes } = shape;

  if (points.length < 3) {
    return null;
  }

  // Expand outer contour (outward)
  const expandedPoints = expandContourPoints(points, distance, false);
  if (!expandedPoints || expandedPoints.length < 3) {
    return null;
  }

  // Shrink holes (inward) - contour should not fill holes
  // Pass positive distance with isHole=true to shrink the hole
  const expandedHoles: Vector2[][] = [];
  for (const hole of holes) {
    const shrunkHole = expandContourPoints(hole, distance, true);
    if (shrunkHole && shrunkHole.length >= 3) {
      expandedHoles.push(shrunkHole);
    }
  }

  return {
    points: expandedPoints,
    holes: expandedHoles,
  };
}

/**
 * Expand multiple shapes for contour generation.
 *
 * @param shapes - Original shapes
 * @param contourWidth - Width of the contour in pixels
 * @returns Array of expanded shapes
 */
export function expandShapesForContour(
  shapes: readonly ShapeInput[],
  contourWidth: number,
): ShapeInput[] {
  const expandedShapes: ShapeInput[] = [];

  for (const shape of shapes) {
    const expanded = expandShape(shape, contourWidth);
    if (expanded) {
      expandedShapes.push(expanded);
    }
  }

  return expandedShapes;
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Expand a contour (closed polygon) by moving each vertex outward.
 *
 * Uses the miter join method at corners - vertices are moved along
 * the bisector of adjacent edge normals.
 *
 * @param points - Contour points (closed polygon)
 * @param distance - Expansion distance (positive = expand, works as shrink for holes)
 * @param isHole - Whether this is a hole (flips normal direction to shrink)
 * @returns Expanded points, or null if expansion fails
 */
function expandContourPoints(
  points: readonly Vector2[],
  distance: number,
  isHole: boolean,
): Vector2[] | null {
  const n = points.length;
  if (n < 3) {
    return null;
  }

  // Determine winding direction (CCW = positive area)
  const area = computeSignedArea(points);
  const isCCW = area > 0;

  // For CCW winding, right perpendicular points outward
  // For CW winding, right perpendicular points inward, so we flip
  // For holes, we want normals pointing into the hole (shrink direction)
  const windingSign = isCCW ? 1 : -1;
  const holeSign = isHole ? -1 : 1;
  const normalSign = windingSign * holeSign;

  const expandedPoints: Vector2[] = [];

  for (let i = 0; i < n; i++) {
    const prevIdx = (i - 1 + n) % n;
    const nextIdx = (i + 1) % n;

    const prev = points[prevIdx];
    const curr = points[i];
    const next = points[nextIdx];

    // Compute edge vectors
    const edge1 = Vec2.sub(curr, prev);
    const edge2 = Vec2.sub(next, curr);

    // Compute outward normals (perpendicular to edge)
    // For CCW winding, RIGHT perpendicular (90° CW rotation) is outward
    // Rotation 90° CW: (dx, dy) → (dy, -dx)
    const normal1 = Vec2.normalize({
      x: edge1.y * normalSign,
      y: -edge1.x * normalSign,
    });
    const normal2 = Vec2.normalize({
      x: edge2.y * normalSign,
      y: -edge2.x * normalSign,
    });

    // Compute bisector (average of normals)
    const bisector = Vec2.normalize(Vec2.add(normal1, normal2));

    // Miter length: distance / cos(half angle)
    // cos(half angle) = dot(normal1, bisector)
    const dotProduct = normal1.x * bisector.x + normal1.y * bisector.y;
    const miterLength = computeMiterLength(distance, dotProduct);

    // Clamp miter length to prevent spikes at sharp corners
    const maxMiterLength = Math.abs(distance) * 4;
    const clampedMiter = Math.min(Math.abs(miterLength), maxMiterLength) * Math.sign(miterLength);

    expandedPoints.push({
      x: curr.x + bisector.x * clampedMiter,
      y: curr.y + bisector.y * clampedMiter,
    });
  }

  return expandedPoints;
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

/**
 * Compute signed area of a polygon (Shoelace formula).
 * Positive = CCW, Negative = CW
 */
function computeSignedArea(points: readonly Vector2[]): number {
  const n = points.length;
  const total = points.reduce((acc, point, i) => {
    const next = points[(i + 1) % n];
    return acc + (point.x * next.y - next.x * point.y);
  }, 0);
  return total / 2;
}
