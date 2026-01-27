/**
 * @file Bezier math utilities
 *
 * Mathematical functions for working with bezier curves.
 */

import type { Point } from "@oxen/pptx/domain";
import type { Pixels } from "@oxen/ooxml/domain/units";
import type { Bounds } from "@oxen/pptx/domain/types";
import { px } from "@oxen/ooxml/domain/units";

// =============================================================================
// Basic Math Utilities
// =============================================================================

/**
 * Linear interpolation between two values
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Linear interpolation between two points
 */
export function lerpPoint(p0: Point, p1: Point, t: number): Point {
  return {
    x: px(lerp(p0.x as number, p1.x as number, t)),
    y: px(lerp(p0.y as number, p1.y as number, t)),
  };
}

/**
 * Calculate distance between two points
 */
export function distance(p0: Point, p1: Point): number {
  const dx = (p1.x as number) - (p0.x as number);
  const dy = (p1.y as number) - (p0.y as number);
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate vector length
 */
export function vectorLength(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

/**
 * Normalize a vector
 */
export function normalizeVector(x: number, y: number): { x: number; y: number } {
  const len = vectorLength(x, y);
  if (len < 1e-10) {
    return { x: 0, y: 0 };
  }
  return { x: x / len, y: y / len };
}

// =============================================================================
// Cubic Bezier Evaluation
// =============================================================================

/**
 * Evaluate a cubic bezier curve at parameter t
 *
 * @param p0 - Start point
 * @param p1 - First control point
 * @param p2 - Second control point
 * @param p3 - End point
 * @param t - Parameter (0 to 1)
 * @returns Point on curve at t
 */
export function evaluateCubicBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): Point {
  const t2 = t * t;
  const t3 = t2 * t;
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;

  return {
    x: px(
      mt3 * (p0.x as number) +
        3 * mt2 * t * (p1.x as number) +
        3 * mt * t2 * (p2.x as number) +
        t3 * (p3.x as number)
    ),
    y: px(
      mt3 * (p0.y as number) +
        3 * mt2 * t * (p1.y as number) +
        3 * mt * t2 * (p2.y as number) +
        t3 * (p3.y as number)
    ),
  };
}

/**
 * Evaluate the derivative of a cubic bezier curve at parameter t
 *
 * @param p0 - Start point
 * @param p1 - First control point
 * @param p2 - Second control point
 * @param p3 - End point
 * @param t - Parameter (0 to 1)
 * @returns Tangent vector at t
 */
export function evaluateCubicBezierDerivative(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): { x: number; y: number } {
  const t2 = t * t;
  const mt = 1 - t;
  const mt2 = mt * mt;

  return {
    x:
      3 * mt2 * ((p1.x as number) - (p0.x as number)) +
      6 * mt * t * ((p2.x as number) - (p1.x as number)) +
      3 * t2 * ((p3.x as number) - (p2.x as number)),
    y:
      3 * mt2 * ((p1.y as number) - (p0.y as number)) +
      6 * mt * t * ((p2.y as number) - (p1.y as number)) +
      3 * t2 * ((p3.y as number) - (p2.y as number)),
  };
}

// =============================================================================
// Cubic Bezier Subdivision (de Casteljau)
// =============================================================================

/**
 * Cubic bezier segment representation
 */
export type CubicBezierSegment = {
  readonly start: Point;
  readonly control1: Point;
  readonly control2: Point;
  readonly end: Point;
};

/**
 * Subdivide a cubic bezier curve at parameter t using de Casteljau's algorithm
 *
 * @param p0 - Start point
 * @param p1 - First control point
 * @param p2 - Second control point
 * @param p3 - End point
 * @param t - Parameter (0 to 1)
 * @returns Two bezier segments
 */
export function subdivideCubicBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): { left: CubicBezierSegment; right: CubicBezierSegment } {
  // First level
  const q0 = lerpPoint(p0, p1, t);
  const q1 = lerpPoint(p1, p2, t);
  const q2 = lerpPoint(p2, p3, t);

  // Second level
  const r0 = lerpPoint(q0, q1, t);
  const r1 = lerpPoint(q1, q2, t);

  // Third level - the split point
  const s = lerpPoint(r0, r1, t);

  return {
    left: {
      start: p0,
      control1: q0,
      control2: r0,
      end: s,
    },
    right: {
      start: s,
      control1: r1,
      control2: q2,
      end: p3,
    },
  };
}

