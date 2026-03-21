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

// SVG-specific alignment
export { getTextAnchor, type SvgTextAnchor } from "./alignment";

// Attribute building
export { buildTextAttrs } from "./attrs";

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
