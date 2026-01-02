/**
 * @file Render module for PPTX processing
 *
 * Provides renderers that transform Domain Objects to HTML/SVG output.
 *
 * ## Directory Structure
 *
 * ```
 * render/
 * ├── core/           # Format-agnostic utilities (transform, fill resolution)
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
 * ├── components/     # SVG-only component renderers
 * │   ├── chart/      # Chart rendering
 * │   ├── table.ts    # Table rendering
 * │   └── diagram.ts  # SmartArt diagram rendering
 * └── text-layout/    # Text layout engine (for SVG absolute positioning)
 * ```
 *
 * ## Usage
 *
 * ### HTML Rendering (for browser display)
 * ```typescript
 * import { renderSlide, createRenderContext } from "./render";
 * const result = renderSlide(slide, ctx);
 * // result.html: HtmlString
 * ```
 *
 * ### SVG Rendering (for image generation)
 * ```typescript
 * import { renderSlideSvg } from "./render/svg/renderer";
 * const result = renderSlideSvg(slide, ctx);
 * // result.svg: string (SVG document)
 * ```
 */

// =============================================================================
// Core (shared utilities)
// =============================================================================

export type {
  CoreRenderContext,
  RenderDialect,
  LineSpacingMode,
  BaselineMode,
  RenderOptions,
  RenderWarning,
  ResourceResolver,
  WarningCollector,
  TransformData,
  ResolvedColor,
  ResolvedFill,
  ResolvedLine,
  DashStyle,
} from "./core";

export {
  DEFAULT_RENDER_OPTIONS,
  createEmptyResourceResolver,
  createWarningCollector,
  createCoreRenderContext,
  createEmptyCoreRenderContext,
  extractTransformData,
  buildCssTransform,
  buildCssPositionStyles,
  buildSvgTransform,
  buildSvgTransformAttr,
  resolveFill,
  resolveLine,
  resolveColorWithAlpha,
  formatRgba,
  getDashArrayPattern,
} from "./core";

// =============================================================================
// Context
// =============================================================================

export type { RenderContext, StyleCollector } from "./context";

export { createEmptyRenderContext, createRenderContext, createStyleCollector } from "./context";

// =============================================================================
// HTML Utilities
// =============================================================================

export type { HtmlString, HtmlRenderContext } from "./html/index";

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

export { renderFillToStyle, renderLineToBorder, renderLineToStyle } from "./svg/fill";

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

export { renderDiagram, renderDiagramPlaceholder } from "./components/diagram";

// =============================================================================
// Table Rendering
// =============================================================================

export { renderTable, renderTableSvg } from "./components/table";

// =============================================================================
// Slide Rendering
// =============================================================================

export type { SlideRenderResult } from "./html/slide";

export { renderSlide, renderSlides, renderSlideStandalone } from "./html/slide";