// =============================================================================
// Cubic Bezier Bounds
// =============================================================================

/**
 * Calculate the bounding box of a cubic bezier curve
 *
 * @param p0 - Start point
 * @param p1 - First control point
 * @param p2 - Second control point
 * @param p3 - End point
 * @returns Bounding box
 */
export function cubicBezierBounds(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point
): Bounds {
  // Start with endpoints
  let minX = Math.min(p0.x as number, p3.x as number);
  let maxX = Math.max(p0.x as number, p3.x as number);
  let minY = Math.min(p0.y as number, p3.y as number);
  let maxY = Math.max(p0.y as number, p3.y as number);

  // Find extrema by solving derivative = 0
  // Bezier derivative coefficients
  const ax = -3 * (p0.x as number) + 9 * (p1.x as number) - 9 * (p2.x as number) + 3 * (p3.x as number);
  const bx = 6 * (p0.x as number) - 12 * (p1.x as number) + 6 * (p2.x as number);
  const cx = -3 * (p0.x as number) + 3 * (p1.x as number);

  const ay = -3 * (p0.y as number) + 9 * (p1.y as number) - 9 * (p2.y as number) + 3 * (p3.y as number);
  const by = 6 * (p0.y as number) - 12 * (p1.y as number) + 6 * (p2.y as number);
  const cy = -3 * (p0.y as number) + 3 * (p1.y as number);

  // Solve quadratic for x
  const txRoots = solveQuadratic(ax, bx, cx);
  for (const t of txRoots) {
    if (t > 0 && t < 1) {
      const pt = evaluateCubicBezier(p0, p1, p2, p3, t);
      minX = Math.min(minX, pt.x as number);
      maxX = Math.max(maxX, pt.x as number);
    }
  }

  // Solve quadratic for y
  const tyRoots = solveQuadratic(ay, by, cy);
  for (const t of tyRoots) {
    if (t > 0 && t < 1) {
      const pt = evaluateCubicBezier(p0, p1, p2, p3, t);
      minY = Math.min(minY, pt.y as number);
      maxY = Math.max(maxY, pt.y as number);
    }
  }

  return {
    x: px(minX),
    y: px(minY),
    width: px(maxX - minX),
    height: px(maxY - minY),
  };
}

/**
 * Solve quadratic equation ax² + bx + c = 0
 */
function solveQuadratic(a: number, b: number, c: number): number[] {
  const roots: number[] = [];

  if (Math.abs(a) < 1e-10) {
    // Linear equation
    if (Math.abs(b) > 1e-10) {
      roots.push(-c / b);
    }
  } else {
    const discriminant = b * b - 4 * a * c;
    if (discriminant >= 0) {
      const sqrtD = Math.sqrt(discriminant);
      roots.push((-b + sqrtD) / (2 * a));
      roots.push((-b - sqrtD) / (2 * a));
    }
  }

  return roots;
}

// =============================================================================
// Nearest Point on Bezier
// =============================================================================

/**
 * Find the nearest point on a cubic bezier curve to a given point
 * Uses recursive subdivision for accuracy
 *
 * @param p0 - Start point
 * @param p1 - First control point
 * @param p2 - Second control point
 * @param p3 - End point
 * @param target - Target point
 * @param tolerance - Distance tolerance for subdivision
 * @returns Nearest point info: { t, point, distance }
 */
