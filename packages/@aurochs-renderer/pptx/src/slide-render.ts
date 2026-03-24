/**
 * @file Integrated slide renderer
 *
 * Orchestration layer that coordinates parser and render layers.
 * Uses the Parse → Domain → Render architecture.
 *
 * @see ECMA-376 Part 1, Section 19.3 (PresentationML)
 */

import type { XmlDocument } from "@aurochs/xml";
import type { SlideContext } from "@aurochs-office/pptx/parser/slide/context";
import type { SlideSize } from "@aurochs-office/pptx/domain";
import { parseSlide } from "@aurochs-office/pptx/parser";
import { createParseContext } from "@aurochs-office/pptx/parser/context";
import { renderSlideSvg, createEmptySlideSvg } from "./svg/renderer";
import { createRenderContextFromSlideContext } from "./context/slide-context-adapter";
import { getLayoutNonPlaceholderShapes } from "@aurochs-office/pptx/parser/slide/context";
import { toResolvedBackgroundFill } from "./background-fill";
import { getBackgroundFillData } from "@aurochs-office/pptx/parser/slide/background-parser";
import { loadSlideExternalContent } from "@aurochs-office/pptx/parser/slide/external-content-loader";
import { createResourceStore } from "@aurochs-office/ooxml/domain/resource-store";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of rendering a slide to SVG with the new architecture.
 */
export type IntegratedSvgRenderResult = {
  /** Rendered SVG output (complete SVG document) */
  readonly svg: string;

  /** Warnings generated during rendering */
  readonly warnings: readonly string[];
};

// =============================================================================
// Integrated Render Functions
// =============================================================================

/**
 * Render a slide to SVG using the new Parse → Domain → Render architecture.
 *
 * This function:
 * 1. Parses XmlDocument to Slide domain object (parser)
 * 2. Parses layout to get non-placeholder decorative shapes
 * 3. Resolves background from slide/layout/master hierarchy
 * 4. Passes layout shapes via context (renderer reads from context)
 * 5. Renders Slide domain object to SVG (render)
 *
 * @param content - Slide XML document
 * @param ctx - Slide render context
 * @param slideSize - Slide dimensions
 * @returns Render result with SVG and warnings
 *
 * @see ECMA-376 Part 1, Section 19.3.1.39 (sldLayout)
 */
export function renderSlideSvgIntegrated(
  content: XmlDocument,
  ctx: SlideContext,
  slideSize: SlideSize,
): IntegratedSvgRenderResult {
  // Step 1: Parse XmlDocument → Slide domain object
  const parseCtx = createParseContext(ctx);
  const parsedSlide = parseSlide(content, parseCtx);

  if (parsedSlide === undefined) {
    return {
      svg: createEmptySlideSvg(slideSize),
      warnings: ["Failed to parse slide content"],
    };
  }

  // Step 2: Parse layout to get non-placeholder shapes
  const layoutShapes = getLayoutNonPlaceholderShapes(ctx);

  // Step 3: Register all resources (images, charts, diagrams, OLE) in ResourceStore
  const resourceStore = createResourceStore();
  const fileReader = ctx.toFileReader();
  const enrichedSlide = loadSlideExternalContent(parsedSlide, fileReader, resourceStore);

  // Register layout shape images using layout-scoped resource resolution
  if (layoutShapes.length > 0) {
    const layoutFileReader = ctx.toFileReader("layout");
    loadSlideExternalContent({ shapes: layoutShapes }, layoutFileReader, resourceStore);
  }

  // Step 4: Resolve background from hierarchy
  const bgFillData = getBackgroundFillData(ctx);
  const resolvedBackground = toResolvedBackgroundFill(bgFillData);

  // Step 5: Render Slide domain object → SVG
  const renderCtx = createRenderContextFromSlideContext(ctx, slideSize, {
    resolvedBackground,
    layoutShapes,
    resourceStore,
  });
  const result = renderSlideSvg(enrichedSlide, renderCtx);

  return {
    svg: result.svg,
    warnings: result.warnings.map((w) => `[${w.type}] ${w.message}`),
  };
}
