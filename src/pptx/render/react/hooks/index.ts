/**
 * @file React Hooks
 *
 * Reusable hooks for PPTX rendering.
 */

// SVG Defs
export {
  SvgDefsProvider,
  SvgDefsCollector,
  useSvgDefs,
  LinearGradientDef,
  RadialGradientDef,
  PatternDef,
  ClipPathDef,
} from "./useSvgDefs";

// Animation
export type {
  UseAnimationPlayerOptions,
  UseAnimationPlayerResult,
} from "./useAnimationPlayer";
export { useAnimationPlayer } from "./useAnimationPlayer";

export type {
  UseSlideAnimationOptions,
  UseSlideAnimationResult,
} from "./useSlideAnimation";
export { useSlideAnimation } from "./useSlideAnimation";
