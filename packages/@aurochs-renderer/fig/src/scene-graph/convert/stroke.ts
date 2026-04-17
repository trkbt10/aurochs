/**
 * @file Convert Figma stroke properties to scene graph Stroke
 *
 * Consumes shared stroke interpretation from stroke/interpret.ts (the SoT).
 * Supports gradient strokes and multi-paint stroke layers.
 */

import type { FigPaint, FigColor, FigStrokeWeight, FigGradientPaint, KiwiEnumValue } from "@aurochs/fig/types";
import { getPaintType } from "@aurochs/fig/color";
import { resolveStrokeWeight, mapStrokeCap, mapStrokeJoin } from "../../stroke";
import type { Stroke, StrokeLayer, StrokeAlign, LinearGradientFill, RadialGradientFill } from "../types";
import { figColorToSceneColor } from "./fill";
import {
  getGradientStops,
  getGradientDirection,
  getRadialGradientCenterAndRadius,
} from "../../paint";
import { convertFigmaBlendMode } from "./blend-mode";

/**
 * Convert a gradient paint to a gradient fill for stroke layer use.
 */
function convertStrokeGradient(paint: FigGradientPaint): LinearGradientFill | RadialGradientFill | undefined {
  const paintType = getPaintType(paint);
  const stops = getGradientStops(paint).map((s) => ({
    position: s.position,
    color: figColorToSceneColor(s.color),
  }));

  if (paintType === "GRADIENT_LINEAR") {
    const { start, end } = getGradientDirection(paint);
    return {
      type: "linear-gradient",
      start,
      end,
      stops,
      opacity: paint.opacity ?? 1,
    };
  }

  if (paintType === "GRADIENT_RADIAL") {
    const { center, radius } = getRadialGradientCenterAndRadius(paint);
    return {
      type: "radial-gradient",
      center,
      radius,
      stops,
      opacity: paint.opacity ?? 1,
    };
  }

  return undefined;
}

/**
 * Build a StrokeLayer from a single visible paint.
 */
function buildStrokeLayer(paint: FigPaint): StrokeLayer {
  const paintType = getPaintType(paint);
  const DEFAULT_COLOR = { r: 0, g: 0, b: 0, a: 1 };
  const blendMode = convertFigmaBlendMode(paint.blendMode);

  if (paintType === "SOLID") {
    const solidPaint = paint as FigPaint & { color: FigColor };
    return {
      color: figColorToSceneColor(solidPaint.color),
      opacity: paint.opacity ?? 1,
      blendMode,
    };
  }

  if (paintType === "GRADIENT_LINEAR" || paintType === "GRADIENT_RADIAL") {
    const gradientFill = convertStrokeGradient(paint as FigGradientPaint);
    return {
      color: DEFAULT_COLOR,
      opacity: paint.opacity ?? 1,
      gradientFill,
      blendMode,
    };
  }

  return { color: DEFAULT_COLOR, opacity: paint.opacity ?? 1, blendMode };
}

/**
 * Convert Figma stroke paints to scene graph Stroke.
 *
 * Supports:
 * - Solid color strokes
 * - Gradient strokes (linear, radial)
 * - Multi-paint stroke layers with per-layer blend modes
 */
export function convertStrokeToSceneStroke(
  paints: readonly FigPaint[] | undefined,
  strokeWeight: FigStrokeWeight | undefined,
  options?: {
    strokeCap?: string | KiwiEnumValue;
    strokeJoin?: string | KiwiEnumValue;
    dashPattern?: readonly number[];
    strokeAlign?: string | KiwiEnumValue;
  },
): Stroke | undefined {
  const width = resolveStrokeWeight(strokeWeight);
  if (width === 0) {return undefined;}

  if (!paints || paints.length === 0) {return undefined;}

  const visiblePaints = paints.filter((p) => p.visible !== false);
  if (visiblePaints.length === 0) {return undefined;}

  // Primary layer (first visible paint)
  const primary = visiblePaints[0];
  const primaryType = getPaintType(primary);
  const DEFAULT_COLOR = { r: 0, g: 0, b: 0, a: 1 };
  const primaryColor = primaryType === "SOLID"
    ? figColorToSceneColor((primary as FigPaint & { color: FigColor }).color)
    : DEFAULT_COLOR;

  // Multi-paint layers (when >1 visible paint), or single gradient paint
  // (gradient stroke requires layers because the primary color/opacity alone
  // cannot express gradient stroke — the gradient def must be in a layer).
  const hasGradientPaint = visiblePaints.some((p) => {
    const t = getPaintType(p);
    return t === "GRADIENT_LINEAR" || t === "GRADIENT_RADIAL";
  });
  const layers = (visiblePaints.length > 1 || hasGradientPaint)
    ? visiblePaints.map(buildStrokeLayer)
    : undefined;

  const align = resolveStrokeAlign(options?.strokeAlign);

  return {
    color: primaryColor,
    width,
    opacity: primary.opacity ?? 1,
    linecap: mapStrokeCap(options?.strokeCap),
    linejoin: mapStrokeJoin(options?.strokeJoin),
    dashPattern: options?.dashPattern?.length ? options.dashPattern : undefined,
    layers,
    align,
  };
}

function resolveStrokeAlign(raw: string | KiwiEnumValue | undefined): StrokeAlign | undefined {
  if (!raw) { return undefined; }
  const name = typeof raw === "string" ? raw : raw.name;
  if (name === "INSIDE" || name === "OUTSIDE") { return name; }
  return undefined; // CENTER is the SVG default, no need to store
}
