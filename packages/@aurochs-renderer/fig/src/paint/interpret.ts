/**
 * @file Pure paint interpretation functions
 *
 * Extracts gradient direction, stops, image references, etc. from FigPaint.
 * These are the authoritative implementations — no other module should
 * re-derive these values from FigPaint.
 *
 * Handles both formats:
 * - API format: gradientHandlePositions, gradientStops
 * - Kiwi (.fig) format: transform matrix, stops array
 */

import type { FigGradientPaint, FigGradientStop, FigImagePaint, FigColor } from "@aurochs/fig/types";

// =============================================================================
// Types
// =============================================================================

export type GradientDirection = {
  readonly start: { readonly x: number; readonly y: number };
  readonly end: { readonly x: number; readonly y: number };
};

export type RadialGradientParams = {
  readonly center: { readonly x: number; readonly y: number };
  readonly radius: number;
};

export type GradientTransform = {
  readonly m00?: number;
  readonly m01?: number;
  readonly m10?: number;
  readonly m11?: number;
  readonly m02?: number;
  readonly m12?: number;
};

/**
 * Alternative gradient stop format used in .fig files (Kiwi encoding).
 * Identical structure to FigGradientStop but found under `stops` instead of `gradientStops`.
 */
type KiwiGradientStop = {
  readonly color: FigColor;
  readonly position: number;
};

// =============================================================================
// Gradient Stops
// =============================================================================

/**
 * Extract gradient stops from a paint, handling both API and Kiwi formats.
 *
 * API format: `paint.gradientStops` — array of { color, position }
 * Kiwi format: `(paint as any).stops` — same structure, different field name
 */
export function getGradientStops(paint: FigGradientPaint): readonly FigGradientStop[] {
  if (paint.gradientStops && paint.gradientStops.length > 0) {
    return paint.gradientStops;
  }
  const paintData = paint as Record<string, unknown>;
  const stops = paintData.stops as readonly KiwiGradientStop[] | undefined;
  if (stops && stops.length > 0) {
    return stops;
  }
  return [];
}

// =============================================================================
// Gradient Direction (Linear)
// =============================================================================

/**
 * Derive gradient direction from a 2x3 affine transform matrix.
 *
 * Figma's gradient transform maps gradient coordinates to object space:
 * - Point (0, 0) in gradient space → transform applied → start in object space
 * - Point (1, 0) in gradient space → transform applied → end in object space
 *
 * The start/end are swapped to match SVG's visual direction expectation.
 */
export function getGradientDirectionFromTransform(transform: GradientTransform | undefined): GradientDirection {
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

  // Swap to match SVG visual direction
  return {
    start: { x: grad1X, y: grad1Y },
    end: { x: grad0X, y: grad0Y },
  };
}

/**
 * Get gradient direction from a paint, handling both API and Kiwi formats.
 *
 * API format: `paint.gradientHandlePositions` — [start, end, ...]
 * Kiwi format: `(paint as any).transform` — 2x3 affine matrix
 */
export function getGradientDirection(paint: FigGradientPaint): GradientDirection {
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

// =============================================================================
// Radial Gradient
// =============================================================================

/**
 * Get radial gradient center and radius from a paint.
 *
 * API format: center = handles[0], radius = distance(handles[0], handles[1])
 * Kiwi format: center = (m02, m12), radius = m00
 */
export function getRadialGradientCenterAndRadius(paint: FigGradientPaint): RadialGradientParams {
  const handles = paint.gradientHandlePositions;
  if (handles && handles.length >= 2) {
    const center = handles[0] ?? { x: 0.5, y: 0.5 };
    const edge = handles[1] ?? { x: 1, y: 0.5 };
    const radius = Math.sqrt(Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2));
    return { center, radius };
  }
  const paintData = paint as Record<string, unknown>;
  const transform = paintData.transform as GradientTransform | undefined;
  return {
    center: { x: transform?.m02 ?? 0.5, y: transform?.m12 ?? 0.5 },
    radius: transform?.m00 ?? 0.5,
  };
}

// =============================================================================
// Image Paint
// =============================================================================

/**
 * Convert a hash array (from Kiwi image.hash) to a hex string reference.
 */
function hashArrayToHex(hash: readonly number[]): string {
  return hash.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Extract image reference from an image paint.
 *
 * Tries multiple locations where the image ref may be stored:
 * 1. `paint.imageRef` — API format
 * 2. `paint.image.hash` — Kiwi format (array of bytes → hex string)
 * 3. `paint.imageHash` — alternative Kiwi field (string or byte array)
 */
export function getImageRef(paint: FigImagePaint): string | null {
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
 * Get scale mode from an image paint.
 */
export function getScaleMode(paint: FigImagePaint): string {
  if (paint.scaleMode) {
    return paint.scaleMode;
  }
  const paintData = paint as Record<string, unknown>;
  if (paintData.imageScaleMode) {
    const mode = paintData.imageScaleMode;
    if (typeof mode === "string") { return mode; }
    if (typeof mode === "object" && mode && "name" in mode) {
      return (mode as { name: string }).name;
    }
  }
  return "FILL";
}
