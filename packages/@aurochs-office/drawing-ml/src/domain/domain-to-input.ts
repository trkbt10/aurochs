/**
 * @file Domain → Input type conversion utilities
 *
 * Converts domain types (ECMA-376 faithful) to input types
 * (simplified external representations). This enables editors
 * (which output domain types) to produce input types consumed
 * by the builder pipeline.
 *
 * The inverse of buildFill/buildColor which convert input → domain.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 * @see ECMA-376 Part 1, Section 20.1.2.3 (Color Types)
 */

import type { Color, ColorTransform } from "./color";
import type { BaseFill, SolidFill, GradientFill, PatternFill, BlipFill } from "./fill";
import type { Percent } from "./units";
import type {
  ColorInput,
  ThemeColorInput,
  FillInput,
  SolidFillInput,
  GradientFillInput,
  GradientStopInput,
  PatternFillInput,
  BlipFillInput,
} from "./spec";

// =============================================================================
// Color: Domain → Input
// =============================================================================

function percentToNumber(p: Percent): number {
  return (p as number) / 1000;
}

function transformToThemeModifiers(transform: ColorTransform | undefined): Partial<Omit<ThemeColorInput, "theme">> {
  if (!transform) {
    return {};
  }
  return {
    ...(transform.lumMod !== undefined ? { lumMod: percentToNumber(transform.lumMod) } : {}),
    ...(transform.lumOff !== undefined ? { lumOff: percentToNumber(transform.lumOff) } : {}),
    ...(transform.tint !== undefined ? { tint: percentToNumber(transform.tint) } : {}),
    ...(transform.shade !== undefined ? { shade: percentToNumber(transform.shade) } : {}),
    ...(transform.satMod !== undefined ? { satMod: percentToNumber(transform.satMod) } : {}),
    ...(transform.alpha !== undefined ? { alpha: percentToNumber(transform.alpha) } : {}),
  };
}

/**
 * Convert a domain Color to a ColorInput.
 *
 * - SrgbColor → hex string (e.g. "FF6B4A")
 * - SchemeColor → ThemeColorInput ({ theme: "accent1", lumMod?: ... })
 * - Other color types → hex string approximation (lossy for non-sRGB colors)
 */
export function colorToInput(color: Color): ColorInput {
  const { spec, transform } = color;

  switch (spec.type) {
    case "srgb":
      return spec.value;
    case "scheme": {
      const mods = transformToThemeModifiers(transform);
      return { theme: spec.value, ...mods };
    }
    case "system":
      return spec.lastColor ?? "000000";
    case "preset":
      return "000000";
    case "hsl":
      return "000000";
    case "scrgb":
      return rgbComponentToHex(spec.red) + rgbComponentToHex(spec.green) + rgbComponentToHex(spec.blue);
    default:
      return "000000";
  }
}

function rgbComponentToHex(value: number): string {
  const clamped = Math.max(0, Math.min(255, Math.round((value as number) / 100000 * 255)));
  return clamped.toString(16).padStart(2, "0");
}

// =============================================================================
// Fill: Domain → Input
// =============================================================================

function solidFillToInput(fill: SolidFill): SolidFillInput {
  return {
    type: "solid",
    color: colorToInput(fill.color),
  };
}

function gradientFillToInput(fill: GradientFill): GradientFillInput {
  const stops: GradientStopInput[] = fill.stops.map((stop) => ({
    position: percentToNumber(stop.position),
    color: colorToInput(stop.color),
  }));

  const gradientType = fill.path ? "path" : "linear";

  return {
    type: "gradient",
    gradientType,
    stops,
    angle: fill.linear ? (fill.linear.angle as number) : undefined,
  };
}

function patternFillToInput(fill: PatternFill): PatternFillInput {
  return {
    type: "pattern",
    preset: fill.preset,
    fgColor: colorToInput(fill.foregroundColor),
    bgColor: colorToInput(fill.backgroundColor),
  };
}

function blipFillToInput(fill: BlipFill): BlipFillInput {
  return {
    resourceId: fill.resourceId,
    ...(fill.dpi !== undefined ? { dpi: fill.dpi } : {}),
    ...(fill.rotWithShape !== undefined ? { rotWithShape: fill.rotWithShape } : {}),
    ...(fill.compressionState !== undefined ? { compressionState: fill.compressionState } : {}),
  };
}

/**
 * Convert a domain BaseFill to a FillInput.
 *
 * Returns undefined for noFill/groupFill (no input representation).
 */
export function fillToInput(fill: BaseFill): FillInput | undefined {
  switch (fill.type) {
    case "solidFill":
      return solidFillToInput(fill);
    case "gradientFill":
      return gradientFillToInput(fill);
    case "patternFill":
      return patternFillToInput(fill);
    case "blipFill":
      return blipFillToInput(fill);
    case "noFill":
    case "groupFill":
      return undefined;
  }
}
