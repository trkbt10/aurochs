/**
 * @file Render module for PPTX processing
 *
 * Provides renderers that transform Domain Objects to HTML/SVG output.
 *
 * ## Directory Structure
 *
 * ```
 * render/
 * ├── html/           # HTML slide rendering (browser display with CSS layout)
 * │   ├── slide.ts    # Main HTML slide renderer
 * │   ├── shape.ts    # Shape → HTML div/SVG
 * │   ├── text.ts     # Text → HTML span
 * │   └── media.ts    # Audio/video elements
 * ├── svg/            # SVG slide rendering (image generation with resvg)
 * │   ├── renderer.ts # Main SVG slide renderer
 * │   ├── slide-*.ts  # SVG slide components
 * │   ├── geometry.ts # Shape geometry → SVG path
 * │   └── effects*.ts # SVG filters and 3D effects
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

export type { RenderDialect, LineSpacingMode, BaselineMode, RenderOptions } from "./render-options";

export { DEFAULT_RENDER_OPTIONS } from "./render-options";

// =============================================================================
// Types from warnings
// =============================================================================

export type { RenderWarning, WarningCollector } from "./warnings";

export { createWarningCollector } from "./warnings";

// =============================================================================
// Types from background-fill
// =============================================================================

export type { ResolvedBackgroundFill } from "./background-fill";

export { toResolvedBackgroundFill } from "./background-fill";

// =============================================================================
// Types from transform
// =============================================================================

export type { TransformData } from "./transform";

export { extractTransformData, buildCssTransform, buildCssPositionStyles, buildSvgTransform, buildSvgTransformAttr } from "./transform";

// =============================================================================
// Types from domain (fill resolution)
// =============================================================================

export type {
  ResolvedColor,
  ResolvedFill,
  ResolvedLine,
  DashStyle,
} from "../domain/color/fill";

export { resolveFill, resolveLine, resolveColorWithAlpha, formatRgba, getDashArrayPattern } from "../domain/color/fill";

// =============================================================================
// Types from domain (resource resolver)
// =============================================================================

export type { ResourceResolver } from "../domain/resource-resolver";

export { createEmptyResourceResolver } from "../domain/resource-resolver";


// =============================================================================
// HTML Utilities (backward compatibility)
// =============================================================================

export type { HtmlString } from "./html/index";

/** @deprecated Use RenderContext */
export type { HtmlRenderContext } from "./html/index";

/** @deprecated Use createRenderContext */
export { createHtmlRenderContext, createEmptyHtmlRenderContext, fillToBackground, lineToBorder } from "./html/index";

export {
  a,
  buildAttrs,
  buildClass,
  buildStyle,
  createElement,
  div,
  EMPTY_HTML,
  escapeHtml,
  img,
  joinHtml,
  p,
  span,
  unsafeHtml,
} from "./html/index";

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
// Text Rendering
// =============================================================================

export { renderParagraph, renderTextBody, renderTextRun } from "./html/text";

// =============================================================================
// Shape Rendering
// =============================================================================

export {
  renderCxnShape,
  renderGraphicFrame,
  renderGrpShape,
  renderPicShape,
  renderShape,
  renderShapes,
  renderSpShape,
} from "./html/shape";

// =============================================================================
// Media Rendering
// =============================================================================

export type { MediaRenderResult } from "./html/media";

export { hasMedia, renderAudio, renderMedia, renderVideo } from "./html/media";

// =============================================================================
// Diagram Rendering
// =============================================================================

export { renderDiagram, renderDiagramPlaceholder } from "./html/diagram";

// =============================================================================
// Table Rendering
// =============================================================================

export { renderTable } from "./html/table";
export { renderTableSvg } from "./svg/table";

// =============================================================================
// Slide Rendering
// =============================================================================

export type { SlideRenderResult } from "./html/slide";

export { renderSlide, renderSlides, renderSlideStandalone } from "./html/slide";
