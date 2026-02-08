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

import type { Slide, SlideSize } from "@aurochs-office/pptx/domain/index";
import type { CoreRenderContext } from "../render-context";
import type { RenderWarning } from "@aurochs-office/ooxml";
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

/**
 * SVG slide content render result (without wrapper element)
 */
export type SvgSlideContentRenderResult = {
  /** SVG defs content (gradients, patterns, etc.) */
  readonly defs: string;

  /** Background SVG content */
  readonly background: string;

  /** Shapes SVG content */
  readonly shapes: string;

  /** Warnings generated during rendering */
  readonly warnings: readonly RenderWarning[];
};

// =============================================================================
// Main Render Function
// =============================================================================

/**
 * Render a slide to SVG format.
 *
 * Layout shapes from context are rendered behind slide shapes per ECMA-376.
 *
 * @param slide - Slide domain object
 * @param ctx - Render context with resources, colors, options, and layout shapes
 * @returns SVG render result with SVG string and warnings
 *
 * @see ECMA-376 Part 1, Section 19.3.1.39 (sldLayout)
 */
export function renderSlideSvg(slide: Slide, ctx: CoreRenderContext): SvgSlideRenderResult {
  const { width, height } = ctx.slideSize;
  const defsCollector = createDefsCollector();

  // Render background - prefer pre-resolved background if available
  const backgroundSvg = renderSlideBackgroundSvg(slide, ctx, defsCollector);

  // Render layout shapes first (decorative, behind slide content)
  const layoutShapesSvg = renderLayoutShapesSvg(ctx, defsCollector);

  // Render slide shapes
  const contentSvg = renderShapesSvg(slide.shapes, ctx, defsCollector);

  // Build SVG document
  const defs = defsCollector.toDefsElement();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${defs}
${backgroundSvg}
${layoutShapesSvg}
${contentSvg}
</svg>`;

  return {
    svg,
    warnings: ctx.warnings.getAll(),
  };
}

function renderLayoutShapesSvg(ctx: CoreRenderContext, defsCollector: ReturnType<typeof createDefsCollector>): string {
  if (ctx.layoutShapes === undefined || ctx.layoutShapes.length === 0) {
    return "";
  }
  return renderShapesSvg(ctx.layoutShapes, ctx, defsCollector);
}

function renderSlideBackgroundSvg(
  slide: Slide,
  ctx: CoreRenderContext,
  defsCollector: ReturnType<typeof createDefsCollector>,
): string {
  if (ctx.resolvedBackground !== undefined) {
    return renderResolvedBackgroundSvg(ctx.resolvedBackground, ctx.slideSize, defsCollector);
  }
  return renderBackgroundSvg({ background: slide.background, slideSize: ctx.slideSize, ctx, defsCollector });
}

// =============================================================================
// Empty Slide Generation
// =============================================================================

/**
 * Create empty slide SVG for error cases.
 *
 * Used when slide parsing fails and we need to return a valid SVG structure.
 *
 * @param slideSize - Slide dimensions
 * @returns Complete SVG document string for an empty white slide
 */
export function createEmptySlideSvg(slideSize: SlideSize): string {
  const { width, height } = slideSize;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="${width}" height="${height}" fill="#ffffff"/>
</svg>`;
}
