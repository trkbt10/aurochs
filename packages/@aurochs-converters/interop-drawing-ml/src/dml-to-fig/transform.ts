/**
 * @file DrawingML Transform → FigMatrix + FigVector
 *
 * DrawingML: decomposed x, y, width, height, rotation, flipH, flipV
 * Figma: 2x3 affine matrix [cos -sin tx; sin cos ty] + size {x, y}
 *
 * In Figma's model, the matrix typically has unit scale — the size
 * vector carries dimensions. We compose:
 *   translate(x, y) × rotate(rotation) × flip
 */

import type { Transform } from "@aurochs-office/drawing-ml/domain/geometry";
import type { FigMatrix, FigVector } from "@aurochs/fig/types";

export type FigTransformResult = {
  readonly transform: FigMatrix;
  readonly size: FigVector;
};

export function dmlTransformToFig(transform: Transform): FigTransformResult {
  const rotRad = ((transform.rotation as number) * Math.PI) / 180;
  const cos = Math.cos(rotRad);
  const sin = Math.sin(rotRad);

  let m00 = cos;
  let m01 = -sin;
  let m10 = sin;
  let m11 = cos;

  if (transform.flipH) { m00 = -m00; m10 = -m10; }
  if (transform.flipV) { m01 = -m01; m11 = -m11; }

  return {
    transform: {
      m00, m01,
      m02: transform.x as number,
      m10, m11,
      m12: transform.y as number,
    },
    size: {
      x: transform.width as number,
      y: transform.height as number,
    },
  };
}
