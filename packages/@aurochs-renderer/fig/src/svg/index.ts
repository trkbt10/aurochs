/**
 * @file SVG renderer barrel export
 */

export {
  type SvgString,
  unsafeSvg,
  EMPTY_SVG,
  buildAttrs,
  svg,
  g,
  defs,
  path,
  rect,
  circle,
  ellipse,
  line,
  text,
  tspan,
  image,
  linearGradient,
  radialGradient,
  stop,
  clipPath,
  mask,
} from "./primitives";

export {
  buildTransformAttr,
} from "./transform";

export {
  type FigSvgRenderOptions,
  renderFigToSvg,
  renderCanvas,
} from "./renderer";

export {
  renderSceneGraphToSvg,
  formatRenderTreeToSvg,
} from "./scene-renderer";
