/**
 * @file Text layout module (format-agnostic)
 *
 * Provides text property extraction, alignment, and fill handling
 * shared between SVG and WebGL renderers.
 */

// Types
export type {
  ExtractedTextProps,
  FillColorResult,
  TextAlignHorizontal,
  TextAlignVertical,
  TextAutoResize,
  TextDecoration,
  TextBoxSize,
  FigFontName,
  FigValueWithUnits,
  FigTextData,
} from "./types";

// Property extraction
export { extractTextProps, getValueWithUnits } from "./extract-props";

// Alignment
export {
  getAlignedX,
  getAlignedY,
  getAlignedYWithMetrics,
  type AlignYOptions,
} from "./alignment";

// Fill handling
export { getFillColorAndOpacity } from "./fill";

// Layout computation
export {
  computeTextLayout,
  type TextLayout,
  type LayoutLine,
  type ComputeLayoutOptions,
} from "./compute-layout";
