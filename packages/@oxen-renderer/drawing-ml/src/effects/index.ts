/**
 * @file Effects module exports
 *
 * SVG filter components for DrawingML effects rendering.
 */

// Re-export effect types from ooxml
export type {
  Effects,
  ShadowEffect,
  GlowEffect,
  SoftEdgeEffect,
  ReflectionEffect,
} from "@oxen-office/ooxml/domain/effects";

export {
  ShadowFilterDef,
  resolveShadowProps,
  directionToOffset,
  type ShadowFilterDefProps,
  type ShadowAlignment,
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
  useEffects,
  resolveEffectsForReact,
  type EffectsResult,
} from "./useEffects";

export {
  EffectsFilter,
  EffectsWrapper,
  EffectsFilterDef,
} from "./EffectsFilter";
