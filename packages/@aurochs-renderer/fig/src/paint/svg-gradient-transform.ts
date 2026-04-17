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
 * Figma's gradient-space convention (verified against actual exports):
 *   Gradient-space point (1, 0) corresponds to the 0% stop (start handle).
 *   Gradient-space point (0, 0) corresponds to the 100% stop (end handle).
 * The paint.transform matrix maps gradient space → normalized object
 * space (coordinates in [0, 1]). Multiplying by (width, height) yields
 * user-space pixel coordinates for SVG's `userSpaceOnUse`.
 *
 * Verification: Flighty 4×4 World map, paint.transform =
 * [[0, 1, 0], [-1, 0, 1]], element size 370×124.4. Figma's actual export
 * emits x1=0-ish (top), y1=0 (top, mint/0% stop), x2=0 (top-ish x), y2=124.4
 * (bottom, pink/100% stop) — i.e. (1,0) maps to the top (0% stop) and
 * (0,0) maps to the bottom (100% stop). Flipping this convention produces
 * upside-down gradients that cascade through OVERLAY / HUE blends.
 *
 * Returns `undefined` when transform is missing — callers should fall back
 * to objectBoundingBox form.
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

  // 0% stop: gradient (1, 0) → normalized (m00 + m02, m10 + m12) → pixel
  const x1 = (m00 + m02) * w;
  const y1 = (m10 + m12) * h;

  // 100% stop: gradient (0, 0) → normalized (m02, m12) → pixel
  const x2 = m02 * w;
  const y2 = m12 * h;

  return { x1, y1, x2, y2, gradientUnits: "userSpaceOnUse" };
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
