/**
 * @file Fill utility functions
 *
 * Utilities for creating and inspecting Fill values.
 */

import type { Color } from "@aurochs-office/drawing-ml/domain/color";
import type { BaseFill, GradientStop } from "@aurochs-office/drawing-ml/domain/fill";
import { deg, pct } from "@aurochs-office/drawing-ml/domain/units";
import type { SelectOption } from "@aurochs-ui/ui-components/types";

export type FillType = BaseFill["type"];

export const fillTypeOptions: SelectOption<FillType>[] = [
  { value: "noFill", label: "None" },
  { value: "solidFill", label: "Solid" },
  { value: "gradientFill", label: "Gradient" },
];

/** Create a Color with sRGB spec from hex string. */
export function createDefaultColor(hex: string): Color {
  return { spec: { type: "srgb", value: hex } };
}

/** Create a default Fill value for the given type. */
export function createDefaultFill(type: FillType): BaseFill {
  switch (type) {
    case "noFill":
      return { type: "noFill" };
    case "solidFill":
      return { type: "solidFill", color: createDefaultColor("000000") };
    case "gradientFill":
      return {
        type: "gradientFill",
        stops: [
          { position: pct(0), color: createDefaultColor("000000") },
          { position: pct(100), color: createDefaultColor("FFFFFF") },
        ],
        linear: { angle: deg(90), scaled: true },
        rotWithShape: true,
      };
    default:
      return { type: "noFill" };
  }
}

/** Extract hex string from Color, defaulting to "000000" for non-sRGB. */
export function getHexFromColor(color: Color): string {
  return color.spec.type === "srgb" ? color.spec.value : "000000";
}

/** Extract hex string from GradientStop color. */
export function getStopHex(stop: GradientStop): string {
  return stop.color.spec.type === "srgb" ? stop.color.spec.value : "888888";
}
