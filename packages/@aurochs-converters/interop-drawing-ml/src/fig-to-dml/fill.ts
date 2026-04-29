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
  FigImagePaint, FigGradientStop, FigGradientTransform, FigColor,
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
 *
 * @param nodeOpacity - The node's opacity (0-1). Multiplied into each
 *   paint's alpha so that a 50% opaque node with a 100% opaque fill
 *   produces a 50% alpha fill in PPTX.
 */
export function figFillsToDml(fills: readonly FigPaint[], nodeOpacity = 1): BaseFill | undefined {
  for (let i = fills.length - 1; i >= 0; i--) {
    const paint = fills[i];
    if (!isPaintVisible(paint)) {continue;}
    const result = convertSinglePaint(paint, nodeOpacity);
    if (result) {return result;}
  }
  return undefined;
}

// =============================================================================
// Internal
// =============================================================================

function isPaintVisible(paint: FigPaint): boolean {
  if (paint.visible === false) {return false;}
  if (paint.opacity !== undefined && paint.opacity <= 0) {return false;}
  return true;
}

function convertSinglePaint(paint: FigPaint, nodeOpacity: number): BaseFill | undefined {
  const paintOpacity = (paint.opacity ?? 1) * nodeOpacity;

  switch (paint.type) {
    case "SOLID":
      return convertSolid(paint, paintOpacity);
    case "GRADIENT_LINEAR":
      return convertLinearGradient(paint, paintOpacity);
    case "GRADIENT_RADIAL":
      return convertRadialGradient(paint, paintOpacity);
    case "GRADIENT_ANGULAR":
    case "GRADIENT_DIAMOND":
      // Angular/diamond have no direct DrawingML equivalent.
      // Fall back to linear as best-effort.
      return convertLinearGradient(paint, paintOpacity);
    case "IMAGE":
      return convertImage(paint);
  }
}

function convertSolid(paint: FigSolidPaint, paintOpacity: number): SolidFill {
  return {
    type: "solidFill",
    color: figColorToColor(applyPaintOpacity(paint.color, paintOpacity)),
  };
}

function applyPaintOpacity(color: FigColor, paintOpacity: number): FigColor {
  if (paintOpacity >= 0.999) {return color;}
  return { ...color, a: color.a * paintOpacity };
}

/**
 * Figma linear gradient: two handle positions (start, end) in 0-1.
 * DrawingML linear gradient: rotation angle in degrees.
 *
 * Both API form (gradientHandlePositions) and Kiwi binary form
 * (transform) are supported. .fig files loaded via the parser
 * carry the Kiwi form; documents constructed via the API carry
 * the handle form. We accept either.
 */
function convertLinearGradient(paint: FigGradientPaint, paintOpacity: number): BaseFill | undefined {
  const stops = resolveStops(paint);
  const fallback = solidFromStops(stops, paintOpacity);
  if (stops.length < 2) {return fallback;}

  const axis = resolveLinearAxis(paint);
  const angle = Math.atan2(axis.end.y - axis.start.y, axis.end.x - axis.start.x) * (180 / Math.PI);

  return {
    type: "gradientFill",
    stops: convertGradientStops(stops, paintOpacity),
    linear: { angle: deg(normalizeAngle(angle)), scaled: false },
    rotWithShape: true,
  };
}

/**
 * Figma radial gradient: handle[0] = center (or transform.m02, m12).
 * DrawingML path gradient with "circle": fillToRect defines the center.
 */
function convertRadialGradient(paint: FigGradientPaint, paintOpacity: number): BaseFill | undefined {
  const stops = resolveStops(paint);
  const fallback = solidFromStops(stops, paintOpacity);
  if (stops.length < 2) {return fallback;}

  const center = resolveRadialCenter(paint);
  const cx = clampUnit(center.x);
  const cy = clampUnit(center.y);

  return {
    type: "gradientFill",
    stops: convertGradientStops(stops, paintOpacity),
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

/**
 * Read gradient stops from API form (`gradientStops`) first, falling
 * back to Kiwi form (`stops`). Domain-level paints loaded from a .fig
 * file populate `stops`; programmatically constructed paints use
 * `gradientStops`.
 */
function resolveStops(paint: FigGradientPaint): readonly FigGradientStop[] {
  if (paint.gradientStops && paint.gradientStops.length > 0) {return paint.gradientStops;}
  if (paint.stops && paint.stops.length > 0) {return paint.stops;}
  return [];
}

/**
 * Resolve a linear gradient's start/end points in shape-normalized
 * 0-1 coordinates from either form.
 *
 * Kiwi convention (see FigGradientTransform doc):
 *   gradient (1, 0) → start (0% stop)
 *   gradient (0, 0) → end   (100% stop)
 * so given the 2x3 affine [m00 m01 m02; m10 m11 m12]:
 *   start = (m02 + m00, m12 + m10)
 *   end   = (m02,        m12)
 */
function resolveLinearAxis(
  paint: FigGradientPaint,
): { readonly start: { readonly x: number; readonly y: number }; readonly end: { readonly x: number; readonly y: number } } {
  const handles = paint.gradientHandlePositions;
  if (handles && handles.length >= 2) {
    return { start: handles[0], end: handles[1] };
  }
  const t = paint.transform;
  if (t) {
    const m00 = t.m00 ?? 1;
    const m02 = t.m02 ?? 0;
    const m10 = t.m10 ?? 0;
    const m12 = t.m12 ?? 0;
    return { start: { x: m02 + m00, y: m12 + m10 }, end: { x: m02, y: m12 } };
  }
  return { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } };
}

/**
 * Resolve a radial gradient's center in shape-normalized 0-1
 * coordinates from either form. For Kiwi radial transforms, the
 * center is encoded in the translation (m02, m12).
 */
function resolveRadialCenter(paint: FigGradientPaint): { readonly x: number; readonly y: number } {
  const handles = paint.gradientHandlePositions;
  if (handles && handles.length > 0) {return handles[0];}
  const t: FigGradientTransform | undefined = paint.transform;
  if (t) {return { x: t.m02 ?? 0.5, y: t.m12 ?? 0.5 };}
  return { x: 0.5, y: 0.5 };
}

function clampUnit(v: number): number {
  if (v < 0) {return 0;}
  if (v > 1) {return 1;}
  return v;
}

/**
 * When a gradient has 0 or 1 stops it cannot be expressed as a
 * valid DrawingML gradFill (gsLst requires ≥ 2 stops). Fall back
 * to a solid fill from the single stop, or undefined when empty.
 */
function solidFromStops(stops: readonly FigGradientStop[], paintOpacity: number): SolidFill | undefined {
  if (stops.length === 0) {return undefined;}
  return {
    type: "solidFill",
    color: figColorToColor(applyPaintOpacity(stops[0].color, paintOpacity)),
  };
}

function convertImage(paint: FigImagePaint): BaseFill | undefined {
  if (!paint.imageRef) {return undefined;}
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
  const a = degrees % 360;
  return a < 0 ? a + 360 : a;
}
