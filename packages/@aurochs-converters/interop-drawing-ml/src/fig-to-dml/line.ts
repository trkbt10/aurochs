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

type FigStrokeToDmlOptions = {
  readonly strokes: readonly FigPaint[];
  readonly strokeWeight: FigStrokeWeight;
  readonly strokeCap?: KiwiEnumValue;
  readonly strokeJoin?: KiwiEnumValue;
  readonly strokeAlign?: KiwiEnumValue;
  readonly nodeOpacity?: number;
};

/**
 * Convert Fig stroke properties to a DrawingML BaseLine.
 * Returns undefined if no visible strokes or zero width.
 */
export function figStrokeToDml(
  { strokes, strokeWeight, strokeCap, strokeJoin, strokeAlign, nodeOpacity }: FigStrokeToDmlOptions,
): BaseLine | undefined {
  const width = resolveStrokeWidth(strokeWeight);
  if (width <= 0) {return undefined;}

  const fill = figFillsToDml(strokes, nodeOpacity ?? 1);
  if (!fill) {return undefined;}

  return {
    width: px(width),
    cap: convertCap(strokeCap),
    compound: "sng",
    alignment: convertAlignment(strokeAlign),
    fill,
    dash: "solid",
    join: convertJoin(strokeJoin),
  };
}

function resolveStrokeWidth(weight: FigStrokeWeight): number {
  if (typeof weight === "number") {return weight;}
  return Math.max(weight.top, weight.right, weight.bottom, weight.left);
}

/**
 * Fig stroke caps include arrow types — those are line-end markers,
 * not SVG stroke-linecap. For the cap property, arrows map to "flat".
 */
function convertCap(cap?: KiwiEnumValue): LineCap {
  if (!cap) {return "flat";}
  switch (cap.name) {
    case "ROUND": return "round";
    case "SQUARE": return "square";
    default: return "flat";
  }
}

function convertJoin(join?: KiwiEnumValue): LineJoin {
  if (!join) {return "miter";}
  switch (join.name) {
    case "ROUND": return "round";
    case "BEVEL": return "bevel";
    default: return "miter";
  }
}

/**
 * Convert Figma stroke alignment to DrawingML line alignment.
 *
 * Figma: INSIDE, OUTSIDE, CENTER
 * DrawingML: "in" (inside), "ctr" (center) — no outside option.
 *
 * OUTSIDE falls back to "ctr" because DrawingML has no outside alignment.
 * @see ECMA-376 §20.1.2.2.24 (algn attribute)
 */
function convertAlignment(align?: KiwiEnumValue): "ctr" | "in" {
  if (!align) {return "ctr";}
  switch (align.name) {
    case "INSIDE": return "in";
    default: return "ctr";
  }
}
