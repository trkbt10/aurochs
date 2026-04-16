/**
 * @file Stroke resolution — shared SoT for SceneGraph Stroke → SVG stroke attributes
 *
 * Both SVG string and React renderers MUST consume this output.
 */

import type { Stroke, BlendMode } from "../types";
import { colorToHex } from "./color";
import { resolveFill, type IdGenerator, type ResolvedFill } from "./fill";

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

/**
 * A resolved stroke layer for multi-paint stroke rendering.
 * Each layer can have its own color/gradient and blend mode.
 */
export type ResolvedStrokeLayer = {
  readonly attrs: ResolvedStrokeAttrs;
  /** Gradient def, if this layer uses a gradient stroke */
  readonly gradientDef?: ResolvedFill["def"];
  /** Paint-level blend mode */
  readonly blendMode?: BlendMode;
};

/**
 * Complete stroke resolution result, including multi-paint layers.
 */
export type ResolvedStrokeResult = {
  /** Primary stroke attrs (for single-paint rendering) */
  readonly attrs: ResolvedStrokeAttrs;
  /** All stroke layers when multi-paint (length >= 2, bottom-to-top) */
  readonly layers?: readonly ResolvedStrokeLayer[];
};

// =============================================================================
// Resolution
// =============================================================================

function buildStrokeAttrsBase(stroke: Stroke): Omit<ResolvedStrokeAttrs, "stroke" | "strokeOpacity"> {
  return {
    strokeWidth: stroke.width,
    strokeLinecap: stroke.linecap !== "butt" ? stroke.linecap : undefined,
    strokeLinejoin: stroke.linejoin !== "miter" ? stroke.linejoin : undefined,
    strokeDasharray: stroke.dashPattern?.join(" "),
  };
}

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

/**
 * Resolve a Stroke including multi-paint layers.
 *
 * When the stroke has layers, each is resolved individually
 * (potentially with gradient fill). Returns a ResolvedStrokeResult
 * with both primary attrs and individual layers.
 */
export function resolveStrokeResult(stroke: Stroke, ids: IdGenerator): ResolvedStrokeResult {
  const attrs = resolveStroke(stroke);

  if (!stroke.layers || stroke.layers.length < 2) {
    // Check if single layer has gradient
    if (stroke.layers && stroke.layers.length === 1) {
      const layer = stroke.layers[0];
      if (layer.gradientFill) {
        const resolved = resolveFill(layer.gradientFill, ids);
        const base = buildStrokeAttrsBase(stroke);
        return {
          attrs: {
            ...base,
            stroke: resolved.attrs.fill,
            strokeOpacity: layer.opacity < 1 ? layer.opacity : undefined,
          },
          layers: [{
            attrs: {
              ...base,
              stroke: resolved.attrs.fill,
              strokeOpacity: layer.opacity < 1 ? layer.opacity : undefined,
            },
            gradientDef: resolved.def,
            blendMode: layer.blendMode,
          }],
        };
      }
    }
    return { attrs };
  }

  const base = buildStrokeAttrsBase(stroke);
  const layers: ResolvedStrokeLayer[] = stroke.layers.map((layer) => {
    if (layer.gradientFill) {
      const resolved = resolveFill(layer.gradientFill, ids);
      return {
        attrs: {
          ...base,
          stroke: resolved.attrs.fill,
          strokeOpacity: layer.opacity < 1 ? layer.opacity : undefined,
        },
        gradientDef: resolved.def,
        blendMode: layer.blendMode,
      };
    }
    return {
      attrs: {
        ...base,
        stroke: colorToHex(layer.color),
        strokeOpacity: layer.opacity < 1 ? layer.opacity : undefined,
      },
      blendMode: layer.blendMode,
    };
  });

  return { attrs, layers };
}
