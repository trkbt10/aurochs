/**
 * @file Fig stroke properties → DrawingML BaseLine
 *
 * Figma allows per-side stroke weights ({top, right, bottom, left}).
 * DrawingML only supports uniform width.
 * We use the maximum — ensures no visual clipping.
 */

import type { FigPaint, FigStrokeWeight, KiwiEnumValue } from "@aurochs/fig/types";
import type { BaseLine, LineCap, LineJoin } from "@aurochs-office/drawing-ml/domain/line";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import { figFillsToDml } from "./fill";

/**
 * Convert Fig stroke properties to a DrawingML BaseLine.
 * Returns undefined if no visible strokes or zero width.
 */
export function figStrokeToDml(
  strokes: readonly FigPaint[],
  strokeWeight: FigStrokeWeight,
  strokeCap?: KiwiEnumValue,
  strokeJoin?: KiwiEnumValue,
): BaseLine | undefined {
  const width = resolveStrokeWidth(strokeWeight);
  if (width <= 0) return undefined;

  const fill = figFillsToDml(strokes);
  if (!fill) return undefined;

  return {
    width: px(width),
    cap: convertCap(strokeCap),
    compound: "sng",
    alignment: "ctr",
    fill,
    dash: "solid",
    join: convertJoin(strokeJoin),
  };
}

function resolveStrokeWidth(weight: FigStrokeWeight): number {
  if (typeof weight === "number") return weight;
  return Math.max(weight.top, weight.right, weight.bottom, weight.left);
}

/**
 * Fig stroke caps include arrow types — those are line-end markers,
 * not SVG stroke-linecap. For the cap property, arrows map to "flat".
 */
function convertCap(cap?: KiwiEnumValue): LineCap {
  if (!cap) return "flat";
  switch (cap.name) {
    case "ROUND": return "round";
    case "SQUARE": return "square";
    default: return "flat";
  }
}

function convertJoin(join?: KiwiEnumValue): LineJoin {
  if (!join) return "miter";
  switch (join.name) {
    case "ROUND": return "round";
    case "BEVEL": return "bevel";
    default: return "miter";
  }
}
