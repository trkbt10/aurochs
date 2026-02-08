/**
 * @file Shared color conversion utilities
 *
 * Format-agnostic color functions extracted from svg/fill.ts
 * for use by both SVG and WebGL backends.
 */

import type { FigColor, FigPaint } from "@aurochs/fig/types";

// =============================================================================
// Color Conversion
// =============================================================================

/**
 * Check if color is a placeholder (pure red r:1, g:0, b:0)
 * Figma uses this as placeholder when external style references cannot be resolved
 */
export function isPlaceholderColor(color: FigColor): boolean {
  return color.r === 1 && color.g === 0 && color.b === 0;
}

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
