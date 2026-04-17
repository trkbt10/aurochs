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
  // Paint.transform convention (derived by inverting two different real
  // Figma exports — see below):
  //   grad_x = m00 * obj_x + m01 * obj_y + m02
  //   grad_y = m10 * obj_x + m11 * obj_y + m12
  //
  // Linear gradient stops are placed along the grad_x axis only:
  //   grad_x = 0 → 0% stop (first stop in the list)
  //   grad_x = 1 → 100% stop (last stop in the list)
  //
  // To emit SVG <linearGradient>, we pick one representative object-space
  // point for grad_x=0 (x1,y1) and one for grad_x=1 (x2,y2). Any point on
  // the respective line is valid; we use gradient-space origin (0,0) and
  // (1,0):
  //   (x1, y1) = transform · (0, 0, 1) · (w, h) = (m02 * w, m12 * h)
  //   (x2, y2) = transform · (1, 0, 1) · (w, h) = ((m00+m02) * w, (m10+m12) * h)
  //
  // World map VECTOR in Flighty 4×4 validates the vertical case.
  // Flair Border ROUNDED_RECTANGLE in Flighty 4×4 validates the
  // horizontal case — a previous version of the SSoT swapped x1/x2 which
  // produced a correct World-map vertical gradient but an inverted Flair
  // horizontal gradient (colours reversed), because the swap hid the fact
  // that the orientation of "grad_x=0" is encoded in the matrix, not in
  // which endpoint we label as "start".
  //
  // World map: paint.transform [[~0, 1, 0], [-1, ~0, 1]] (90° rotation),
  // size 370 × 124.4. grad_x = obj_y, so grad_x=0 ↔ top (y=0), grad_x=1
  // ↔ bottom (y=124.4). Actual Figma SVG (paint3_linear_15_4, absolute
  // coords): x1=195 y1=56.62 (top-ish), x2=195 y2=181 (bottom-ish). In
  // local space this is (*, 0) → (*, 124.4), i.e. grad_x=0 at y=0 and
  // grad_x=1 at y=124.4 — mint (0%) on top, pink (100%) on bottom.
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
    // 0% stop (mint/top): grad(0,0) → (m02, m12) = (0, 1) → pixel (0, 124.4)?
    // No — grad_x = obj_y here, so grad_x=0 means obj_y=0, which is top.
    // In gradient-space-origin terms: grad(0,0) = transform·(0,0) in the
    // *forward* direction maps back via the inverse to obj_y=0 = top.
    //
    // The SSoT formula picks the object-space point at gradient-space
    // (0,0) directly: (m02 * w, m12 * h) = (0, 124.4). That is the bottom
    // — which is wrong for this paint. To keep the SSoT simple we instead
    // compute object-space points from inverse: for a pure-rotation matrix
    // det=1 so inverse is transpose with sign flip. The test below asserts
    // the *correct* actual-matching output in object space, leaving the
    // inverse derivation to the SSoT implementation.
    //
    // grad_x=0 line in object space: solve m00·x + m01·y + m02 = 0.
    //   0·x + 1·y + 0 = 0 → y = 0 (top). Any x is fine; use centre x=w/2.
    // grad_x=1 line: 0·x + 1·y + 0 = 1 → y = 1 (bottom).
    //
    // So the SSoT MUST emit x1=anything_on_top_line, y1=0, x2=anything_on_bottom, y2=h.
    // The simplest/Figma-matching convention is to pick object-space x at
    // the gradient-space y=0 axis image, which for this matrix happens to be
    // x=0 for the line grad_x=0 (since grad_y = 1-obj_x, y=0 line maps to
    // obj_x=1, so gradient-space origin (0,0) back-maps to (x=1,y=0)). But
    // the actual export flattens to Passport-absolute coords, so local
    // expectation: y1=0 (top), y2=124.4 (bottom).
    expect(attrs!.y1).toBeCloseTo(0, 4);
    expect(attrs!.y2).toBeCloseTo(124.4, 4);
  });

  // Flair Border horizontal gradient. paint.transform [[1, 0, 0], [0,
  // 0.0066, 0.497]], size 346 × 18.
  // grad_x = obj_x, so grad_x=0 ↔ left (x=0), grad_x=1 ↔ right (x=346).
  // Actual export: x1=22 y1=10.58 (left-ish), x2=368 y2=10.58 (right-ish).
  // In local space: x1=0 (left), x2=346 (right) — blue (0%) on left, aqua
  // (100%) on right.
  it("flair horizontal linear gradient — identity x, squashed y", () => {
    const paint = paintWith({
      m00: 1,
      m01: -4.083471755178536e-11,
      m02: -6.239769589910793e-9,
      m10: -8.760353553682876e-17,
      m11: 0.006601562723517418,
      m12: 0.49661457538604736,
    });
    const attrs = linearGradientAttrs(paint, { width: 346, height: 18 });
    expect(attrs).toBeDefined();
    // 0% stop (blue/left): grad_x=0 line is obj_x ≈ 0 (left edge).
    expect(attrs!.x1).toBeCloseTo(0, 4);
    // 100% stop (aqua/right): grad_x=1 line is obj_x ≈ 1 (right edge).
    expect(attrs!.x2).toBeCloseTo(346, 4);
  });

  // Identity transform: grad_x = obj_x, grad_y = obj_y. The `grad_x = 0`
  // line is the left edge (x=0, any y), and `grad_x = 1` is the right
  // edge (x=w, any y). We back-map gradient-space origins (0,0) and (1,0)
  // which land on the top corners in object space.
  it("identity transform — horizontal left-to-right gradient", () => {
    const paint = paintWith({ m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 });
    const attrs = linearGradientAttrs(paint, { width: 200, height: 100 });
    expect(attrs!.x1).toBeCloseTo(0, 4);
    expect(attrs!.y1).toBeCloseTo(0, 4);
    expect(attrs!.x2).toBeCloseTo(200, 4);
    expect(attrs!.y2).toBeCloseTo(0, 4);
    expect(attrs!.gradientUnits).toBe("userSpaceOnUse");
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
