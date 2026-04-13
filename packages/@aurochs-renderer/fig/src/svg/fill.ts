/**
 * @file Fill rendering for Figma nodes (SVG string output)
 *
 * Paint interpretation (gradient direction, stops, image refs) is delegated
 * to the shared SoT in paint/interpret.ts. This file handles only
 * SVG-string-specific output formatting.
 */

import type { FigPaint, FigColor, FigGradientPaint, FigGradientStop, FigImagePaint } from "@aurochs/fig/types";
import type { FigSvgRenderContext } from "../types";
import { linearGradient, radialGradient, stop, pattern, image, type SvgString } from "./primitives";
import { isPlaceholderColor, figColorToHex, getPaintType } from "@aurochs/fig/color";
import {
  getGradientStops as sharedGetGradientStops,
  getGradientDirection as sharedGetGradientDirection,
  getRadialGradientCenterAndRadius as sharedGetRadialGradientCenterAndRadius,
  getImageRef as sharedGetImageRef,
} from "../paint";

// =============================================================================
// Fill Attributes
// =============================================================================

/**
 * Fill attributes for SVG elements
 */
export type FillAttrs = {
  fill: string;
  "fill-opacity"?: number;
};

/**
 * Options for getFillAttrs
 */
export type GetFillAttrsOptions = {
  /** Element size for image pattern sizing */
  readonly elementSize?: { width: number; height: number };
};

/**
 * Get fill attributes from Figma paints
 *
 * In Figma, multiple fills are layered bottom-to-top, so we use the last
 * visible paint (topmost layer) for rendering.
 */
export function getFillAttrs(
  paints: readonly FigPaint[] | undefined,
  ctx: FigSvgRenderContext,
  options?: GetFillAttrsOptions,
): FillAttrs {
  if (!paints || paints.length === 0) {
    return { fill: "none" };
  }

  // Find the last visible paint (topmost layer in Figma's stacking order)
  const visiblePaints = paints.filter((p) => p.visible !== false);
  if (visiblePaints.length === 0) {
    return { fill: "none" };
  }

  const topPaint = visiblePaints[visiblePaints.length - 1];
  return paintToFillAttrs(topPaint, ctx, options?.elementSize);
}

/**
 * Build fill attrs with optional opacity
 */
function buildFillWithOpacity(fill: string, opacity: number): FillAttrs {
  if (opacity < 1) {
    return { fill, "fill-opacity": opacity };
  }
  return { fill };
}

type ElementSize = { width: number; height: number };

/**
 * Convert a single paint to fill attributes
 */
function paintToFillAttrs(paint: FigPaint, ctx: FigSvgRenderContext, elementSize?: ElementSize): FillAttrs {
  const opacity = paint.opacity ?? 1;
  const paintType = getPaintType(paint);

  switch (paintType) {
    case "SOLID": {
      const solidPaint = paint as FigPaint & { color: FigColor };
      // Check for placeholder color (unresolved external style reference)
      if (isPlaceholderColor(solidPaint.color)) {
        return { fill: "none" }; // Skip placeholder colors
      }
      const color = figColorToHex(solidPaint.color);
      return buildFillWithOpacity(color, opacity);
    }

    case "GRADIENT_LINEAR": {
      const gradientPaint = paint as FigGradientPaint;
      const gradientId = createLinearGradient(gradientPaint, ctx);
      return buildFillWithOpacity(`url(#${gradientId})`, opacity);
    }

    case "GRADIENT_RADIAL": {
      const gradientPaint = paint as FigGradientPaint;
      const gradientId = createRadialGradient(gradientPaint, ctx);
      return buildFillWithOpacity(`url(#${gradientId})`, opacity);
    }

    case "IMAGE": {
      const imagePaint = paint as FigImagePaint;
      const patternId = createImagePattern(imagePaint, ctx, elementSize);
      if (patternId) {
        return buildFillWithOpacity(`url(#${patternId})`, opacity);
      }
      // Fallback to placeholder if no image found
      return { fill: "#cccccc" };
    }

    default:
      return { fill: "none" };
  }
}

// =============================================================================
// Gradient Creation (delegates interpretation to shared SoT)
// =============================================================================

/**
 * Create a linear gradient def and return its ID
 */
function createLinearGradient(paint: FigGradientPaint, ctx: FigSvgRenderContext): string {
  const id = ctx.defs.generateId("lg");

  const { start, end } = sharedGetGradientDirection(paint);
  const stops = createGradientStops(sharedGetGradientStops(paint));

  const gradientDef = linearGradient(
    {
      id,
      x1: `${start.x * 100}%`,
      y1: `${start.y * 100}%`,
      x2: `${end.x * 100}%`,
      y2: `${end.y * 100}%`,
    },
    ...stops,
  );

  ctx.defs.add(gradientDef);
  return id;
}

