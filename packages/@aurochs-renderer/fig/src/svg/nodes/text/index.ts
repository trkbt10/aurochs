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

// Unified text-rendering entry point (SoT formatter).
// Consumers should prefer `formatTextRenderingToSvg(resolveTextRendering(node, ctx))`
// over the legacy renderX() entry points below.
export { formatTextRenderingToSvg } from "./format-rendering";

// SVG-specific alignment
export { getTextAnchor, type SvgTextAnchor } from "./alignment";

// Attribute building
export { buildTextAttrs } from "./attrs";

// Path-based text rendering using opentype.js (font-driver fallback).
// Still needed for the lines-mode branch where no derived glyphs exist.
export {
  renderTextNodeAsPath,
  batchRenderTextNodesAsPaths,
  getFontMetricsFromFont,
  calculateBaselineOffset,
  type PathRenderContext,
} from "./path-render";

// Derived path rendering — legacy wrappers. New code should use the SoT:
// `resolveTextRendering(node, { blobs })` + `formatTextRenderingToSvg(rendering)`.
export {
  renderTextNodeFromDerivedData,
  renderTextNodeWithDerivedFallback,
  hasDerivedPathData,
  type DerivedPathRenderContext,
} from "./derived-path-render";
