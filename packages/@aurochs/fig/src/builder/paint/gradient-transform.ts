/**
 * @file Gradient handle positions → Kiwi transform matrix conversion
 *
 * The Kiwi schema stores gradients as an affine transform matrix
 * that maps gradient-local coordinates to the shape's normalized
 * [0,1]×[0,1] coordinate space.
 *
 * Gradient-local coordinate system:
 * - x-axis: gradient direction (0=start, 1=end for linear; 0=center, 1=edge for radial)
 * - y-axis: perpendicular to gradient direction
 *
 * The builder API uses handle positions (points in 0-1 space)
 * which are the user-facing representation from the Figma API.
 * These must be converted to the matrix form for Kiwi encoding.
 */

type Matrix = {
  readonly m00: number;
  readonly m01: number;
  readonly m02: number;
  readonly m10: number;
  readonly m11: number;
  readonly m12: number;
};

/**
 * Convert linear gradient handle positions to a Kiwi transform matrix.
 *
 * Handle positions: [start, end] in shape-normalized 0-1 space.
 *
 * The matrix maps:
 * - gradient (0,0) → end point
 * - gradient (1,0) → start point
 * - gradient (0,1) → perpendicular offset from end
 */
export function linearHandlesToTransform(
  start: { x: number; y: number },
  end: { x: number; y: number },
): Matrix {
  const dx = start.x - end.x;
  const dy = start.y - end.y;
  return {
    m00: dx,
    m01: -dy,
    m02: end.x,
    m10: dy,
    m11: dx,
    m12: end.y,
  };
}

/**
 * Convert radial gradient parameters to a Kiwi transform matrix.
 *
 * The matrix maps:
 * - gradient (0,0) → center point
 * - gradient (1,0) → center + (radiusX, 0)
 * - gradient (0,1) → center + (0, radiusY)
 */
export function radialParamsToTransform(
  center: { x: number; y: number },
  radiusX: number,
  radiusY: number,
): Matrix {
  return {
    m00: radiusX,
    m01: 0,
    m02: center.x,
    m10: 0,
    m11: radiusY,
    m12: center.y,
  };
}

/**
 * Convert angular/diamond gradient handle positions to a Kiwi transform matrix.
 *
 * Handle positions: [center, xAxisEnd, yAxisEnd] in shape-normalized 0-1 space.
 *
 * The matrix maps:
 * - gradient (0,0) → center
 * - gradient (1,0) → xAxisEnd
 * - gradient (0,1) → yAxisEnd
 */
export function axialHandlesToTransform(
  center: { x: number; y: number },
  xAxisEnd: { x: number; y: number },
  yAxisEnd: { x: number; y: number },
): Matrix {
  return {
    m00: xAxisEnd.x - center.x,
    m01: yAxisEnd.x - center.x,
    m02: center.x,
    m10: xAxisEnd.y - center.y,
    m11: yAxisEnd.y - center.y,
    m12: center.y,
  };
}
