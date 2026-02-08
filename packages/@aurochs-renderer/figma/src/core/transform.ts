/**
 * @file Shared transform matrix operations
 *
 * Format-agnostic matrix math extracted from svg/transform.ts
 * for use by both SVG and WebGL backends.
 */

import type { FigMatrix } from "@aurochs/fig/types";

// =============================================================================
// Identity Matrix
// =============================================================================

/**
 * Identity matrix constant
 */
export const IDENTITY_MATRIX: FigMatrix = {
  m00: 1,
  m01: 0,
  m02: 0,
  m10: 0,
  m11: 1,
  m12: 0,
};

// =============================================================================
// Matrix Operations
// =============================================================================

/**
 * Check if a matrix is the identity matrix
 */
export function isIdentityMatrix(matrix: FigMatrix | undefined): boolean {
  if (!matrix) {
    return true;
  }
  return (
    matrix.m00 === 1 && matrix.m01 === 0 && matrix.m02 === 0 && matrix.m10 === 0 && matrix.m11 === 1 && matrix.m12 === 0
  );
}

/**
 * Create a translation matrix
 */
export function createTranslationMatrix(x: number, y: number): FigMatrix {
  return {
    m00: 1,
    m01: 0,
    m02: x,
    m10: 0,
    m11: 1,
    m12: y,
  };
}

/**
 * Create a scale matrix
 */
export function createScaleMatrix(sx: number, sy: number): FigMatrix {
  return {
    m00: sx,
    m01: 0,
    m02: 0,
    m10: 0,
    m11: sy,
    m12: 0,
  };
}

/**
 * Create a rotation matrix (angle in radians)
 */
export function createRotationMatrix(angle: number): FigMatrix {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    m00: cos,
    m01: -sin,
    m02: 0,
    m10: sin,
    m11: cos,
    m12: 0,
  };
}

/**
 * Multiply two matrices
 */
export function multiplyMatrices(a: FigMatrix, b: FigMatrix): FigMatrix {
  return {
    m00: a.m00 * b.m00 + a.m01 * b.m10,
    m01: a.m00 * b.m01 + a.m01 * b.m11,
    m02: a.m00 * b.m02 + a.m01 * b.m12 + a.m02,
    m10: a.m10 * b.m00 + a.m11 * b.m10,
    m11: a.m10 * b.m01 + a.m11 * b.m11,
    m12: a.m10 * b.m02 + a.m11 * b.m12 + a.m12,
  };
}

/**
 * Extract translation from matrix
 */
export function extractTranslation(matrix: FigMatrix): { x: number; y: number } {
  return { x: matrix.m02, y: matrix.m12 };
}

/**
 * Extract scale from matrix (approximate, ignores rotation)
 */
export function extractScale(matrix: FigMatrix): { x: number; y: number } {
  const scaleX = Math.sqrt(matrix.m00 * matrix.m00 + matrix.m10 * matrix.m10);
  const scaleY = Math.sqrt(matrix.m01 * matrix.m01 + matrix.m11 * matrix.m11);
  return { x: scaleX, y: scaleY };
}

/**
 * Extract rotation from matrix (in radians)
 */
export function extractRotation(matrix: FigMatrix): number {
  return Math.atan2(matrix.m10, matrix.m00);
}
