/**
 * @file PDF matrix operations
 *
 * Provides matrix manipulation functions for PDF transformations.
 */

import type { PdfMatrix, PdfPoint } from "./types";

// =============================================================================
// Constants
// =============================================================================

export const IDENTITY_MATRIX: PdfMatrix = [1, 0, 0, 1, 0, 0];

// =============================================================================
// Matrix Operations
// =============================================================================

/**
 * Multiply two transformation matrices
 * Result = a * b
 */
export function multiplyMatrices(a: PdfMatrix, b: PdfMatrix): PdfMatrix {
  const [a1, a2, a3, a4, a5, a6] = a;
  const [b1, b2, b3, b4, b5, b6] = b;

  return [
    a1 * b1 + a2 * b3,
    a1 * b2 + a2 * b4,
    a3 * b1 + a4 * b3,
    a3 * b2 + a4 * b4,
    a5 * b1 + a6 * b3 + b5,
    a5 * b2 + a6 * b4 + b6,
  ];
}

/**
 * Transform a point by a matrix
 */
export function transformPoint(point: PdfPoint, matrix: PdfMatrix): PdfPoint {
  const [a, b, c, d, e, f] = matrix;
  return {
    x: a * point.x + c * point.y + e,
    y: b * point.x + d * point.y + f,
  };
}

/**
 * Calculate the inverse of a matrix
 * Returns null if matrix is singular
 */
export function invertMatrix(matrix: PdfMatrix): PdfMatrix | null {
  const [a, b, c, d, e, f] = matrix;
  const det = a * d - b * c;

  if (Math.abs(det) < 1e-10) {
    return null; // Singular matrix
  }

  const invDet = 1 / det;

  return [
    d * invDet,
    -b * invDet,
    -c * invDet,
    a * invDet,
    (c * f - d * e) * invDet,
    (b * e - a * f) * invDet,
  ];
}

/**
 * Create a translation matrix
 */
export function translationMatrix(tx: number, ty: number): PdfMatrix {
  return [1, 0, 0, 1, tx, ty];
}

/**
 * Create a scaling matrix
 */
export function scalingMatrix(sx: number, sy: number): PdfMatrix {
  return [sx, 0, 0, sy, 0, 0];
}

/**
 * Create a rotation matrix (angle in radians)
 */
export function rotationMatrix(angle: number): PdfMatrix {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [cos, sin, -sin, cos, 0, 0];
}

/**
 * Check if a matrix is (approximately) the identity matrix
 */
export function isIdentityMatrix(matrix: PdfMatrix): boolean {
  const [a, b, c, d, e, f] = matrix;
  const eps = 1e-6;
  return (
    Math.abs(a - 1) < eps &&
    Math.abs(b) < eps &&
    Math.abs(c) < eps &&
    Math.abs(d - 1) < eps &&
    Math.abs(e) < eps &&
    Math.abs(f) < eps
  );
}

/**
 * Check if a matrix contains only scale and translation (no rotation/skew)
 */
export function isSimpleTransform(matrix: PdfMatrix): boolean {
  const [, b, c] = matrix;
  const eps = 1e-6;
  return Math.abs(b) < eps && Math.abs(c) < eps;
}

/**
 * Extract scale factors from a matrix
 */
export function getMatrixScale(matrix: PdfMatrix): { scaleX: number; scaleY: number } {
  const [a, b, c, d] = matrix;
  return {
    scaleX: Math.sqrt(a * a + b * b),
    scaleY: Math.sqrt(c * c + d * d),
  };
}

/**
 * Extract rotation angle from a matrix (in radians)
 */
export function getMatrixRotation(matrix: PdfMatrix): number {
  const [a, b] = matrix;
  return Math.atan2(b, a);
}

/**
 * Complete matrix decomposition result
 */
export type MatrixDecomposition = {
  readonly scaleX: number;
  readonly scaleY: number;
  readonly rotation: number; // radians
  readonly shearX: number;
  readonly shearY: number;
  readonly translateX: number;
  readonly translateY: number;
  readonly isSimple: boolean; // true if no shear
  readonly hasRotation: boolean;
  readonly hasScale: boolean;
};

/**
 * Decompose a transformation matrix into its components
 *
 * A 2D affine transformation matrix [a, b, c, d, e, f] can be decomposed as:
 * - Translation: (e, f)
 * - Rotation: atan2(b, a)
 * - Scale: (scaleX, scaleY)
 * - Shear: shearX, shearY
 *
 * The matrix represents: [scaleX*cos(r) + shearY*sin(r), scaleX*sin(r) - shearY*cos(r),
 *                         shearX*cos(r) + scaleY*sin(r), shearX*sin(r) - scaleY*cos(r), e, f]
 *
 * For shear detection, we check if the matrix can be represented as pure scale + rotation
 */
export function decomposeMatrix(matrix: PdfMatrix): MatrixDecomposition {
  const [a, b, c, d, e, f] = matrix;

  // Floating-point epsilon for near-zero comparison
  const eps = 1e-6;

  // Translation components
  const translateX = e;
  const translateY = f;

  // Calculate rotation from the first column
  const rotation = Math.atan2(b, a);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  // Calculate scale factors
  // For a pure scale+rotation matrix: a = scaleX*cos, b = scaleX*sin, c = -scaleY*sin, d = scaleY*cos
  const scaleX = Math.sqrt(a * a + b * b);

  // For scaleY, we need to account for the sign (reflection)
  // The determinant ad - bc gives us scaleX * scaleY
  const det = a * d - b * c;
  const scaleY = det / scaleX;

  // Calculate shear
  // If there's no shear: c = -scaleY*sin, d = scaleY*cos
  // Shear causes deviation from this
  const expectedC = -scaleY * sin;
  const expectedD = scaleY * cos;
  // shearX: deviation in c divided by cos (when cos is non-zero)
  const shearX = Math.abs(cos) > eps ? (c - expectedC) / cos : 0;
  // shearY: deviation in a divided by sin (when sin is non-zero)
  // Bug fix: was checking cos but dividing by sin
  const shearY = Math.abs(sin) > eps ? (a - scaleX * cos) / sin : 0;

  // Check if matrix is "simple" (no shear)
  const isSimple = Math.abs(c - expectedC) < eps && Math.abs(d - expectedD) < eps;

  // Check for rotation (non-identity rotation)
  const hasRotation = Math.abs(rotation) > eps;

  // Check for scale (non-identity scale)
  const hasScale = Math.abs(scaleX - 1) > eps || Math.abs(scaleY - 1) > eps;

  return {
    scaleX,
    scaleY,
    rotation,
    shearX,
    shearY,
    translateX,
    translateY,
    isSimple,
    hasRotation,
    hasScale,
  };
}

/**
 * Check if a matrix has shear (skew) transformation
 */
export function hasShear(matrix: PdfMatrix): boolean {
  return !decomposeMatrix(matrix).isSimple;
}
