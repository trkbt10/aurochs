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
export type { DefsCollector, SvgRenderContext, SvgRenderContextConfig } from "./context";
export {
  createDefsCollector,
  createSvgRenderContext,
  createEmptySvgRenderContext,
} from "./context";

// SVG fill rendering
export type { FillStyle, LineStyle } from "./fill";
export {
  renderFillToStyle,
  renderLineToStyle,
  renderLineToBorder,
  renderFillToSvgStyle,
  renderFillToSvgDef,
} from "./fill";

// Geometry rendering
export {
  renderGeometryPathData,
  renderGeometryPath,
  renderPresetGeometryData,
  renderCustomGeometryData,
  renderGeometryData,
  buildTransformAttr,
} from "./geometry";
