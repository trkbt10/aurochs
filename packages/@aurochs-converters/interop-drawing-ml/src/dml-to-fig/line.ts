/**
 * @file DrawingML BaseLine → Fig stroke properties
 */

import type { BaseLine } from "@aurochs-office/drawing-ml/domain/line";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FigPaint, FigStrokeWeight, FigStrokeCap, FigStrokeJoin } from "@aurochs/fig/types";
import { dmlFillToFig } from "./fill";

export type FigStrokeResult = {
  readonly strokePaints: readonly FigPaint[];
  readonly strokeWeight: FigStrokeWeight;
  readonly strokeCap?: FigStrokeCap;
  readonly strokeJoin?: FigStrokeJoin;
};






/** Converts a DrawingML line definition to a Figma stroke result. */
export function dmlLineTofig(
  line: BaseLine | undefined,
  colorContext?: ColorContext,
): FigStrokeResult | undefined {
  if (!line) {return undefined;}
  if ((line.width) <= 0) {return undefined;}

  const strokePaints = dmlFillToFig(line.fill, colorContext);
  if (strokePaints.length === 0) {return undefined;}

  return {
    strokePaints,
    strokeWeight: line.width,
    strokeCap: convertCap(line.cap),
    strokeJoin: convertJoin(line.join),
  };
}

function convertCap(cap: string): FigStrokeCap {
  switch (cap) {
    case "round": return "ROUND";
    case "square": return "SQUARE";
    default: return "NONE";
  }
}

function convertJoin(join: string): FigStrokeJoin {
  switch (join) {
    case "round": return "ROUND";
    case "bevel": return "BEVEL";
    default: return "MITER";
  }
}
