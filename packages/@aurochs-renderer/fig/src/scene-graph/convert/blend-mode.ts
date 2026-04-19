/**
 * @file Figma blend mode → CSS mix-blend-mode conversion
 *
 * SoT for blend mode mapping. Used by:
 * - scene-graph builder (node-level blendMode)
 * - convert/fill.ts (paint-level blendMode)
 * - convert/effects.ts (effect-level blendMode)
 */

import type { BlendMode as FigBlendMode } from "@aurochs/fig/types";
import type { BlendMode } from "../types";

/**
 * Maps Figma blend mode names (SSoT domain type) to CSS mix-blend-mode
 * values. PASS_THROUGH, NORMAL, HUE, SATURATION, COLOR, LUMINOSITY fall
 * through to undefined when a CSS equivalent is not defined here; the
 * Partial record keeps the exhaustive source the domain type.
 */
const FIGMA_BLEND_MODE_TO_CSS: Partial<Record<FigBlendMode, BlendMode>> = {
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
 * Convert a Figma blend mode (SSoT domain string) to CSS BlendMode.
 * Returns undefined for NORMAL / PASS_THROUGH / unmapped names.
 */
export function convertFigmaBlendMode(
  blendMode: FigBlendMode | undefined,
): BlendMode | undefined {
  if (!blendMode) { return undefined; }
  return FIGMA_BLEND_MODE_TO_CSS[blendMode];
}
