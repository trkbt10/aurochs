/**
 * @file DrawingML Color → FigColor
 *
 * DrawingML colors are polymorphic: sRGB, scheme, system, HSL, scRGB, preset.
 * Scheme colors require a ColorContext to resolve to hex.
 *
 * All color specs are resolved to sRGB hex, then converted to RGBA 0-1.
 * Alpha comes from ColorTransform.alpha (0-100 → 0-1).
 */

import type { Color, ColorSpec, SchemeColorValue } from "@aurochs-office/drawing-ml/domain/color";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FigColor } from "@aurochs/fig/types";

export function dmlColorToFig(color: Color, colorContext?: ColorContext): FigColor {
  const hex = resolveColorSpec(color.spec, colorContext);
  const { r, g, b } = hexToRgb(hex);

  let alpha = 1;
  if (color.transform?.alpha !== undefined) {
    alpha = (color.transform.alpha as number) / 100;
  }

  return { r, g, b, a: alpha };
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
      const h = (spec.hue as number) / 360;
      const s = (spec.saturation as number) / 100;
      const l = (spec.luminance as number) / 100;
      return hslToHex(h, s, l);
    }

    case "scrgb":
      return (
        componentToHex(clamp01((spec.red as number) / 100)) +
        componentToHex(clamp01((spec.green as number) / 100)) +
        componentToHex(clamp01((spec.blue as number) / 100))
      );

    default:
      return "000000";
  }
}

function resolveSchemeColor(value: SchemeColorValue, ctx: ColorContext): string {
  const mapped = ctx.colorMap[value] ?? value;
  return ctx.colorScheme[mapped] ?? "000000";
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace("#", "");
  return {
    r: parseInt(cleaned.substring(0, 2), 16) / 255,
    g: parseInt(cleaned.substring(2, 4), 16) / 255,
    b: parseInt(cleaned.substring(4, 6), 16) / 255,
  };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function componentToHex(v: number): string {
  return Math.round(v * 255).toString(16).padStart(2, "0").toUpperCase();
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  const sector = Math.floor(h * 6) % 6;
  switch (sector) {
    case 0: r = c; g = x; break;
    case 1: r = x; g = c; break;
    case 2: g = c; b = x; break;
    case 3: g = x; b = c; break;
    case 4: r = x; b = c; break;
    case 5: r = c; b = x; break;
  }
  return componentToHex(r + m) + componentToHex(g + m) + componentToHex(b + m);
}

const PRESET_COLORS: Record<string, string> = {
  black: "000000", white: "FFFFFF", red: "FF0000", green: "008000",
  blue: "0000FF", yellow: "FFFF00", cyan: "00FFFF", magenta: "FF00FF",
  gray: "808080", darkGray: "A9A9A9", lightGray: "D3D3D3", orange: "FFA500",
  pink: "FFC0CB", purple: "800080", brown: "A52A2A", navy: "000080",
  teal: "008080", olive: "808000", maroon: "800000", silver: "C0C0C0",
};
