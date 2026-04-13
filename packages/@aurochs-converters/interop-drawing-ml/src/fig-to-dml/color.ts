/**
 * @file FigColor → DrawingML Color
 *
 * Fig uses RGBA in 0-1 range. DrawingML uses sRGB hex strings
 * with separate alpha via ColorTransform.
 *
 * Alpha near 1.0 (>= 0.999) omits the transform, since DrawingML
 * defaults to full opacity — emitting an explicit 100% alpha
 * would be redundant and would clutter the XML.
 */

import type { FigColor } from "@aurochs/fig/types";
import type { Color } from "@aurochs-office/drawing-ml/domain/color";
import { pct } from "@aurochs-office/drawing-ml/domain/units";

/**
 * Convert a Fig color (RGBA 0-1) to a DrawingML Color.
 */
export function figColorToColor(figColor: FigColor): Color {
  const r = clamp01(figColor.r);
  const g = clamp01(figColor.g);
  const b = clamp01(figColor.b);
  const a = clamp01(figColor.a);

  const hex = componentToHex(r) + componentToHex(g) + componentToHex(b);

  if (a >= 0.999) {
    return { spec: { type: "srgb", value: hex } };
  }

  return {
    spec: { type: "srgb", value: hex },
    transform: { alpha: pct(a * 100) },
  };
}

/**
 * Convert a Fig color to a 6-digit hex string (ignoring alpha).
 */
export function figColorToHex(figColor: FigColor): string {
  return (
    componentToHex(clamp01(figColor.r)) +
    componentToHex(clamp01(figColor.g)) +
    componentToHex(clamp01(figColor.b))
  );
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function componentToHex(value01: number): string {
  const byte = Math.round(value01 * 255);
  return byte.toString(16).padStart(2, "0").toUpperCase();
}
