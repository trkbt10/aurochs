/**
 * @file Fill rendering for Figma nodes
 */

import type {
  FigPaint,
  FigColor,
  FigGradientPaint,
  FigGradientStop,
  FigImagePaint,
} from "@oxen/fig/types";
import type { FigSvgRenderContext } from "../types";
import { linearGradient, radialGradient, stop, pattern, image, type SvgString } from "./primitives";

// =============================================================================
// Color Conversion
// =============================================================================

/**
 * Check if color is a placeholder (pure red r:1, g:0, b:0)
 * Figma uses this as placeholder when external style references cannot be resolved
 */
export function isPlaceholderColor(color: FigColor): boolean {
  return color.r === 1 && color.g === 0 && color.b === 0;
}

/**
 * Convert Figma color (0-1 range) to CSS hex color
 */
export function figColorToHex(color: FigColor): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * Convert Figma color to CSS rgba
 */
export function figColorToRgba(color: FigColor): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `rgba(${r}, ${g}, ${b}, ${color.a})`;
}

// =============================================================================
// Paint Type Helper
// =============================================================================

/**
 * Get paint type as string (handles both string and enum object forms)
 */
export function getPaintType(paint: FigPaint): string {
  const type = paint.type;
  if (typeof type === "string") {
    return type;
  }
  if (type && typeof type === "object" && "name" in type) {
    return (type as { name: string }).name;
  }
  return "UNKNOWN";
}

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
 */
