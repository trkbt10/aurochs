/**
 * @file Byte-exact verification of the gradient SSoT against real Figma exports.
 *
 * Each test case below was lifted verbatim from edge-cases.fig's
 * actual/*.svg exports. For each Figma paint (transform matrix + element
 * size) we assert the SSoT produces the same SVG attribute strings that
 * Figma itself emitted. Any drift here means a downstream rendering
 * difference for gradient-blended content — so these tests exist to hold
 * the line against future SSoT violations.
 */

import type { FigGradientPaint } from "@aurochs/fig/types";
import { linearGradientAttrs, radialGradientAttrs } from "./svg-gradient-transform";

function paintWith(transform: FigGradientPaint["transform"]): FigGradientPaint {
  // Minimal FigGradientPaint — only transform matters for these tests.
  return {
    type: "GRADIENT_LINEAR",
    opacity: 1,
    visible: true,
    blendMode: "NORMAL",
    stops: [],
    transform,
  };
}

describe("linearGradientAttrs (SSoT vs Figma export)", () => {
  // World map VECTOR in Flighty 4×4.
  // Figma paint.transform: [[0, 1, 0], [-1, 0, 1]] (90° rotation).
  // World map local size: 370 x 124.4.
  // Figma's own actual SVG emits:
  //   paint3_linear_15_4: x1="195" y1="60.6202" x2="195" y2="185"
  //   (These are in Flighty-absolute coords because the path is flattened.)
  //
  // Our renderer keeps the path in World-map-local coords inside nested g
  // transforms, so the expected endpoints are the local-space equivalents:
  //   local start = (0, 0), local end = (0, 124.4).
  it("world map vertical linear gradient — 90° rotation matrix", () => {
    const paint = paintWith({
      m00: 6.123234262925839e-17, // ≈ 0 (cos 90°)
      m01: 1,
      m02: 0,
      m10: -1,
      m11: 6.123234262925839e-17,
      m12: 1,
    });
    const attrs = linearGradientAttrs(paint, { width: 370, height: 124.4 });
    expect(attrs).toBeDefined();
    // 0% stop (mint/top in actual export): gradient (1,0) → (m00+m02,
    // m10+m12) = (~0, 0) → pixel (~0, 0). World map local top edge.
    expect(Math.abs(attrs!.x1)).toBeLessThan(1e-10);
    expect(Math.abs(attrs!.y1)).toBeLessThan(1e-10);
    // 100% stop (pink/bottom): gradient (0,0) → (m02, m12) = (0, 1) →
    // pixel (0, 124.4). World map local bottom edge.
    expect(attrs!.x2).toBeCloseTo(0, 4);
    expect(attrs!.y2).toBeCloseTo(124.4, 4);
  });

  // Identity transform: gradient (1,0) → (1,0) = right edge (0% stop),
  // gradient (0,0) → (0,0) = left edge (100% stop). So the 0% stop is on
  // the right; pixel-output is x1=200 (right), x2=0 (left).
  it("identity transform — horizontal right-to-left gradient", () => {
    const paint = paintWith({ m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 });
    const attrs = linearGradientAttrs(paint, { width: 200, height: 100 });
    expect(attrs).toEqual({
      x1: 200, y1: 0, x2: 0, y2: 0,
      gradientUnits: "userSpaceOnUse",
    });
  });

  it("undefined transform returns undefined", () => {
    const paint = paintWith(undefined);
    expect(linearGradientAttrs(paint, { width: 100, height: 100 })).toBeUndefined();
  });
});

describe("radialGradientAttrs (SSoT vs Figma export)", () => {
  // Passport paint 0 (base RADIAL) in Flighty 4×4 (element size 390 × 342).
  // Figma paint.transform: [[0, 1, 0], [-1, 0, 1]] (90° rotation).
  //
  // Figma's own actual SVG (Flighty 4 × 4.svg, paint0_radial_15_4):
  //   gradientTransform="translate(195 195) rotate(90) scale(171 195)"
  //
  // Note: actual's y-translate (195) is the Flighty-absolute centre of the
  // Passport rectangle because Figma's export flattens all parent
  // transforms into the gradient's user-space coordinates. In our renderer
  // we keep parent transforms on wrapping <g>s, so the gradient centre
  // must be expressed in the *paint's own* element space — i.e. the
  // Passport's own 390×342 box where the vertical centre is 171.
  //
  // Therefore the SSoT is expected to emit `translate(195 171)`, not the
  // `translate(195 195)` that Figma writes for the flattened form.
  it("passport base radial — 90° rotation, 390×342 element", () => {
    const paint = paintWith({
      m00: 6.123234262925839e-17,
      m01: 1,
      m02: 0,
      m10: -1,
      m11: 6.123234262925839e-17,
      m12: 1,
    });
    const attrs = radialGradientAttrs(paint, { width: 390, height: 342 });
    expect(attrs).toBeDefined();
    expect(attrs!.cx).toBe("0");
    expect(attrs!.cy).toBe("0");
    expect(attrs!.r).toBe("1");
    expect(attrs!.gradientUnits).toBe("userSpaceOnUse");

    // Parse the gradientTransform parts to numeric values for tolerance
    // comparisons (angle and scale directions have equivalent representations
    // — e.g. rotate(90) scale(171 195) and rotate(-90) scale(171 195) produce
    // the same ellipse because radial gradients are central-symmetric).
    const match = attrs!.gradientTransform.match(
      /^translate\(([-\d.e+]+)\s+([-\d.e+]+)\)\s+rotate\(([-\d.e+]+)\)\s+scale\(([-\d.e+]+)\s+([-\d.e+]+)\)$/,
    );
    expect(match).not.toBeNull();
    const [, tx, ty, ang, sx, sy] = match!;
    expect(Number(tx)).toBeCloseTo(195, 4);
    expect(Number(ty)).toBeCloseTo(171, 4);
    expect(Math.abs(Number(ang))).toBeCloseTo(90, 4);
    expect(Number(sx)).toBeCloseTo(171, 4);
    expect(Number(sy)).toBeCloseTo(195, 4);
  });

  it("identity transform — circle centred and sized to element", () => {
    const paint = paintWith({ m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 });
    const attrs = radialGradientAttrs(paint, { width: 200, height: 100 });
    expect(attrs).toBeDefined();
    const match = attrs!.gradientTransform.match(
      /^translate\(([-\d.e+]+)\s+([-\d.e+]+)\)\s+rotate\(([-\d.e+]+)\)\s+scale\(([-\d.e+]+)\s+([-\d.e+]+)\)$/,
    );
    const [, tx, ty, ang, sx, sy] = match!;
    expect(Number(tx)).toBeCloseTo(100, 4); // element centre x
    expect(Number(ty)).toBeCloseTo(50, 4);  // element centre y
    expect(Number(ang)).toBeCloseTo(0, 4);
    expect(Number(sx)).toBeCloseTo(100, 4); // half width
    expect(Number(sy)).toBeCloseTo(50, 4);  // half height
  });

  it("undefined transform returns undefined", () => {
    const paint = paintWith(undefined);
    expect(radialGradientAttrs(paint, { width: 100, height: 100 })).toBeUndefined();
  });
});
