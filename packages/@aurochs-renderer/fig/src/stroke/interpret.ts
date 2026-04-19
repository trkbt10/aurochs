/**
 * @file Stroke interpretation — shared SoT
 *
 * Pure functions that interpret Figma stroke properties into
 * platform-agnostic intermediate values. Both the SVG string renderer
 * and the SceneGraph builder consume these.
 *
 * Consumes domain-level string unions (FigStrokeCap, FigStrokeJoin).
 * Parser normalises Kiwi `{ value, name }` to the string name at input
 * time; the builder materialises the enum shape on output. No consumer
 * in the render pipeline needs to handle the raw enum shape.
 */

import type { FigStrokeWeight, FigStrokeCap, FigStrokeJoin } from "@aurochs/fig/types";

// =============================================================================
// Stroke Weight
// =============================================================================

/**
 * Resolve a Figma stroke weight to a single numeric value.
 *
 * Figma supports per-side stroke weights ({ top, right, bottom, left }).
 * When per-side weights are provided, the maximum is used because SVG
 * and most raster backends apply a uniform stroke width.
 */
export function resolveStrokeWeight(strokeWeight: FigStrokeWeight | undefined): number {
  if (strokeWeight === undefined) {return 0;}
  if (typeof strokeWeight === "number") {return strokeWeight;}
  return Math.max(strokeWeight.top ?? 0, strokeWeight.right ?? 0, strokeWeight.bottom ?? 0, strokeWeight.left ?? 0);
}

// =============================================================================
// Stroke Cap
// =============================================================================

export type SvgStrokeCap = "butt" | "round" | "square";

/**
 * Map Figma stroke cap to SVG linecap value.
 *
 * Arrow caps (LINE_ARROW, TRIANGLE_ARROW) fall back to "butt" — arrow markers
 * require separate SVG marker definitions not handled here.
 */
export function mapStrokeCap(cap: FigStrokeCap | undefined | null): SvgStrokeCap {
  switch (cap) {
    case "ROUND":
      return "round";
    case "SQUARE":
      return "square";
    case "NONE":
    case "LINE_ARROW":
    case "TRIANGLE_ARROW":
    default:
      return "butt";
  }
}

// =============================================================================
// Stroke Join
// =============================================================================

export type SvgStrokeJoin = "miter" | "round" | "bevel";

/**
 * Map Figma stroke join to SVG linejoin value.
 * Default is "miter" (SVG default and Figma default).
 */
export function mapStrokeJoin(join: FigStrokeJoin | undefined | null): SvgStrokeJoin {
  switch (join) {
    case "ROUND":
      return "round";
    case "BEVEL":
      return "bevel";
    case "MITER":
    default:
      return "miter";
  }
}
