/**
 * @file Stroke resolution — shared SoT for SceneGraph Stroke → SVG stroke attributes
 *
 * Both SVG string and React renderers MUST consume this output.
 */

import type { Stroke } from "../types";
import { colorToHex } from "./color";

// =============================================================================
// Resolved Types
// =============================================================================

/**
 * SVG stroke attributes resolved from a SceneGraph Stroke.
 * Field names match SVG attribute names (camelCase for React, kebab-case consumers convert).
 */
export type ResolvedStrokeAttrs = {
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly strokeOpacity?: number;
  readonly strokeLinecap?: "round" | "square";
  readonly strokeLinejoin?: "round" | "bevel";
  readonly strokeDasharray?: string;
};

// =============================================================================
// Resolution
// =============================================================================

/**
 * Resolve a Stroke to SVG stroke attributes.
 */
export function resolveStroke(stroke: Stroke): ResolvedStrokeAttrs {
  return {
    stroke: colorToHex(stroke.color),
    strokeWidth: stroke.width,
    strokeOpacity: stroke.opacity < 1 ? stroke.opacity : undefined,
    strokeLinecap: stroke.linecap !== "butt" ? stroke.linecap : undefined,
    strokeLinejoin: stroke.linejoin !== "miter" ? stroke.linejoin : undefined,
    strokeDasharray: stroke.dashPattern?.join(" "),
  };
}
