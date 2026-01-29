/**
 * @file Effects module exports
 *
 * SVG filter components and hooks for DrawingML effects.
 *
 * Note: This module provides PPTX-specific hooks that use PPTX's RenderContext
 * and PPTX's Effects type (which extends the shared OOXML Effects type).
 * For format-agnostic effect utilities, use @oxen-renderer/drawing-ml/effects directly.
 */

// PPTX-specific exports (use PPTX RenderContext and PPTX Effects type)
export {
  useEffects,
  resolveEffectsForReact,
  type EffectsResult,
} from "./useEffects";

export {
  ShadowFilterDef,
  directionToOffset,
  resolveShadowProps,
  type ShadowFilterDefProps,
  type ResolvedShadowProps,
} from "./ShadowFilter";

export {
  GlowFilterDef,
  resolveGlowProps,
  type GlowFilterDefProps,
  type ResolvedGlowProps,
} from "./GlowFilter";

export {
  SoftEdgeFilterDef,
  type SoftEdgeFilterDefProps,
} from "./SoftEdgeFilter";

export {
  EffectsFilter,
  EffectsWrapper,
  EffectsFilterDef,
} from "./EffectsFilter";
