/**
 * @file Text Effects module exports
 *
 * SVG filter components for DrawingML text effects.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Effects)
 */

export type {
  TextEffectsConfig,
  TextShadowConfig,
  TextGlowConfig,
  TextSoftEdgeConfig,
  TextReflectionConfig,
} from "./types";

export { createTextEffectsFilterDef } from "./TextEffectsFilter";
