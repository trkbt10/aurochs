/**
 * @file Animation core module
 *
 * Framework-agnostic animation engine and effects.
 */

// Types - Runtime types for animation playback
export type {
  RuntimeAnimationTarget,
  EffectConfig,
  EffectDirection,
  EffectType,
  ElementFinder,
  RuntimeKeyframe,
  PlayerOptions,
  PlayerState,
  PropertyAnimation,
} from "./types";

// Engine - RAF-based animation primitives
export type {
  AnimationController,
  AnimationOptions,
  EasingFn,
  EasingName,
  TimeProvider,
  AnimatableCSSProperty,
} from "./engine";
export {
  animate,
  lerp,
  easings,
  getEasing,
  animateStyle,
  animateOpacity,
  animateTranslate,
  animateClipInset,
  animateParallel,
  delay,
  defaultTimeProvider,
  createMockTimeProvider,
  setTimeProvider,
  resetTimeProvider,
} from "./engine";

// Effects - CSS-transition based effects (MS-OE376 Part 4 Section 4.6.3)
export {
  applyEffect,
  applyFade,
  applySlide,
  applyWipe,
  applyBlinds,
  applyBox,
  applyCheckerboard,
  applyCircle,
  applyDiamond,
  applyDissolve,
  applyStrips,
  applyWheel,
  applyPlus,
  applyBarn,
  applyRandombar,
  applyWedge,
  hideElement,
  showElement,
  prepareForAnimation,
  resetElementStyles,
  parseFilterToEffectType,
  parseFilterDirection,
} from "./effects";

// Browser Effects - RAF-based effects (alternative implementation)
export type {
  BrowserEffectType,
  BrowserEffectDirection,
  ParsedFilter,
} from "./browser-effects";
export {
  parseFilter,
  applyBrowserEffect,
  animateFade,
  animateSlide,
  animateWipe,
  animateBlinds,
  animateBox,
  animateCircle,
  animateDiamond,
  animateDissolve,
  animateStrips,
  animateWheel,
  animatePlus,
  animateBarn,
  animateRandombar,
  animateWedge,
  animateCheckerboard,
} from "./browser-effects";

// Player - Timing tree processor
export type { AnimationPlayerInstance } from "./player";
export { createPlayer, extractShapeIds } from "./player";
