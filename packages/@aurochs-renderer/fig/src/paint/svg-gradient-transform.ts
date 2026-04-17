/**
 * @file SSoT: Figma paint.transform → SVG gradient attributes
 *
 * This module is the single authoritative source for converting Figma's
 * gradient paint transform matrix into SVG gradient element attributes
 * (gradientTransform for radial, x1/y1/x2/y2 for linear).
 *
 * Every caller that emits a `<linearGradient>` or `<radialGradient>` MUST
 * obtain its attributes from the functions here. Duplicating the math in
 * individual renderers (SVG string, scene-graph, React, WebGL, image-
 * pattern finalize) causes drift — a 1px sign flip in one place propagates
 * into an entire column of gradient-colour diffs because downstream
 * elements (vector fills, OVERLAY-blended world maps, HUE-blended
 * passport panels) all sample the shifted gradient and composite against
 * wrong base colours.
 *
 * The output is designed to match Figma's SVG export byte-for-byte where
 * possible, so pixelmatch diffs shrink to aliasing-only variance.
 */

import type { FigGradientPaint, FigGradientTransform } from "@aurochs/fig/types";

// =============================================================================
// Types
// =============================================================================

/**
 * Attributes needed to construct an SVG <linearGradient> element.
 *
 * `gradientUnits` is always `"userSpaceOnUse"` — we always compute absolute
 * pixel coordinates so the gradient follows the shape regardless of
 * bounding-box quirks (objectBoundingBox has surprising behaviour with
 * stroked elements and transformed parents).
 */
export type SvgLinearGradientAttrs = {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly gradientUnits: "userSpaceOnUse";
};

/**
 * Attributes needed to construct an SVG <radialGradient> element.
 *
 * The gradient is defined in a canonical form (cx=0, cy=0, r=1) and
 * positioned/shaped via `gradientTransform`. This mirrors Figma's SVG
 * export convention and keeps the transform math in one place.
 */
export type SvgRadialGradientAttrs = {
  readonly cx: "0";
  readonly cy: "0";
  readonly r: "1";
  readonly gradientUnits: "userSpaceOnUse";
  readonly gradientTransform: string;
};

export type ElementSize = {
  readonly width: number;
  readonly height: number;
};

// =============================================================================
// Transform extraction
// =============================================================================

function m(t: FigGradientTransform | undefined, field: keyof FigGradientTransform, fallback: number): number {
  const v = t?.[field];
  return typeof v === "number" ? v : fallback;
}

// =============================================================================
// Linear gradient
// =============================================================================

/**
 * Compute SVG linear gradient endpoints from a Figma paint transform.
 *
 * Figma's gradient-space convention (derived by inverting actual Figma
 * exports — see spec for World-map and Flair test vectors):
 *
 *   (grad_x, grad_y) = (m00·obj_x + m01·obj_y + m02,
 *                       m10·obj_x + m11·obj_y + m12)
 *
 * The transform maps object-space (0..1, 0..1) → gradient space. Linear
 * gradient stops sit on the grad_x axis only:
 *
 *   grad_x = 0  →  0% stop (first stop in paint.stops)
 *   grad_x = 1  →  100% stop (last stop in paint.stops)
 *
 * To emit a <linearGradient>, we need one object-space point on the
 * `grad_x = 0` line (→ x1, y1) and one on the `grad_x = 1` line (→ x2,
 * y2). The gradient-space origin (0, 0) and (1, 0) back-map through the
 * matrix's inverse to give these points.
 *
 * Verification (spec): World map (90° rotation) produces a vertical
 * top→bottom gradient; Flair (identity-x, squashed-y) produces a
 * horizontal left→right gradient. Both match Figma's actual SVG output
 * direction.
 *
 * Returns `undefined` when the paint has no transform — callers use the
 * objectBoundingBox (0%..100%) form as the authoritative no-transform
 * behaviour, not as a fallback for failed math.
 *
 * Throws on a non-invertible 2×2 upper block. A zero determinant means
 * `grad_x` does not depend on object position (grad_x is constant
 * across the whole element), so "0% stop line" vs "100% stop line" is
 * mathematically undefined — no direction we emit would be correct.
 * We refuse to invent one. Figma does not emit such matrices for valid
 * linear-gradient paints; callers receiving this error should treat the
 * paint as malformed rather than silently accept a wrong direction.
 */
