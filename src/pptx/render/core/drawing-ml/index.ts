/**
 * @file DrawingML render functions
 *
 * Domain object to output conversion for DrawingML color and background processing.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.3 (Color Types)
 */

// Types from domain
export type {
  BackgroundFill,
  GradientData,
  GradientStop,
  ImageFillMode,
} from "../../../domain/drawing-ml";

// Color resolution
export { resolveColor } from "./color";

// Background rendering
export { getSlideBackgroundFill, getBackgroundFillData } from "./background";

// Text fill types and resolution
export type {
  TextGradientStop,
  TextGradientFillConfig,
  TextSolidFillConfig,
  TextNoFillConfig,
  TextPatternFillConfig,
  TextImageFillConfig,
  TextFillConfig,
  ResourceResolver,
} from "./text-fill";
export { resolveTextFill } from "./text-fill";

// Text effects types and resolution
export type {
  TextShadowConfig,
  TextGlowConfig,
  TextSoftEdgeConfig,
  TextReflectionConfig,
  TextEffectsConfig,
} from "./text-effects";
export { resolveTextEffects } from "./text-effects";
