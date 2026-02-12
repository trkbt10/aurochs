/**
 * @file Animation core module
 *
 * Framework-agnostic animation engine and effects.
 */

// Types - Runtime types for animation playback
export type {
  RuntimeAnimationTarget,
  EffectConfig,
  ElementFinder,
  RuntimeKeyframe,
  PlayerOptions,
  PlayerState,
  PropertyAnimation,
} from "./types";

// Click groups - Step-by-step playback extraction
export type { ClickGroup, TimingLike } from "./click-groups";
export { extractClickGroups } from "./click-groups";

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

// Interpolation utilities - Keyframe and value interpolation
export type { ParsedValue, InterpolatedValue } from "./interpolate";
export {
  parseAnimateValue,
  parseCoordinateValue,
  interpolateKeyframes,
  interpolateValues,
  mapAttributeToCSS,
  applyAnimatedValue,
  createAnimateFunction,
} from "./interpolate";

// Motion path - SVG path parsing and interpolation
export type {
  PathCommandType,
  PathCommand,
  MotionPath,
  PathSegment,
} from "./motion-path";
export {
  parsePathCommands,
  parseMotionPath,
  getPointAtProgress,
  createMotionPathFunction,
  toSVGPathString,
} from "./motion-path";

// Color interpolation - RGB/HSL color animation
// Note: Uses src/color for base conversion utilities (no duplication)
export type { ParsedColor } from "./color-interpolate";
export {
  parseColor,
  lerpRGB,
  lerpHSL,
  interpolateColor,
  rgbToHexString,
  createColorAnimationFunction,
} from "./color-interpolate";
