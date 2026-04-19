/**
 * @file Convert Figma stroke properties to scene graph Stroke
 *
 * Consumes shared stroke interpretation from stroke/interpret.ts (the SoT).
 * Supports gradient strokes and multi-paint stroke layers.
 */

import type {
  FigPaint,
  FigStrokeWeight,
  FigGradientPaint,
  FigStrokeCap,
  FigStrokeJoin,
  FigStrokeAlign,
} from "@aurochs/fig/types";
import { getPaintType, asGradientPaint, asSolidPaint } from "@aurochs/fig/color";
import { resolveStrokeWeight, mapStrokeCap, mapStrokeJoin } from "../../stroke";
import type { Stroke, StrokeLayer, StrokeAlign, LinearGradientFill, RadialGradientFill, AffineMatrix } from "../types";
import { figColorToSceneColor } from "./fill";
import {
  getGradientStops,
  getGradientDirection,
  getRadialGradientCenterAndRadius,
} from "../../paint";
import { convertFigmaBlendMode } from "./blend-mode";

/**
 * Extract the gradient transform matrix from a Figma gradient paint.
 *
 * Mirrors the implementation in `convert/fill.ts::extractGradientTransform`
 * — kept private here rather than shared because both sides sit on the
 * exact-same SSoT and moving it to a third module would add indirection
 * without removing the two call sites.
 *
 * The transform is what lets the render-tree `finalizeGradientDefs`
 * pass emit `userSpaceOnUse` pixel coordinates instead of the
 * `objectBoundingBox` percentage fallback. Stroke gradients without a
 * transform (identity) get no transform here and render in bbox form —
 * which is the correct behaviour for an identity paint.
 */
function extractGradientTransform(paint: FigGradientPaint): AffineMatrix | undefined {
  const t = paint.transform;
  if (!t) { return undefined; }
  const m: AffineMatrix = {
    m00: t.m00 ?? 1,
    m01: t.m01 ?? 0,
    m02: t.m02 ?? 0,
    m10: t.m10 ?? 0,
    m11: t.m11 ?? 1,
    m12: t.m12 ?? 0,
  };
  if (m.m00 === 1 && m.m01 === 0 && m.m02 === 0 && m.m10 === 0 && m.m11 === 1 && m.m12 === 0) {
    return undefined;
  }
  return m;
}

/**
 * Convert a gradient paint to a gradient fill for stroke layer use.
 *
 * Carries the paint.transform through to the resulting fill so the
 * render-tree finalizer can convert the gradient coordinates from
 * objectBoundingBox percentages to userSpaceOnUse pixels. Without the
 * transform, stroke gradients fall back to the normalized start/end
 * which produce nonsense extrapolated percentages (e.g. y=-7522%) for
 * matrices whose inverse puts the gradient-space origin outside
 * [0, 1] — breaking every non-identity stroke gradient.
 */
function convertStrokeGradient(paint: FigGradientPaint): LinearGradientFill | RadialGradientFill | undefined {
  const paintType = getPaintType(paint);
  const stops = getGradientStops(paint).map((s) => ({
    position: s.position,
    color: figColorToSceneColor(s.color),
  }));
  const gradientTransform = extractGradientTransform(paint);

  if (paintType === "GRADIENT_LINEAR") {
    const { start, end } = getGradientDirection(paint);
    return {
      type: "linear-gradient",
      start,
      end,
      stops,
      opacity: paint.opacity ?? 1,
      gradientTransform,
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
      gradientTransform,
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
    const solidPaint = asSolidPaint(paint);
    if (solidPaint) {
      return {
        color: figColorToSceneColor(solidPaint.color),
        opacity: paint.opacity ?? 1,
        blendMode,
      };
    }
  }

  if (paintType === "GRADIENT_LINEAR" || paintType === "GRADIENT_RADIAL") {
    const gradientPaint = asGradientPaint(paint);
    if (gradientPaint) {
      const gradientFill = convertStrokeGradient(gradientPaint);
      return {
        color: DEFAULT_COLOR,
        opacity: paint.opacity ?? 1,
        gradientFill,
        blendMode,
      };
    }
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
    strokeCap?: FigStrokeCap;
    strokeJoin?: FigStrokeJoin;
    dashPattern?: readonly number[];
    strokeAlign?: FigStrokeAlign;
  },
): Stroke | undefined {
  const width = resolveStrokeWeight(strokeWeight);
  if (width === 0) {return undefined;}

  if (!paints || paints.length === 0) {return undefined;}

  const visiblePaints = paints.filter((p) => p.visible !== false);
  if (visiblePaints.length === 0) {return undefined;}

  // Primary layer (first visible paint)
  const primary = visiblePaints[0];
  const DEFAULT_COLOR = { r: 0, g: 0, b: 0, a: 1 };
  const primarySolid = asSolidPaint(primary);
  const primaryColor = primarySolid
    ? figColorToSceneColor(primarySolid.color)
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

function resolveStrokeAlign(raw: FigStrokeAlign | undefined): StrokeAlign | undefined {
  if (!raw) { return undefined; }
  if (raw === "INSIDE" || raw === "OUTSIDE") { return raw; }
  return undefined; // CENTER is the SVG default, no need to store
}