export function nearestPointOnCubicBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  target: Point,
  tolerance: number = 0.5
): { t: number; point: Point; distance: number } {
  // Sample the curve at regular intervals
  const samples = 10;
  let bestT = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  let bestPoint = p0;

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const pt = evaluateCubicBezier(p0, p1, p2, p3, t);
    const dist = distance(pt, target);
    if (dist < bestDist) {
      bestDist = dist;
      bestT = t;
      bestPoint = pt;
    }
  }

  // Refine using binary search
  let lo = Math.max(0, bestT - 1 / samples);
  let hi = Math.min(1, bestT + 1 / samples);

  while (hi - lo > tolerance / 100) {
    const mid1 = lo + (hi - lo) / 3;
    const mid2 = hi - (hi - lo) / 3;
    const pt1 = evaluateCubicBezier(p0, p1, p2, p3, mid1);
    const pt2 = evaluateCubicBezier(p0, p1, p2, p3, mid2);
    const dist1 = distance(pt1, target);
    const dist2 = distance(pt2, target);

    if (dist1 < dist2) {
      hi = mid2;
      if (dist1 < bestDist) {
        bestDist = dist1;
        bestT = mid1;
        bestPoint = pt1;
      }
    } else {
      lo = mid1;
      if (dist2 < bestDist) {
        bestDist = dist2;
        bestT = mid2;
        bestPoint = pt2;
      }
    }
  }

  return { t: bestT, point: bestPoint, distance: bestDist };
}

// =============================================================================
// Angle Constraints
// =============================================================================

/**
 * Constrain an angle to 45-degree increments
 *
 * @param angle - Angle in radians
 * @returns Constrained angle in radians
 */
export function constrainTo45Degrees(angle: number): number {
  const increment = Math.PI / 4; // 45 degrees
  return Math.round(angle / increment) * increment;
}

/**
 * Constrain a vector direction to 45-degree increments
 *
 * @param dx - X component
 * @param dy - Y component
 * @returns Constrained vector with same length
 */
export function constrainVectorTo45Degrees(
  dx: number,
  dy: number
): { dx: number; dy: number } {
  const len = vectorLength(dx, dy);
  if (len < 1e-10) {
    return { dx: 0, dy: 0 };
  }

  const angle = Math.atan2(dy, dx);
  const constrainedAngle = constrainTo45Degrees(angle);

  return {
    dx: len * Math.cos(constrainedAngle),
    dy: len * Math.sin(constrainedAngle),
  };
}

/**
 * Calculate angle from point to point
 *
 * @param from - Starting point
 * @param to - Target point
 * @returns Angle in radians
 */
export function angleFromTo(from: Point, to: Point): number {
  return Math.atan2(
    (to.y as number) - (from.y as number),
    (to.x as number) - (from.x as number)
  );
}

/**
 * Check if two angles are collinear (within tolerance)
 *
 * @param angle1 - First angle in radians
 * @param angle2 - Second angle in radians
 * @param tolerance - Tolerance in radians (default 10 degrees)
 * @returns True if angles are roughly opposite (collinear handles)
 */
export function areAnglesCollinear(
  angle1: number,
  angle2: number,
  tolerance: number = Math.PI / 18
): boolean {
  // Normalize angles to [-PI, PI]
  const normalize = (a: number) => {
    while (a > Math.PI) {
      a -= 2 * Math.PI;
    }
    while (a < -Math.PI) {
      a += 2 * Math.PI;
    }
    return a;
  };

  const diff = normalize(angle1 - angle2);
  // For collinear handles, angles should be opposite (diff near PI or -PI)
  return Math.abs(Math.abs(diff) - Math.PI) < tolerance;
}

// =============================================================================
// Handle Mirroring
// =============================================================================

/**
 * Mirror a handle position across an anchor point
 *
 * @param anchor - The anchor point
 * @param handle - The handle to mirror
 * @param preserveLength - If true, use same length; if false, use mirrored length
 * @returns Mirrored handle position
 */
export function mirrorHandle(
  anchor: Point,
  handle: Point,
  preserveLength?: number
): Point {
  const dx = (handle.x as number) - (anchor.x as number);
  const dy = (handle.y as number) - (anchor.y as number);

  let scale = 1;
  if (preserveLength !== undefined) {
    const currentLen = vectorLength(dx, dy);
    if (currentLen > 1e-10) {
      scale = preserveLength / currentLen;
    }
  }

  return {
    x: px((anchor.x as number) - dx * scale),
    y: px((anchor.y as number) - dy * scale),
  };
}
