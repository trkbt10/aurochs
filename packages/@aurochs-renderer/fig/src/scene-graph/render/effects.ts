/**
 * @file Effects resolution — shared SoT for SceneGraph Effect → SVG filter attributes
 *
 * Both SVG string and React renderers MUST consume this output.
 *
 * The resolved filter primitives are plain data objects, not SVG strings
 * or React elements. Each consumer formats them for its own output.
 */

import type { Effect, Color, BlendMode } from "../types";

// =============================================================================
// Resolved Filter Primitive Types
// =============================================================================

/** SVG feColorMatrix `type` attribute values (see SVG spec). */
export type FeColorMatrixType = "matrix" | "saturate" | "hueRotate" | "luminanceToAlpha";

/**
 * SVG feBlend `mode` attribute values (CSS blend modes supported by SVG).
 * Intersection of SVG spec values and CSS <blend-mode> values.
 */
export type FeBlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn"
  | "hard-light"
  | "soft-light"
  | "difference"
  | "exclusion"
  | "hue"
  | "saturation"
  | "color"
  | "luminosity";

/** SVG feComposite `operator` attribute values. */
export type FeCompositeOperator = "over" | "in" | "out" | "atop" | "xor" | "arithmetic";

/**
 * A resolved SVG filter primitive.
 * Each variant corresponds to an SVG filter element with all attributes computed.
 */
export type ResolvedFilterPrimitive =
  | { readonly type: "feFlood"; readonly floodOpacity: number; readonly result: string }
  | { readonly type: "feColorMatrix"; readonly in?: string; readonly matrixType: FeColorMatrixType; readonly values: string; readonly result?: string }
  | { readonly type: "feOffset"; readonly dx: number; readonly dy: number }
  | { readonly type: "feGaussianBlur"; readonly in?: string; readonly stdDeviation: number }
  | { readonly type: "feBlend"; readonly mode: FeBlendMode; readonly in?: string; readonly in2?: string; readonly result?: string }
  | { readonly type: "feComposite"; readonly in2: string; readonly operator: FeCompositeOperator; readonly k2: number; readonly k3: number }
  | { readonly type: "feMorphology"; readonly operator: "dilate" | "erode"; readonly radius: number };

/**
 * Complete resolved filter with all primitives and the filter ID.
 */
export type ResolvedFilter = {
  readonly id: string;
  readonly filterAttr: string;
  readonly primitives: readonly ResolvedFilterPrimitive[];
  /**
   * Filter region in userSpaceOnUse coordinates.
   * Required to prevent shadow/blur clipping — SVG's default filter region
   * (10% margin) is too small for large offsets or blur radii.
   * Set by the caller (resolveWrapper) which knows the element bounds.
   */
  readonly filterBounds?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
};

type IdGenerator = {
  readonly getNextId: (prefix: string) => string;
};

// =============================================================================
// Resolution
// =============================================================================

/**
 * Convert a BlendMode to SVG feBlend mode string.
 * Returns "normal" when no blend mode is specified. Unsupported values
 * (SVG feBlend only supports a subset of CSS blend modes) fall back to
 * "normal" so renderers never emit an illegal attribute value.
 */
function effectBlendModeToSvg(bm: BlendMode | undefined): FeBlendMode {
  if (!bm) { return "normal"; }
  switch (bm) {
    case "multiply":
    case "screen":
    case "darken":
    case "lighten":
    case "overlay":
      return bm;
    default:
      return "normal";
  }
}

const ALPHA_BINARIZE_MATRIX = "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0";

function buildColorMatrix(c: Color): string {
  return `0 0 0 0 ${c.r} 0 0 0 0 ${c.g} 0 0 0 0 ${c.b} 0 0 0 ${c.a} 0`;
}

/**
 * Resolve effects to a filter definition.
 *
 * This is the exhaustive handler — adding a new Effect type without
 * handling it here will produce a TypeScript compile error (via the
 * never check at the bottom of the switch).
 */
