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
 * Get paint type as string. With the SSoT kiwi→domain normalisation
 * performed at parse time, `paint.type` is always a FigPaintType
 * string — this helper remains to document the domain contract and
 * give a single call site if the contract ever evolves.
 */
export function getPaintType(paint: FigPaint): FigPaint["type"] {
  return paint.type;
}

/**
 * Extract color from a solid paint. Returns the FigColor if the
 * paint is SOLID, undefined otherwise. Narrowing is via the
 * discriminated union's `type` tag — no cast needed.
 */
export function getSolidPaintColor(paint: FigPaint): FigColor | undefined {
  if (paint.type !== "SOLID") {
    return undefined;
  }
  return paint.color;
}

// =============================================================================
// Paint Narrowing Helpers (SSoT for FigPaint → variant)
// =============================================================================
//
// After the parser normalises KiwiEnumValue type tags to string
// literals, FigPaint is a plain discriminated union and TypeScript
// narrows it natively via `paint.type === "SOLID"` etc. These helpers
// remain as explicit, named entry points for variant access so call
// sites read as domain intent ("give me the gradient variant") rather
// than open-coded switch statements.

/**
 * Narrow a paint to `FigGradientPaint` when its type is one of the
 * gradient tags. Returns undefined otherwise.
 */
export function asGradientPaint(paint: FigPaint): FigGradientPaint | undefined {
  if (
    paint.type === "GRADIENT_LINEAR" ||
    paint.type === "GRADIENT_RADIAL" ||
    paint.type === "GRADIENT_ANGULAR" ||
    paint.type === "GRADIENT_DIAMOND"
  ) {
    return paint;
  }
  return undefined;
}

/**
 * Narrow a paint to `FigImagePaint` when its type is IMAGE.
 * Returns undefined otherwise.
 */
export function asImagePaint(paint: FigPaint): FigImagePaint | undefined {
  return paint.type === "IMAGE" ? paint : undefined;
}

/**
 * Narrow a paint to `FigSolidPaint` when its type is SOLID.
 * Returns undefined otherwise.
 */
export function asSolidPaint(paint: FigPaint): FigSolidPaint | undefined {
  return paint.type === "SOLID" ? paint : undefined;
}
