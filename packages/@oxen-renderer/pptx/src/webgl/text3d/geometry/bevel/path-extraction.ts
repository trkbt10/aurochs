/**
 * @file Bevel Path Extraction (Three.js Independent)
 *
 * Extracts paths from shape input and computes inward normals
 * for bevel geometry generation.
 *
 * @see ECMA-376 Part 1, Section 20.1.5.1 (bevelT/bevelB)
 */

import type { Vector2, BevelPath, BevelPathPoint, ShapeInput } from "./types";
import { vec2, Vec2 } from "./types";

// =============================================================================
// Signed Area Computation
// =============================================================================

/**
 * Compute signed area of a polygon to determine winding direction.
 *
 * Uses the shoelace formula.
 * - Positive = Counter-Clockwise (CCW)
 * - Negative = Clockwise (CW)
 */
export function computeSignedArea(points: readonly Vector2[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    const next = points[(i + 1) % points.length];
    area += curr.x * next.y - next.x * curr.y;
  }
  return area / 2;
}

// =============================================================================
// Path Point Extraction
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
 * Shape.closePath() creates a duplicate point at the end that matches the start.
 * This duplicate causes degenerate faces when generating bevel geometry because
 * consecutive vertices end up at the same position.
 *
 * @param points - Input polygon points
 * @returns Points with duplicate closing point removed
 */
function removeDuplicateClosingPoint(points: readonly Vector2[]): readonly Vector2[] {
  if (points.length < 2) {
    return points;
  }

  const first = points[0];
  const last = points[points.length - 1];

  if (pointsEqual(first, last)) {
    // Remove the duplicate closing point
    return points.slice(0, -1);
  }

  return points;
}

/**
 * Maximum miter factor to prevent extreme spikes at sharp corners.
 *
 * Reduced from 4 to 2 because:
 * - With bevel width 5 and miter 4, effective inset = 20px
 * - This collapses thin strokes (<20px) completely
 * - A value of 2 limits effective inset to 10px, preserving more shapes
 *
 * Trade-off: Sharp corners will have slightly beveled/cut appearance
 * instead of perfectly extended miter joints.
 */
const MAX_MITER_FACTOR = 2;

/**
 * Minimum dot product threshold for miter calculation.
 * Below this, the angle is too sharp and we use MAX_MITER_FACTOR.
 */
const MIN_DOT_PRODUCT = 0.1;

/**
 * Extract path points with inward-facing normals from a polygon.
 *
 * Uses signed area to determine winding direction and ensure
 * normals always point inward (toward the shape interior).
 *
 * Also computes miter factor for each vertex to enable proper
 * corner handling in bevel generation.
 *
 * @param points - Polygon vertices
 * @param isHole - Whether this is a hole (affects normal direction)
 * @returns Array of points with computed normals and miter factors
 */
export function extractPathPointsWithNormals(
  points: readonly Vector2[],
  isHole: boolean,
): readonly BevelPathPoint[] {
  // Remove duplicate closing point before processing
  const cleanedPoints = removeDuplicateClosingPoint(points);

  if (cleanedPoints.length < 3) {
    return [];
  }

  // Compute signed area to determine winding
  const signedArea = computeSignedArea(cleanedPoints);
  // CCW (positive area) for outer, CW (negative) for holes
  const isCCW = signedArea > 0;

  // Determine if we need to flip the normal direction.
  //
  // perpCCW gives the "left" side of the path:
  // - For CCW path: left = INWARD (toward shape interior)
  // - For CW path: left = OUTWARD (away from enclosed area)
  //
  // For bevel, we want:
  // - Outer shapes: normals pointing INWARD (toward shape center)
  // - Holes: normals pointing TOWARD SOLID (away from hole center)
  //
  // Expected winding after THREE.js conversion (Y-flip + reversal):
  // - Outer: CCW (positive area) → perpCCW gives inward → no flip needed
  // - Hole: CW (negative area) → perpCCW gives outward (toward solid) → no flip needed
  //
  // For unexpected winding, we flip to correct:
  // - CW outer: flip to get inward normals
  // - CCW hole: flip to get outward normals
  const flipNormal = isHole ? isCCW : !isCCW;

  const result: BevelPathPoint[] = [];
  const numPoints = cleanedPoints.length;

  for (let i = 0; i < numPoints; i++) {
    const curr = cleanedPoints[i];
    const prev = cleanedPoints[(i - 1 + numPoints) % numPoints];
    const next = cleanedPoints[(i + 1) % numPoints];

    // Compute edge direction (along the path)
    const edgePrev = Vec2.sub(curr, prev);
    const edgeNext = Vec2.sub(next, curr);

    // Compute normals for each adjacent edge (perpCCW of normalized edge)
    const normal1Raw = Vec2.perpCCW(Vec2.normalize(edgePrev));
    const normal2Raw = Vec2.perpCCW(Vec2.normalize(edgeNext));

    // Apply flip if needed (consistent with bisector calculation)
    const normal1 = flipNormal ? Vec2.negate(normal1Raw) : normal1Raw;
    const normal2 = flipNormal ? Vec2.negate(normal2Raw) : normal2Raw;

    // Compute bisector of adjacent normals
    // This is the direction we move vertices for miter join
    const bisectorSum = Vec2.add(normal1, normal2);
    const bisectorLength = Vec2.length(bisectorSum);

    let normal: Vector2;
    let miterFactor: number;

    if (bisectorLength < 0.001) {
      // Nearly parallel edges (180° corner) - use single edge normal
      normal = normal2;
      miterFactor = 1;
    } else {
      // Compute bisector (normalized average of normals)
      const bisector = Vec2.scale(bisectorSum, 1 / bisectorLength);

      // The normal for the bevel is the bisector direction
      // This ensures the bevel surface is symmetric at corners
      normal = bisector;

      // Compute miter factor: 1 / cos(halfAngle)
      // where halfAngle is angle between edge normal and bisector
      const dotProduct = normal1.x * bisector.x + normal1.y * bisector.y;

      if (Math.abs(dotProduct) > MIN_DOT_PRODUCT) {
        miterFactor = Math.min(1 / dotProduct, MAX_MITER_FACTOR);
      } else {
        // Very sharp corner - cap at max to prevent spikes
        miterFactor = MAX_MITER_FACTOR;
      }
    }

    result.push({
      position: vec2(curr.x, curr.y),
      normal,
      miterFactor,
    });
  }

  return result;
}

// =============================================================================
// Shape Path Extraction
// =============================================================================

/**
 * Extract bevel paths from a shape input.
 *
 * Extracts the outer contour and any holes, computing inward normals
 * for each vertex to enable proper bevel direction.
 *
 * @param shape - Shape input with points and holes
 * @returns Array of bevel paths (outer contour and holes)
 */
export function extractBevelPathsFromShape(
  shape: ShapeInput,
): readonly BevelPath[] {
  const paths: BevelPath[] = [];

  // Extract outer contour
  const outerPoints = extractPathPointsWithNormals(shape.points, false);
  if (outerPoints.length >= 3) {
    paths.push({
      points: outerPoints,
      isHole: false,
      isClosed: true,
    });
  }

  // Extract holes
  for (const holePoints of shape.holes) {
    const extractedPoints = extractPathPointsWithNormals(holePoints, true);
    if (extractedPoints.length >= 3) {
      paths.push({
        points: extractedPoints,
        isHole: true,
        isClosed: true,
      });
    }
  }

  return paths;
}
