/**
 * @file SVG effects renderer
 *
 * Converts Effects domain objects to SVG filter definitions.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.49 (outerShdw)
 * @see ECMA-376 Part 1, Section 20.1.8.40 (innerShdw)
 * @see ECMA-376 Part 1, Section 20.1.8.32 (glow)
 * @see ECMA-376 Part 1, Section 20.1.8.50 (reflection)
 * @see ECMA-376 Part 1, Section 20.1.8.53 (softEdge)
 */

import type {
  Color,
  Effects,
  GlowEffect,
  ShadowEffect,
  SoftEdgeEffect,
} from "../../domain";
import type { HtmlString } from "../html/primitives";
import {
  filter,
  feGaussianBlur,
  feOffset,
  feColorMatrix,
  feMerge,
  feMergeNode,
} from "./primitives";
import { unsafeHtml } from "../html/primitives";
import { resolveColor } from "../../core/dml/render/color";
import type { ColorContext } from "../../domain/resolution";

// =============================================================================
// Effect ID Generation
// =============================================================================

/**
 * Generate unique filter ID for effects.
 */
export function generateEffectsFilterId(shapeId: string): string {
  return `effect-${shapeId}`;
}

// =============================================================================
// Shadow Effect Rendering
// =============================================================================

/**
 * Calculate shadow offset from distance and direction.
 *
 * Per ECMA-376 Part 1, Section 20.1.8.49:
 * - dir: Direction of shadow in 60000ths of a degree (clockwise from top)
 * - dist: Distance of shadow in EMU
 *
 * @see ECMA-376 Part 1, Section 20.1.8.49
 */
function calculateShadowOffset(
  distance: number,
  direction: number,
): { dx: number; dy: number } {
  // Direction is in degrees, 0 = right, 90 = down (clockwise from right)
  const radians = (direction * Math.PI) / 180;
  const dx = distance * Math.cos(radians);
  const dy = distance * Math.sin(radians);
  return { dx, dy };
}

/**
 * Parse hex color string to RGB components (0-1 range).
 */
function parseHexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  return {
    r: parseInt(normalized.slice(0, 2), 16) / 255,
    g: parseInt(normalized.slice(2, 4), 16) / 255,
    b: parseInt(normalized.slice(4, 6), 16) / 255,
  };
}

/**
 * Resolve Color to hex string, with fallback.
 */
function resolveEffectColor(color: Color, colorContext?: ColorContext): string {
  return resolveColor(color, colorContext) ?? "000000";
}

/**
 * Generate SVG filter primitives for outer shadow.
 *
 * Per ECMA-376 Part 1, Section 20.1.8.49 (outerShdw):
 * - blurRad: Blur radius in EMU
 * - dist: Distance from shape in EMU
 * - dir: Direction angle in 60000ths of degree
 *
 * SVG implementation:
 * 1. feGaussianBlur for blur effect
 * 2. feOffset for shadow position
 * 3. feColorMatrix for shadow color
 * 4. feMerge to combine shadow and source
 *
 * @see ECMA-376 Part 1, Section 20.1.8.49
 */
function generateOuterShadowFilter(
  shadow: ShadowEffect,
  filterId: string,
  colorContext?: ColorContext,
): HtmlString {
  const { dx, dy } = calculateShadowOffset(
    shadow.distance as number,
    shadow.direction as number,
  );

  // Convert blur radius to standard deviation (approximately blur/2)
  const stdDeviation = (shadow.blurRadius as number) / 2;

  // Resolve and parse color to RGB
  const hex = resolveEffectColor(shadow.color, colorContext);
  const { r, g, b } = parseHexToRgb(hex);

  // Color matrix to apply shadow color
  // This matrix sets output to the shadow color with alpha from input
  const colorMatrix = `0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  0 0 0 0.5 0`;

  const blur = feGaussianBlur({ in: "SourceAlpha", stdDeviation, result: "blur" });
  const offset = feOffset({ in: "blur", dx, dy, result: "offsetBlur" });
  const colorize = feColorMatrix({ in: "offsetBlur", type: "matrix", values: colorMatrix, result: "shadow" });
  const merge = feMerge(
    feMergeNode({ in: "shadow" }),
    feMergeNode({ in: "SourceGraphic" }),
  );

  return filter(
    { id: filterId, x: "-50%", y: "-50%", width: "200%", height: "200%" },
    blur,
    offset,
    colorize,
    merge,
  );
}

/**
 * Generate SVG filter primitives for inner shadow.
 *
 * Per ECMA-376 Part 1, Section 20.1.8.40 (innerShdw):
 * Similar to outer shadow but rendered inside the shape.
 *
 * SVG implementation uses composite operations to clip shadow to shape.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.40
 */
function generateInnerShadowFilter(
  shadow: ShadowEffect,
  filterId: string,
  colorContext?: ColorContext,
): HtmlString {
  const { dx, dy } = calculateShadowOffset(
    shadow.distance as number,
    shadow.direction as number,
  );

  const stdDeviation = (shadow.blurRadius as number) / 2;

  // Resolve and parse color to RGB
  const hex = resolveEffectColor(shadow.color, colorContext);
  const { r, g, b } = parseHexToRgb(hex);

  // Inner shadow is more complex - simplified implementation
  const colorMatrix = `0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  0 0 0 0.3 0`;

  const blur = feGaussianBlur({ in: "SourceAlpha", stdDeviation, result: "blur" });
  const offset = feOffset({ in: "blur", dx: -dx, dy: -dy, result: "offsetBlur" });
  const colorize = feColorMatrix({ in: "offsetBlur", type: "matrix", values: colorMatrix, result: "shadow" });

  // For inner shadow, we use feComposite to clip to source shape
  const composite = unsafeHtml(`<feComposite in="shadow" in2="SourceAlpha" operator="in" result="innerShadow"/>`);

  const merge = feMerge(
    feMergeNode({ in: "SourceGraphic" }),
    feMergeNode({ in: "innerShadow" }),
  );

  return filter(
    { id: filterId, x: "-50%", y: "-50%", width: "200%", height: "200%" },
    blur,
    offset,
    colorize,
    composite,
    merge,
  );
}

