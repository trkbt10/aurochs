/**
 * @file Convert Figma stroke properties to scene graph Stroke
 */

import type { FigPaint, FigColor, FigStrokeWeight } from "@aurochs/fig/types";
import { getPaintType } from "../../core/color";
import type { Stroke } from "../types";
import { figColorToSceneColor } from "./fill";

/**
 * Extract numeric stroke weight from Figma's stroke weight format
 *
 * Figma supports per-side stroke weights (top/right/bottom/left).
 * We use the maximum value for SVG/WebGL rendering.
 */
function resolveStrokeWeight(strokeWeight: FigStrokeWeight | undefined): number {
  if (strokeWeight === undefined) return 0;
  if (typeof strokeWeight === "number") return strokeWeight;
  // Per-side weights - use max
  const w = strokeWeight as { top?: number; right?: number; bottom?: number; left?: number };
  return Math.max(w.top ?? 0, w.right ?? 0, w.bottom ?? 0, w.left ?? 0);
}

/**
 * Map Figma stroke cap to scene graph format
 */
function mapStrokeCap(cap: unknown): "butt" | "round" | "square" {
  const name = typeof cap === "string" ? cap : (cap as { name?: string })?.name;
  switch (name) {
    case "ROUND":
      return "round";
    case "SQUARE":
      return "square";
    default:
      return "butt";
  }
}

/**
 * Map Figma stroke join to scene graph format
 */
function mapStrokeJoin(join: unknown): "miter" | "round" | "bevel" {
  const name = typeof join === "string" ? join : (join as { name?: string })?.name;
  switch (name) {
    case "ROUND":
      return "round";
    case "BEVEL":
      return "bevel";
    default:
      return "miter";
  }
}

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
    // Gradient strokes fall back to black
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
