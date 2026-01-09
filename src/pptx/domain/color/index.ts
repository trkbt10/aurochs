/**
 * @file Color and fill domain types and resolution utilities
 *
 * Consolidated module for color-related types and operations.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.3 - Color Types
 * @see ECMA-376 Part 1, Section 20.1.8 - Fill Properties
 */

// Re-export all types from types.ts
export * from "./types";

// Re-export color context types
export type {
  ColorScheme,
  ColorMap,
  ColorContext,
  ColorResolveContext,
} from "./context";

// Re-export color resolution functions
export { resolveColor } from "./resolution";

// Re-export fill resolution types and functions
export type {
  ResolvedColor,
  ResolvedSolidFill,
  ResolvedGradientStop,
  ResolvedGradientFill,
  ResolvedImageFill,
  ResolvedPatternFill,
  ResolvedFill,
  PresetDashStyle,
  DashStyle,
  ResolvedLine,
} from "./fill";

export {
  resolveColorWithAlpha,
  hexToRgb,
  formatRgba,
  resolveFill,
  resolveBlipFill,
  resolveLine,
  getDashArrayPattern,
} from "./fill";