export function linearGradientAttrs(
  paint: FigGradientPaint,
  elementSize: ElementSize,
): SvgLinearGradientAttrs | undefined {
  const t = paint.transform;
  if (!t) return undefined;
  const { width: w, height: h } = elementSize;

  const m00 = m(t, "m00", 1);
  const m01 = m(t, "m01", 0);
  const m02 = m(t, "m02", 0);
  const m10 = m(t, "m10", 0);
  const m11 = m(t, "m11", 1);
  const m12 = m(t, "m12", 0);

  // Invert the 2×2 upper block of the Kiwi matrix to back-map
  // gradient-space endpoints into object space.
  //   [[m00 m01 m02],    inv (upper 2×2):
  //    [m10 m11 m12]]       1/det · [[ m11  -m01],
  //                                  [-m10   m00]]
  //   translation inverse:  -inv2x2 · (m02, m12)
  const det = m00 * m11 - m01 * m10;
  if (det === 0) {
    throw new Error(
      `linearGradientAttrs: paint.transform has zero determinant ` +
        `(m00=${m00}, m01=${m01}, m10=${m10}, m11=${m11}). ` +
        `grad_x cannot vary across the object — the gradient direction ` +
        `is undefined. Figma does not emit such matrices for valid ` +
        `linear-gradient paints.`,
    );
  }

  const invDet = 1 / det;
  const inv00 = m11 * invDet;
  const inv01 = -m01 * invDet;
  const inv10 = -m10 * invDet;
  const inv11 = m00 * invDet;
  // Full inverse translation: -inv2x2 · (m02, m12). We only need the
  // left column (grad_x=0 → object space origin) and inv00/inv10
  // (gradient-x unit-vector image in object space) — the y-column of
  // the inverse (inv01, inv11) enters only through invTx/invTy.
  const invTx = -(inv00 * m02 + inv01 * m12);
  const invTy = -(inv10 * m02 + inv11 * m12);

  // Back-map gradient (0, 0) → object space → pixel (0% stop line)
  // Back-map gradient (1, 0) → object space → pixel (100% stop line)
  const objX0 = invTx;
  const objY0 = invTy;
  const objX1 = inv00 + invTx;
  const objY1 = inv10 + invTy;

  return {
    x1: objX0 * w,
    y1: objY0 * h,
    x2: objX1 * w,
    y2: objY1 * h,
    gradientUnits: "userSpaceOnUse",
  };
}

// =============================================================================
// Radial gradient
// =============================================================================

/**
 * Compute SVG gradientTransform for a radial gradient from a Figma paint
 * transform.
 *
 * Figma's radial gradient is defined on the unit circle centred at (0.5,
 * 0.5) with radius 0.5 in gradient space. paint.transform maps that
 * gradient-space unit circle into normalized object space.
 *
 * The SVG canonical gradient is cx=0, cy=0, r=1. To map our canonical
 * unit circle onto Figma's positioned/shaped ellipse in user space, we
 * emit `translate(cx, cy) rotate(angle) scale(rx, ry)` where:
 *
 *   - (cx, cy)      = centre of the ellipse in user-space pixels
 *   - angle         = rotation of the ellipse's primary axis (first
 *                     gradient-space axis image) from the user-space x-axis
 *   - (rx, ry)      = half-lengths of the ellipse's two axes
 *
 * The centre is Figma-matrix × (0.5, 0.5) scaled to pixels:
 *   cx = (m00 * 0.5 + m01 * 0.5 + m02) * w
 *   cy = (m10 * 0.5 + m11 * 0.5 + m12) * h
 *
 * The two axes are the images of (0.5, 0) and (0, 0.5) measured from the
 * centre:
 *   axis1 = (m00 * w, m10 * h) × 0.5
 *   axis2 = (m01 * w, m11 * h) × 0.5
 *
 * rx / ry are the lengths of these axes. angle is atan2(axis1.y, axis1.x).
 */
export function radialGradientAttrs(
  paint: FigGradientPaint,
  elementSize: ElementSize,
): SvgRadialGradientAttrs | undefined {
  const t = paint.transform;
  if (!t) return undefined;
  const { width: w, height: h } = elementSize;

  const m00 = m(t, "m00", 1);
  const m01 = m(t, "m01", 0);
  const m02 = m(t, "m02", 0);
  const m10 = m(t, "m10", 0);
  const m11 = m(t, "m11", 1);
  const m12 = m(t, "m12", 0);

  const cx = (m00 * 0.5 + m01 * 0.5 + m02) * w;
  const cy = (m10 * 0.5 + m11 * 0.5 + m12) * h;

  const ax1x = m00 * w * 0.5;
  const ax1y = m10 * h * 0.5;
  const ax2x = m01 * w * 0.5;
  const ax2y = m11 * h * 0.5;

  const rx = Math.hypot(ax1x, ax1y);
  const ry = Math.hypot(ax2x, ax2y);

  const angle = (Math.atan2(ax1y, ax1x) * 180) / Math.PI;

  return {
    cx: "0",
    cy: "0",
    r: "1",
    gradientUnits: "userSpaceOnUse",
    gradientTransform: `translate(${cx} ${cy}) rotate(${angle}) scale(${rx} ${ry})`,
  };
}
