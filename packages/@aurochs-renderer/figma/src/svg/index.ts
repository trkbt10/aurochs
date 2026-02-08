/**
 * @file SVG renderer barrel export
 */

export {
  createDefsCollector,
  createFigSvgRenderContext,
  createEmptyFigSvgRenderContext,
} from "./context";

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
  IDENTITY_MATRIX,
  isIdentityMatrix,
  createTranslationMatrix,
  createScaleMatrix,
  createRotationMatrix,
  multiplyMatrices,
  extractTranslation,
  extractScale,
  extractRotation,
} from "../core/transform";

export {
  figColorToHex,
  figColorToRgba,
} from "../core/color";

export {
  type FillAttrs,
  getFillAttrs,
  hasVisibleFill,
} from "./fill";

export {
  type StrokeAttrs,
  type StrokeOptions,
  type GetStrokeAttrsParams,
  getStrokeAttrs,
  hasVisibleStroke,
} from "./stroke";

export {
  type FigSvgRenderOptions,
  renderFigToSvg,
  renderCanvas,
} from "./renderer";

export {
  renderFrameNode,
  renderGroupNode,
  renderRectangleNode,
  renderEllipseNode,
  renderVectorNode,
  renderTextNode,
} from "./nodes";

export {
  renderSceneGraphToSvg,
} from "./scene-renderer";
