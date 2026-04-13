/**
 * @file Stroke interpretation — shared SoT
 *
 * Pure functions that interpret Figma stroke properties into
 * platform-agnostic intermediate values. Both the SVG string renderer
 * and the SceneGraph builder consume these.
 *
 * Handles both string enum values (API format) and KiwiEnumValue
 * objects ({ value, name } — .fig file format).
 */

import type { FigStrokeWeight } from "@aurochs/fig/types";

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
  const w = strokeWeight as { top?: number; right?: number; bottom?: number; left?: number };
  return Math.max(w.top ?? 0, w.right ?? 0, w.bottom ?? 0, w.left ?? 0);
}

// =============================================================================
// Stroke Cap
// =============================================================================

export type SvgStrokeCap = "butt" | "round" | "square";

/**
 * Map Figma stroke cap to SVG linecap value.
 *
 * Accepts both string ("NONE", "ROUND", ...) and KiwiEnumValue ({ name: "ROUND" }).
 * Arrow caps (LINE_ARROW, TRIANGLE_ARROW) fall back to "butt" — arrow markers
 * require separate SVG marker definitions not handled here.
 */
export function mapStrokeCap(cap: unknown): SvgStrokeCap {
  const name = typeof cap === "string" ? cap : (cap as { name?: string } | null)?.name;
  switch (name) {
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
 *
 * Accepts both string and KiwiEnumValue.
 * Default is "miter" (SVG default and Figma default).
 */
export function mapStrokeJoin(join: unknown): SvgStrokeJoin {
  const name = typeof join === "string" ? join : (join as { name?: string } | null)?.name;
  switch (name) {
    case "ROUND":
      return "round";
    case "BEVEL":
      return "bevel";
    case "MITER":
    default:
      return "miter";
  }
}
