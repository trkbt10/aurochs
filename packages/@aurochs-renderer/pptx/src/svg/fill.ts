/**
 * @file SVG fill and line renderer
 *
 * Converts Fill and Line domain objects to SVG styles.
 */

import type { Fill, Line } from "@aurochs-office/pptx/domain";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import {
  getDashArrayPattern,
  resolveFill,
  resolveBlipFill,
  resolveLine,
  type ResolvedFill,
  type ResolvedGradientFill,
  type ResolvedLine,
  type ResolvedImageFill,
} from "@aurochs-office/pptx/domain/color/fill";
import type { ResourceResolverFn } from "@aurochs-office/pptx/domain/resource-resolver";
import { ooxmlAngleToSvgLinearGradient, getRadialGradientCoords } from "./gradient-utils";

// =============================================================================
// Fill Style Types
// =============================================================================

/**
 * Fill style result
 */
export type FillStyle = {
  fill: string;
  fillOpacity?: number;
  gradientId?: string;
  /** Pattern ID for image fills */
  patternId?: string;
  /** Image source for pattern definition */
  imageSrc?: string;
};

/**
 * Line (stroke) style result
 */
export type LineStyle = {
  stroke: string;
  strokeWidth: number;
  strokeOpacity?: number;
  strokeLinecap?: "butt" | "round" | "square";
  strokeLinejoin?: "miter" | "round" | "bevel";
  strokeDasharray?: string;
  /** marker-start attribute for headEnd arrow */
  markerStart?: string;
  /** marker-end attribute for tailEnd arrow */
  markerEnd?: string;
};

// =============================================================================
// Fill Rendering (SVG-specific)
// =============================================================================

/**
 * Render resolved fill to SVG fill attribute value
 */
function resolvedFillToSvgFill(fill: ResolvedFill, patternIdPrefix?: string): FillStyle {
  switch (fill.type) {
    case "none":
      return { fill: "none" };

    case "solid": {
      if (fill.color.alpha < 1) {
        return {
          fill: `#${fill.color.hex}`,
          fillOpacity: fill.color.alpha,
        };
      }
      return { fill: `#${fill.color.hex}` };
    }

    case "gradient": {
      // Gradient needs to be rendered as defs - return first stop as fallback
      if (fill.stops.length === 0) {
        return { fill: "none" };
      }
      const first = fill.stops[0];
      return {
        fill: `#${first.color.hex}`,
        fillOpacity: first.color.alpha < 1 ? first.color.alpha : undefined,
      };
    }

    case "image": {
      // Image fill requires a pattern definition
      const patternId = patternIdPrefix ? `${patternIdPrefix}-img` : "img-pattern";
      return {
        fill: `url(#${patternId})`,
        patternId,
        imageSrc: fill.src,
      };
    }

    case "pattern": {
      // Pattern fill requires a pattern definition
      const patternId = patternIdPrefix ? `${patternIdPrefix}-patt` : "patt-fill";
      return {
        fill: `url(#${patternId})`,
        patternId,
      };
    }

    case "unresolved":
      return { fill: "none" };
  }
}

/**
 * Render fill to style object
 */
export function renderFillToStyle(fill: Fill, colorContext?: ColorContext): FillStyle {
  const resolved = resolveFill(fill, colorContext);
  return resolvedFillToSvgFill(resolved);
}

// =============================================================================
// Line Rendering
// =============================================================================

/**
 * Render resolved line to SVG line style
 */
function resolvedLineToSvgStyle(line: ResolvedLine): LineStyle {
  const fillStyle = resolvedFillToSvgFill(line.fill);

  const style: LineStyle = {
    stroke: fillStyle.fill === "none" ? "none" : fillStyle.fill,
    strokeWidth: line.width,
    strokeLinecap: line.cap === "flat" ? "butt" : line.cap,
    strokeLinejoin: line.join,
  };

  if (fillStyle.fillOpacity !== undefined) {
    style.strokeOpacity = fillStyle.fillOpacity;
  }

  const dashArray = getDashArrayPattern(line.dash, line.width, line.customDash);
  if (dashArray) {
    style.strokeDasharray = dashArray.join(" ");
  }

  return style;
}

