/**
 * @file Effect rendering for Figma nodes (shadows, blur, etc.)
 */

import type { FigEffect, FigEffectType } from "@aurochs/fig/types";
import type { FigSvgRenderContext } from "../types";
import {
  filter,
  feFlood,
  feColorMatrix,
  feOffset,
  feGaussianBlur,
  feBlend,
  feComposite,
  feMerge,
  feMergeNode,
  type SvgString,
} from "./primitives";

export type { FigEffect, FigEffectType };

// =============================================================================
// Filter Bounds Computation
// =============================================================================

/**
 * Compute filter region as the union of shape bounds and all shadow regions.
 * Each shadow region = shape shifted by (offsetX, offsetY), expanded by radius (= 2 * stdDeviation).
 * Matches Figma's SVG export filter region calculation.
 */
function computeShadowFilterBounds(
  shadows: readonly FigEffect[],
  bounds: { x: number; y: number; width: number; height: number },
): { x: number; y: number; width: number; height: number } {
  let minX = bounds.x;
  let minY = bounds.y;
  let maxX = bounds.x + bounds.width;
  let maxY = bounds.y + bounds.height;

  for (const shadow of shadows) {
    const offsetX = shadow.offset?.x ?? 0;
    const offsetY = shadow.offset?.y ?? 0;
    const blurExpansion = shadow.radius ?? 0; // 2 * stdDeviation = 2 * (radius / 2) = radius

    minX = Math.min(minX, bounds.x + offsetX - blurExpansion);
    minY = Math.min(minY, bounds.y + offsetY - blurExpansion);
    maxX = Math.max(maxX, bounds.x + bounds.width + offsetX + blurExpansion);
    maxY = Math.max(maxY, bounds.y + bounds.height + offsetY + blurExpansion);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// =============================================================================
// Effect Helpers
// =============================================================================

/**
 * Get effect type as string
 */
function getEffectType(effect: FigEffect): FigEffectType {
  const type = effect.type;
  if (typeof type === "string") {
    return type;
  }
  if (type && typeof type === "object" && "name" in type) {
    return type.name;
  }
  return "DROP_SHADOW";
}

/**
 * Check if effects array has visible drop shadows
 */
export function hasDropShadow(effects: readonly FigEffect[] | undefined): boolean {
  if (!effects || effects.length === 0) {
    return false;
  }
  return effects.some((e) => e.visible !== false && getEffectType(e) === "DROP_SHADOW");
}

/**
 * Get drop shadows from effects array
 */
export function getDropShadows(effects: readonly FigEffect[] | undefined): readonly FigEffect[] {
  if (!effects || effects.length === 0) {
    return [];
  }
  return effects.filter((e) => e.visible !== false && getEffectType(e) === "DROP_SHADOW");
}

// =============================================================================
// Filter Creation
// =============================================================================

/**
 * Create a drop shadow filter definition
 *
 * Based on Figma's SVG export format which uses multiple blur layers
 * for smoother shadow rendering.
 */
export function createDropShadowFilter(
  shadows: readonly FigEffect[],
  ctx: FigSvgRenderContext,
  bounds: { x: number; y: number; width: number; height: number },
): { id: string; def: SvgString } | null {
  if (shadows.length === 0) {
    return null;
  }

  const id = ctx.defs.generateId("shadow");

  // Calculate filter region as union of shape bounds and all shadow regions.
  // Each shadow region = shape shifted by offset, expanded by 2*stdDeviation (= radius).
  const filterBounds = computeShadowFilterBounds(shadows, bounds);

  // Build filter primitives
  const primitives: SvgString[] = [];

  // Start with BackgroundImageFix
  primitives.push(feFlood({ "flood-opacity": 0, result: "BackgroundImageFix" }));

  // Generate shadow layers
  const lastShadowResult = shadows.reduce((previousResult, shadow, i) => {
    const effectNum = i + 1;
    const shadowResult = "effect" + effectNum + "_dropShadow_" + id;

    // Extract shadow alpha from source
    primitives.push(
      feColorMatrix({
        in: "SourceAlpha",
        type: "matrix",
        values: "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0",
        result: "hardAlpha",
      }),
    );

    // Apply offset
    primitives.push(
      feOffset({
        dy: shadow.offset?.y ?? 0,
      }),
    );

    // Apply blur (stdDeviation = radius / 2 for Gaussian blur to match Figma)
    const stdDeviation = (shadow.radius ?? 0) / 2;
    primitives.push(
      feGaussianBlur({
        stdDeviation,
      }),
    );

    // Apply shadow color via color matrix (4x5 = 20 values)
    // Row 4: 0 0 0 alpha 0 → output_A = alpha * srcA (proportional fade)
    const color = shadow.color ?? { r: 0, g: 0, b: 0, a: 0.25 };
    primitives.push(
      feColorMatrix({
        type: "matrix",
        values: "0 0 0 0 " + color.r + " 0 0 0 0 " + color.g + " 0 0 0 0 " + color.b + " 0 0 0 " + color.a + " 0",
      }),
    );

    // Blend with previous result
    primitives.push(
      feBlend({
        mode: "normal",
        in2: previousResult,
        result: shadowResult,
      }),
    );

    return shadowResult;
  }, "BackgroundImageFix");

  // Final blend with source graphic
  primitives.push(
    feBlend({
      mode: "normal",
      in: "SourceGraphic",
      in2: lastShadowResult,
      result: "shape",
    }),
  );

  // Create filter with computed bounds
  const filterDef = filter(
    {
      id,
      ...filterBounds,
      filterUnits: "userSpaceOnUse",
      "color-interpolation-filters": "sRGB",
    },
    ...primitives,
  );

  return { id, def: filterDef };
}

// =============================================================================
// Inner Shadow Filter
// =============================================================================

/**
 * Check if effects array has visible inner shadows
 */
export function hasInnerShadow(effects: readonly FigEffect[] | undefined): boolean {
  if (!effects || effects.length === 0) {
    return false;
  }
  return effects.some((e) => e.visible !== false && getEffectType(e) === "INNER_SHADOW");
}

/**
 * Get inner shadows from effects array
 */
export function getInnerShadows(effects: readonly FigEffect[] | undefined): readonly FigEffect[] {
  if (!effects || effects.length === 0) {
    return [];
  }
  return effects.filter((e) => e.visible !== false && getEffectType(e) === "INNER_SHADOW");
}

/**
 * Create an inner shadow filter definition
 *
 * Inner shadow is created by:
 * 1. Creating a shadow from the inverted alpha of the source
 * 2. Clipping it to the original shape
 */
export function createInnerShadowFilter(
  shadows: readonly FigEffect[],
  ctx: FigSvgRenderContext,
  bounds: { x: number; y: number; width: number; height: number },
): { id: string; def: SvgString } | null {
  if (shadows.length === 0) {
    return null;
  }

  const id = ctx.defs.generateId("inner-shadow");

  // Inner shadows are contained within the shape, use same union-based calculation
  const filterBounds = computeShadowFilterBounds(shadows, bounds);

  const primitives: SvgString[] = [];

  // Process each inner shadow
  shadows.forEach((shadow, i) => {
    const effectNum = i + 1;
    const prefix = "effect" + effectNum + "_innerShadow_";

    // Get shadow color
    const color = shadow.color ?? { r: 0, g: 0, b: 0, a: 0.25 };
    const stdDeviation = (shadow.radius ?? 0) / 2;

    // Create flood with shadow color
    primitives.push(
      feFlood({
        "flood-color": `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`,
        "flood-opacity": color.a ?? 0.25,
        result: prefix + "flood",
      }),
    );

    // Composite flood with source alpha to get colored shape
    primitives.push(
      feComposite({
        in: prefix + "flood",
        in2: "SourceAlpha",
        operator: "in",
        result: prefix + "colored",
      }),
    );

    // Offset the colored shape (opposite direction for inner shadow)
    primitives.push(
      feOffset({
        in: prefix + "colored",
        dx: shadow.offset?.x ?? 0,
        dy: shadow.offset?.y ?? 0,
        result: prefix + "offset",
      }),
    );

    // Blur the offset shape
    primitives.push(
      feGaussianBlur({
        in: prefix + "offset",
        stdDeviation,
        result: prefix + "blur",
      }),
    );

    // Create the inner shadow by subtracting from SourceAlpha
    // First, invert and clip to create inner edge
    primitives.push(
      feComposite({
        in: prefix + "blur",
        in2: "SourceAlpha",
        operator: "out",
        result: prefix + "inner",
      }),
    );
  });

  // Merge all inner shadows with source graphic
  const mergeNodes: SvgString[] = [feMergeNode({ in: "SourceGraphic" })];
  shadows.forEach((_, i) => {
    const effectNum = i + 1;
    mergeNodes.push(feMergeNode({ in: "effect" + effectNum + "_innerShadow_inner" }));
  });
  primitives.push(feMerge({}, ...mergeNodes));

  const filterDef = filter(
    {
      id,
      ...filterBounds,
      filterUnits: "userSpaceOnUse",
      "color-interpolation-filters": "sRGB",
    },
    ...primitives,
  );

  return { id, def: filterDef };
}

// =============================================================================
// Layer Blur Filter
// =============================================================================

/**
 * Check if effects array has visible layer blur
 */
export function hasLayerBlur(effects: readonly FigEffect[] | undefined): boolean {
  if (!effects || effects.length === 0) {
    return false;
  }
  return effects.some((e) => e.visible !== false && getEffectType(e) === "LAYER_BLUR");
}

/**
 * Get layer blur effect from effects array
 */
export function getLayerBlur(effects: readonly FigEffect[] | undefined): FigEffect | undefined {
  if (!effects || effects.length === 0) {
    return undefined;
  }
  return effects.find((e) => e.visible !== false && getEffectType(e) === "LAYER_BLUR");
}

/**
 * Create a layer blur filter definition
 */
export function createLayerBlurFilter(
  blur: FigEffect,
  ctx: FigSvgRenderContext,
  bounds: { x: number; y: number; width: number; height: number },
): { id: string; def: SvgString } | null {
  const radius = blur.radius ?? 0;
  if (radius <= 0) {
    return null;
  }

  const id = ctx.defs.generateId("layer-blur");
  const stdDeviation = radius / 2;
  const expand = radius; // 2 * stdDeviation

  const primitives: SvgString[] = [
    feGaussianBlur({
      in: "SourceGraphic",
      stdDeviation,
      result: "blur",
    }),
  ];

  const filterDef = filter(
    {
      id,
      x: bounds.x - expand,
      y: bounds.y - expand,
      width: bounds.width + expand * 2,
      height: bounds.height + expand * 2,
      filterUnits: "userSpaceOnUse",
      "color-interpolation-filters": "sRGB",
    },
    ...primitives,
  );

  return { id, def: filterDef };
}

// =============================================================================
// Background Blur Filter
// =============================================================================

/**
 * Check if effects array has visible background blur
 */
export function hasBackgroundBlur(effects: readonly FigEffect[] | undefined): boolean {
  if (!effects || effects.length === 0) {
    return false;
  }
  return effects.some((e) => e.visible !== false && getEffectType(e) === "BACKGROUND_BLUR");
}

/**
 * Get background blur effect from effects array
 * Note: Background blur in SVG is limited - it cannot truly blur content behind
 * the element like CSS backdrop-filter. This creates a placeholder filter.
 */
export function getBackgroundBlur(effects: readonly FigEffect[] | undefined): FigEffect | undefined {
  if (!effects || effects.length === 0) {
    return undefined;
  }
  return effects.find((e) => e.visible !== false && getEffectType(e) === "BACKGROUND_BLUR");
}

// =============================================================================
// Combined Filter Creation
// =============================================================================

/**
 * Create a combined filter for all effects on a node
 */
export function createCombinedFilter(
  effects: readonly FigEffect[],
  ctx: FigSvgRenderContext,
  bounds: { x: number; y: number; width: number; height: number },
): { id: string; def: SvgString } | null {
  const dropShadows = getDropShadows(effects);
  const innerShadows = getInnerShadows(effects);
  const layerBlur = getLayerBlur(effects);

  // If no effects, return null
  if (dropShadows.length === 0 && innerShadows.length === 0 && !layerBlur) {
    return null;
  }

  const id = ctx.defs.generateId("effects");

  // Calculate combined filter region using union of all effect regions
  const allEffects = [...dropShadows, ...innerShadows];
  if (layerBlur) {
    allEffects.push(layerBlur);
  }
  const filterBounds = computeShadowFilterBounds(allEffects, bounds);

  const primitives: SvgString[] = [];
  let lastResult = "SourceGraphic";

  // Apply layer blur first (if present)
  if (layerBlur && (layerBlur.radius ?? 0) > 0) {
    const stdDeviation = (layerBlur.radius ?? 0) / 2;
    primitives.push(
      feGaussianBlur({
        in: lastResult,
        stdDeviation,
        result: "layerBlur",
      }),
    );
    lastResult = "layerBlur";
  }

  // Apply drop shadows
  if (dropShadows.length > 0) {
    primitives.push(feFlood({ "flood-opacity": 0, result: "BackgroundImageFix" }));

    let shadowResult = "BackgroundImageFix";
    dropShadows.forEach((shadow, i) => {
      const effectNum = i + 1;
      const currentResult = "effect" + effectNum + "_dropShadow";

      primitives.push(
        feColorMatrix({
          in: "SourceAlpha",
          type: "matrix",
          values: "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0",
          result: "hardAlpha",
        }),
      );

      primitives.push(
        feOffset({
          dy: shadow.offset?.y ?? 0,
          dx: shadow.offset?.x ?? 0,
        }),
      );

      const stdDeviation = (shadow.radius ?? 0) / 2;
      primitives.push(feGaussianBlur({ stdDeviation }));

      const color = shadow.color ?? { r: 0, g: 0, b: 0, a: 0.25 };
      primitives.push(
        feColorMatrix({
          type: "matrix",
          values:
            "0 0 0 0 " + color.r + " 0 0 0 0 " + color.g + " 0 0 0 0 " + color.b + " 0 0 0 " + (color.a ?? 0.25) + " 0",
        }),
      );

      primitives.push(
        feBlend({
          mode: "normal",
          in2: shadowResult,
          result: currentResult,
        }),
      );

      shadowResult = currentResult;
    });

    primitives.push(
      feBlend({
        mode: "normal",
        in: lastResult,
        in2: shadowResult,
        result: "dropShadowResult",
      }),
    );
    lastResult = "dropShadowResult";
  }

  // Apply inner shadows
  if (innerShadows.length > 0) {
    innerShadows.forEach((shadow, i) => {
      const effectNum = i + 1;
      const prefix = "innerShadow" + effectNum + "_";

      const color = shadow.color ?? { r: 0, g: 0, b: 0, a: 0.25 };
      const stdDeviation = (shadow.radius ?? 0) / 2;

      primitives.push(
        feFlood({
          "flood-color": `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`,
          "flood-opacity": color.a ?? 0.25,
          result: prefix + "flood",
        }),
      );

      primitives.push(
        feComposite({
          in: prefix + "flood",
          in2: "SourceAlpha",
          operator: "in",
          result: prefix + "colored",
        }),
      );

      primitives.push(
        feOffset({
          in: prefix + "colored",
          dx: shadow.offset?.x ?? 0,
          dy: shadow.offset?.y ?? 0,
          result: prefix + "offset",
        }),
      );

      primitives.push(
        feGaussianBlur({
          in: prefix + "offset",
          stdDeviation,
          result: prefix + "blur",
        }),
      );

      primitives.push(
        feComposite({
          in: prefix + "blur",
          in2: "SourceAlpha",
          operator: "out",
          result: prefix + "inner",
        }),
      );

      // Blend inner shadow onto current result
      primitives.push(
        feBlend({
          mode: "normal",
          in: prefix + "inner",
          in2: lastResult,
          result: prefix + "result",
        }),
      );

      lastResult = prefix + "result";
    });
  }

  const filterDef = filter(
    {
      id,
      ...filterBounds,
      filterUnits: "userSpaceOnUse",
      "color-interpolation-filters": "sRGB",
    },
    ...primitives,
  );

  return { id, def: filterDef };
}

/**
 * Get filter attribute from effects
 */
export function getFilterAttr(
  effects: readonly FigEffect[] | undefined,
  ctx: FigSvgRenderContext,
  bounds: { x: number; y: number; width: number; height: number },
): string | undefined {
  if (!effects || effects.length === 0) {
    return undefined;
  }

  // Use combined filter if multiple effect types
  const dropShadows = getDropShadows(effects);
  const innerShadows = getInnerShadows(effects);
  const layerBlur = getLayerBlur(effects);

  // Count how many effect types we have
  const effectTypes = [dropShadows.length > 0, innerShadows.length > 0, !!layerBlur].filter(Boolean).length;

  // If multiple effect types, use combined filter
  if (effectTypes > 1) {
    const result = createCombinedFilter(effects, ctx, bounds);
    if (!result) {
      return undefined;
    }
    ctx.defs.add(result.def);
    return "url(#" + result.id + ")";
  }

  // Single effect type - use specialized filters
  if (dropShadows.length > 0) {
    const result = createDropShadowFilter(dropShadows, ctx, bounds);
    if (!result) {
      return undefined;
    }
    ctx.defs.add(result.def);
    return "url(#" + result.id + ")";
  }

  if (innerShadows.length > 0) {
    const result = createInnerShadowFilter(innerShadows, ctx, bounds);
    if (!result) {
      return undefined;
    }
    ctx.defs.add(result.def);
    return "url(#" + result.id + ")";
  }

  if (layerBlur) {
    const result = createLayerBlurFilter(layerBlur, ctx, bounds);
    if (!result) {
      return undefined;
    }
    ctx.defs.add(result.def);
    return "url(#" + result.id + ")";
  }

  return undefined;
}
