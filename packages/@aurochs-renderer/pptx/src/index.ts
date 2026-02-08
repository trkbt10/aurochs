/**
 * @file Render module for PPTX processing
 *
 * Provides renderers that transform Domain Objects to SVG output.
 *
 * ## Directory Structure
 *
 * ```
 * render/
 * ├── svg/            # SVG slide rendering (image generation with resvg)
 * │   ├── renderer.ts # Main SVG slide renderer
 * │   ├── slide-*.ts  # SVG slide components
 * │   ├── geometry.ts # Shape geometry → SVG path
 * │   └── effects*.ts # SVG filters and 3D effects
 * ├── react/          # React components for interactive rendering
 * │   ├── index.ts    # React slide renderer
 * │   └── shapes/     # Shape components
 * └── text-layout/    # Text layout engine (for SVG absolute positioning)
 * ```
 */

// =============================================================================
// Types from render-context
// =============================================================================

export type { CoreRenderContext, CoreRenderContextConfig } from "./render-context";

export { createCoreRenderContext, createEmptyCoreRenderContext } from "./render-context";

// =============================================================================
// Types from render-options
// =============================================================================

export type { RenderDialect, LineSpacingMode, BaselineMode, TableScalingMode, RenderOptions } from "./render-options";

export {
  DEFAULT_RENDER_OPTIONS,
  LIBREOFFICE_RENDER_OPTIONS,
  POWERPOINT_RENDER_OPTIONS,
  createRenderOptions,
  getEffectiveLineSpacing,
} from "./render-options";

// =============================================================================
// Types from warnings
// NOTE: For RenderWarning, WarningCollector, createWarningCollector,
// import directly from @aurochs-office/ooxml
// =============================================================================

// =============================================================================
// Types from background-fill
// =============================================================================

export type { ResolvedBackgroundFill } from "./background-fill";

export { toResolvedBackgroundFill } from "./background-fill";

// =============================================================================
// Types from transform
// =============================================================================

export type { TransformData } from "./transform";

export {
  extractTransformData,
  buildCssTransform,
  buildCssPositionStyles,
  buildSvgTransform,
  buildSvgTransformAttr,
} from "./transform";

// =============================================================================
// Types from domain (fill resolution)
// =============================================================================

// =============================================================================
// SVG Utilities
// =============================================================================

export type { SvgRenderContext, DefsCollector } from "./svg/index";

export { createSvgRenderContext, createEmptySvgRenderContext, createDefsCollector } from "./svg/index";

export {
  circle,
  clipPath,
  defs,
  ellipse,
  feColorMatrix,
  feGaussianBlur,
  feMerge,
  feMergeNode,
  feOffset,
  filter,
  g,
  image,
  line,
  linearGradient,
  mask,
  path,
  polygon,
  polyline,
  radialGradient,
  rect,
  stop,
  svg,
  text,
  tspan,
  use,
} from "./svg/primitives";

// =============================================================================
// Fill/Line Rendering
// =============================================================================

export type { FillStyle, LineStyle } from "./svg/fill";

export { renderFillToStyle, renderLineToStyle } from "./svg/fill";

// =============================================================================
// Geometry Rendering
// =============================================================================

export {
  buildTransformAttr,
  renderCustomGeometryData,
  renderGeometryData,
  renderGeometryPath,
  renderGeometryPathData,
  renderPresetGeometryData,
} from "./svg/geometry";

// =============================================================================
// Table Rendering (SVG)
// =============================================================================

export { renderTableSvg } from "./svg/table";

// =============================================================================
// Slide Rendering (SVG)
// =============================================================================

export type { SvgSlideRenderResult } from "./svg/renderer";

export { renderSlideSvg, createEmptySlideSvg } from "./svg/renderer";

// =============================================================================
// Context Adapters
// =============================================================================

export type { RenderContextFromSlideOptions } from "./context/slide-context-adapter";

export { createRenderContextFromSlideContext } from "./context/slide-context-adapter";

export type { RenderContext, CreateRenderContextOptions } from "./context/api-render-context";

export { createRenderContext, getLayoutNonPlaceholderShapes } from "./context/api-render-context";
