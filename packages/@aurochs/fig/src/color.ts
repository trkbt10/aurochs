/**
 * @file FigColor conversion utilities
 *
 * Provides utility functions for working with FigColor (0-1 RGBA range).
 * FigColor is defined in types.ts — this module provides operations on it.
 */

import type { FigColor, FigPaint, FigSolidPaint, FigGradientPaint, FigImagePaint } from "./types";

// =============================================================================
// Color Predicates
// =============================================================================

/**
 * @deprecated Pure red (#ff0000) is a valid color, not a reliable placeholder
 * indicator. Style resolution (resolveNodeStyleIds) handles stale paint caches
 * before rendering. Do not use this to suppress color output.
 */
export function isPlaceholderColor(color: FigColor): boolean {
  return color.r === 1 && color.g === 0 && color.b === 0;
}

// =============================================================================
// Color Conversion
// =============================================================================

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

/**
 * Extract color from a solid paint.
 *
 * Returns the FigColor if the paint is SOLID type (in either API string
 * or Kiwi enum object format), undefined otherwise.
 *
 * This encapsulates the KiwiEnumValue type check so callers never need
 * `as FigPaint & { color: ... }` casts.
 */
export function getSolidPaintColor(paint: FigPaint): FigColor | undefined {
  if (getPaintType(paint) !== "SOLID") {
    return undefined;
  }
  // getPaintType normalizes the KiwiEnumValue type to a string and confirmed SOLID.
  // FigSolidPaint has a required `color` field. The union can't narrow via
  // getPaintType (which operates on string/KiwiEnumValue duality), so we narrow
  // explicitly: if the color field exists, use it.
  const solid = paint as FigSolidPaint;
  return solid.color;
}

// =============================================================================
// Paint Narrowing Helpers (SSoT for FigPaint → variant)
// =============================================================================
//
// FigPaint is a union whose discriminator (`type`) can be either a string
// literal or a KiwiEnumValue object. TypeScript's built-in narrowing
// handles string-literal discriminants but not mixed string | object
// discriminants, so downstream code would otherwise pepper the codebase
// with `paint as FigGradientPaint` / `paint as FigImagePaint` casts.
//
// Centralising the narrowing in these helpers makes the unchecked cast
// happen in exactly one place per variant, where the invariant
// ("getPaintType returned the right tag, therefore the variant's
// optional fields are present") can be documented and enforced once.
// Every caller that previously wrote `paint as FigGradientPaint` now
// calls `asGradientPaint(paint)` and gets back a typed variant or
// undefined.

/**
 * Narrow a paint to `FigGradientPaint` when its type is one of the
 * gradient tags. Returns undefined otherwise.
 */
export function asGradientPaint(paint: FigPaint): FigGradientPaint | undefined {
  const t = getPaintType(paint);
  if (t === "GRADIENT_LINEAR" || t === "GRADIENT_RADIAL" || t === "GRADIENT_ANGULAR" || t === "GRADIENT_DIAMOND") {
    return paint as FigGradientPaint;
  }
  return undefined;
}

/**
 * Narrow a paint to `FigImagePaint` when its type is IMAGE.
 * Returns undefined otherwise.
 */
export function asImagePaint(paint: FigPaint): FigImagePaint | undefined {
  if (getPaintType(paint) !== "IMAGE") {
    return undefined;
  }
  return paint as FigImagePaint;
}

/**
 * Narrow a paint to `FigSolidPaint` when its type is SOLID.
 * Returns undefined otherwise.
 */
export function asSolidPaint(paint: FigPaint): FigSolidPaint | undefined {
  if (getPaintType(paint) !== "SOLID") {
    return undefined;
  }
  return paint as FigSolidPaint;
}
