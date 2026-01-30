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
// Point Utilities
// =============================================================================

/**
 * Check if two points are approximately equal.
 */
function pointsEqual(a: Vector2, b: Vector2, epsilon = 0.0001): boolean {
  return Math.abs(a.x - b.x) < epsilon && Math.abs(a.y - b.y) < epsilon;
}

/**
 * Remove duplicate closing point if present.
 *
 * THREE.Shape.getPoints() may return a duplicate closing point when closePath() was called.
 * This duplicate causes issues in wall thickness calculation.
 */
function removeDuplicateClosingPoint(points: readonly Vector2[]): readonly Vector2[] {
  if (points.length < 2) {
    return points;
  }

  const first = points[0];
  const last = points[points.length - 1];

  if (pointsEqual(first, last)) {
    return points.slice(0, -1);
  }

  return points;
}

// =============================================================================
// Wall Thickness Calculation
// =============================================================================

/**
 * Calculate the minimum distance from a point to a polygon edge.
 *
 * @param point - The point to measure from
 * @param polygon - The polygon to measure to
 * @returns Minimum distance to any edge of the polygon
 */
function pointToPolygonDistance(point: Vector2, polygon: readonly Vector2[]): number {
  // eslint-disable-next-line no-restricted-syntax -- Algorithm: tracks minimum distance to polygon
  let minDist = Infinity;
  const n = polygon.length;

  for (let i = 0; i < n; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % n];

    // Distance from point to line segment a-b
    const dist = pointToSegmentDistance(point, a, b);
    if (dist < minDist) {
      minDist = dist;
    }
  }

  return minDist;
}

/**
 * Calculate distance from a point to a line segment.
 */
function pointToSegmentDistance(p: Vector2, a: Vector2, b: Vector2): number {
  const ab = Vec2.sub(b, a);
  const ap = Vec2.sub(p, a);

  const abLenSq = ab.x * ab.x + ab.y * ab.y;
  if (abLenSq < 0.0001) {
    // Degenerate segment - just return distance to point a
    return Vec2.length(ap);
  }

  // Project p onto line ab, clamped to segment
  const t = Math.max(0, Math.min(1, (ap.x * ab.x + ap.y * ab.y) / abLenSq));
  const closest = { x: a.x + t * ab.x, y: a.y + t * ab.y };

  return Vec2.length(Vec2.sub(p, closest));
}

/**
 * Calculate minimum wall thickness of a shape with holes.
 *
 * The wall thickness is the minimum distance between the outer contour
 * and any hole. This determines the maximum safe bevel width.
 *
 * @param shape - Shape with outer contour and holes
 * @returns Minimum wall thickness, or Infinity if no holes
 */
export function calculateMinWallThickness(shape: ShapeInput): number {
  if (shape.holes.length === 0) {
    // No holes - wall thickness is unlimited for bevel purposes
    // But we should still consider the shape's narrowest part
    return calculateMinShapeWidth(shape.points);
  }

  // eslint-disable-next-line no-restricted-syntax -- Algorithm: tracks minimum wall thickness
  let minThickness = Infinity;

  // For each point on the outer contour, find minimum distance to any hole
  for (const outerPoint of shape.points) {
    for (const hole of shape.holes) {
      const dist = pointToPolygonDistance(outerPoint, hole);
      if (dist < minThickness) {
        minThickness = dist;
      }
    }
  }

  // Also check from hole points to outer contour
  for (const hole of shape.holes) {
    for (const holePoint of hole) {
      const dist = pointToPolygonDistance(holePoint, shape.points);
      if (dist < minThickness) {
        minThickness = dist;
      }
    }
  }

  return minThickness;
}

/**
 * Calculate the minimum width of a shape (narrowest part).
 *
 * Uses a simplified approach: samples points and finds minimum
 * distance to opposite edge.
 *
 * @param points - Shape contour points
 * @returns Approximate minimum width
 */
function calculateMinShapeWidth(points: readonly Vector2[]): number {
  if (points.length < 3) {
    return 0;
  }

  // Remove duplicate closing point if present (THREE.Shape.getPoints may include it)
  const cleanedPoints = removeDuplicateClosingPoint(points);
  if (cleanedPoints.length < 3) {
    return 0;
  }

  let minWidth = Infinity;
  const n = cleanedPoints.length;

  // For each point, find distance to the "opposite" part of the shape
  // Simplified: check distance to edges that are at least n/3 away in index
  for (let i = 0; i < n; i++) {
    const p = cleanedPoints[i];
    const startOffset = Math.floor(n / 3);
    const endOffset = Math.floor(2 * n / 3);

    for (let j = startOffset; j <= endOffset; j++) {
      const idx1 = (i + j) % n;
      const idx2 = (i + j + 1) % n;
      const a = cleanedPoints[idx1];
      const b = cleanedPoints[idx2];

      const dist = pointToSegmentDistance(p, a, b);
      if (dist < minWidth) {
        minWidth = dist;
      }
    }
  }

  return minWidth;
}

