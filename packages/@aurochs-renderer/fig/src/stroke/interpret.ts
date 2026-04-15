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

import type { FigStrokeWeight, KiwiEnumValue } from "@aurochs/fig/types";

/** Accepted enum input: string literal, KiwiEnumValue, or undefined */
type EnumInput = string | KiwiEnumValue | null | undefined;

/** Extract the name string from an enum input */
function enumName(input: EnumInput): string | undefined {
  if (typeof input === "string") return input;
  if (input && typeof input === "object" && "name" in input) return input.name;
  return undefined;
}

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
 * Accepts both string ("NONE", "ROUND", ...) and KiwiEnumValue ({ name: "ROUND" }).
 * Arrow caps (LINE_ARROW, TRIANGLE_ARROW) fall back to "butt" — arrow markers
 * require separate SVG marker definitions not handled here.
 */
export function mapStrokeCap(cap: EnumInput): SvgStrokeCap {
  const name = enumName(cap);
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
export function mapStrokeJoin(join: EnumInput): SvgStrokeJoin {
  const name = enumName(join);
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
