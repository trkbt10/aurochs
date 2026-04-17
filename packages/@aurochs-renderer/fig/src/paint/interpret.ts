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
 * Figma's paint.transform maps object space → gradient space:
 *   (grad_x, grad_y) = (m00·obj_x + m01·obj_y + m02,
 *                       m10·obj_x + m11·obj_y + m12)
 *
 * Linear gradient stops sit on the grad_x axis:
 *   grad_x = 0 → 0% stop (first stop)   → direction.start
 *   grad_x = 1 → 100% stop (last stop)  → direction.end
 *
 * We emit the object-space points by inverting the 2×2 upper block of
 * the matrix. A rank-deficient matrix (det=0) produces no well-defined
 * direction and is rejected with a throw; Figma does not emit such
 * matrices for valid linear gradients.
 *
 * The SSoT for pixel-space endpoints lives in
 * `paint/svg-gradient-transform.ts`. This helper returns normalized
 * (0..1) object-space points for consumers that emit gradient attrs as
 * objectBoundingBox percentages rather than userSpaceOnUse pixels.
 */
export function getGradientDirectionFromTransform(transform: FigGradientTransform | undefined): GradientDirection {
  if (!transform) {
    return { start: { x: 0, y: 0 }, end: { x: 0, y: 1 } };
  }
  const m00 = transform.m00 ?? 1;
  const m01 = transform.m01 ?? 0;
  const m02 = transform.m02 ?? 0;
  const m10 = transform.m10 ?? 0;
  const m11 = transform.m11 ?? 1;
  const m12 = transform.m12 ?? 0;

  const det = m00 * m11 - m01 * m10;
  if (det === 0) {
    throw new Error(
      `getGradientDirectionFromTransform: non-invertible 2×2 upper block ` +
        `(det=0, m00=${m00}, m01=${m01}, m10=${m10}, m11=${m11}). ` +
        `A valid Figma linear-gradient paint cannot have a rank-deficient ` +
        `transform — there would be no well-defined direction.`,
    );
  }

  const invDet = 1 / det;
  const inv00 = m11 * invDet;
  const inv01 = -m01 * invDet;
  const inv10 = -m10 * invDet;
  const inv11 = m00 * invDet;
  const invTx = -(inv00 * m02 + inv01 * m12);
  const invTy = -(inv10 * m02 + inv11 * m12);

  // Back-map gradient (0, 0) → object space (start, 0% stop)
  // Back-map gradient (1, 0) → object space (end, 100% stop)
  return {
    start: { x: invTx, y: invTy },
    end: { x: inv00 + invTx, y: inv10 + invTy },
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
 * Figma's Kiwi paint.transform maps object space → gradient space:
 *   (grad_x, grad_y) = (m00·obj_x + m01·obj_y + m02,
 *                       m10·obj_x + m11·obj_y + m12)
 *
 * For angular (conic) gradients the sweep is centred on the **object's
 * (0.5, 0.5)** — verified by evaluating T·(0.5, 0.5) on a real Figma
 * paint (Flighty Hologram: m00=-0.583, m01=0.583, m02=0.500, m10=-0.583,
 * m11=-0.583, m12=1.083) which yields gradient-space (0.5, 0.5) exactly.
 * The translation components m02/m12 are NOT the gradient centre in
 * object space — they are T·(0, 0), which for a non-identity rotation
 * lands well outside the element (Hologram: m12=1.083, i.e. 108% down,
 * clearly not the visible centre). Emitting the centre as (m02, m12)
 * placed the conic gradient outside the element and produced a
 * transparent foreignObject.
 *
 * So the centre is fixed at (0.5, 0.5). Only the rotation angle is
 * extracted from the matrix. The 2×2 rotation of T (from the actual
 * Hologram numbers) is -135°; Figma's conic-gradient CSS expects a
 * `from` angle measured clockwise from 12 o'clock. The matrix rotation
 * is measured in object-space coordinates and we add 90° because CSS
 * conic-gradient's "0deg" points up while our matrix's +x axis points
 * right.
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

  // Rotation from the 2×2 upper block.
  //
  // Figma's SVG export places the conic gradient inside a foreignObject
  // that is rotated by the *inverse* of the paint-transform's 2×2 block
  // (so the normalized-space gradient maps back onto object space). The
  // inverse of an orthonormal 2×2 rotation rotates by the negative
  // angle, which means the effective rotation applied to the stops is
  //     atan2(-m10, m00)
  // (the inverse-image angle of the +x axis), not atan2(m10, m00) of
  // the forward matrix.
  //
  // Then +90° to convert from Figma's "0° = +x (3 o'clock)" convention
  // to CSS conic-gradient's "0° = top (12 o'clock)" convention.
  //
  // Verification (Hologram): paint.transform m00=-0.583, m10=-0.583.
  // atan2(-m10, m00) = atan2(0.583, -0.583) = 135°. Matches the
  // rotation baked into Figma's own foreignObject matrix
  // `matrix(-0.0163, 0.0163, -0.0163, -0.0163, 21, 20)` which also
  // has atan2(0.0163, -0.0163) = 135°.
  const m00 = transform.m00 ?? 1;
  const m10 = transform.m10 ?? 0;
  const angle = Math.atan2(-m10, m00) * (180 / Math.PI);

  return { center: { x: 0.5, y: 0.5 }, startAngle: angle + 90 };
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
