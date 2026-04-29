/**
 * @file FigMatrix + FigVector → DrawingML Transform
 *
 * Figma: 2x3 affine matrix [a c tx; b d ty] + separate size vector
 * DrawingML: decomposed x, y, width, height, rotation, flipH, flipV
 *
 * Decomposition via the column vectors of the 2x2 part:
 *   scaleX = sqrt(a² + b²)
 *   scaleY = sqrt(c² + d²)
 *   rotation = atan2(b, a)
 *   flipH = det(matrix) < 0
 *
 * Skew cannot be represented in DrawingML's Transform — it is lost.
 */

import type { FigMatrix, FigVector } from "@aurochs/fig/types";
import type { Transform } from "@aurochs-office/drawing-ml/domain/geometry";
import { px, deg } from "@aurochs-office/drawing-ml/domain/units";






/** Converts a Figma transform matrix and size to a DrawingML transform definition. */
export function figTransformToDml(matrix: FigMatrix, size: FigVector): Transform {
  const a = matrix.m00;
  const b = matrix.m10;
  const c = matrix.m01;
  const d = matrix.m11;

  const det = a * d - b * c;
  const scaleX = Math.sqrt(a * a + b * b);
  const scaleY = Math.sqrt(c * c + d * d);
  const rotation = Math.atan2(b, a) * (180 / Math.PI);
  const flipH = det < 0;

  const width = size.x * scaleX;
  const height = size.y * scaleY;

  return {
    x: px(matrix.m02),
    y: px(matrix.m12),
    width: px(Math.abs(width)),
    height: px(Math.abs(height)),
    rotation: deg(normalizeAngle(rotation)),
    flipH,
    flipV: false,
  };
}

/**
 * Wrap a degree value into the half-open range [0, 360).
 *
 * Naive `(d % 360) + 360` for negative inputs can land on a value
 * arbitrarily close to 360 (e.g. when `d` is a near-zero negative
 * floating-point value like `-1e-15`), which then rounds to exactly
 * `360°` downstream. ECMA-376 ST_PositiveFixedAngle excludes 360
 * and PowerPoint flags `rot="21600000"` as out of range. Snap such
 * boundary cases back to 0.
 */
function normalizeAngle(d: number): number {
  const a = d % 360;
  const wrapped = a < 0 ? a + 360 : a;
  return wrapped >= 360 || wrapped < 0 ? 0 : wrapped;
}
