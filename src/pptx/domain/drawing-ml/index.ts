/**
 * @file DrawingML domain types
 *
 * Type definitions for DrawingML parsing and rendering.
 * This module contains only types - no runtime code.
 *
 * @see ECMA-376 Part 1, Chapter 20 (DrawingML)
 */

// Fill types
export type {
  FillType,
  FillResult,
  GradientFill,
} from "./fill";

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
