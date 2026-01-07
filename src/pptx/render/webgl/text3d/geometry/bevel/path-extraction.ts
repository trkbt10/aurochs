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
 * Extract path points with inward-facing normals from a polygon.
 *
 * Uses signed area to determine winding direction and ensure
 * normals always point inward (toward the shape interior).
 *
 * @param points - Polygon vertices
 * @param isHole - Whether this is a hole (affects normal direction)
 * @returns Array of points with computed normals
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
  // If winding doesn't match expectation, flip normal direction
  const isCCW = signedArea > 0;
  // For outer paths we expect CCW, for holes we expect CW
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

    // Average edge direction
    const avgEdge = Vec2.add(edgePrev, edgeNext);

    let normal: Vector2;

    if (Vec2.lengthSq(avgEdge) < 0.001) {
      // Use single edge if directions cancel out
      const edge =
        Vec2.lengthSq(edgeNext) > 0.001 ? edgeNext : edgePrev;
      const normalizedEdge = Vec2.normalize(edge);
      // Perpendicular: rotate 90° CCW
      normal = Vec2.perpCCW(normalizedEdge);
    } else {
      const normalizedAvg = Vec2.normalize(avgEdge);
      // Perpendicular to edge direction: rotate 90° CCW
      // This gives the "left" side of the path
      normal = Vec2.perpCCW(normalizedAvg);
    }

    // Flip if winding doesn't match expectation
    if (flipNormal) {
      normal = Vec2.negate(normal);
    }

    result.push({
      position: vec2(curr.x, curr.y),
      normal,
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
