/**
 * @file Core render module
 *
 * Shared types and utilities for both HTML and SVG renderers.
 */

// Types
export type {
  RenderDialect,
  LineSpacingMode,
  BaselineMode,
  RenderOptions,
  ResourceResolver,
  RenderWarning,
  WarningCollector,
  CoreRenderContext,
  ResolvedBackgroundFill,
} from "./types";

export { DEFAULT_RENDER_OPTIONS } from "./types";

// Context creation
export {
  createEmptyResourceResolver,
  createWarningCollector,
  createCoreRenderContext,
  createEmptyCoreRenderContext,
  createRenderContextFromSlideContext,
} from "./context";

export type { CoreRenderContextConfig, RenderContextFromSlideOptions } from "./context";

// Transform utilities
export type { TransformData } from "./transform";

export {
  extractTransformData,
  getRotationCenter,
  hasTransformations,
  buildCssTransform,
  buildCssPositionStyles,
  buildSvgTransform,
  buildSvgTransformAttr,
} from "./transform";

// Fill utilities
export type {
  ResolvedColor,
  ResolvedSolidFill,
  ResolvedGradientStop,
  ResolvedGradientFill,
  ResolvedFill,
  PresetDashStyle,
  DashStyle,
  ResolvedLine,
} from "./fill";

export { resolveColorWithAlpha, hexToRgb, formatRgba, resolveFill, resolveLine, getDashArrayPattern } from "./fill";

// Background fill conversion
export { toResolvedBackgroundFill } from "./background-fill";

// Gradient utilities
export type { LinearGradientCoords, RadialGradientCoords } from "./gradient";

export {
  ooxmlAngleToSvgLinearGradient,
  fillToRectToRadialCenter,
  getRadialGradientCoords,
} from "./gradient";

// Animation utilities
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
  AnimationController,
  AnimationOptions,
  EasingFn,
  EasingName,
  TimeProvider,
  AnimatableCSSProperty,
  AnimationPlayerInstance,
  BrowserEffectType,
  BrowserEffectDirection,
  ParsedFilter,
} from "./animation";

export {
  // Player
  createPlayer,
  extractShapeIds,
  // Effects (MS-OE376 Part 4 Section 4.6.3)
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
  // Element utilities
  hideElement,
  showElement,
  prepareForAnimation,
  resetElementStyles,
  // Filter parsing
  parseFilterToEffectType,
  parseFilterDirection,
  // Engine
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
  // Browser effects
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
} from "./animation";
