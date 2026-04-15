/**
 * @file FigColor conversion utilities
 *
 * Provides utility functions for working with FigColor (0-1 RGBA range).
 * FigColor is defined in types.ts — this module provides operations on it.
 */

import type { FigColor, FigPaint, FigSolidPaint } from "./types";

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