function createRadialGradient(paint: FigGradientPaint, ctx: FigSvgRenderContext): string {
  const id = ctx.defs.generateId("rg");
  const { center, radius } = sharedGetRadialGradientCenterAndRadius(paint);

  const stops = createGradientStops(sharedGetGradientStops(paint));

  const gradientDef = radialGradient(
    {
      id,
      cx: `${center.x * 100}%`,
      cy: `${center.y * 100}%`,
      r: `${Math.abs(radius) * 100}%`,
    },
    ...stops,
  );

  ctx.defs.add(gradientDef);
  return id;
}

/**
 * Get stop opacity if less than 1
 */
function getStopOpacity(alpha: number): number | undefined {
  if (alpha < 1) {
    return alpha;
  }
  return undefined;
}

/**
 * Create gradient stop elements
 */
function createGradientStops(stops: readonly FigGradientStop[]): SvgString[] {
  return stops.map((s) =>
    stop({
      offset: `${s.position * 100}%`,
      "stop-color": figColorToHex(s.color),
      "stop-opacity": getStopOpacity(s.color.a),
    }),
  );
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Check if paints array has any visible fills
 */
export function hasVisibleFill(paints: readonly FigPaint[] | undefined): boolean {
  if (!paints || paints.length === 0) {
    return false;
  }
  return paints.some((p) => p.visible !== false);
}

// =============================================================================
// Image Pattern Creation
// =============================================================================

/**
 * Convert Uint8Array to base64 string
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary);
}

/**
 * Create an image pattern def and return its ID
 */
function createImagePattern(paint: FigImagePaint, ctx: FigSvgRenderContext, elementSize?: ElementSize): string | null {
  const imageRef = sharedGetImageRef(paint);
  if (!imageRef) {
    return null;
  }

  // Look up the image in context
  const figImage = ctx.images.get(imageRef);
  if (!figImage) {
    return null;
  }

  return createPatternFromImage({ figImage, paint, ctx, elementSize });
}

type CreatePatternParams = {
  readonly figImage: { data: Uint8Array; mimeType: string };
  readonly paint: FigImagePaint;
  readonly ctx: FigSvgRenderContext;
  readonly elementSize?: ElementSize;
};

/**
 * Create a pattern element from an image
 */
function createPatternFromImage(params: CreatePatternParams): string {
  const { figImage, paint: _paint, ctx, elementSize: _elementSize } = params;
  const id = ctx.defs.generateId("img");

  // Convert image data to base64 data URI
  const base64 = uint8ArrayToBase64(figImage.data);
  const dataUri = `data:${figImage.mimeType};base64,${base64}`;

  // Use objectBoundingBox to match Figma's SVG export behavior:
  // the image stretches to fill the element's bounding box exactly.
  const patternDef = pattern(
    {
      id,
      patternContentUnits: "objectBoundingBox",
      width: 1,
      height: 1,
    },
    image({
      href: dataUri,
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      preserveAspectRatio: "none",
    }),
  );

  ctx.defs.add(patternDef);
  return id;
}

type ScaleMode = "FILL" | "FIT" | "CROP" | "TILE";

/**
 * Extract scale mode from imageScaleMode field
 */
function extractImageScaleMode(imageScaleMode: { name?: string } | string): ScaleMode | undefined {
  if (typeof imageScaleMode === "string") {
    return imageScaleMode as ScaleMode;
  }
  return imageScaleMode.name as ScaleMode | undefined;
}

/**
 * Get scale mode from paint
 */
function getScaleMode(paint: FigImagePaint): ScaleMode | undefined {
  if (paint.scaleMode) {
    return paint.scaleMode;
  }
  const paintData = paint as Record<string, unknown>;
  if (paintData.imageScaleMode) {
    return extractImageScaleMode(paintData.imageScaleMode as { name?: string } | string);
  }
  return undefined;
}

/**
 * Get SVG preserveAspectRatio from Figma scale mode
 */
function _getPreserveAspectRatio(paint: FigImagePaint): string {
  const scaleMode = getScaleMode(paint);

  switch (scaleMode) {
    case "FIT":
      // FIT: Scale to fit inside, maintaining aspect ratio, showing all content
      return "xMidYMid meet";
    case "FILL":
      // FILL: Scale to fill the container, maintaining aspect ratio, cropping excess
      return "xMidYMid slice";
    case "CROP":
      // CROP: Same as FILL - maintains aspect ratio but clips
      return "xMidYMid slice";
    case "TILE":
      // TILE: No aspect ratio preservation (handled separately with pattern repeat)
      return "none";
    default:
      // Default to FILL behavior for most UI images
      return "xMidYMid slice";
  }
}
