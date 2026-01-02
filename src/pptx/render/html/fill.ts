/**
 * @file HTML fill rendering
 *
 * Convert resolved fills to CSS background styles.
 */

import type { Fill, Line } from "../../domain";
import type { ColorContext } from "../../domain/resolution";
import {
  formatRgba,
  resolveFill,
  resolveLine,
  type ResolvedFill,
  type ResolvedGradientFill,
  type ResolvedLine,
} from "../core";

// =============================================================================
// Fill to CSS Background
// =============================================================================

/**
 * Render resolved fill to CSS background value
 */
export function resolvedFillToBackground(fill: ResolvedFill): string {
  switch (fill.type) {
    case "none":
      return "transparent";

    case "solid":
      return formatRgba(fill.color.hex, fill.color.alpha);

    case "gradient":
      return gradientToCssBackground(fill);

    case "image":
      // Image fills rendered separately via <img> or background-image
      return `url("${fill.src}")`;

    case "unresolved":
      return "transparent";
  }
}

/**
 * Render gradient fill to CSS background
 */
function gradientToCssBackground(fill: ResolvedGradientFill): string {
  if (fill.stops.length === 0) {
    return "transparent";
  }

  const stops = fill.stops.map((stop) => {
    const color = formatRgba(stop.color.hex, stop.color.alpha);
    return `${color} ${stop.position}%`;
  });

  if (fill.isRadial) {
    const cx = fill.radialCenter?.cx ?? 50;
    const cy = fill.radialCenter?.cy ?? 50;
    return `radial-gradient(circle at ${cx}% ${cy}%, ${stops.join(", ")})`;
  }

  // Convert OOXML angle (from top, clockwise) to CSS (from bottom, counter-clockwise)
  const cssAngle = 90 - fill.angle;
  return `linear-gradient(${cssAngle}deg, ${stops.join(", ")})`;
}

/**
 * Render fill to CSS background (convenience wrapper)
 */
export function fillToBackground(fill: Fill, colorContext?: ColorContext): string {
  const resolved = resolveFill(fill, colorContext);
  return resolvedFillToBackground(resolved);
}

// =============================================================================
// Line to CSS Border
// =============================================================================

/**
 * Render resolved line to CSS border value
 */
export function resolvedLineToBorder(line: ResolvedLine): string {
  if (line.fill.type === "none" || line.fill.type === "unresolved") {
    return "none";
  }

  const color = resolveLineColor(line);
  if (color === undefined) {
    return "none";
  }
  const style = line.dash === "solid" ? "solid" : "dashed";
  return `${line.width}px ${style} ${color}`;
}

function resolveLineColor(line: ResolvedLine): string | undefined {
  if (line.fill.type === "solid") {
    return formatRgba(line.fill.color.hex, line.fill.color.alpha);
  }
  if (line.fill.type === "gradient" && line.fill.stops.length > 0) {
    // Use first stop color for borders
    const stop = line.fill.stops[0];
    return formatRgba(stop.color.hex, stop.color.alpha);
  }
  return undefined;
}

/**
 * Render line to CSS border (convenience wrapper)
 */
export function lineToBorder(line: Line, colorContext?: ColorContext): string {
  const resolved = resolveLine(line, colorContext);
  return resolvedLineToBorder(resolved);
}
