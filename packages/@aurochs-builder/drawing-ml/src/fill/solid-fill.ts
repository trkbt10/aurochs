/**
 * @file Solid fill builder for DrawingML
 */

import type { Color, ColorTransform } from "@aurochs-office/drawing-ml/domain/color";
import type { SolidFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { Percent } from "@aurochs-office/drawing-ml/domain/units";
import type { ColorInput, ThemeColorInput } from "@aurochs-office/drawing-ml/domain/spec";

/**
 * Strip leading "#" from hex color strings.
 * Internal srgb values must be stored without "#" prefix.
 */
function stripHash(hex: string): string {
  return hex.startsWith("#") ? hex.slice(1) : hex;
}

/**
 * Build a Color object from ColorInput
 */
export function buildColor(colorSpec: ColorInput): Color {
  if (typeof colorSpec === "string") {
    // Hex color - strip leading "#" for internal representation
    return { spec: { type: "srgb", value: stripHash(colorSpec) } };
  }

  // Theme color - build transform object immutably
  const transform: ColorTransform = {
    ...(colorSpec.lumMod !== undefined && { lumMod: (colorSpec.lumMod * 1000) as Percent }),
    ...(colorSpec.lumOff !== undefined && { lumOff: (colorSpec.lumOff * 1000) as Percent }),
    ...(colorSpec.tint !== undefined && { tint: (colorSpec.tint * 1000) as Percent }),
    ...(colorSpec.shade !== undefined && { shade: (colorSpec.shade * 1000) as Percent }),
  };

  return {
    spec: { type: "scheme", value: colorSpec.theme },
    transform: Object.keys(transform).length > 0 ? transform : undefined,
  };
}

/**
 * Build a solid fill object from hex color
 */
export function buildSolidFill(hexColor: string): SolidFill {
  return {
    type: "solidFill",
    color: { spec: { type: "srgb", value: stripHash(hexColor) } },
  };
}

/**
 * Build a solid fill object from ColorInput (hex or theme)
 */
export function buildSolidFillFromSpec(colorSpec: ColorInput): SolidFill {
  return {
    type: "solidFill",
    color: buildColor(colorSpec),
  };
}

/**
 * Build a theme fill object
 */
export function buildThemeFill(spec: {
  readonly theme: ThemeColorInput["theme"];
  readonly lumMod?: number;
  readonly lumOff?: number;
  readonly tint?: number;
  readonly shade?: number;
}): SolidFill {
  const themeColorInput: ThemeColorInput = {
    theme: spec.theme,
    lumMod: spec.lumMod,
    lumOff: spec.lumOff,
    tint: spec.tint,
    shade: spec.shade,
  };
  return buildSolidFillFromSpec(themeColorInput);
}
