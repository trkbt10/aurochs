/**
 * @file DrawingML Color → FigColor
 *
 * DrawingML colors are polymorphic: sRGB, scheme, system, HSL, scRGB, preset.
 * Scheme colors require a ColorContext to resolve to hex.
 *
 * All color specs are resolved to sRGB hex, then color transforms (tint,
 * shade, lumMod, satMod, etc.) are applied via @aurochs/color (SoT for
 * color operations). Finally the result is converted to RGBA 0-1.
 *
 * Alpha comes from ColorTransform.alpha (0-100 → 0-1).
 */

import type { Color, ColorSpec, SchemeColorValue } from "@aurochs-office/drawing-ml/domain/color";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FigColor } from "@aurochs/fig/types";
import {
  applyTint,
  applyShade,
  applyLumMod,
  applyLumOff,
  applySatMod,
  hexToRgb,
  hslToHexString,
} from "@aurochs/color";

export function dmlColorToFig(color: Color, colorContext?: ColorContext): FigColor {
  let hex = resolveColorSpec(color.spec, colorContext);

  // Apply color transforms per ECMA-376 §20.1.2.3 via @aurochs/color SoT
  const t = color.transform;
  if (t) {
    // tint: DrawingML value is Percent (0-100), @aurochs/color expects 0-1
    if (t.tint !== undefined) {
      hex = applyTint(hex, (t.tint as number) / 100);
    }

    // shade: DrawingML value is Percent (0-100), @aurochs/color expects 0-1
    if (t.shade !== undefined) {
      hex = applyShade(hex, (t.shade as number) / 100);
    }

    // lumMod: DrawingML value is Percent (0-100), @aurochs/color expects multiplier
    if (t.lumMod !== undefined) {
      hex = applyLumMod(hex, (t.lumMod as number) / 100);
    }

    // lumOff: DrawingML value is Percent (0-100), @aurochs/color expects 0-1 offset
    if (t.lumOff !== undefined) {
      hex = applyLumOff(hex, (t.lumOff as number) / 100);
    }

    // satMod: DrawingML value is Percent (0-100), @aurochs/color expects multiplier
    if (t.satMod !== undefined) {
      hex = applySatMod(hex, (t.satMod as number) / 100);
    }
  }

  const rgb = hexToRgb(hex);

  let alpha = 1;
  if (t?.alpha !== undefined) {
    alpha = (t.alpha as number) / 100;
  }

  return { r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255, a: alpha };
}

function resolveColorSpec(spec: ColorSpec, ctx?: ColorContext): string {
  switch (spec.type) {
    case "srgb":
      return spec.value;

    case "scheme":
      if (!ctx) return "000000";
      return resolveSchemeColor(spec.value, ctx);

    case "system":
      return spec.lastColor ?? "000000";

    case "preset":
      return PRESET_COLORS[spec.value] ?? "000000";

    case "hsl": {
      // ECMA-376 §20.1.2.3.13: hue is Degrees (0-360), sat/lum are Percent (0-100)
      // @aurochs/color hslToHexString expects h:0-360, s:0-1, l:0-1
      const h = spec.hue as number;
      const s = (spec.saturation as number) / 100;
      const l = (spec.luminance as number) / 100;
      return hslToHexString({ h, s, l, a: 1 });
    }

    case "scrgb": {
      const toHex = (v: number) => Math.round(clamp01(v / 100) * 255).toString(16).padStart(2, "0").toUpperCase();
      return toHex(spec.red as number) + toHex(spec.green as number) + toHex(spec.blue as number);
    }

    default:
      return "000000";
  }
}

function resolveSchemeColor(value: SchemeColorValue, ctx: ColorContext): string {
  const mapped = ctx.colorMap[value] ?? value;
  return ctx.colorScheme[mapped] ?? "000000";
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

const PRESET_COLORS: Record<string, string> = {
  black: "000000", white: "FFFFFF", red: "FF0000", green: "008000",
  blue: "0000FF", yellow: "FFFF00", cyan: "00FFFF", magenta: "FF00FF",
  gray: "808080", darkGray: "A9A9A9", lightGray: "D3D3D3", orange: "FFA500",
  pink: "FFC0CB", purple: "800080", brown: "A52A2A", navy: "000080",
  teal: "008080", olive: "808000", maroon: "800000", silver: "C0C0C0",
};
