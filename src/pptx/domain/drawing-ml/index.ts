/**
 * @file DrawingML domain types and utilities
 *
 * Type definitions and pure functions for DrawingML parsing and rendering.
 *
 * @see ECMA-376 Part 1, Chapter 20 (DrawingML)
 */

// Color resolution (pure domain transformation)
export { resolveColor } from "../color/resolution";

// Background types
export type {
  BackgroundElement,
  BackgroundParseResult,
  ImageFillMode,
  GradientStop,
  GradientData,
  BackgroundFill,
} from "./background";

// Text fill types
export type {
  TextGradientStop,
  TextGradientFillConfig,
  TextSolidFillConfig,
  TextNoFillConfig,
  TextPatternFillConfig,
  TextImageFillConfig,
  TextFillConfig,
} from "./text-fill";

// Text effects types
export type {
  TextShadowConfig,
  TextGlowConfig,
  TextSoftEdgeConfig,
  TextReflectionConfig,
  TextEffectsConfig,
} from "./text-effects";

// Fill resolution (domain Fill → ResolvedFill transformation)
export type {
  ResolvedColor,
  ResolvedSolidFill,
  ResolvedGradientStop,
  ResolvedGradientFill,
  ResolvedFill,
  PresetDashStyle,
  DashStyle,
  ResolvedLine,
} from "../color/fill";

export {
  resolveColorWithAlpha,
  hexToRgb,
  formatRgba,
  resolveFill,
  resolveLine,
  getDashArrayPattern,
} from "../color/fill";
