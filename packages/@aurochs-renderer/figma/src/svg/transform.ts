/**
 * @file SVG transform attribute building
 *
 * SVG-specific transform serialization. Matrix math operations
 * are in core/transform.ts for shared use.
 */

import type { FigMatrix } from "@aurochs/fig/types";
import { isIdentityMatrix } from "../core/transform";

// =============================================================================
// SVG-Specific Transform
// =============================================================================

/**
 * Build SVG transform attribute from Figma matrix
 *
 * Figma uses a 2x3 affine matrix:
 * | m00 m01 m02 |   | a c tx |
 * | m10 m11 m12 | = | b d ty |
 *
 * SVG matrix() is: matrix(a, b, c, d, tx, ty)
 */
export function buildTransformAttr(matrix: FigMatrix | undefined): string {
  if (!matrix) {
    return "";
  }
  if (isIdentityMatrix(matrix)) {
    return "";
  }

  const { m00, m01, m02, m10, m11, m12 } = matrix;
  // SVG matrix format: matrix(a, b, c, d, e, f)
  // where: a=scaleX, b=skewY, c=skewX, d=scaleY, e=translateX, f=translateY
  return `matrix(${m00}, ${m10}, ${m01}, ${m11}, ${m02}, ${m12})`;
}
