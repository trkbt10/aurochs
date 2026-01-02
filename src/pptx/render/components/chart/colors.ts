/**
 * @file Chart color utilities
 *
 * Color constants and resolution for chart rendering.
 *
 * @see ECMA-376 Part 1, Section 21.2 - DrawingML Charts
 */

import type { ChartShapeProperties } from "../../../domain/chart";
import type { RenderContext } from "../../context";
import { resolveFill } from "../../core/fill";

/**
 * Fallback color palette for chart series (implementation-defined)
 *
 * ECMA-376 specifies that colors come from:
 * 1. Explicit spPr/solidFill on series (21.2.2.188)
 * 2. Theme accent colors (20.1.6.2)
 * 3. Automatic styling based on chart style
 *
 * When theme colors aren't available, we use this fallback palette.
 * These colors are chosen to be visually distinct and accessible.
 */
export const FALLBACK_CHART_COLORS: readonly string[] = [
  "#4472C4", // Blue (similar to Office accent1)
  "#ED7D31", // Orange (similar to Office accent2)
  "#A5A5A5", // Gray (similar to Office accent3)
  "#FFC000", // Gold (similar to Office accent4)
  "#5B9BD5", // Light Blue (similar to Office accent5)
  "#70AD47", // Green (similar to Office accent6)
  "#264478", // Dark Blue
  "#9E480E", // Dark Orange
  "#636363", // Dark Gray
  "#997300", // Dark Gold
  "#255E91", // Dark Light Blue
  "#43682B", // Dark Green
];

/**
 * Get color for chart series
 *
 * Priority per ECMA-376:
 * 1. Explicit spPr fill on series
 * 2. Theme accent colors
 * 3. Fallback palette
 *
 * @param index - Series or data point index
 * @param ctx - Render context for theme color resolution
 * @param shapeProperties - Optional shape properties with explicit fill
 * @returns Resolved color as hex string
 *
 * @see ECMA-376 Part 1, Section 21.2.2.188 (spPr)
 * @see ECMA-376 Part 1, Section 20.1.6.2 (accent colors)
 */
export function getSeriesColor(
  index: number,
  ctx: RenderContext,
  shapeProperties?: ChartShapeProperties
): string {
  // 1. Check for explicit fill in shape properties
  if (shapeProperties?.fill) {
    const resolved = resolveFill(shapeProperties.fill, ctx.colorContext);
    if (resolved.type === "solid") {
      return `#${resolved.color.hex}`;
    }
    // For gradient fills, use the first stop color
    if (resolved.type === "gradient" && resolved.stops.length > 0) {
      return `#${resolved.stops[0].color.hex}`;
    }
  }

  // 2. Try theme accent colors
  const accentIndex = (index % 6) + 1; // accent1-accent6
  const accentKey = `accent${accentIndex}` as keyof typeof ctx.colorContext.colorScheme;
  const themeColor = ctx.colorContext.colorScheme[accentKey];
  if (themeColor) {
    // Theme color may or may not have # prefix, normalize it
    return themeColor.startsWith("#") ? themeColor : `#${themeColor}`;
  }

  // 3. Fallback to default palette
  return FALLBACK_CHART_COLORS[index % FALLBACK_CHART_COLORS.length];
}

/**
 * Get color from explicit shape properties only
 *
 * Used when we need to check if a series has an explicit color
 * without falling back to theme or default colors.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.188 (spPr)
 */
export function getColorFromShapeProperties(
  shapeProperties: ChartShapeProperties | undefined,
  ctx: RenderContext
): string | undefined {
  if (!shapeProperties?.fill) {return undefined;}

  const resolved = resolveFill(shapeProperties.fill, ctx.colorContext);
  if (resolved.type === "solid") {
    return `#${resolved.color.hex}`;
  }
  // For gradient fills, use the first stop color
  if (resolved.type === "gradient" && resolved.stops.length > 0) {
    return `#${resolved.stops[0].color.hex}`;
  }
  return undefined;
}
