/**
 * @file Stroke (Line) Primitives for React SVG Renderer
 *
 * Provides utilities and components for rendering stroke/line styles.
 */

import type { Line } from "../../../domain";
import type { ColorContext } from "../../../domain/resolution";
import { resolveLine, getDashArrayPattern } from "../../../domain/color/fill";
import { useRenderContext } from "../context";

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

type ResolvedLineFill = ReturnType<typeof resolveLine>["fill"];

/**
 * Get stroke color from resolved line fill
 */
function getStrokeColor(fill: ResolvedLineFill): string | undefined {
  if (fill.type === "solid") {
    return `#${fill.color.hex}`;
  }
  if (fill.type === "gradient" && fill.stops.length > 0) {
    return `#${fill.stops[0].color.hex}`;
  }
  return undefined;
}

/**
 * Get stroke opacity from resolved line fill
 */
function getStrokeOpacity(fill: ResolvedLineFill): number | undefined {
  if (fill.type === "solid" && fill.color.alpha < 1) {
    return fill.color.alpha;
  }
  return undefined;
}

/**
 * Convert resolved line to SVG stroke props
 */
function resolvedLineToProps(
  line: ReturnType<typeof resolveLine>,
): SvgStrokeProps | undefined {
  if (line.fill.type === "none" || line.fill.type === "unresolved") {
    return undefined;
  }

  const strokeColor = getStrokeColor(line.fill);
  if (strokeColor === undefined) {
    return undefined;
  }

  // Get optional values
  const strokeOpacity = getStrokeOpacity(line.fill);

  const dashArray = getDashArrayPattern(line.dash, line.width, line.customDash);
  const strokeDasharray = dashArray ? dashArray.join(" ") : undefined;

  return {
    stroke: strokeColor,
    strokeWidth: line.width,
    strokeLinecap: line.cap === "flat" ? "butt" : line.cap,
    strokeLinejoin: line.join,
    strokeOpacity,
    strokeDasharray,
  };
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to resolve line to SVG stroke props.
 *
 * @param line - Domain line object
 * @returns SVG stroke props or undefined if no stroke
 */
export function useStroke(line: Line | undefined): SvgStrokeProps | undefined {
  const { colorContext } = useRenderContext();

  if (line === undefined || line.fill.type === "noFill") {
    return undefined;
  }

  const resolved = resolveLine(line, colorContext);
  return resolvedLineToProps(resolved);
}

/**
 * Resolve line to stroke props without context (for external use).
 */
export function resolveStrokeForReact(
  line: Line | undefined,
  colorContext?: ColorContext,
): SvgStrokeProps | undefined {
  if (line === undefined || line.fill.type === "noFill") {
    return undefined;
  }

  const resolved = resolveLine(line, colorContext);
  return resolvedLineToProps(resolved);
}

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

  if (strokeProps) {
    combined.stroke = strokeProps.stroke;
    combined.strokeWidth = strokeProps.strokeWidth;
    combined.strokeOpacity = strokeProps.strokeOpacity;
    combined.strokeLinecap = strokeProps.strokeLinecap;
    combined.strokeLinejoin = strokeProps.strokeLinejoin;
    combined.strokeDasharray = strokeProps.strokeDasharray;
  }

  return combined;
}
