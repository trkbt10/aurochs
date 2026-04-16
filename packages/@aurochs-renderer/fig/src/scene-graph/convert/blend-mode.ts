/**
 * @file Figma blend mode → CSS mix-blend-mode conversion
 *
 * SoT for blend mode mapping. Used by:
 * - scene-graph builder (node-level blendMode)
 * - convert/fill.ts (paint-level blendMode)
 * - convert/effects.ts (effect-level blendMode)
 */

import type { BlendMode } from "../types";

/**
 * Maps Figma blend mode names to CSS mix-blend-mode values.
 * PASS_THROUGH and NORMAL produce undefined (no explicit CSS needed).
 */
const FIGMA_BLEND_MODE_TO_CSS: Record<string, BlendMode> = {
  DARKEN: "darken",
  MULTIPLY: "multiply",
  LINEAR_BURN: "plus-darker",
  COLOR_BURN: "color-burn",
  LIGHTEN: "lighten",
  SCREEN: "screen",
  LINEAR_DODGE: "plus-lighter",
  COLOR_DODGE: "color-dodge",
  OVERLAY: "overlay",
  SOFT_LIGHT: "soft-light",
  HARD_LIGHT: "hard-light",
  DIFFERENCE: "difference",
  EXCLUSION: "exclusion",
  HUE: "hue",
  SATURATION: "saturation",
  COLOR: "color",
  LUMINOSITY: "luminosity",
};

/**
 * Convert a Figma blend mode value (string or KiwiEnumValue) to CSS BlendMode.
 * Returns undefined for NORMAL / PASS_THROUGH / unknown.
 */
/**
 * Convert a Figma blend mode value (string or KiwiEnumValue) to CSS BlendMode.
 * Returns undefined for NORMAL / PASS_THROUGH / unknown.
 *
 * Input is always a Figma-level name (MULTIPLY, DARKEN, etc.) or a
 * KiwiEnumValue with a .name field. This function is the single boundary
 * where Figma vocabulary is translated to CSS vocabulary.
 */
export function convertFigmaBlendMode(
  blendMode: string | { name: string } | undefined,
): BlendMode | undefined {
  if (!blendMode) { return undefined; }
  const name = typeof blendMode === "string" ? blendMode : blendMode.name;
  return FIGMA_BLEND_MODE_TO_CSS[name];
}
