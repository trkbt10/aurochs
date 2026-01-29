/**
 * @file Effects module exports
 *
 * SVG filter components and hooks for DrawingML effects.
 */

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
