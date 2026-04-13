/**
 * @file FigPaint[] → DrawingML BaseFill
 *
 * Figma supports multiple fills layered bottom-to-top.
 * DrawingML supports a single BaseFill per shape.
 * We take the topmost visible fill — this matches what the
 * user sees on the Figma canvas.
 *
 * Gradient handle positions in Figma use 0-1 normalized
 * coordinates within the node's bounding box.
 * DrawingML linear gradients use an angle; path gradients
 * use a center point expressed as a percentage rect.
 */

import type {
  FigPaint, FigSolidPaint, FigGradientPaint,
  FigImagePaint, FigGradientStop, FigColor,
} from "@aurochs/fig/types";
import type {
  BaseFill, GradientStop, GradientFill, SolidFill,
} from "@aurochs-office/drawing-ml/domain/fill";
import { pct, deg } from "@aurochs-office/drawing-ml/domain/units";
import { figColorToColor } from "./color";

// =============================================================================
// Public API
// =============================================================================

/**
 * Convert a Figma fills array to a single DrawingML BaseFill.
 * Returns undefined if no visible fill exists.
 */
export function figFillsToDml(fills: readonly FigPaint[]): BaseFill | undefined {
  for (let i = fills.length - 1; i >= 0; i--) {
    const paint = fills[i];
    if (!isPaintVisible(paint)) continue;
    const result = convertSinglePaint(paint);
    if (result) return result;
  }
  return undefined;
}

// =============================================================================
// Internal
// =============================================================================

function getPaintTypeName(paint: FigPaint): string {
  const t = paint.type;
  return typeof t === "string" ? t : t.name;
}

function isPaintVisible(paint: FigPaint): boolean {
  if (paint.visible === false) return false;
  if (paint.opacity !== undefined && paint.opacity <= 0) return false;
  return true;
}

function convertSinglePaint(paint: FigPaint): BaseFill | undefined {
  const typeName = getPaintTypeName(paint);
  const paintOpacity = paint.opacity ?? 1;

  switch (typeName) {
    case "SOLID":
      return convertSolid(paint as FigSolidPaint, paintOpacity);
    case "GRADIENT_LINEAR":
      return convertLinearGradient(paint as FigGradientPaint, paintOpacity);
    case "GRADIENT_RADIAL":
      return convertRadialGradient(paint as FigGradientPaint, paintOpacity);
    case "GRADIENT_ANGULAR":
    case "GRADIENT_DIAMOND":
      // Angular/diamond have no direct DrawingML equivalent.
      // Fall back to linear as best-effort.
      return convertLinearGradient(paint as FigGradientPaint, paintOpacity);
    case "IMAGE":
      return convertImage(paint as FigImagePaint);
    default:
      return undefined;
  }
}

function convertSolid(paint: FigSolidPaint, paintOpacity: number): SolidFill {
  return {
    type: "solidFill",
    color: figColorToColor(applyPaintOpacity(paint.color, paintOpacity)),
  };
}

function applyPaintOpacity(color: FigColor, paintOpacity: number): FigColor {
  if (paintOpacity >= 0.999) return color;
  return { ...color, a: color.a * paintOpacity };
}

/**
 * Figma linear gradient: two handle positions (start, end) in 0-1.
 * DrawingML linear gradient: rotation angle in degrees.
 * angle = atan2(dy, dx).
 */
function convertLinearGradient(paint: FigGradientPaint, paintOpacity: number): GradientFill {
  const handles = paint.gradientHandlePositions;
  let angle = 0;
  if (handles.length >= 2) {
    const dx = handles[1].x - handles[0].x;
    const dy = handles[1].y - handles[0].y;
    angle = Math.atan2(dy, dx) * (180 / Math.PI);
  }

  return {
    type: "gradientFill",
    stops: convertGradientStops(paint.gradientStops, paintOpacity),
    linear: { angle: deg(normalizeAngle(angle)), scaled: false },
    rotWithShape: true,
  };
}

/**
 * Figma radial gradient: handle[0] = center.
 * DrawingML path gradient with "circle": fillToRect defines the center.
 */
function convertRadialGradient(paint: FigGradientPaint, paintOpacity: number): GradientFill {
  const handles = paint.gradientHandlePositions;
  const cx = handles.length > 0 ? handles[0].x : 0.5;
  const cy = handles.length > 0 ? handles[0].y : 0.5;

  return {
    type: "gradientFill",
    stops: convertGradientStops(paint.gradientStops, paintOpacity),
    path: {
      path: "circle",
      fillToRect: {
        left: pct(cx * 100),
        top: pct(cy * 100),
        right: pct((1 - cx) * 100),
        bottom: pct((1 - cy) * 100),
      },
    },
    rotWithShape: true,
  };
}

function convertImage(paint: FigImagePaint): BaseFill | undefined {
  if (!paint.imageRef) return undefined;
  return {
    type: "blipFill",
    resourceId: `fig-image:${paint.imageRef}`,
    stretch: {
      fillRect: {
        left: pct(0),
        top: pct(0),
        right: pct(0),
        bottom: pct(0),
      },
    },
    rotWithShape: true,
  };
}

function convertGradientStops(
  stops: readonly FigGradientStop[],
  paintOpacity: number,
): readonly GradientStop[] {
  return stops.map((stop): GradientStop => ({
    position: pct(stop.position * 100),
    color: figColorToColor(applyPaintOpacity(stop.color, paintOpacity)),
  }));
}

function normalizeAngle(degrees: number): number {
  let a = degrees % 360;
  if (a < 0) a += 360;
  return a;
}
