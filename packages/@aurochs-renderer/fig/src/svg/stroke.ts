/**
 * @file Stroke rendering for Figma nodes (SVG string output)
 *
 * Stroke interpretation (weight resolution, cap/join mapping) delegates
 * to the shared SoT in stroke/interpret.ts.
 */

import type { FigPaint, FigStrokeCap, FigStrokeJoin, FigStrokeWeight } from "@aurochs/fig/types";
import { figColorToHex, getSolidPaintColor } from "@aurochs/fig/color";
import { resolveStrokeWeight, mapStrokeCap, mapStrokeJoin } from "../stroke";

// =============================================================================
// Stroke Attributes
// =============================================================================

export type StrokeAttrs = {
  stroke?: string;
  "stroke-width"?: number;
  "stroke-opacity"?: number;
  "stroke-linecap"?: "butt" | "round" | "square";
  "stroke-linejoin"?: "miter" | "round" | "bevel";
  "stroke-dasharray"?: string;
};

export type StrokeOptions = {
  readonly strokeCap?: FigStrokeCap;
  readonly strokeJoin?: FigStrokeJoin;
  readonly dashPattern?: readonly number[];
};

export type GetStrokeAttrsParams = {
  readonly paints: readonly FigPaint[] | undefined;
  readonly strokeWeight: FigStrokeWeight | undefined;
  readonly options?: StrokeOptions;
};

/** Returns SVG stroke attributes derived from Figma paint definitions and stroke weight. */
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
  if (paintsOrParams && typeof paintsOrParams === "object" && "paints" in paintsOrParams) {
    const params = paintsOrParams as GetStrokeAttrsParams;
    return getStrokeAttrsImpl(params.paints, params.strokeWeight, params.options);
  }
  return getStrokeAttrsImpl(paintsOrParams as readonly FigPaint[] | undefined, strokeWeight, options);
}

function getStrokeAttrsImpl(
  paints: readonly FigPaint[] | undefined,
  strokeWeight: FigStrokeWeight | undefined,
  options?: StrokeOptions,
): StrokeAttrs {
  if (!paints || paints.length === 0 || !strokeWeight) {
    return {};
  }

  const visiblePaint = paints.find((p) => p.visible !== false);
  if (!visiblePaint) {
    return {};
  }

  const attrs: StrokeAttrs = {};

  const solidColor = getSolidPaintColor(visiblePaint);
  if (solidColor) {
    attrs.stroke = figColorToHex(solidColor);
    const opacity = visiblePaint.opacity ?? 1;
    if (opacity < 1) {
      attrs["stroke-opacity"] = opacity;
    }
  } else {
    attrs.stroke = "#000000";
  }

  attrs["stroke-width"] = resolveStrokeWeight(strokeWeight);

  if (options?.strokeCap) {
    const cap = mapStrokeCap(options.strokeCap);
    if (cap !== "butt") {
      attrs["stroke-linecap"] = cap;
    }
  }

  if (options?.strokeJoin) {
    const join = mapStrokeJoin(options.strokeJoin);
    if (join !== "miter") {
      attrs["stroke-linejoin"] = join;
    }
  }

  if (options?.dashPattern && options.dashPattern.length > 0) {
    attrs["stroke-dasharray"] = options.dashPattern.join(" ");
  }

  return attrs;
}

/**
 * Check if paints array has any visible strokes
 */
export function hasVisibleStroke(
  paints: readonly FigPaint[] | undefined,
  strokeWeight: FigStrokeWeight | undefined,
): boolean {
  if (!paints || paints.length === 0) {return false;}
  if (!strokeWeight) {return false;}
  const weight = resolveStrokeWeight(strokeWeight);
  if (weight <= 0) {return false;}
  return paints.some((p) => p.visible !== false);
}
