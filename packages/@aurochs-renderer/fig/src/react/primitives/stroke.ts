/**
 * @file Stroke rendering for React scene graph renderer
 */

import type { Stroke } from "../../scene-graph/types";
import { colorToHex } from "./color";

// =============================================================================
// Types
// =============================================================================

type StrokeAttrs = {
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly strokeOpacity?: number;
  readonly strokeLinecap?: "round" | "square";
  readonly strokeLinejoin?: "round" | "bevel";
  readonly strokeDasharray?: string;
};

// =============================================================================
// Stroke Resolution
// =============================================================================

/** Resolve a Stroke to React SVG props (camelCase attribute names). */
export function resolveStrokeAttrs(stroke: Stroke): StrokeAttrs {
  return {
    stroke: colorToHex(stroke.color),
    strokeWidth: stroke.width,
    strokeOpacity: stroke.opacity < 1 ? stroke.opacity : undefined,
    strokeLinecap: stroke.linecap !== "butt" ? stroke.linecap : undefined,
    strokeLinejoin: stroke.linejoin !== "miter" ? stroke.linejoin : undefined,
    strokeDasharray: stroke.dashPattern?.join(" "),
  };
}
