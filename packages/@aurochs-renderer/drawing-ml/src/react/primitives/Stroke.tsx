/**
 * @file Stroke (Line) Primitives for React SVG Renderer
 *
 * Format-agnostic stroke rendering utilities.
 * Receives resolved line types and produces SVG stroke attributes.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.2.24 (ln)
 */

import { useMemo } from "react";
import type { ResolvedLine, ResolvedFill } from "@aurochs-office/drawing-ml/domain/resolved-fill";

// =============================================================================
// Types
// =============================================================================

/**
 * SVG stroke props
 */
export type SvgStrokeProps = {
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly strokeOpacity?: number;
  readonly strokeLinecap?: "butt" | "round" | "square";
  readonly strokeLinejoin?: "miter" | "round" | "bevel";
  readonly strokeDasharray?: string;
};

// =============================================================================
// Stroke Resolution
// =============================================================================

/**
 * Get stroke color from resolved fill
 */
function getStrokeColor(fill: ResolvedFill): string | undefined {
  if (fill.type === "solid") {
    return `#${fill.color.hex}`;
  }
  if (fill.type === "gradient" && fill.stops.length > 0) {
    return `#${fill.stops[0].color.hex}`;
  }
  return undefined;
}

/**
 * Get stroke opacity from resolved fill
 */
function getStrokeOpacity(fill: ResolvedFill): number | undefined {
  if (fill.type === "solid" && fill.color.alpha < 1) {
    return fill.color.alpha;
  }
  return undefined;
}

/**
 * Convert line cap to SVG stroke-linecap value
 */
function lineCapToSvgLinecap(cap: string | undefined): "butt" | "round" | "square" | undefined {
  if (cap === "flat") {
    return "butt";
  }
  if (cap === "round") {
    return "round";
  }
  if (cap === "square") {
    return "square";
  }
  return undefined;
}

/**
 * Convert resolved line to SVG stroke props
 */
export function resolvedLineToProps(line: ResolvedLine): SvgStrokeProps | undefined {
  const { fill, width, cap, join, customDash } = line;

  if (fill.type === "none" || fill.type === "unresolved") {
    return undefined;
  }

  const strokeColor = getStrokeColor(fill);
  if (strokeColor === undefined) {
    return undefined;
  }

  const strokeOpacity = getStrokeOpacity(fill);
  const strokeLinecap = lineCapToSvgLinecap(cap);
  const strokeDasharray = customDash ? customDash.join(" ") : undefined;

  return {
    stroke: strokeColor,
    strokeWidth: width,
    strokeLinecap,
    strokeLinejoin: join,
    strokeOpacity,
    strokeDasharray,
  };
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook to convert resolved line to SVG stroke props.
 *
 * @param resolvedLine - Resolved line (after color resolution)
 * @returns SVG stroke props or undefined if no stroke
 */
export function useStroke(resolvedLine: ResolvedLine | undefined): SvgStrokeProps | undefined {
  return useMemo(() => {
    if (resolvedLine === undefined) {
      return undefined;
    }

    return resolvedLineToProps(resolvedLine);
  }, [resolvedLine]);
}

/**
 * Resolve line to stroke props without context (for external use).
 *
 * @param resolvedLine - Resolved line
 * @returns SVG stroke props or undefined if no stroke
 */
export function resolveStrokeForReact(resolvedLine: ResolvedLine | undefined): SvgStrokeProps | undefined {
  if (resolvedLine === undefined) {
    return undefined;
  }

  return resolvedLineToProps(resolvedLine);
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Combine fill and stroke props into a single props object.
 */
export function combineShapeProps(
  fillProps: { fill: string; fillOpacity?: number },
  strokeProps: SvgStrokeProps | undefined,
): Record<string, string | number | undefined> {
  const combined: Record<string, string | number | undefined> = {
    fill: fillProps.fill,
    fillOpacity: fillProps.fillOpacity,
  };

  if (strokeProps !== undefined) {
    combined.stroke = strokeProps.stroke;
    combined.strokeWidth = strokeProps.strokeWidth;
    combined.strokeOpacity = strokeProps.strokeOpacity;
    combined.strokeLinecap = strokeProps.strokeLinecap;
    combined.strokeLinejoin = strokeProps.strokeLinejoin;
    combined.strokeDasharray = strokeProps.strokeDasharray;
  }

  return combined;
}