/**
 * Render line to style object
 */
export function renderLineToStyle(line: Line, colorContext?: ColorContext): LineStyle {
  const resolved = resolveLine(line, colorContext);
  return resolvedLineToSvgStyle(resolved);
}

// =============================================================================
// SVG-Specific Rendering
// =============================================================================

/**
 * Render fill to SVG fill attribute value (without gradients)
 */
export function renderFillToSvgStyle(fill: Fill, colorContext?: ColorContext): string {
  const resolved = resolveFill(fill, colorContext);

  switch (resolved.type) {
    case "none":
    case "unresolved":
      return "none";

    case "solid":
      return `#${resolved.color.hex}`;

    case "gradient":
      // For gradients, return first stop color as fallback
      if (resolved.stops.length === 0) {
        return "none";
      }
      return `#${resolved.stops[0].color.hex}`;

    default:
      return "none";
  }
}

/**
 * Render resolved gradient fill to SVG gradient definition
 */
function resolvedGradientToSvgDef(fill: ResolvedGradientFill, gradientId: string): string {
  // Build gradient stops
  const stops = fill.stops
    .map((stop) => {
      const color = `#${stop.color.hex}`;
      const opacity = stop.color.alpha < 1 ? ` stop-opacity="${stop.color.alpha}"` : "";
      return `<stop offset="${stop.position}%" stop-color="${color}"${opacity}/>`;
    })
    .join("");

  if (fill.isRadial) {
    const { cx, cy, r } = getRadialGradientCoords(fill.radialCenter);
    return `<radialGradient id="${gradientId}" cx="${cx}%" cy="${cy}%" r="${r}%">${stops}</radialGradient>`;
  }

  // Linear gradient - use shared utility for angle conversion
  const { x1, y1, x2, y2 } = ooxmlAngleToSvgLinearGradient(fill.angle);

  return `<linearGradient id="${gradientId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">${stops}</linearGradient>`;
}

/**
 * Render gradient fill to SVG gradient definition
 * Returns undefined if fill is not a gradient
 */
export function renderFillToSvgDef(fill: Fill, gradientId: string, colorContext?: ColorContext): string | undefined {
  const resolved = resolveFill(fill, colorContext);

  if (resolved.type !== "gradient") {
    return undefined;
  }

  if (resolved.stops.length === 0) {
    return undefined;
  }

  return resolvedGradientToSvgDef(resolved, gradientId);
}

/**
 * Render image fill to SVG pattern definition
 *
 * @param imageFill - Resolved image fill
 * @param patternId - Pattern ID
 * @param width - Shape width in pixels
 * @param height - Shape height in pixels
 * @returns SVG pattern definition string
 */
export function renderImageFillToSvgDef({
  imageFill,
  patternId,
  width,
  height,
}: {
  imageFill: ResolvedImageFill;
  patternId: string;
  width: number;
  height: number;
}): string {
  // Use preserveAspectRatio="xMidYMid slice" to fill the shape while maintaining aspect ratio
  return (
    `<pattern id="${patternId}" patternUnits="objectBoundingBox" width="1" height="1">` +
    `<image href="${imageFill.src}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>` +
    `</pattern>`
  );
}

/**
 * Check if fill is an image fill that needs a pattern definition
 */
export function isImageFill(fill: Fill, colorContext?: ColorContext, resourceResolver?: ResourceResolverFn): boolean {
  const resolved = resolveFill(fill, colorContext, resourceResolver);
  return resolved.type === "image";
}

/**
 * Get resolved image fill if applicable
 *
 * @param fill - Fill to resolve
 * @param colorContext - Color context for theme/scheme color resolution
 * @param resourceResolver - Optional resource resolver for blipFill resolution
 */
export function getResolvedImageFill(
  fill: Fill,
  colorContext?: ColorContext,
  resourceResolver?: ResourceResolverFn,
): ResolvedImageFill | undefined {
  if (fill.type === "blipFill") {
    return resolveBlipFill(fill, resourceResolver);
  }
  const resolved = resolveFill(fill, colorContext, resourceResolver);
  if (resolved.type === "image") {
    return resolved;
  }
  return undefined;
}
