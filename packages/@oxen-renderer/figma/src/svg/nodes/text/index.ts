/**
 * @file Text node renderer module
 *
 * Provides SVG rendering for Figma TEXT nodes with support for:
 * - Font resolution and fallbacks
 * - Font styling (family, weight, style)
 * - Text alignment (horizontal and vertical)
 * - Line height and letter spacing
 * - Multi-line text
 * - Fill colors
 */

// Main render function
export { renderTextNode } from "./render";

// Types
export type {
  ExtractedTextProps,
  FillColorResult,
  TextAlignHorizontal,
  TextAlignVertical,
  TextBoxSize,
  FigFontName,
  FigValueWithUnits,
  FigTextData,
} from "./types";

// Legacy exports (deprecated - use font module directly)
export { getFontWeightFromStyle, isItalicStyle } from "./font";

// Alignment
export {
  getTextAnchor,
  getAlignedX,
  getAlignedY,
  getAlignedYWithMetrics,
  type AlignYOptions,
} from "./alignment";

// Property extraction
export { extractTextProps, getValueWithUnits } from "./props";

// Fill handling
export { getFillColorAndOpacity } from "./fill";

// Attribute building
export { buildTextAttrs } from "./attrs";

// Font resolution module
export * as font from "./font/index";

// Text measurement module
export * as measure from "./measure/index";

// Path-based text rendering
export {
  renderTextNodeAsPath,
  batchRenderTextNodesAsPaths,
  getFontMetricsFromFont,
  calculateBaselineOffset,
  type PathRenderContext,
} from "./path-render";

// Derived path rendering (uses pre-computed paths from .fig files)
export {
  renderTextNodeFromDerivedData,
  renderTextNodeWithDerivedFallback,
  hasDerivedPathData,
  type DerivedPathRenderContext,
} from "./derived-path-render";
