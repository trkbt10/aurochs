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
import { figColorToHex, getPaintType, getSolidPaintColor } from "@aurochs/fig/color";
import {
  getGradientStops as sharedGetGradientStops,
  getGradientDirection as sharedGetGradientDirection,
  getRadialGradientCenterAndRadius as sharedGetRadialGradientCenterAndRadius,
  getAngularGradientParams as sharedGetAngularGradientParams,
  getDiamondGradientParams as sharedGetDiamondGradientParams,
  getImageRef as sharedGetImageRef,
} from "../paint";

// =============================================================================
// Paint Blend Mode
// =============================================================================

/**
 * Map Figma blend mode names to CSS mix-blend-mode values.
 *
 * PASS_THROUGH and NORMAL have no CSS equivalent — they use the default
 * compositing (source-over), so we return undefined.
 */
const PAINT_BLEND_MODE_TO_CSS: Record<string, string> = {
  DARKEN: "darken",
  MULTIPLY: "multiply",
  LINEAR_BURN: "plus-darker",
  COLOR_BURN: "color-burn",
  LIGHTEN: "lighten",
  SCREEN: "screen",
  LINEAR_DODGE: "plus-lighter",
  COLOR_DODGE: "color-dodge",
  OVERLAY: "overlay",
  SOFT_LIGHT: "soft-light",
  HARD_LIGHT: "hard-light",
  DIFFERENCE: "difference",
  EXCLUSION: "exclusion",
  HUE: "hue",
  SATURATION: "saturation",
  COLOR: "color",
  LUMINOSITY: "luminosity",
};

/**
 * Get CSS mix-blend-mode from a paint's blendMode field.
 * Returns undefined for NORMAL / PASS_THROUGH / unset.
 */
