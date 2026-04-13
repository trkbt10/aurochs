/**
 * @file Convert Figma stroke properties to scene graph Stroke
 *
 * Consumes shared stroke interpretation from stroke/interpret.ts (the SoT).
 */

import type { FigPaint, FigColor, FigStrokeWeight } from "@aurochs/fig/types";
import { getPaintType } from "@aurochs/fig/color";
import { resolveStrokeWeight, mapStrokeCap, mapStrokeJoin } from "../../stroke";
import type { Stroke } from "../types";
import { figColorToSceneColor } from "./fill";

/**
 * Convert Figma stroke paints to scene graph Stroke
 *
 * Uses the first visible paint (only one stroke supported).
 */
export function convertStrokeToSceneStroke(
  paints: readonly FigPaint[] | undefined,
  strokeWeight: FigStrokeWeight | undefined,
  options?: {
    strokeCap?: unknown;
    strokeJoin?: unknown;
    dashPattern?: readonly number[];
  },
): Stroke | undefined {
  const width = resolveStrokeWeight(strokeWeight);
  if (width === 0) return undefined;

  if (!paints || paints.length === 0) return undefined;

  const firstVisible = paints.find((p) => p.visible !== false);
  if (!firstVisible) return undefined;

  const paintType = getPaintType(firstVisible);
  let color: { r: number; g: number; b: number; a: number };

  if (paintType === "SOLID") {
    const solidPaint = firstVisible as FigPaint & { color: FigColor };
    color = figColorToSceneColor(solidPaint.color);
  } else {
    color = { r: 0, g: 0, b: 0, a: 1 };
  }

  return {
    color,
    width,
    opacity: firstVisible.opacity ?? 1,
    linecap: mapStrokeCap(options?.strokeCap),
    linejoin: mapStrokeJoin(options?.strokeJoin),
    dashPattern: options?.dashPattern?.length ? options.dashPattern : undefined,
  };
}
