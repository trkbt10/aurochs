/**
 * @file Convert Figma paints to scene graph fills
 *
 * Consumes shared paint interpretation functions from paint/interpret.ts (the SoT)
 * to ensure parity with the SVG string renderer's fill handling.
 */

import type { FigPaint, FigColor, FigGradientPaint, FigImagePaint } from "@aurochs/fig/types";
import type { FigImage } from "@aurochs/fig/parser";
import { isPlaceholderColor, getPaintType } from "@aurochs/fig/color";
import {
  getGradientStops,
  getGradientDirection,
  getRadialGradientCenterAndRadius,
  getImageRef,
  getScaleMode,
} from "../../paint";
import type { Fill, Color, GradientStop } from "../types";

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
function uint8ArrayToBase64(data: Uint8Array): string {
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
export function convertPaintToFill(paint: FigPaint, images: ReadonlyMap<string, FigImage>): Fill | null {
  const opacity = paint.opacity ?? 1;
  const paintType = getPaintType(paint);

  switch (paintType) {
    case "SOLID": {
      const solidPaint = paint as FigPaint & { color: FigColor };
      if (isPlaceholderColor(solidPaint.color)) {
        return null;
      }
      return {
        type: "solid",
        color: figColorToSceneColor(solidPaint.color),
        opacity,
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
      };
    }

    case "IMAGE": {
      const imagePaint = paint as FigImagePaint;
      const imageRef = getImageRef(imagePaint);
      if (!imageRef) { return null; }

      const figImage = images.get(imageRef);
      if (!figImage) { return null; }

      return {
        type: "image",
        imageRef,
        data: figImage.data,
        mimeType: figImage.mimeType,
        scaleMode: getScaleMode(imagePaint),
        opacity,
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
