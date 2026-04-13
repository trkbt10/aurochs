/**
 * @file Transform conversion — shared SoT for SceneGraph AffineMatrix → SVG transform
 *
 * Both SVG string and React renderers MUST use this function.
 */

import type { AffineMatrix } from "../types";

/**
 * Convert an AffineMatrix to an SVG transform attribute string.
 * Returns undefined for identity matrices (avoids unnecessary DOM attribute).
 */
export function matrixToSvgTransform(m: AffineMatrix): string | undefined {
  if (
    Math.abs(m.m00 - 1) < 1e-6 &&
    Math.abs(m.m01) < 1e-6 &&
    Math.abs(m.m02) < 1e-6 &&
    Math.abs(m.m10) < 1e-6 &&
    Math.abs(m.m11 - 1) < 1e-6 &&
    Math.abs(m.m12) < 1e-6
  ) {
    return undefined;
  }
  // SVG matrix(a, b, c, d, e, f) = matrix(m00, m10, m01, m11, m02, m12)
  return `matrix(${m.m00},${m.m10},${m.m01},${m.m11},${m.m02},${m.m12})`;
}