/**
 * Generate shadow filter based on shadow type.
 */
function generateShadowFilter(
  shadow: ShadowEffect,
  filterId: string,
  colorContext?: ColorContext,
): HtmlString {
  if (shadow.type === "inner") {
    return generateInnerShadowFilter(shadow, filterId, colorContext);
  }
  return generateOuterShadowFilter(shadow, filterId, colorContext);
}

// =============================================================================
// Glow Effect Rendering
// =============================================================================

/**
 * Generate SVG filter primitives for glow effect.
 *
 * Per ECMA-376 Part 1, Section 20.1.8.32 (glow):
 * - rad: Glow radius in EMU
 * - color: Glow color
 *
 * SVG implementation:
 * 1. feGaussianBlur for glow spread
 * 2. feColorMatrix for glow color
 * 3. feMerge to combine glow and source
 *
 * @see ECMA-376 Part 1, Section 20.1.8.32
 */
function generateGlowFilter(
  glow: GlowEffect,
  filterId: string,
  colorContext?: ColorContext,
): HtmlString {
  // Convert radius to standard deviation
  const stdDeviation = (glow.radius as number) / 2;

  // Resolve and parse color to RGB
  const hex = resolveEffectColor(glow.color, colorContext);
  const { r, g, b } = parseHexToRgb(hex);

  const colorMatrix = `0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  0 0 0 0.7 0`;

  const blur = feGaussianBlur({ in: "SourceAlpha", stdDeviation, result: "blur" });
  const colorize = feColorMatrix({ in: "blur", type: "matrix", values: colorMatrix, result: "glow" });
  const merge = feMerge(
    feMergeNode({ in: "glow" }),
    feMergeNode({ in: "SourceGraphic" }),
  );

  return filter(
    { id: filterId, x: "-50%", y: "-50%", width: "200%", height: "200%" },
    blur,
    colorize,
    merge,
  );
}

// =============================================================================
// Soft Edge Effect Rendering
// =============================================================================

/**
 * Generate SVG filter primitives for soft edge effect.
 *
 * Per ECMA-376 Part 1, Section 20.1.8.53 (softEdge):
 * - rad: Soft edge radius in EMU
 *
 * SVG implementation:
 * Uses feGaussianBlur on alpha channel to create fading edges.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.53
 */
function generateSoftEdgeFilter(
  softEdge: SoftEdgeEffect,
  filterId: string,
): HtmlString {
  const stdDeviation = (softEdge.radius as number) / 2;

  // Create blurred alpha mask
  const blur = feGaussianBlur({ in: "SourceAlpha", stdDeviation, result: "blur" });

  // Composite source with blurred alpha
  const composite = unsafeHtml(`<feComposite in="SourceGraphic" in2="blur" operator="in"/>`);

  return filter(
    { id: filterId, x: "-10%", y: "-10%", width: "120%", height: "120%" },
    blur,
    composite,
  );
}

// =============================================================================
// Combined Effects Rendering
// =============================================================================

/**
 * Effect filter result.
 */
export type EffectsFilterResult = {
  /** Filter ID for referencing */
  filterId: string;
  /** SVG filter definition element */
  filterDef: HtmlString;
};

/**
 * Generate SVG filter definition for effects.
 *
 * Priority order (when multiple effects present):
 * 1. Shadow (most common)
 * 2. Glow
 * 3. Soft edge
 *
 * Note: Complex effect combinations would require compositing multiple filters.
 * This simplified implementation handles single effects only.
 *
 * @param effects - Effects specification from domain
 * @param shapeId - Shape ID for unique filter naming
 * @param colorContext - Optional color context for resolving scheme colors
 * @returns Filter result with ID and SVG definition, or undefined if no effects
 */
export function generateEffectsFilter(
  effects: Effects | undefined,
  shapeId: string,
  colorContext?: ColorContext,
): EffectsFilterResult | undefined {
  if (!effects) {
    return undefined;
  }

  const filterId = generateEffectsFilterId(shapeId);

  // Priority: shadow > glow > softEdge
  if (effects.shadow) {
    const filterDef = generateShadowFilter(effects.shadow, filterId, colorContext);
    return { filterId, filterDef };
  }

  if (effects.glow) {
    return {
      filterId,
      filterDef: generateGlowFilter(effects.glow, filterId, colorContext),
    };
  }

  if (effects.softEdge) {
    return {
      filterId,
      filterDef: generateSoftEdgeFilter(effects.softEdge, filterId),
    };
  }

  // Reflection is not implemented as SVG filter (requires complex transforms)
  return undefined;
}

/**
 * Check if effects object has any renderable effect.
 */
function hasRenderableEffect(effects: Effects): boolean {
  if (effects.shadow) {
    return true;
  }
  if (effects.glow) {
    return true;
  }
  if (effects.softEdge) {
    return true;
  }
  return false;
}

/**
 * Get filter attribute for shape element.
 *
 * @param effects - Effects specification
 * @param shapeId - Shape ID
 * @returns CSS filter reference string or undefined
 */
export function getFilterAttribute(
  effects: Effects | undefined,
  shapeId: string,
): string | undefined {
  if (!effects) {
    return undefined;
  }

  if (hasRenderableEffect(effects)) {
    return `url(#${generateEffectsFilterId(shapeId)})`;
  }

  return undefined;
}