/**
 * Calculate the maximum safe bevel width for a shape.
 *
 * The bevel causes:
 * - Outer contour to shrink inward by bevelWidth
 * - Holes to expand outward by bevelWidth
 *
 * Total wall thickness reduction = 2 * bevelWidth
 * Therefore: maxBevelWidth = minWallThickness / 2
 *
 * Additional constraint: shrinkShape requires that expanded hole area
 * must not exceed 90% of shrunk outer area. For shapes with large holes,
 * we need a more conservative limit.
 *
 * @param shape - Shape to analyze
 * @param requestedWidth - Requested bevel width
 * @param safetyMargin - Safety margin (default 0.8 = 80% of max)
 * @returns Safe bevel width that won't cause collision
 */
export function calculateSafeBevelWidth(
  shape: ShapeInput,
  requestedWidth: number,
  safetyMargin = 0.8,
): number {
  const minThickness = calculateMinWallThickness(shape);

  // Max safe bevel = half of min thickness (both sides shrink/expand)
  // Apply safety margin to avoid edge cases
  let maxSafeBevel = (minThickness / 2) * safetyMargin;

  // For shapes with holes, apply additional constraint based on area ratio
  // to satisfy shrinkShape's "expanded hole < 90% of shrunk outer" check
  if (shape.holes.length > 0) {
    const outerArea = Math.abs(computeSignedAreaPublic(shape.points));
    let totalHoleArea = 0;
    for (const hole of shape.holes) {
      totalHoleArea += Math.abs(computeSignedAreaPublic(hole));
    }

    // If hole already takes > 70% of outer area, be very conservative
    const holeRatio = totalHoleArea / outerArea;
    if (holeRatio > 0.7) {
      // Reduce bevel proportionally to remaining wall area
      const areaFactor = Math.max(0.1, 1 - holeRatio);
      maxSafeBevel *= areaFactor;
    }
  }

  return Math.min(requestedWidth, Math.max(0, maxSafeBevel));
}

/**
 * Compute signed area of a polygon (Shoelace formula).
 * Positive = CCW, Negative = CW
 */
function computeSignedAreaPublic(points: readonly Vector2[]): number {
  const n = points.length;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const curr = points[i];
    const next = points[(i + 1) % n];
    total += curr.x * next.y - next.x * curr.y;
  }
  return total / 2;
}

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
 * Shrink a shape inward by a specified distance.
 *
 * The opposite of expandShape - moves outer contour inward
 * and expands holes outward.
 *
 * @param shape - The original shape to shrink
 * @param distance - Distance to shrink inward
 * @returns Shrunk shape, or null if shrinking fails or shape becomes degenerate
 */
export function shrinkShape(
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

  // Shrink outer contour (inward) - use isHole=true to invert normal direction
  const shrunkPoints = expandContourPoints(points, distance, true);
  if (!shrunkPoints || shrunkPoints.length < 3) {
    return null;
  }

  // Validate shrunk shape - check for self-intersection by verifying area
  // Original shape should have positive area (CCW), shrunk should too
  const originalArea = computeSignedArea(points);
  const shrunkArea = computeSignedArea(shrunkPoints);

  // If shrunk area is negative or too small, shape has collapsed/inverted
  // Use 10% of original area as minimum threshold
  const minValidArea = Math.abs(originalArea) * 0.1;
  if (shrunkArea * originalArea < 0 || Math.abs(shrunkArea) < minValidArea) {
    return null;
  }

  // Expand holes (outward) - holes get bigger when shape shrinks
  const expandedHoles: Vector2[][] = [];
  for (const hole of holes) {
    const expandedHole = expandContourPoints(hole, distance, false);
    if (!expandedHole || expandedHole.length < 3) {
      // Hole expansion failed - return null to indicate shape can't be shrunk
      // This prevents generating an inner cap without holes (which would look filled)
      return null;
    }

    // Validate expanded hole - ensure it doesn't exceed outer bounds
    const holeArea = computeSignedArea(expandedHole);
    const originalHoleArea = computeSignedArea(hole);

    // If hole area inverted, shrinking has broken the geometry
    if (holeArea * originalHoleArea < 0) {
      return null;
    }

    // Check if expanded hole area exceeds the remaining shape area
    // This indicates the hole has grown too large (collision with shrunk outer)
    if (Math.abs(holeArea) > Math.abs(shrunkArea) * 0.9) {
      return null;
    }

    expandedHoles.push(expandedHole);
  }

  return {
    points: shrunkPoints,
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