export function getPaintBlendModeCss(paint: FigPaint): string | undefined {
  const bm = paint.blendMode;
  if (!bm) { return undefined; }
  const name = typeof bm === "string" ? bm : bm.name;
  return PAINT_BLEND_MODE_TO_CSS[name];
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
 * Convert a single paint to fill attributes.
 *
 * Exported for reuse by stroke rendering (gradient strokes use the same
 * gradient defs mechanism — the result's `fill` value can be used as
 * SVG `stroke` since both accept `url(#id)` references).
 */
export function paintToFillAttrs(paint: FigPaint, ctx: FigSvgRenderContext, elementSize?: ElementSize): FillAttrs {
  const opacity = paint.opacity ?? 1;
  const paintType = getPaintType(paint);

  switch (paintType) {
    case "SOLID": {
      const color = getSolidPaintColor(paint);
      if (!color) {
        return { fill: "none" };
      }
      // Note: #ff0000 (r=1,g=0,b=0) was previously treated as a "placeholder"
      // color, but this is incorrect. Pure red is a valid color that users
      // intentionally set. Style ID resolution (resolveNodeStyleIds) handles
      // stale cached paints before rendering, so any color reaching this point
      // is authoritative.
      return buildFillWithOpacity(figColorToHex(color), opacity);
    }

    case "GRADIENT_LINEAR": {
      const gradientPaint = paint as FigGradientPaint;
      const gradientId = createLinearGradient(gradientPaint, ctx, elementSize);
      return buildFillWithOpacity(`url(#${gradientId})`, opacity);
    }

    case "GRADIENT_RADIAL": {
      const gradientPaint = paint as FigGradientPaint;
      const gradientId = createRadialGradient(gradientPaint, ctx, elementSize);
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
function createLinearGradient(paint: FigGradientPaint, ctx: FigSvgRenderContext, elementSize?: ElementSize): string {
  const id = ctx.defs.generateId("lg");
  const stops = createGradientStops(sharedGetGradientStops(paint));

  // When elementSize is available, compute final userSpaceOnUse coordinates
  // directly from Figma's paint transform, matching Figma's SVG export format.
  //
  // Figma's gradient transform maps gradient space to normalized object space (0..1):
  //   (1, 0) → start point (0% stop) = (m00 + m02, m10 + m12)
  //   (0, 0) → end point (100% stop)  = (m02, m12)
  //
  // SVG linearGradient maps:
  //   (x1, y1) = 0% stop position (start)
  //   (x2, y2) = 100% stop position (end)
  //
  // To convert from normalized → pixel coordinates: multiply by elementSize.
  const transform = paint.transform;

  if (elementSize && transform) {
    const w = elementSize.width;
    const h = elementSize.height;

    // Start (0% stop): gradient space (1, 0) → normalized → pixel
    const startNormX = (transform.m00 ?? 1) + (transform.m02 ?? 0);
    const startNormY = (transform.m10 ?? 0) + (transform.m12 ?? 0);
    const x1 = startNormX * w;
    const y1 = startNormY * h;

    // End (100% stop): gradient space (0, 0) → normalized → pixel
    const endNormX = transform.m02 ?? 0;
    const endNormY = transform.m12 ?? 0;
    const x2 = endNormX * w;
    const y2 = endNormY * h;

    const gradientDef = linearGradient(
      {
        id,
        x1: `${x1}`,
        y1: `${y1}`,
        x2: `${x2}`,
        y2: `${y2}`,
        gradientUnits: "userSpaceOnUse",
      },
      ...stops,
    );

    ctx.defs.add(gradientDef);
    return id;
  }

  // Fallback: objectBoundingBox with percentage coordinates
  const { start, end } = sharedGetGradientDirection(paint);
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

function createRadialGradient(paint: FigGradientPaint, ctx: FigSvgRenderContext, elementSize?: ElementSize): string {
  const id = ctx.defs.generateId("rg");
  const stops = createGradientStops(sharedGetGradientStops(paint));

  // When elementSize is available, use userSpaceOnUse with a gradientTransform
  // derived from the paint's transform matrix. This matches Figma's export format:
  //   cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
  //   gradientTransform="translate(...) scale(...)"
  //
  // The paint's transform maps gradient space → normalized object space (0..1).
  // Multiplying by elementSize converts to pixel coordinates for userSpaceOnUse.
  const transform = paint.transform;

  if (elementSize && transform) {
    const w = elementSize.width;
    const h = elementSize.height;

    // Figma's paint transform maps gradient space → normalized object space.
    // For radial gradients, the gradient is defined on a unit circle centered
    // at (0.5, 0.5) with radius 0.5 in gradient space. The transform positions
    // and shapes this circle into the element.
    //
    // To produce the SVG gradientTransform:
    //   1. Compute center in pixel coordinates: transform × (0.5, 0.5) × elementSize
    //   2. Decompose the 2×2 rotation+scale part into angle + radii
    //   3. Emit translate(cx, cy) rotate(angle) scale(rx, ry)

    const m00 = transform.m00 ?? 1;
    const m01 = transform.m01 ?? 0;
    const m02 = transform.m02 ?? 0;
    const m10 = transform.m10 ?? 0;
    const m11 = transform.m11 ?? 1;
    const m12 = transform.m12 ?? 0;

    // Center: transform × (0.5, 0.5) → normalized → pixel
    const cx = (m00 * 0.5 + m01 * 0.5 + m02) * w;
    const cy = (m10 * 0.5 + m11 * 0.5 + m12) * h;

    // The 2×2 part [m00, m01; m10, m11] encodes rotation + non-uniform scale.
    // Column vectors scaled by elementSize give the ellipse axes:
    //   axis1 = (m00 * w, m10 * h) × 0.5
    //   axis2 = (m01 * w, m11 * h) × 0.5
    // The SVG radial gradient with rotate + scale needs the angle and axis lengths.

    const ax1x = m00 * w * 0.5;
    const ax1y = m10 * h * 0.5;
    const ax2x = m01 * w * 0.5;
    const ax2y = m11 * h * 0.5;

    const r1 = Math.sqrt(ax1x * ax1x + ax1y * ax1y);
    const r2 = Math.sqrt(ax2x * ax2x + ax2y * ax2y);

    // Rotation angle from the first axis
    const angle = Math.atan2(ax1y, ax1x) * (180 / Math.PI);

    const gradientDef = radialGradient(
      {
        id,
        cx: "0",
        cy: "0",
        r: "1",
        gradientUnits: "userSpaceOnUse",
        gradientTransform: `translate(${cx} ${cy}) rotate(${angle}) scale(${r1} ${r2})`,
      },
      ...stops,
    );

    ctx.defs.add(gradientDef);
    return id;
  }

  // Fallback: objectBoundingBox (no transform available)
  const { center, radius } = sharedGetRadialGradientCenterAndRadius(paint);
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
 * Figma layers paints bottom (index 0) to top (last index), so the
 * topmost (last) visible paint determines the visible fill colour.
 *
 * This is a shared utility — previously duplicated across ellipse.ts,
 * vector.ts, rectangle.ts, and frame.ts.
 */
export function strokePaintsToFillAttrs(paints: readonly FigPaint[] | undefined): FillAttrs {
  if (!paints || paints.length === 0) { return { fill: "none" }; }

  // Use the last (topmost) visible paint — Figma layers bottom-to-top
  const visiblePaints = paints.filter((p) => p.visible !== false);
  if (visiblePaints.length === 0) { return { fill: "none" }; }

  const topPaint = visiblePaints[visiblePaints.length - 1];
  const color = getSolidPaintColor(topPaint);
  if (color) {
    const hex = figColorToHex(color);
    const opacity = topPaint.opacity ?? 1;
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

type ImageDimensions = { readonly width: number; readonly height: number };

/**
 * Extract pixel dimensions from image binary data.
 *
 * Supports JPEG (SOF0/SOF2 markers) and PNG (IHDR chunk).
 * Returns undefined if the format is unrecognized.
 */
function getImageDimensions(data: Uint8Array, mimeType: string): ImageDimensions | undefined {
  if (mimeType === "image/png" && data.length >= 24) {
    // PNG IHDR: bytes 16-19 = width (big-endian), 20-23 = height
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const width = view.getUint32(16);
    const height = view.getUint32(20);
    if (width > 0 && height > 0) {
      return { width, height };
    }
  }

  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    // JPEG: scan for SOF0 (0xFFC0) or SOF2 (0xFFC2) marker
    for (let i = 0; i < data.length - 9; i++) {
      if (data[i] === 0xFF && (data[i + 1] === 0xC0 || data[i + 1] === 0xC2)) {
        const view = new DataView(data.buffer, data.byteOffset + i + 5, 4);
        const height = view.getUint16(0);
        const width = view.getUint16(2);
        if (width > 0 && height > 0) {
          return { width, height };
        }
      }
    }
  }

  return undefined;
}

type CreatePatternParams = {
  readonly figImage: { data: Uint8Array; mimeType: string };
  readonly paint: FigImagePaint;
  readonly ctx: FigSvgRenderContext;
  readonly elementSize?: ElementSize;
};

/**
 * Create a pattern element from an image.
 *
 * Figma's SVG export uses `patternContentUnits="objectBoundingBox"` and
 * positions the image via a `<use transform="translate(tx ty) scale(sx [sy])"/>`
 * where sx/sy map image pixels to the 0..1 objectBoundingBox space.
 *
 * For FILL mode: scale by the shorter axis to cover the element, then
 * center-crop the excess. For STRETCH: scale both axes independently.
 */
function createPatternFromImage(params: CreatePatternParams): string {
  const { figImage, paint, ctx, elementSize } = params;
  const id = ctx.defs.generateId("img");

  // Convert image data to base64 data URI
  const base64 = uint8ArrayToBase64(figImage.data);
  const dataUri = `data:${figImage.mimeType};base64,${base64}`;

  const imgDim = getImageDimensions(figImage.data, figImage.mimeType);
  const scaleMode = getScaleMode(paint);

  // Compute image transform in objectBoundingBox space (0..1)
  const imgTransform = computeImagePatternTransform(
    imgDim,
    elementSize,
    scaleMode,
    paint.transform,
  );

  const patternContent = imgTransform
    ? image({
        href: dataUri,
        width: imgDim?.width ?? 1,
        height: imgDim?.height ?? 1,
        transform: imgTransform,
      })
    : image({
        href: dataUri,
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        preserveAspectRatio: "none",
      });

  const patternDef = pattern(
    {
      id,
      patternContentUnits: "objectBoundingBox",
      width: 1,
      height: 1,
    },
    patternContent,
  );

  ctx.defs.add(patternDef);
  return id;
}

/**
 * Compute the SVG transform for an image inside a pattern with
 * `patternContentUnits="objectBoundingBox"`.
 *
 * In objectBoundingBox space, the element spans (0,0)–(1,1).
 * The image needs to be scaled from its pixel dimensions into this space.
 *
 * Figma's paint.transform maps image normalised coordinates (0..1)
 * to element normalised coordinates (0..1). In the SVG pattern we need
 * the inverse: element → image (pixel). The combined transform for the
 * `<image>` element is therefore:
 *
 *     T_svg = inv(paint.transform) × diag(1/imgW, 1/imgH)
 *
 * For FILL mode with an identity paint.transform this simplifies to a
 * uniform scale (cover) with centre-crop offset.
 *
 * Returns a transform string or undefined if image dimensions are unavailable.
 */
function computeImagePatternTransform(
  imgDim: ImageDimensions | undefined,
  elementSize: ElementSize | undefined,
  scaleMode: ScaleMode | undefined,
  paintTransform: FigImagePaint["transform"],
): string | undefined {
  if (!imgDim || imgDim.width <= 0 || imgDim.height <= 0) {
    return undefined;
  }

  const imgW = imgDim.width;
  const imgH = imgDim.height;

  // Extract paint transform components (identity if unset)
  const pm00 = paintTransform?.m00 ?? 1;
  const pm01 = paintTransform?.m01 ?? 0;
  const pm10 = paintTransform?.m10 ?? 0;
  const pm11 = paintTransform?.m11 ?? 1;
  const pm02 = paintTransform?.m02 ?? 0;
  const pm12 = paintTransform?.m12 ?? 0;

  const isIdentity =
    pm00 === 1 && pm01 === 0 && pm10 === 0 && pm11 === 1 && pm02 === 0 && pm12 === 0;

  // ------------------------------------------------------------------
  // FILL with identity transform: cover + centre-crop
  //
  // In objectBoundingBox space, 1 unit in X = elemWidth pixels,
  // 1 unit in Y = elemHeight pixels. To maintain the image's aspect
  // ratio (uniform pixel scale), the oBB scale must be non-uniform:
  //
  //   pixelScale = max(elemW/imgW, elemH/imgH)   // cover both axes
  //   sx_obb = pixelScale / elemW
  //   sy_obb = pixelScale / elemH
  //
  // The resulting image dimensions in oBB space are then used to
  // compute the centering offset.
  // ------------------------------------------------------------------
  if (scaleMode === "FILL" && isIdentity && elementSize) {
    const pixelScale = Math.max(
      elementSize.width / imgW,
      elementSize.height / imgH,
    );

    const sx = pixelScale / elementSize.width;
    const sy = pixelScale / elementSize.height;
    const obbW = imgW * sx;
    const obbH = imgH * sy;
    const tx = -(obbW - 1) / 2;
    const ty = -(obbH - 1) / 2;

    if (sx === sy) {
      if (tx === 0 && ty === 0) {
        return `scale(${sx})`;
      }
      return `translate(${tx} ${ty}) scale(${sx})`;
    }
    return `matrix(${sx} 0 0 ${sy} ${tx} ${ty})`;
  }

  // ------------------------------------------------------------------
  // General case: inv(paintTransform) × diag(1/imgW, 1/imgH)
  //
  // paint.transform is a 2×3 affine matrix [a c tx; b d ty].
  // Invert the 2×2 part and compose with diag(1/imgW, 1/imgH).
  // ------------------------------------------------------------------
  const det = pm00 * pm11 - pm01 * pm10;
  if (Math.abs(det) < 1e-12) {
    // Degenerate transform — fall back to simple stretch
    return undefined;
  }

  // inv(2×2): [d/det, -c/det; -b/det, a/det]
  // inv translation: inv(2×2) × [-tx, -ty]
  const invA = pm11 / det;
  const invB = -pm10 / det;
  const invC = -pm01 / det;
  const invD = pm00 / det;
  const invTx = invA * (-pm02) + invC * (-pm12);
  const invTy = invB * (-pm02) + invD * (-pm12);

  // Compose with diag(1/imgW, 1/imgH): multiply the inv matrix on the right
  const sa = invA / imgW;
  const sb = invB / imgW;
  const sc = invC / imgH;
  const sd = invD / imgH;
  // Translation components are not scaled by image size (already in OBB space)
  const stx = invTx;
  const sty = invTy;

  // Emit the most compact transform string
  if (sb === 0 && sc === 0) {
    // Axis-aligned: use translate + scale or just scale
    if (stx === 0 && sty === 0) {
      if (sa === sd) {
        return `scale(${sa})`;
      }
      return `scale(${sa} ${sd})`;
    }
    return `matrix(${sa} 0 0 ${sd} ${stx} ${sty})`;
  }

  return `matrix(${sa} ${sb} ${sc} ${sd} ${stx} ${sty})`;
}

type ScaleMode = "FILL" | "FIT" | "CROP" | "TILE" | "STRETCH";

/**
 * Get scale mode from paint.
 *
 * Figma's API format uses `scaleMode` (string literal).
 * Kiwi binary format uses `imageScaleMode` (KiwiEnumValue with .name).
 */
function getScaleMode(paint: FigImagePaint): ScaleMode | undefined {
  if (paint.scaleMode) {
    return paint.scaleMode;
  }
  if (paint.imageScaleMode) {
    return paint.imageScaleMode.name as ScaleMode | undefined;
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

  /**
   * Wrap an SVG element with mix-blend-mode if the paint has a non-default blendMode.
   * Figma paints can individually specify blend modes (HUE, LUMINOSITY, etc.)
   * that affect how they composite with layers below.
   */
  function wrapWithBlendMode(element: SvgString, paint: FigPaint): SvgString {
    const blendCss = getPaintBlendModeCss(paint);
    if (blendCss) {
      return g({ style: `mix-blend-mode:${blendCss}` }, element);
    }
    return element;
  }

  for (let i = 0; i < visiblePaints.length - 1; i++) {
    const paint = visiblePaints[i];
    const layerResult = resolveSinglePaint(paint, ctx, geometry, options?.elementSize);

    if (layerResult.kind === "complex") {
      // Complex layers may have multiple prepend elements — wrap the group
      const blendCss = getPaintBlendModeCss(paint);
      if (blendCss) {
        prependElements.push(g({ style: `mix-blend-mode:${blendCss}` }, ...layerResult.prependElements));
      } else {
        prependElements.push(...layerResult.prependElements);
      }
    } else {
      const fillLayer = geometry.renderFillLayer(layerResult.attrs);
      prependElements.push(wrapWithBlendMode(fillLayer, paint));
    }
  }

  // Top layer
  const topPaint = visiblePaints[visiblePaints.length - 1];
  const topResult = resolveSinglePaint(topPaint, ctx, geometry, options?.elementSize);
  const topBlendCss = getPaintBlendModeCss(topPaint);

  if (topResult.kind === "complex") {
    // Top is also complex — all layers are prepended, shape gets fill="none"
    if (topBlendCss) {
      prependElements.push(g({ style: `mix-blend-mode:${topBlendCss}` }, ...topResult.prependElements));
    } else {
      prependElements.push(...topResult.prependElements);
    }
    return {
      kind: "complex",
      prependElements,
      attrs: { fill: "none" },
    };
  }

  // Top is simple — lower layers are prepended, top goes on the shape
  if (prependElements.length > 0) {
    if (topBlendCss) {
      // Top layer also has blend mode — must prepend it too with blend
      prependElements.push(wrapWithBlendMode(geometry.renderFillLayer(topResult.attrs), topPaint));
      return {
        kind: "complex",
        prependElements,
        attrs: { fill: "none" },
      };
    }
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