export function resolveEffects(
  effects: readonly Effect[],
  ids: IdGenerator,
  elementBounds?: { x: number; y: number; width: number; height: number },
): ResolvedFilter | undefined {
  if (effects.length === 0) {
    return undefined;
  }

  const primitives: ResolvedFilterPrimitive[] = [];
  // eslint-disable-next-line no-restricted-syntax -- mutable state flag tracking whether shape primitive was established during loop
  let shapeEstablished = false;

  for (const effect of effects) {
    switch (effect.type) {
      case "drop-shadow": {
        const stdDev = effect.radius / 2;
        const blendMode = effectBlendModeToSvg(effect.blendMode);
        primitives.push(
          { type: "feFlood", floodOpacity: 0, result: "BackgroundImageFix" },
          { type: "feColorMatrix", in: "SourceAlpha", matrixType: "matrix", values: ALPHA_BINARIZE_MATRIX, result: "hardAlpha" },
        );
        // Spread: feMorphology dilate (positive) or erode (negative) before offset
        if (effect.spread && effect.spread !== 0) {
          primitives.push({
            type: "feMorphology",
            operator: effect.spread > 0 ? "dilate" : "erode",
            radius: Math.abs(effect.spread),
          });
        }
        primitives.push(
          { type: "feOffset", dx: effect.offset.x, dy: effect.offset.y },
          { type: "feGaussianBlur", stdDeviation: stdDev },
          { type: "feColorMatrix", matrixType: "matrix", values: buildColorMatrix(effect.color) },
          { type: "feBlend", mode: blendMode, in2: "BackgroundImageFix" },
          { type: "feBlend", mode: "normal", in: "SourceGraphic", in2: "effect", result: "shape" },
        );
        shapeEstablished = true;
        break;
      }

      case "inner-shadow": {
        const stdDev = effect.radius / 2;
        const blendMode = effectBlendModeToSvg(effect.blendMode);
        if (!shapeEstablished) {
          primitives.push(
            { type: "feFlood", floodOpacity: 0, result: "BackgroundImageFix" },
            { type: "feBlend", mode: "normal", in: "SourceGraphic", in2: "BackgroundImageFix", result: "shape" },
          );
          shapeEstablished = true;
        }
        primitives.push(
          { type: "feColorMatrix", in: "SourceAlpha", matrixType: "matrix", values: ALPHA_BINARIZE_MATRIX, result: "hardAlpha" },
          { type: "feOffset", dx: effect.offset.x, dy: effect.offset.y },
          { type: "feGaussianBlur", stdDeviation: stdDev },
          { type: "feComposite", in2: "hardAlpha", operator: "arithmetic", k2: -1, k3: 1 },
          { type: "feColorMatrix", matrixType: "matrix", values: buildColorMatrix(effect.color) },
          { type: "feBlend", mode: blendMode, in2: "shape", result: "shape" },
        );
        break;
      }

      case "layer-blur": {
        const stdDev = effect.radius / 2;
        primitives.push(
          { type: "feGaussianBlur", in: "SourceGraphic", stdDeviation: stdDev },
        );
        break;
      }

      case "background-blur":
        // Background blur not supported in SVG filter pipeline
        break;

      default: {
        // Exhaustiveness check: if a new Effect type is added to the union,
        // TypeScript will report an error here.
        const _exhaustive: never = effect;
        void _exhaustive;
      }
    }
  }

  if (primitives.length === 0) {
    return undefined;
  }

  const id = ids.getNextId("filter");

  // Compute filter bounds from shadow offsets/radii to prevent clipping
  const filterBounds = elementBounds ? computeFilterBounds(effects, elementBounds) : undefined;

  return {
    id,
    filterAttr: `url(#${id})`,
    primitives,
    filterBounds,
  };
}

/**
 * Compute filter region as the union of element bounds and all shadow regions.
 *
 * Each shadow extends the region by its offset + blur radius.
 * Without this, SVG's default 10% filter margin clips large shadows.
 */
function computeFilterBounds(
  effects: readonly Effect[],
  bounds: { x: number; y: number; width: number; height: number },
): { x: number; y: number; width: number; height: number } {
  let minX = bounds.x;
  let minY = bounds.y;
  let maxX = bounds.x + bounds.width;
  let maxY = bounds.y + bounds.height;

  for (const effect of effects) {
    if (effect.type === "drop-shadow" || effect.type === "inner-shadow") {
      const offsetX = effect.offset.x;
      const offsetY = effect.offset.y;
      const blurExpansion = effect.radius; // 2 × stdDeviation = 2 × (radius/2) = radius
      const spreadExpansion = effect.spread ?? 0;
      const totalExpansion = blurExpansion + Math.abs(spreadExpansion);

      minX = Math.min(minX, bounds.x + offsetX - totalExpansion);
      minY = Math.min(minY, bounds.y + offsetY - totalExpansion);
      maxX = Math.max(maxX, bounds.x + bounds.width + offsetX + totalExpansion);
      maxY = Math.max(maxY, bounds.y + bounds.height + offsetY + totalExpansion);
    } else if (effect.type === "layer-blur") {
      const expand = effect.radius;
      minX -= expand;
      minY -= expand;
      maxX += expand;
      maxY += expand;
    }
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
