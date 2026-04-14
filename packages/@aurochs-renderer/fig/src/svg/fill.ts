/**
 * @file Fill rendering for Figma nodes (SVG string output)
 *
 * Paint interpretation (gradient direction, stops, image refs) is delegated
 * to the shared SoT in paint/interpret.ts. This file handles only
 * SVG-string-specific output formatting.
 */

import type { FigPaint, FigGradientPaint, FigGradientStop, FigImagePaint } from "@aurochs/fig/types";
import type { FigSvgRenderContext } from "../types";
import { linearGradient, radialGradient, stop, pattern, image, clipPath, foreignObject, rect, g, unsafeSvg, type SvgString } from "./primitives";
import { isPlaceholderColor, figColorToHex, getPaintType, getSolidPaintColor } from "@aurochs/fig/color";
import {
  getGradientStops as sharedGetGradientStops,
  getGradientDirection as sharedGetGradientDirection,
  getRadialGradientCenterAndRadius as sharedGetRadialGradientCenterAndRadius,
  getAngularGradientParams as sharedGetAngularGradientParams,
  getDiamondGradientParams as sharedGetDiamondGradientParams,
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
      const color = getSolidPaintColor(paint);
      if (!color || isPlaceholderColor(color)) {
        return { fill: "none" };
      }
      return buildFillWithOpacity(figColorToHex(color), opacity);
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
// Stroke-as-Fill Conversion
// =============================================================================

/**
 * Build fill attributes from stroke paints.
 *
 * strokeGeometry is Figma's pre-expanded outline of a stroke.
 * These paths represent the stroke shape as a filled area, so they must
 * be filled with the stroke colour instead of being stroked.
 *
 * This is a shared utility — previously duplicated across ellipse.ts,
 * vector.ts, rectangle.ts, and frame.ts.
 */
export function strokePaintsToFillAttrs(paints: readonly FigPaint[] | undefined): FillAttrs {
  if (!paints || paints.length === 0) { return { fill: "none" }; }
  const visible = paints.find((p) => p.visible !== false);
  if (!visible) { return { fill: "none" }; }

  const color = getSolidPaintColor(visible);
  if (color) {
    const hex = figColorToHex(color);
    const opacity = visible.opacity ?? 1;
    if (opacity < 1) { return { fill: hex, "fill-opacity": opacity }; }
    return { fill: hex };
  }

  return { fill: "#000000" };
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

// =============================================================================
// Advanced Fill Result — supports angular/diamond gradients
// =============================================================================

/**
 * Shape geometry descriptor. Needed for complex gradients and multi-fill layers.
 *
 * `clipShapes` are used for clipPath definitions (angular/diamond gradients).
 * `renderFillLayer` creates a new shape element with the given fill, used for
 * multi-fill layer stacking.
 */
export type ShapeGeometry = {
  /** SVG element(s) describing the shape, used as clipPath children */
  readonly clipShapes: readonly SvgString[];
  /** Bounding box in the shape's local coordinate system */
  readonly bounds: { x: number; y: number; width: number; height: number };
  /**
   * Construct a shape element with the specified fill attributes.
   * Used for multi-fill layers where each layer needs an independent
   * shape element with its own fill. Must use primitives (rect, ellipse, path)
   * to preserve SvgString safety.
   */
  readonly renderFillLayer: (attrs: FillAttrs) => SvgString;
};

/** Simple fill: expressible as SVG fill attributes */
export type SimpleFillResult = {
  readonly kind: "simple";
  readonly attrs: FillAttrs;
};

/**
 * Complex fill: requires additional SVG elements prepended before the shape.
 * The shape itself gets fill="none" so the prepended gradient shows through.
 */
export type ComplexFillResult = {
  readonly kind: "complex";
  /** SVG elements to prepend before the shape */
  readonly prependElements: readonly SvgString[];
  /** The shape's own fill attrs (typically fill="none") */
  readonly attrs: FillAttrs;
};

export type FillResult = SimpleFillResult | ComplexFillResult;

/**
 * Resolve a single paint to a FillResult.
 */
function resolveSinglePaint(
  paint: FigPaint,
  ctx: FigSvgRenderContext,
  geometry: ShapeGeometry,
  elementSize?: ElementSize,
): FillResult {
  const paintType = getPaintType(paint);

  switch (paintType) {
    case "GRADIENT_ANGULAR":
      return createAngularGradientFill(paint as FigGradientPaint, ctx, geometry);

    case "GRADIENT_DIAMOND":
      return createDiamondGradientFill(paint as FigGradientPaint, ctx, geometry);

    default:
      return {
        kind: "simple",
        attrs: paintToFillAttrs(paint, ctx, elementSize),
      };
  }
}

/**
 * Resolve fill for paints, handling all gradient types and multiple fill layers.
 *
 * Single visible paint: resolves directly to SimpleFillResult or ComplexFillResult.
 * Multiple visible paints: layers them bottom-to-top as prepended shape copies,
 * each with its own fill. The topmost paint goes on the shape element itself
 * (or as the final prepend if it's complex).
 *
 * Figma stacks fills bottom (index 0) to top (last index). In SVG, later
 * elements paint over earlier ones, so we emit layers in array order.
 */
export function getFillResult(
  paints: readonly FigPaint[] | undefined,
  ctx: FigSvgRenderContext,
  geometry: ShapeGeometry,
  options?: GetFillAttrsOptions,
): FillResult {
  if (!paints || paints.length === 0) {
    return { kind: "simple", attrs: { fill: "none" } };
  }

  const visiblePaints = paints.filter((p) => p.visible !== false);
  if (visiblePaints.length === 0) {
    return { kind: "simple", attrs: { fill: "none" } };
  }

  // Single paint — no layering needed
  if (visiblePaints.length === 1) {
    return resolveSinglePaint(visiblePaints[0], ctx, geometry, options?.elementSize);
  }

  // Multiple paints — layer them.
  // Bottom layers (indices 0..n-2) become prepended shape copies.
  // Top layer (index n-1) becomes the shape's own fill attrs.
  const prependElements: SvgString[] = [];

  // Create a shared clipPath for the shape geometry (used by complex paints)
  // Also used to clip each layer's shape copy to the correct bounds.
  for (let i = 0; i < visiblePaints.length - 1; i++) {
    const layerResult = resolveSinglePaint(visiblePaints[i], ctx, geometry, options?.elementSize);

    if (layerResult.kind === "complex") {
      prependElements.push(...layerResult.prependElements);
    } else {
      prependElements.push(geometry.renderFillLayer(layerResult.attrs));
    }
  }

  // Top layer
  const topResult = resolveSinglePaint(
    visiblePaints[visiblePaints.length - 1], ctx, geometry, options?.elementSize,
  );

  if (topResult.kind === "complex") {
    // Top is also complex — all layers are prepended, shape gets fill="none"
    prependElements.push(...topResult.prependElements);
    return {
      kind: "complex",
      prependElements,
      attrs: { fill: "none" },
    };
  }

  // Top is simple — lower layers are prepended, top goes on the shape
  if (prependElements.length > 0) {
    return {
      kind: "complex",
      prependElements,
      attrs: topResult.attrs,
    };
  }

  return topResult;
}

/**
 * Apply a FillResult to a rendered shape element.
 *
 * SimpleFillResult: returns the shape element unchanged (fill attrs
 * were already applied to the element).
 * ComplexFillResult: wraps the shape in a group with prepended gradient
 * elements.
 */
export function applyFillResult(
  fillResult: FillResult,
  shapeElement: SvgString,
): SvgString {
  if (fillResult.kind === "simple") {
    return shapeElement;
  }
  return g({}, ...fillResult.prependElements, shapeElement);
}

// =============================================================================
// Angular (Conic) Gradient
// =============================================================================

/**
 * Create an angular gradient fill using CSS conic-gradient inside
 * a foreignObject, clipped to the shape geometry.
 *
 * This matches Figma's SVG export approach: SVG 1.1 has no conic
 * gradient primitive, so we use HTML foreignObject with CSS.
 */
function createAngularGradientFill(
  paint: FigGradientPaint,
  ctx: FigSvgRenderContext,
  geometry: ShapeGeometry,
): ComplexFillResult {
  const stops = sharedGetGradientStops(paint);
  const { center, startAngle } = sharedGetAngularGradientParams(paint);
  const { bounds, clipShapes } = geometry;

  // Create clipPath from shape geometry
  const clipId = ctx.defs.generateId("ag-clip");
  const clipDef = clipPath({ id: clipId }, ...clipShapes);
  ctx.defs.add(clipDef);

  // Build CSS conic-gradient string
  const cssStops = stops
    .map((s) => `${figColorToHex(s.color)} ${s.position * 360}deg`)
    .join(", ");
  const fromAngle = startAngle;
  const centerX = center.x * 100;
  const centerY = center.y * 100;
  const cssGradient = `conic-gradient(from ${fromAngle}deg at ${centerX}% ${centerY}%, ${cssStops})`;

  const opacity = paint.opacity ?? 1;
  const opacityStyle = opacity < 1 ? `opacity:${opacity};` : "";

  // foreignObject with HTML div carrying the conic gradient
  const fo = foreignObject(
    { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
    unsafeSvg(
      `<div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;background:${cssGradient};${opacityStyle}"></div>`,
    ),
  );

  const clippedGroup = g({ "clip-path": `url(#${clipId})` }, fo);

  return {
    kind: "complex",
    prependElements: [clippedGroup],
    attrs: { fill: "none" },
  };
}

// =============================================================================
// Diamond Gradient
// =============================================================================

/**
 * Create a diamond gradient fill using four mirrored linear gradients,
 * clipped to the shape geometry.
 *
 * Figma exports diamond gradients as four <rect> elements with the
 * same linearGradient, each mirrored along X/Y axes to create the
 * diamond pattern.
 */
function createDiamondGradientFill(
  paint: FigGradientPaint,
  ctx: FigSvgRenderContext,
  geometry: ShapeGeometry,
): ComplexFillResult {
  const stops = sharedGetGradientStops(paint);
  const { center } = sharedGetDiamondGradientParams(paint);
  const { bounds, clipShapes } = geometry;

  // Create clipPath from shape geometry
  const clipId = ctx.defs.generateId("dg-clip");
  const clipDef = clipPath({ id: clipId }, ...clipShapes);
  ctx.defs.add(clipDef);

  // Create a linearGradient from center toward edge (diagonal)
  const lgId = ctx.defs.generateId("dg-lg");
  const gradientStops = createGradientStops(stops);
  const lgDef = linearGradient(
    {
      id: lgId,
      x1: "0",
      y1: "0",
      x2: `${bounds.width * 0.5}`,
      y2: `${bounds.height * 0.5}`,
      gradientUnits: "userSpaceOnUse",
    },
    ...gradientStops,
  );
  ctx.defs.add(lgDef);

  // Four mirrored rects covering the bounding box
  const cx = bounds.x + bounds.width * center.x;
  const cy = bounds.y + bounds.height * center.y;
  const fillUrl = `url(#${lgId})`;
  const opacity = paint.opacity ?? 1;
  const opacityAttr = opacity < 1 ? opacity : undefined;

  const quadrants: SvgString[] = [
    rect({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, fill: fillUrl, opacity: opacityAttr }),
    rect({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, fill: fillUrl, opacity: opacityAttr,
      transform: `translate(${2 * cx}, 0) scale(-1, 1)` }),
    rect({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, fill: fillUrl, opacity: opacityAttr,
      transform: `translate(0, ${2 * cy}) scale(1, -1)` }),
    rect({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, fill: fillUrl, opacity: opacityAttr,
      transform: `translate(${2 * cx}, ${2 * cy}) scale(-1, -1)` }),
  ];

  const clippedGroup = g({ "clip-path": `url(#${clipId})` }, ...quadrants);

  return {
    kind: "complex",
    prependElements: [clippedGroup],
    attrs: { fill: "none" },
  };
}
