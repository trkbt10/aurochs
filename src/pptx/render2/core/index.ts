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
  createRenderContext,
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