export function getFillAttrs(
  paints: readonly FigPaint[] | undefined,
  ctx: FigSvgRenderContext,
  options?: GetFillAttrsOptions
): FillAttrs {
  if (!paints || paints.length === 0) {
    return { fill: "none" };
  }

  // Find the first visible paint
  const visiblePaint = paints.find((p) => p.visible !== false);
  if (!visiblePaint) {
    return { fill: "none" };
  }

  return paintToFillAttrs(visiblePaint, ctx, options?.elementSize);
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
// Gradient Creation
// =============================================================================

/**
 * Alternative gradient stop format used in .fig files
 */
type FigGradientStopAlt = {
  readonly color: FigColor;
  readonly position: number;
};

/**
 * Get gradient stops from paint (handles both formats)
 */
function getGradientStops(paint: FigGradientPaint): readonly FigGradientStop[] {
  // Try gradientStops first (API format)
  if (paint.gradientStops && paint.gradientStops.length > 0) {
    return paint.gradientStops;
  }

  // Try stops (fig file format)
  const paintData = paint as Record<string, unknown>;
  const stops = paintData.stops as readonly FigGradientStopAlt[] | undefined;
  if (stops && stops.length > 0) {
    return stops;
  }

  return [];
}

/**
 * Get gradient direction from transform matrix
 *
 * Figma's gradient transform matrix maps gradient coordinates to object space.
 * The transform is a 2x3 affine matrix:
 * | m00 m01 m02 |
 * | m10 m11 m12 |
 *
 * In Figma's gradient space:
 * - Point (0, 0) is the gradient start (position 0)
 * - Point (1, 0) is the gradient end (position 1)
 *
 * The transform maps these to object space (normalized 0-1 coordinates).
 * We then reverse the direction to match SVG's expectation that gradients
 * flow from start (offset 0) to end (offset 1).
 */
type GradientTransform = { m00?: number; m01?: number; m10?: number; m11?: number; m02?: number; m12?: number };

function getGradientDirectionFromTransform(
  transform: GradientTransform | undefined
): { start: { x: number; y: number }; end: { x: number; y: number } } {
  if (!transform) {
    return { start: { x: 0, y: 0 }, end: { x: 0, y: 1 } };
  }

  const m00 = transform.m00 ?? 1;
  const _m01 = transform.m01 ?? 0;
  const m02 = transform.m02 ?? 0;
  const m10 = transform.m10 ?? 0;
  const _m11 = transform.m11 ?? 1;
  const m12 = transform.m12 ?? 0;

  // Map gradient point (0, 0) - start in gradient space
  const grad0X = m02;
  const grad0Y = m12;

  // Map gradient point (1, 0) - end in gradient space
  const grad1X = m00 + m02;
  const grad1Y = m10 + m12;

  // Figma's gradient runs from (0,0) to (1,0), but the visual direction
  // might be reversed depending on the transform. The transform here
  // gives us a -90° rotation, meaning the gradient that was horizontal
  // is now vertical, running from bottom (grad0) to top (grad1).
  //
  // However, for the Cover gradient to match the actual SVG output
  // (bright blue at TOP, dark blue at BOTTOM), we need to SWAP the
  // start and end points.
  return {
    start: { x: grad1X, y: grad1Y },
    end: { x: grad0X, y: grad0Y },
  };
}

/**
 * Get gradient direction from paint (handles both API and fig file formats)
 */
function getGradientDirection(paint: FigGradientPaint): { start: { x: number; y: number }; end: { x: number; y: number } } {
  const handles = paint.gradientHandlePositions;
  if (handles && handles.length >= 2) {
    // API format with handles
    return {
      start: handles[0] ?? { x: 0, y: 0.5 },
      end: handles[1] ?? { x: 1, y: 0.5 },
    };
  }
  // Fig file format with transform matrix
  const paintData = paint as Record<string, unknown>;
  const transform = paintData.transform as GradientTransform | undefined;
  return getGradientDirectionFromTransform(transform);
}

/**
 * Create a linear gradient def and return its ID
 */
function createLinearGradient(paint: FigGradientPaint, ctx: FigSvgRenderContext): string {
  const id = ctx.defs.generateId("lg");

  // Get gradient direction
  const { start, end } = getGradientDirection(paint);

  const stops = createGradientStops(getGradientStops(paint));

  const gradientDef = linearGradient(
    {
      id,
      x1: `${start.x * 100}%`,
      y1: `${start.y * 100}%`,
      x2: `${end.x * 100}%`,
      y2: `${end.y * 100}%`,
    },
    ...stops
  );

  ctx.defs.add(gradientDef);
  return id;
}

/**
 * Get radial gradient center and radius from paint
 */
function getRadialGradientCenterAndRadius(paint: FigGradientPaint): { center: { x: number; y: number }; radius: number } {
  const handles = paint.gradientHandlePositions;
  if (handles && handles.length >= 2) {
    // API format with handles
    const center = handles[0] ?? { x: 0.5, y: 0.5 };
    const edge = handles[1] ?? { x: 1, y: 0.5 };
    const radius = Math.sqrt(
      Math.pow((edge.x - center.x), 2) + Math.pow((edge.y - center.y), 2)
    );
    return { center, radius };
  }
  // Fig file format - use transform
  const paintData = paint as Record<string, unknown>;
  const transform = paintData.transform as GradientTransform | undefined;
  return {
    center: { x: transform?.m02 ?? 0.5, y: transform?.m12 ?? 0.5 },
    radius: transform?.m00 ?? 0.5,
  };
}

/**
 * Create a radial gradient def and return its ID
 */
function createRadialGradient(paint: FigGradientPaint, ctx: FigSvgRenderContext): string {
  const id = ctx.defs.generateId("rg");
  const { center, radius } = getRadialGradientCenterAndRadius(paint);

  const stops = createGradientStops(getGradientStops(paint));

  const gradientDef = radialGradient(
    {
      id,
      cx: `${center.x * 100}%`,
      cy: `${center.y * 100}%`,
      r: `${Math.abs(radius) * 100}%`,
    },
    ...stops
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
    })
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
 * Convert hash array to hex string
 */
function hashArrayToHex(hash: readonly number[]): string {
  return hash.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Get image ref from paint (handles both API and .fig file formats)
 */
function getImageRef(paint: FigImagePaint): string | null {
  // API format: imageRef is a string
  if (paint.imageRef) {
    return paint.imageRef;
  }

  // .fig file format: image.hash is a byte array
  const paintData = paint as Record<string, unknown>;
  const image = paintData.image as { hash?: readonly number[] } | undefined;
  if (image?.hash && Array.isArray(image.hash) && image.hash.length > 0) {
    return hashArrayToHex(image.hash);
  }

  // Also check imageHash for older formats
  const imageHash = paintData.imageHash as string | readonly number[] | undefined;
  if (typeof imageHash === "string") {
    return imageHash;
  }
  if (Array.isArray(imageHash) && imageHash.length > 0) {
    return hashArrayToHex(imageHash);
  }

  return null;
}

/**
 * Create an image pattern def and return its ID
 */
function createImagePattern(
  paint: FigImagePaint,
  ctx: FigSvgRenderContext,
  elementSize?: ElementSize
): string | null {
  const imageRef = getImageRef(paint);
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
  const { figImage, paint, ctx, elementSize } = params;
  const id = ctx.defs.generateId("img");

  // Convert image data to base64 data URI
  const base64 = uint8ArrayToBase64(figImage.data);
  const dataUri = `data:${figImage.mimeType};base64,${base64}`;

  // If element size is provided, use userSpaceOnUse for correct aspect ratio
  if (elementSize && elementSize.width > 0 && elementSize.height > 0) {
    const patternDef = pattern(
      {
        id,
        patternUnits: "userSpaceOnUse",
        width: elementSize.width,
        height: elementSize.height,
      },
      image({
        href: dataUri,
        x: 0,
        y: 0,
        width: elementSize.width,
        height: elementSize.height,
        preserveAspectRatio: getPreserveAspectRatio(paint),
      })
    );

    ctx.defs.add(patternDef);
    return id;
  }

  // Fallback: use objectBoundingBox (may distort non-square images)
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
      preserveAspectRatio: getPreserveAspectRatio(paint),
    })
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
function getPreserveAspectRatio(paint: FigImagePaint): string {
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
