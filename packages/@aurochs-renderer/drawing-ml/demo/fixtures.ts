/**
 * @file DrawingML Demo Fixtures
 *
 * Test fixtures and helper functions for DrawingML demos.
 */

import type { SchemeColorValue } from "@aurochs-office/pptx/domain";
import type { GradientFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import { px, deg, pct } from "@aurochs-office/drawing-ml/domain/units";

export const testSlideSize = {
  width: px(960) as Pixels,
  height: px(540) as Pixels,
};

export const testColorContext = {
  colorScheme: {
    dk1: "000000",
    lt1: "FFFFFF",
    dk2: "1F497D",
    lt2: "EEECE1",
    accent1: "4F81BD",
    accent2: "C0504D",
    accent3: "9BBB59",
    accent4: "8064A2",
    accent5: "4BACC6",
    accent6: "F79646",
    hlink: "0000FF",
    folHlink: "800080",
  },
  colorMap: {
    tx1: "dk1",
    tx2: "dk2",
    bg1: "lt1",
    bg2: "lt2",
  },
};

/**
 * Helper to create valid GradientFill objects
 */
export function makeGradient(
  angleDeg: number,
  ...colors: Array<{ pos: number; color: string | { scheme: SchemeColorValue } }>
): GradientFill {
  function toColorSpec(c: string | { scheme: SchemeColorValue }) {
    if (typeof c === "string") {
      return { type: "srgb" as const, value: c };
    }
    return { type: "scheme" as const, value: c.scheme };
  }
  return {
    type: "gradientFill",
    stops: colors.map((c) => ({
      position: pct(c.pos),
      color: { spec: toColorSpec(c.color) },
    })),
    linear: { angle: deg(angleDeg), scaled: true },
    rotWithShape: true,
  };
}
