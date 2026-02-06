/**
 * @file Convert Figma paints to scene graph fills
 */

import type {
  FigPaint,
  FigColor,
  FigGradientPaint,
  FigGradientStop,
  FigImagePaint,
} from "@oxen/fig/types";
import type { FigImage } from "@oxen/fig/parser";
import { isPlaceholderColor, getPaintType } from "../../core/color";
import type { Fill, Color, GradientStop } from "../types";

/**
 * Convert FigColor to scene graph Color
 */
export function figColorToSceneColor(color: FigColor): Color {
  return { r: color.r, g: color.g, b: color.b, a: color.a };
}

/**
 * Alternative gradient stop format used in .fig files
 */
type FigGradientStopAlt = {
  readonly color: FigColor;
  readonly position: number;
};

/**
 * Get gradient stops from paint (handles both API and .fig formats)
 */
function getGradientStops(paint: FigGradientPaint): readonly FigGradientStop[] {
  if (paint.gradientStops && paint.gradientStops.length > 0) {
    return paint.gradientStops;
  }
  const paintData = paint as Record<string, unknown>;
  const stops = paintData.stops as readonly FigGradientStopAlt[] | undefined;
  if (stops && stops.length > 0) {
    return stops;
  }
  return [];
}

/**
 * Convert gradient stops to scene graph format
 */
function convertGradientStops(stops: readonly FigGradientStop[]): GradientStop[] {
  return stops.map((s) => ({
    position: s.position,
    color: figColorToSceneColor(s.color),
  }));
}

type GradientTransform = { m00?: number; m01?: number; m10?: number; m11?: number; m02?: number; m12?: number };

/**
 * Get gradient direction from transform matrix
 */
function getGradientDirectionFromTransform(
  transform: GradientTransform | undefined
): { start: { x: number; y: number }; end: { x: number; y: number } } {
  if (!transform) {
    return { start: { x: 0, y: 0 }, end: { x: 0, y: 1 } };
  }
  const m00 = transform.m00 ?? 1;
  const m02 = transform.m02 ?? 0;
  const m10 = transform.m10 ?? 0;
  const m12 = transform.m12 ?? 0;

  const grad0X = m02;
  const grad0Y = m12;
  const grad1X = m00 + m02;
  const grad1Y = m10 + m12;

  // Swap start/end to match Figma's visual direction
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
    return {
      start: handles[0] ?? { x: 0, y: 0.5 },
      end: handles[1] ?? { x: 1, y: 0.5 },
    };
  }
  const paintData = paint as Record<string, unknown>;
  const transform = paintData.transform as GradientTransform | undefined;
  return getGradientDirectionFromTransform(transform);
}

/**
 * Get radial gradient center and radius
 */
function getRadialGradientCenterAndRadius(paint: FigGradientPaint): { center: { x: number; y: number }; radius: number } {
  const handles = paint.gradientHandlePositions;
  if (handles && handles.length >= 2) {
    const center = handles[0] ?? { x: 0.5, y: 0.5 };
    const edge = handles[1] ?? { x: 1, y: 0.5 };
    const radius = Math.sqrt(
      Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2)
    );
    return { center, radius };
  }
  const paintData = paint as Record<string, unknown>;
  const transform = paintData.transform as GradientTransform | undefined;
  return {
    center: { x: transform?.m02 ?? 0.5, y: transform?.m12 ?? 0.5 },
    radius: transform?.m00 ?? 0.5,
  };
}

/**
 * Convert hash array to hex string
 */
function hashArrayToHex(hash: readonly number[]): string {
  return hash.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Get image ref from paint
 */
function getImageRef(paint: FigImagePaint): string | null {
  if (paint.imageRef) {
    return paint.imageRef;
  }
  const paintData = paint as Record<string, unknown>;
  const image = paintData.image as { hash?: readonly number[] } | undefined;
  if (image?.hash && Array.isArray(image.hash) && image.hash.length > 0) {
    return hashArrayToHex(image.hash);
  }
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
 * Get scale mode from paint
 */
function getScaleMode(paint: FigImagePaint): string {
  if (paint.scaleMode) {
    return paint.scaleMode;
  }
  const paintData = paint as Record<string, unknown>;
  if (paintData.imageScaleMode) {
    const mode = paintData.imageScaleMode;
    if (typeof mode === "string") return mode;
    if (typeof mode === "object" && mode && "name" in mode) {
      return (mode as { name: string }).name;
    }
  }
  return "FILL";
}

/**
 * Convert a single Figma paint to a scene graph Fill
 *
 * @param paint - Figma paint
 * @param images - Image lookup map
 * @returns Scene graph Fill, or null if unsupported
 */
export function convertPaintToFill(
  paint: FigPaint,
  images: ReadonlyMap<string, FigImage>
): Fill | null {
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
      if (!imageRef) return null;

      const figImage = images.get(imageRef);
      if (!figImage) return null;

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
  images: ReadonlyMap<string, FigImage>
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
