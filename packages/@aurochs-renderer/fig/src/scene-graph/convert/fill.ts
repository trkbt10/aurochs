/**
 * @file Convert Figma paints to scene graph fills
 *
 * Consumes shared paint interpretation functions from paint/interpret.ts (the SoT)
 * to ensure parity with the SVG string renderer's fill handling.
 */

import type { FigPaint, FigColor, FigGradientPaint, FigImagePaint } from "@aurochs/fig/types";
import type { FigImage } from "@aurochs/fig/parser";
import { getPaintType } from "@aurochs/fig/color";
import {
  getGradientStops,
  getGradientDirection,
  getRadialGradientCenterAndRadius,
  getImageRef,
  getScaleMode,
} from "../../paint";
import type { Fill, Color, GradientStop, BlendMode, AffineMatrix } from "../types";
import type { FigGradientTransform } from "@aurochs/fig/types";
import { convertFigmaBlendMode } from "./blend-mode";

/**
 * Convert FigColor to scene graph Color
 */
export function figColorToSceneColor(color: FigColor): Color {
  return { r: color.r, g: color.g, b: color.b, a: color.a };
}

/**
 * Convert gradient stops to scene graph format
 */
function convertGradientStops(stops: readonly { color: FigColor; position: number }[]): GradientStop[] {
  return stops.map((s) => ({
    position: s.position,
    color: figColorToSceneColor(s.color),
  }));
}

/**
 * Convert hash array to hex string
 */
function _uint8ArrayToBase64(data: Uint8Array): string {
  const binary = Array.from(data, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary);
}

/**
 * Convert a single Figma paint to a scene graph Fill
 *
 * @param paint - Figma paint
 * @param images - Image lookup map
 * @returns Scene graph Fill, or null if unsupported
 */
/**
 * Extract paint-level blend mode from a FigPaint.
 * The blendMode field can be a string or KiwiEnumValue.
 */
function extractPaintBlendMode(paint: FigPaint): BlendMode | undefined {
  const raw = paint as Record<string, unknown>;
  return convertFigmaBlendMode(raw.blendMode as string | { name: string } | undefined);
}

/**
 * Extract gradient transform matrix from a Figma gradient paint.
 * Returns undefined if no transform or identity transform.
 */
function extractGradientTransform(gradientPaint: FigGradientPaint): AffineMatrix | undefined {
  const t = gradientPaint.transform;
  if (!t) { return undefined; }
  const m: AffineMatrix = {
    m00: t.m00 ?? 1,
    m01: t.m01 ?? 0,
    m02: t.m02 ?? 0,
    m10: t.m10 ?? 0,
    m11: t.m11 ?? 1,
    m12: t.m12 ?? 0,
  };
  // Skip identity
  if (m.m00 === 1 && m.m01 === 0 && m.m02 === 0 && m.m10 === 0 && m.m11 === 1 && m.m12 === 0) {
    return undefined;
  }
  return m;
}

/**
 * Get angular gradient rotation from gradient handle positions.
 */
function getAngularGradientRotation(gradientPaint: FigGradientPaint): number {
  const handles = gradientPaint.gradientHandlePositions;
  if (!handles || handles.length < 2) { return 0; }
  const dx = handles[1].x - handles[0].x;
  const dy = handles[1].y - handles[0].y;
  return Math.atan2(dy, dx);
}

export function convertPaintToFill(paint: FigPaint, images: ReadonlyMap<string, FigImage>): Fill | null {
  const opacity = paint.opacity ?? 1;
  const paintType = getPaintType(paint);
  const blendMode = extractPaintBlendMode(paint);

  switch (paintType) {
    case "SOLID": {
      const solidPaint = paint as FigPaint & { color: FigColor };
      return {
        type: "solid",
        color: figColorToSceneColor(solidPaint.color),
        opacity,
        blendMode,
      };
    }

    case "GRADIENT_LINEAR": {
      const gradientPaint = paint as FigGradientPaint;
      const { start, end } = getGradientDirection(gradientPaint);
      const stops = convertGradientStops(getGradientStops(gradientPaint));
      return {
        type: "linear-gradient",
        start,
        end,
        stops,
        opacity,
        blendMode,
        gradientTransform: extractGradientTransform(gradientPaint),
      };
    }

    case "GRADIENT_RADIAL": {
      const gradientPaint = paint as FigGradientPaint;
      const { center, radius } = getRadialGradientCenterAndRadius(gradientPaint);
      const stops = convertGradientStops(getGradientStops(gradientPaint));
      return {
        type: "radial-gradient",
        center,
        radius,
        stops,
        opacity,
        blendMode,
        gradientTransform: extractGradientTransform(gradientPaint),
      };
    }

    case "GRADIENT_ANGULAR": {
      const gradientPaint = paint as FigGradientPaint;
      const { center } = getRadialGradientCenterAndRadius(gradientPaint);
      const stops = convertGradientStops(getGradientStops(gradientPaint));
      const rotation = getAngularGradientRotation(gradientPaint);
      return {
        type: "angular-gradient",
        center,
        stops,
        opacity,
        blendMode,
        rotation,
      };
    }

    case "GRADIENT_DIAMOND": {
      const gradientPaint = paint as FigGradientPaint;
      const { center } = getRadialGradientCenterAndRadius(gradientPaint);
      const stops = convertGradientStops(getGradientStops(gradientPaint));
      return {
        type: "diamond-gradient",
        center,
        stops,
        opacity,
        blendMode,
      };
    }

    case "IMAGE": {
      const imagePaint = paint as FigImagePaint;
      const imageRef = getImageRef(imagePaint);
      if (!imageRef) { return null; }

      const figImage = images.get(imageRef);
      if (!figImage) { return null; }

      // Extract image transform if present
      let imageTransform: AffineMatrix | undefined;
      if (imagePaint.transform) {
        const t = imagePaint.transform;
        imageTransform = {
          m00: t.m00 ?? 1,
          m01: t.m01 ?? 0,
          m02: t.m02 ?? 0,
          m10: t.m10 ?? 0,
          m11: t.m11 ?? 1,
          m12: t.m12 ?? 0,
        };
      }

      return {
        type: "image",
        imageRef,
        data: figImage.data,
        mimeType: figImage.mimeType,
        scaleMode: getScaleMode(imagePaint),
        opacity,
        blendMode,
        imageTransform,
      };
    }

    default:
      return null;
  }
}

/**
 * Convert Figma paints array to scene graph fills
 *
 * Returns all visible fills in Figma's stacking order (bottom to top).
 * The renderer should draw them in array order, compositing each on top.
 */
export function convertPaintsToFills(
  paints: readonly FigPaint[] | undefined,
  images: ReadonlyMap<string, FigImage>,
): Fill[] {
  if (!paints || paints.length === 0) {
    return [];
  }

  const visiblePaints = paints.filter((p) => p.visible !== false);
  if (visiblePaints.length === 0) {
    return [];
  }

  const fills: Fill[] = [];
  for (const paint of visiblePaints) {
    const fill = convertPaintToFill(paint, images);
    if (fill) {
      fills.push(fill);
    }
  }
  return fills;
}
