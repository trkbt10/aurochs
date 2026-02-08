/**
 * @file Integrated slide renderer
 *
 * Orchestration layer that coordinates parser and render layers.
 * Uses the Parse → Domain → Render architecture.
 *
 * @see ECMA-376 Part 1, Section 19.3 (PresentationML)
 */

import type { XmlDocument } from "@aurochs/xml";
import { getChild } from "@aurochs/xml";
import type { SlideContext } from "@aurochs-office/pptx/parser/slide/context";
import { createResourceContextImpl } from "@aurochs-office/pptx/parser/slide/context";
import type { Shape, SlideSize } from "@aurochs-office/pptx/domain";
import { getNonPlaceholderShapes } from "@aurochs-office/pptx/domain/shape-utils";
import { parseSlide } from "@aurochs-office/pptx/parser";
import { parseShapeTree } from "@aurochs-office/pptx/parser";
import { createParseContext } from "@aurochs-office/pptx/parser/context";
import { renderSlideSvg, createEmptySlideSvg } from "./svg/renderer";
import { createRenderContextFromSlideContext } from "./context/slide-context-adapter";
import { toResolvedBackgroundFill } from "./background-fill";
import { getBackgroundFillData } from "@aurochs-office/pptx/parser/slide/background-parser";
import { enrichSlideContent, type FileReader } from "@aurochs-office/pptx/parser/slide/external-content-loader";

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
// Layout Shape Extraction
// =============================================================================

/**
 * Parse and get non-placeholder shapes from slide layout.
 * These are decorative shapes that should be rendered behind slide content.
 *
 * Uses a layout-specific ResourceContext to resolve images from the layout's
 * relationships, not the slide's. This is critical because layout and slide
 * may have different rId mappings for the same relationship IDs.
 *
 * @param ctx - Slide render context containing layout content
 * @returns Array of non-placeholder shapes from layout
 *
 * @see ECMA-376 Part 1, Section 19.3.1.39 (sldLayout)
 */
function getLayoutNonPlaceholderShapes(ctx: SlideContext): readonly Shape[] {
  const layoutContent = ctx.layout.content;
  if (layoutContent === undefined) {
    return [];
  }

  // Get the shape tree from p:sldLayout/p:cSld/p:spTree
  const cSld = getChild(layoutContent, "p:cSld");
  if (cSld === undefined) {
    return [];
  }

  const spTree = getChild(cSld, "p:spTree");
  if (spTree === undefined) {
    return [];
  }

  // Create a layout-specific ResourceContext that resolves from layout resources first
  // This prevents rId collision between slide and layout relationships
  const layoutResourceContext = createResourceContextImpl((rId: string) => {
    // Resolve from layout resources first
    const layoutTarget = ctx.layout.resources.getTarget(rId);
    if (layoutTarget !== undefined) {
      return layoutTarget;
    }
    // Fall back to master resources (for shared resources)
    return ctx.master.resources.getTarget(rId);
  }, ctx.readFile.bind(ctx));

  const layoutShapes = parseShapeTree({ spTree, resourceContext: layoutResourceContext });
  return getNonPlaceholderShapes(layoutShapes);
}

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

  // Step 3: Enrich slide with pre-parsed chart/diagram content
  const fileReader: FileReader = {
    readFile: (path: string) => ctx.readFile(path),
    resolveResource: (id: string) => ctx.resolveResource(id),
    getResourceByType: (relType: string) => ctx.slide.resources.getTargetByType(relType),
  };
  const enrichedSlide = enrichSlideContent(parsedSlide, fileReader);

  // Step 4: Resolve background from hierarchy
  const bgFillData = getBackgroundFillData(ctx);
  const resolvedBackground = toResolvedBackgroundFill(bgFillData);

  // Step 5: Render Slide domain object → SVG
  const renderCtx = createRenderContextFromSlideContext(ctx, slideSize, {
    resolvedBackground,
    layoutShapes,
  });
  const result = renderSlideSvg(enrichedSlide, renderCtx);

  return {
    svg: result.svg,
    warnings: result.warnings.map((w) => `[${w.type}] ${w.message}`),
  };
}
