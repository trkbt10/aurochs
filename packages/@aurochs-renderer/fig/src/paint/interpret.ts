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

import type { FigGradientPaint, FigGradientStop, FigGradientTransform, FigImagePaint } from "@aurochs/fig/types";

export type GradientDirection = {
  readonly start: { readonly x: number; readonly y: number };
  readonly end: { readonly x: number; readonly y: number };
};

export type RadialGradientParams = {
  readonly center: { readonly x: number; readonly y: number };
  readonly radius: number;
};

// =============================================================================
// Gradient Stops
// =============================================================================

/**
 * Extract gradient stops from a paint, handling both API and Kiwi formats.
 *
 * API format: `paint.gradientStops` — array of { color, position }
 * Kiwi format: `paint.stops` — same structure, different field name
 */
export function getGradientStops(paint: FigGradientPaint): readonly FigGradientStop[] {
  if (paint.gradientStops && paint.gradientStops.length > 0) {
    return paint.gradientStops;
  }
  if (paint.stops && paint.stops.length > 0) {
    return paint.stops;
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
export function getGradientDirectionFromTransform(transform: FigGradientTransform | undefined): GradientDirection {
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
 * Kiwi format: `paint.transform` — 2x3 affine matrix
 */
export function getGradientDirection(paint: FigGradientPaint): GradientDirection {
  const handles = paint.gradientHandlePositions;
  if (handles && handles.length >= 2) {
    return {
      start: handles[0] ?? { x: 0, y: 0.5 },
      end: handles[1] ?? { x: 1, y: 0.5 },
    };
  }
  return getGradientDirectionFromTransform(paint.transform);
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
  const transform = paint.transform;
  return {
    center: { x: transform?.m02 ?? 0.5, y: transform?.m12 ?? 0.5 },
    radius: transform?.m00 ?? 0.5,
  };
}

// =============================================================================
// Angular (Conic) Gradient
// =============================================================================

export type AngularGradientParams = {
  /** Center point in object-space (0..1, 0..1) */
  readonly center: { readonly x: number; readonly y: number };
  /** Start angle in degrees (0 = right/3 o'clock, clockwise) */
  readonly startAngle: number;
};

/**
 * Get angular gradient center and start angle from a paint.
 *
 * Figma's angular gradient transform encodes center position and rotation.
 * The transform maps gradient space (0,0)–(1,1) to object space.
 * Center is at (m02, m12) in normalized coords, rotation is derived from
 * the matrix rotation component.
 */
export function getAngularGradientParams(paint: FigGradientPaint): AngularGradientParams {
  const handles = paint.gradientHandlePositions;
  if (handles && handles.length >= 2) {
    const center = handles[0] ?? { x: 0.5, y: 0.5 };
    const edge = handles[1] ?? { x: 1, y: 0.5 };
    const angle = Math.atan2(edge.y - center.y, edge.x - center.x) * (180 / Math.PI);
    return { center, startAngle: angle };
  }

  const transform = paint.transform;
  if (!transform) {
    return { center: { x: 0.5, y: 0.5 }, startAngle: 0 };
  }

  // Extract center from translation
  const cx = transform.m02 ?? 0.5;
  const cy = transform.m12 ?? 0.5;

  // Extract angle from rotation component of the matrix
  const m00 = transform.m00 ?? 1;
  const m10 = transform.m10 ?? 0;
  const angle = Math.atan2(m10, m00) * (180 / Math.PI);

  return { center: { x: cx, y: cy }, startAngle: angle + 90 };
}

// =============================================================================
// Diamond Gradient
// =============================================================================

export type DiamondGradientParams = {
  /** Center point in object-space (0..1, 0..1) */
  readonly center: { readonly x: number; readonly y: number };
};

/**
 * Get diamond gradient center from a paint.
 *
 * Diamond gradients radiate from a center point in a diamond pattern.
 * The transform maps gradient space to object space; center is at (m02, m12).
 */
export function getDiamondGradientParams(paint: FigGradientPaint): DiamondGradientParams {
  const handles = paint.gradientHandlePositions;
  if (handles && handles.length >= 1) {
    return { center: handles[0] ?? { x: 0.5, y: 0.5 } };
  }

  const transform = paint.transform;
  return {
    center: {
      x: transform?.m02 ?? 0.5,
      y: transform?.m12 ?? 0.5,
    },
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
  if (paint.image?.hash && Array.isArray(paint.image.hash) && paint.image.hash.length > 0) {
    return hashArrayToHex(paint.image.hash);
  }
  const imageHash = paint.imageHash;
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
    if (typeof paint.scaleMode === "string") {
      return paint.scaleMode;
    }
    return paint.scaleMode.name;
  }
  if (paint.imageScaleMode) {
    return paint.imageScaleMode.name;
  }
  return "FILL";
}

/**
 * Get image transform from either raw Kiwi or API/builder field names.
 */
export function getImageTransform(paint: FigImagePaint): FigImagePaint["transform"] {
  if (paint.transform) {
    return paint.transform;
  }
  return paint.imageTransform;
}

/**
 * Get tile scaling factor from an image paint.
 *
 * API format uses `scalingFactor`. Kiwi binary format uses `scale`.
 */
export function getScalingFactor(paint: FigImagePaint): number | undefined {
  if (typeof paint.scalingFactor === "number" && paint.scalingFactor > 0) {
    return paint.scalingFactor;
  }
  if (typeof paint.scale === "number" && paint.scale > 0) {
    return paint.scale;
  }
  return undefined;
}
