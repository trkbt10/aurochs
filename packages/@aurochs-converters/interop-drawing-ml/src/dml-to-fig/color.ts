/**
 * @file DrawingML Color → FigColor
 *
 * Delegates color resolution (spec → hex, color transforms) to
 * @aurochs-office/drawing-ml/domain/color-resolution (SoT for ECMA-376
 * color resolution). This module handles only the final conversion
 * from resolved hex + alpha to FigColor (RGBA 0-1).
 *
 * Alpha is computed separately because resolveColor() returns only
 * the RGB hex — alpha is orthogonal to the RGB color space transforms.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.3 (Color Types)
 */

import type { Color } from "@aurochs-office/drawing-ml/domain/color";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FigColor } from "@aurochs/fig/types";
import { resolveColor, resolveAlpha } from "@aurochs-office/drawing-ml/domain";
import { hexToRgb } from "@aurochs/color";

export function dmlColorToFig(color: Color, colorContext?: ColorContext): FigColor {
  const hex = resolveColor(color, colorContext) ?? "000000";
  const rgb = hexToRgb(hex);
  const alpha = resolveAlpha(color);

  return { r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255, a: alpha };
}
