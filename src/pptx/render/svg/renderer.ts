/**
 * @file SVG Slide renderer
 *
 * Converts Slide domain objects to SVG output.
 *
 * This is the main entry point for SVG slide rendering.
 * The implementation is split across several modules:
 *
 * - **svg/slide-utils.ts** - Defs collector, transform helpers
 * - **svg/slide-background.ts** - Background rendering
 * - **svg/slide-shapes.ts** - Shape rendering (sp, pic, grpSp, cxnSp, graphicFrame)
 * - **svg/slide-text.ts** - Text rendering with layout engine
 *
 * @see ECMA-376 Part 1, Section 19.3 (PresentationML)
 */

import type { Slide } from "../../domain/index";
import type { RenderContext, RenderWarning } from "../context";
import { createDefsCollector } from "./slide-utils";
import { renderResolvedBackgroundSvg, renderBackgroundSvg } from "./slide-background";
import { renderShapesSvg } from "./slide-shapes";

// =============================================================================
// Types
// =============================================================================

/**
 * SVG slide render result
 */
export type SvgSlideRenderResult = {
  /** Rendered SVG content (complete SVG document) */
  readonly svg: string;

  /** Warnings generated during rendering */
  readonly warnings: readonly RenderWarning[];
};

// =============================================================================
// Main Render Function
// =============================================================================

/**
 * Render a slide to SVG format.
 *
 * @param slide - Slide domain object
 * @param ctx - Render context with resources, colors, and options
 * @returns SVG render result with SVG string and warnings
 */
export function renderSlideSvg(slide: Slide, ctx: RenderContext): SvgSlideRenderResult {
  const { width, height } = ctx.slideSize;
  const defsCollector = createDefsCollector();

  // Render background - prefer pre-resolved background if available
  const backgroundSvg = renderSlideBackgroundSvg(slide, ctx, defsCollector);

  // Render shapes
  const contentSvg = renderShapesSvg(slide.shapes, ctx, defsCollector);

  // Build SVG document
  const defs = defsCollector.toDefsElement();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${defs}
${backgroundSvg}
${contentSvg}
</svg>`;

  return {
    svg,
    warnings: ctx.warnings.getAll(),
  };
}

function renderSlideBackgroundSvg(
  slide: Slide,
  ctx: RenderContext,
  defsCollector: ReturnType<typeof createDefsCollector>
): string {
  if (ctx.resolvedBackground !== undefined) {
    return renderResolvedBackgroundSvg(ctx.resolvedBackground, ctx.slideSize, defsCollector);
  }
  return renderBackgroundSvg(slide.background, ctx.slideSize, ctx, defsCollector);
}
