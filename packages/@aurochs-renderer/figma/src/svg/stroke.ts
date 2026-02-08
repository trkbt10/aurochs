/**
 * @file Stroke rendering for Figma nodes
 */

import type { FigPaint, FigColor, FigStrokeCap, FigStrokeJoin, FigStrokeWeight } from "@aurochs/fig/types";
import { figColorToHex, getPaintType } from "../core/color";

// =============================================================================
// Stroke Attributes
// =============================================================================

/**
 * Stroke attributes for SVG elements
 */
export type StrokeAttrs = {
  stroke?: string;
  "stroke-width"?: number;
  "stroke-opacity"?: number;
  "stroke-linecap"?: "butt" | "round" | "square";
  "stroke-linejoin"?: "miter" | "round" | "bevel";
  "stroke-dasharray"?: string;
};

/**
 * Options for stroke rendering
 */
export type StrokeOptions = {
  readonly strokeCap?: FigStrokeCap;
  readonly strokeJoin?: FigStrokeJoin;
  readonly dashPattern?: readonly number[];
};

/**
 * Parameters for getStrokeAttrs
 */
export type GetStrokeAttrsParams = {
  readonly paints: readonly FigPaint[] | undefined;
  readonly strokeWeight: FigStrokeWeight | undefined;
  readonly options?: StrokeOptions;
};

/**
 * Get stroke attributes from Figma paints
 */
export function getStrokeAttrs(params: GetStrokeAttrsParams): StrokeAttrs;
export function getStrokeAttrs(
  paints: readonly FigPaint[] | undefined,
  strokeWeight: FigStrokeWeight | undefined,
  options?: StrokeOptions,
): StrokeAttrs;
export function getStrokeAttrs(
  paintsOrParams: readonly FigPaint[] | undefined | GetStrokeAttrsParams,
  strokeWeight?: FigStrokeWeight | undefined,
  options?: StrokeOptions,
): StrokeAttrs {
  // Handle object parameter form
  if (paintsOrParams && typeof paintsOrParams === "object" && "paints" in paintsOrParams) {
    const params = paintsOrParams as GetStrokeAttrsParams;
    return getStrokeAttrsImpl(params.paints, params.strokeWeight, params.options);
  }

  // Handle positional parameter form
  return getStrokeAttrsImpl(paintsOrParams as readonly FigPaint[] | undefined, strokeWeight, options);
}

/**
 * Implementation of getStrokeAttrs
 */
function getStrokeAttrsImpl(
  paints: readonly FigPaint[] | undefined,
  strokeWeight: FigStrokeWeight | undefined,
  options?: StrokeOptions,
): StrokeAttrs {
  if (!paints || paints.length === 0 || !strokeWeight) {
    return {};
  }

  // Find the first visible paint
  const visiblePaint = paints.find((p) => p.visible !== false);
  if (!visiblePaint) {
    return {};
  }

  const attrs: StrokeAttrs = {};

  // Get stroke color
  if (getPaintType(visiblePaint) === "SOLID") {
    const solidPaint = visiblePaint as FigPaint & { color: FigColor };
    attrs.stroke = figColorToHex(solidPaint.color);
    const opacity = visiblePaint.opacity ?? 1;
    if (opacity < 1) {
      attrs["stroke-opacity"] = opacity;
    }
  } else {
    // For gradients, use the first stop color as approximation
    attrs.stroke = "#000000";
  }

  // Get stroke width
  attrs["stroke-width"] = getStrokeWidth(strokeWeight);

  // Stroke cap
  if (options?.strokeCap) {
    attrs["stroke-linecap"] = mapStrokeCap(options.strokeCap);
  }

  // Stroke join
  if (options?.strokeJoin) {
    attrs["stroke-linejoin"] = mapStrokeJoin(options.strokeJoin);
  }

  // Dash pattern
  if (options?.dashPattern && options.dashPattern.length > 0) {
    attrs["stroke-dasharray"] = options.dashPattern.join(" ");
  }

  return attrs;
}

/**
 * Get stroke width from weight
 */
function getStrokeWidth(strokeWeight: FigStrokeWeight): number {
  if (typeof strokeWeight === "number") {
    return strokeWeight;
  }
  // Individual stroke weights - use max
  const { top, right, bottom, left } = strokeWeight;
  return Math.max(top, right, bottom, left);
}

// =============================================================================
// Mapping Functions
// =============================================================================

/**
 * Map Figma stroke cap to SVG
 */
function mapStrokeCap(cap: FigStrokeCap): "butt" | "round" | "square" | undefined {
  switch (cap) {
    case "NONE":
      return "butt";
    case "ROUND":
      return "round";
    case "SQUARE":
      return "square";
    case "LINE_ARROW":
    case "TRIANGLE_ARROW":
      // Arrow caps need marker definitions - fallback to butt
      return "butt";
    default:
      return undefined;
  }
}

/**
 * Map Figma stroke join to SVG
 */
function mapStrokeJoin(join: FigStrokeJoin): "miter" | "round" | "bevel" | undefined {
  switch (join) {
    case "MITER":
      return "miter";
    case "ROUND":
      return "round";
    case "BEVEL":
      return "bevel";
    default:
      return undefined;
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Check if paints array has any visible strokes
 */
export function hasVisibleStroke(
  paints: readonly FigPaint[] | undefined,
  strokeWeight: FigStrokeWeight | undefined,
): boolean {
  if (!paints || paints.length === 0) {
    return false;
  }
  if (!strokeWeight) {
    return false;
  }

  const weight = getStrokeWidth(strokeWeight);
  if (weight <= 0) {
    return false;
  }

  return paints.some((p) => p.visible !== false);
}
