/**
 * @file Integrated slide renderer
 *
 * Orchestration layer that coordinates parser and render layers.
 * Uses the Parse → Domain → Render architecture.
 *
 * @see ECMA-376 Part 1, Section 19.3 (PresentationML)
 */

import type { XmlDocument } from "../../xml/index";
import { getChild } from "../../xml/index";
import type { SlideRenderContext } from "../render/core/slide-context";
import type { Shape, SlideSize } from "../domain/index";
import { getNonPlaceholderShapes } from "../domain/shape-utils";
import { parseSlide } from "../parser/slide/slide-parser";
import { parseShapeTree } from "../parser/shape-parser/index";
import { createParseContext } from "../parser/context";
import { renderSlide, createEmptySlideHtml } from "../render/html/slide";
import { renderSlideSvg, createEmptySlideSvg } from "../render/svg/renderer";
import { createRenderContextFromSlideContext, toResolvedBackgroundFill } from "../render/core";
import { getBackgroundFillData } from "../core/dml/render/background";
import { enrichSlideContent, type FileReader } from "../parser/slide/external-content-loader";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of rendering a slide with the new architecture.
 */
export type IntegratedRenderResult = {
  /** Rendered HTML output */
  readonly html: string;

  /** Generated CSS styles */
  readonly styles: string;

  /** Warnings generated during rendering */
  readonly warnings: readonly string[];
};

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
 * @param ctx - Slide render context containing layout content
 * @returns Array of non-placeholder shapes from layout
 */
function getLayoutNonPlaceholderShapes(ctx: SlideRenderContext): readonly Shape[] {
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

  const layoutShapes = parseShapeTree(spTree);
  return getNonPlaceholderShapes(layoutShapes);
}

// =============================================================================
// Integrated Render Functions
// =============================================================================

/**
 * Render a slide using the new Parse → Domain → Render architecture.
 *
 * This function:
 * 1. Parses XmlDocument to Slide domain object (parser)
 * 2. Parses layout to get non-placeholder decorative shapes
 * 3. Resolves background from slide/layout/master hierarchy
 * 4. Merges layout shapes with slide shapes
 * 5. Renders Slide domain object to HTML (render)
 *
 * No `as unknown as` casts are needed because all layers use
 * well-defined types.
 *
 * @param content - Slide XML document
 * @param ctx - Slide render context
 * @param slideSize - Slide dimensions
 * @returns Render result with HTML, styles, and warnings
 */
export function renderSlideIntegrated(
  content: XmlDocument,
  ctx: SlideRenderContext,
  slideSize: SlideSize,
): IntegratedRenderResult {
  // Step 1: Parse XmlDocument → Slide domain object
  const parseCtx = createParseContext(ctx);
  const parsedSlide = parseSlide(content, parseCtx);

  if (parsedSlide === undefined) {
    return {
      html: createEmptySlideHtml(slideSize),
      styles: "",
      warnings: ["Failed to parse slide content"],
    };
  }

  // Step 2: Parse layout to get non-placeholder shapes
  const layoutShapes = getLayoutNonPlaceholderShapes(ctx);

  // Step 3: Resolve background from hierarchy (slide → layout → master)
  // This uses the legacy background resolution which properly handles ECMA-376 inheritance
  const bgFillData = getBackgroundFillData(ctx);
  const resolvedBackground = toResolvedBackgroundFill(bgFillData);

  // Step 4: Render Slide domain object → HTML
  // Pass resolved background and layout shapes through render context
  const renderCtx = createRenderContextFromSlideContext(ctx, slideSize, {
    resolvedBackground,
    layoutShapes,
  });
  const result = renderSlide(parsedSlide, renderCtx);

  return {
    html: result.html,
    styles: result.styles,
    warnings: result.warnings.map((w) => `[${w.type}] ${w.message}`),
  };
}

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
 * Layout shapes are rendered behind slide content per ECMA-376.
 *
 * No `as unknown as` casts are needed because all layers use
 * well-defined types.
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
  ctx: SlideRenderContext,
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
  // Layout shapes provide decorative elements (lines, rectangles, etc.)
  const layoutShapes = getLayoutNonPlaceholderShapes(ctx);

  // Step 3: Enrich slide with pre-parsed chart/diagram content
  // This allows render to render without directly calling parser
  const fileReader: FileReader = {
    readFile: (path: string) => ctx.readFile(path),
    resolveResource: (id: string) => ctx.resolveResource(id),
    getResourceByType: (relType: string) => {
      // Use the getTargetByType method on ResourceMap
      return ctx.slide.resources.getTargetByType(relType);
    },
  };
  const enrichedSlide = enrichSlideContent(parsedSlide, fileReader);

  // Step 4: Resolve background from hierarchy (slide → layout → master)
  // This uses the legacy background resolution which properly handles ECMA-376 inheritance
  const bgFillData = getBackgroundFillData(ctx);
  const resolvedBackground = toResolvedBackgroundFill(bgFillData);

  // Step 5: Render Slide domain object → SVG
  // Pass resolved background and layout shapes through render context
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
