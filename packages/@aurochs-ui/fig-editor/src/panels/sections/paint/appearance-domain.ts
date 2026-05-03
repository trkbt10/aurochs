/** @file Shape appearance mutation domain shared by paint and effect property sections. */
/* eslint-disable jsdoc/require-jsdoc -- Exported operation names form the appearance mutation contract and are covered by colocated specs. */

import type { FigDesignNode } from "@aurochs/fig/domain";
import type { FigStrokeAlign, FigStrokeCap, FigStrokeJoin } from "@aurochs/fig/types";
import { applyEffectListOperation, type EffectListOperation } from "./effect-domain";
import { applyPaintListOperation, type PaintListOperation } from "./paint-domain";

export type AppearanceOperation =
  | { readonly type: "fill-paints"; readonly operation: PaintListOperation }
  | { readonly type: "stroke-paints"; readonly operation: PaintListOperation }
  | { readonly type: "stroke-weight"; readonly weight: number }
  | { readonly type: "stroke-align"; readonly strokeAlign: FigStrokeAlign }
  | { readonly type: "stroke-cap"; readonly strokeCap: FigStrokeCap }
  | { readonly type: "stroke-join"; readonly strokeJoin: FigStrokeJoin }
  | { readonly type: "stroke-dashes"; readonly strokeDashes: readonly number[] | undefined }
  | { readonly type: "effects"; readonly operation: EffectListOperation };

export function applyAppearanceOperation(node: FigDesignNode, operation: AppearanceOperation): FigDesignNode {
  switch (operation.type) {
    case "fill-paints":
      return { ...node, fills: applyPaintListOperation(node.fills, operation.operation) };
    case "stroke-paints":
      return {
        ...node,
        strokes: applyPaintListOperation(node.strokes, operation.operation),
        strokeWeight: resolveStrokeWeightAfterPaintOperation(node.strokeWeight, node.strokes.length, operation.operation),
      };
    case "stroke-weight":
      return { ...node, strokeWeight: operation.weight };
    case "stroke-align":
      return { ...node, strokeAlign: operation.strokeAlign };
    case "stroke-cap":
      return { ...node, strokeCap: operation.strokeCap };
    case "stroke-join":
      return { ...node, strokeJoin: operation.strokeJoin };
    case "stroke-dashes":
      return { ...node, strokeDashes: operation.strokeDashes };
    case "effects":
      return { ...node, effects: applyEffectListOperation(node.effects, operation.operation) };
  }
}

function resolveStrokeWeightAfterPaintOperation(
  currentWeight: FigDesignNode["strokeWeight"],
  currentStrokeCount: number,
  operation: PaintListOperation,
): FigDesignNode["strokeWeight"] {
  if (operation.type === "add") {
    return typeof currentWeight === "number" && currentWeight > 0 ? currentWeight : 1;
  }
  if (operation.type === "remove" && currentStrokeCount <= 1) {
    return 0;
  }
  return currentWeight;
}
