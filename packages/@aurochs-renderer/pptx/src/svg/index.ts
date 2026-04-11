/**
 * @file SVG renderer module
 *
 * SVG-specific rendering utilities.
 */

// SVG primitives
export {
  svg,
  g,
  path,
  rect,
  circle,
  ellipse,
  line,
  polyline,
  polygon,
  text,
  tspan,
  image,
  use,
  defs,
  clipPath,
  mask,
  linearGradient,
  radialGradient,
  stop,
  filter,
  feGaussianBlur,
  feOffset,
  feColorMatrix,
  feMerge,
  feMergeNode,
} from "./primitives";

// SVG context
export type { DefsCollector, SvgRenderContext } from "./context";
export { createDefsCollector, createSvgRenderContext, createEmptySvgRenderContext } from "./context";

// SVG fill rendering
export type { FillStyle, LineStyle } from "./fill";
export { renderFillToStyle, renderLineToStyle, renderFillToSvgStyle, renderFillToSvgDef } from "./fill";

// Geometry rendering (PPTX-specific with Fill/Line support)
export type { GeometryPathWithMarkersResult } from "./geometry";
export { renderGeometryPath, renderGeometryPathWithMarkers } from "./geometry";

// SVG utilities
export { extractSvgContent } from "./svg-utils";

// SVG parsing (string → structured tree)
export { parseSvgString, parseSvgInnerContent, parseSvgFragment, normalizeSvgForScaling } from "./svg-parse";

// Slide rendering
export type { SvgRenderResult } from "./slide-render";
export { renderSlideToSvg } from "./slide-render";

// Low-level (domain-based) slide renderer and helpers used by editor
export type { SvgSlideRenderResult, SvgSlideNodeRenderResult, SvgSlideContentRenderResult } from "./renderer";
export { renderSlideSvg, renderSlideSvgNode, createEmptySlideSvg } from "./renderer";

// SVG → React element conversion
export { svgElementToJsx, svgChildrenToJsx } from "./svg-to-jsx";

export { getShapeTransform, isShapeHidden } from "./slide-utils";
