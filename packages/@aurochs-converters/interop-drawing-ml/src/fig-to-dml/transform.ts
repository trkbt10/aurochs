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
import type { Pixels, Degrees } from "@aurochs-office/drawing-ml/domain/units";
import { px, deg } from "@aurochs-office/drawing-ml/domain/units";

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
    x: px(matrix.m02) as Pixels,
    y: px(matrix.m12) as Pixels,
    width: px(Math.abs(width)) as Pixels,
    height: px(Math.abs(height)) as Pixels,
    rotation: deg(normalizeAngle(rotation)) as Degrees,
    flipH,
    flipV: false,
  };
}

function normalizeAngle(d: number): number {
  let a = d % 360;
  if (a < 0) a += 360;
  return a;
}
