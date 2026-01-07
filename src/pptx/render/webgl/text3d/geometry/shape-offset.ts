/**
 * @file Shape Offset/Expansion for Contour
 *
 * Implements 2D shape expansion for ECMA-376 contour effect.
 * The contour is created by expanding the shape outline before extrusion,
 * NOT by scaling or expanding the 3D geometry after extrusion.
 *
 * @see ECMA-376 Part 1, Section 20.1.5.9 (sp3d contourW)
 */

import * as THREE from "three";

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
export function expandShape(
  shape: THREE.Shape,
  distance: number,
): THREE.Shape | null {
  if (distance <= 0) {
    return shape.clone();
  }

  const points = shape.getPoints(12);
  if (points.length < 3) {
    return null;
  }

  // Expand outer contour
  const expandedPoints = expandContourPoints(points, distance, false);
  if (!expandedPoints || expandedPoints.length < 3) {
    return null;
  }

  // Create new shape from expanded points
  const expandedShape = new THREE.Shape();
  expandedShape.moveTo(expandedPoints[0].x, expandedPoints[0].y);
  for (let i = 1; i < expandedPoints.length; i++) {
    expandedShape.lineTo(expandedPoints[i].x, expandedPoints[i].y);
  }
  expandedShape.closePath();

  // Handle holes - they need to be SHRUNK (expanded inward)
  for (const hole of shape.holes) {
    const holePoints = hole.getPoints(12);
    // Shrink holes (negative expansion = inward)
    const shrunkHolePoints = expandContourPoints(holePoints, -distance, true);
    if (shrunkHolePoints && shrunkHolePoints.length >= 3) {
      const shrunkHole = new THREE.Path();
      shrunkHole.moveTo(shrunkHolePoints[0].x, shrunkHolePoints[0].y);
      for (let i = 1; i < shrunkHolePoints.length; i++) {
        shrunkHole.lineTo(shrunkHolePoints[i].x, shrunkHolePoints[i].y);
      }
      shrunkHole.closePath();
      expandedShape.holes.push(shrunkHole);
    }
  }

  return expandedShape;
}

type Point2D = { x: number; y: number };

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
function expandContourPoints(
  points: readonly THREE.Vector2[],
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
    const edge1 = { x: curr.x - prev.x, y: curr.y - prev.y };
    const edge2 = { x: next.x - curr.x, y: next.y - curr.y };

    // Compute outward normals (perpendicular to edge)
    // For CCW winding, RIGHT perpendicular (90° CW rotation) is outward
    // Rotation 90° CW: (dx, dy) → (dy, -dx)
    const normal1 = normalize({ x: edge1.y * normalSign, y: -edge1.x * normalSign });
    const normal2 = normalize({ x: edge2.y * normalSign, y: -edge2.x * normalSign });

    // Compute bisector (average of normals)
    const bisector = normalize({
      x: normal1.x + normal2.x,
      y: normal1.y + normal2.y,
    });

    // Miter length: distance / cos(half angle)
    // cos(half angle) = dot(normal1, bisector)
    const dotProduct = normal1.x * bisector.x + normal1.y * bisector.y;
    // Use full distance for nearly parallel edges, otherwise divide by dot product
    const miterLength = computeMiterLength(distance, dotProduct);

    // Clamp miter length to prevent spikes at sharp corners
    const maxMiterLength = distance * 4;
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
function computeSignedArea(points: readonly THREE.Vector2[]): number {
  const n = points.length;
  const total = points.reduce((acc, point, i) => {
    const next = points[(i + 1) % n];
    return acc + (point.x * next.y - next.x * point.y);
  }, 0);
  return total / 2;
}

/**
 * Normalize a 2D vector to unit length.
 */
function normalize(v: Point2D): Point2D {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len < 0.0001) {
    return { x: 0, y: 0 };
  }
  return { x: v.x / len, y: v.y / len };
}

/**
 * Create contour geometry by expanding shapes and extruding.
 *
 * This creates a proper contour shell by:
 * 1. Expanding the 2D shape by contour width
 * 2. Extruding the expanded shape with the same bevel/depth
 *
 * The result is geometry that wraps around the original,
 * with uniform contour width in all directions.
 *
 * @param shapes - Original shapes
 * @param contourWidth - Width of the contour in pixels
 * @returns Array of expanded shapes ready for extrusion
 */
export function createExpandedShapesForContour(
  shapes: THREE.Shape[],
  contourWidth: number,
): THREE.Shape[] {
  const expandedShapes: THREE.Shape[] = [];

  for (const shape of shapes) {
    const expanded = expandShape(shape, contourWidth);
    if (expanded) {
      expandedShapes.push(expanded);
    }
  }

  return expandedShapes;
}
