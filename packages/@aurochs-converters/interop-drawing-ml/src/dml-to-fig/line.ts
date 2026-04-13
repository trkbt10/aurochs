/**
 * @file DrawingML BaseLine → Fig stroke properties
 */

import type { BaseLine } from "@aurochs-office/drawing-ml/domain/line";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FigPaint, FigStrokeWeight, KiwiEnumValue } from "@aurochs/fig/types";
import { dmlFillToFig } from "./fill";

export type FigStrokeResult = {
  readonly strokePaints: readonly FigPaint[];
  readonly strokeWeight: FigStrokeWeight;
  readonly strokeCap?: KiwiEnumValue;
  readonly strokeJoin?: KiwiEnumValue;
};

export function dmlLineTofig(
  line: BaseLine | undefined,
  colorContext?: ColorContext,
): FigStrokeResult | undefined {
  if (!line) return undefined;
  if ((line.width as number) <= 0) return undefined;

  const strokePaints = dmlFillToFig(line.fill, colorContext);
  if (strokePaints.length === 0) return undefined;

  return {
    strokePaints,
    strokeWeight: line.width as number,
    strokeCap: convertCap(line.cap),
    strokeJoin: convertJoin(line.join),
  };
}

function convertCap(cap: string): KiwiEnumValue {
  switch (cap) {
    case "round": return { value: 2, name: "ROUND" };
    case "square": return { value: 3, name: "SQUARE" };
    default: return { value: 1, name: "NONE" };
  }
}

function convertJoin(join: string): KiwiEnumValue {
  switch (join) {
    case "round": return { value: 2, name: "ROUND" };
    case "bevel": return { value: 3, name: "BEVEL" };
    default: return { value: 1, name: "MITER" };
  }
}
