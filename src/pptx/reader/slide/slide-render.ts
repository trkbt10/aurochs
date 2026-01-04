/**
 * @file Integrated slide renderer
 *
 * Uses the new Parse → Domain → Render architecture.
 * No `as unknown as` casts needed.
 */

import type { XmlDocument } from "../../../xml/index";
import { getChild } from "../../../xml/index";
import type { SlideRenderContext } from "./accessor";
import type { Slide, SlideSize, Shape, SpShape } from "../../domain/index";
import type { ResolvedBackgroundFill } from "../../render/context";
import { parseSlide } from "../../parser/slide/slide-parser";
import { parseShapeTree } from "../../parser/shape-parser/index";
import { createParseContext } from "../../parser/context";
import { renderSlide } from "../../render/html/slide";
import { renderSlideSvg } from "../../render/svg/renderer";
import { createRenderContextFromSlideContext } from "../../render/core/context";
import { createStyleCollector } from "../../render/context";
import { getBackgroundFillData } from "../../core/dml/render/background";
import { enrichSlideContent, type FileReader } from "../../parser/slide/external-content-loader";

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
// Parse Context Creation
// =============================================================================

// Parse context creation is handled by parser/context.ts (createParseContext)

// =============================================================================
// Integrated Render Function
// =============================================================================

/**
 * Parse and get non-placeholder shapes from slide layout.
 * These are decorative shapes that should be rendered behind slide content.
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
  // Note: HTML rendering requires StyleCollector, so we add it to CoreRenderContext
  const coreCtx = createRenderContextFromSlideContext(ctx, slideSize, {
    resolvedBackground,
    layoutShapes,
  });
  const renderCtx = { ...coreCtx, styles: createStyleCollector() };
  const result = renderSlide(parsedSlide, renderCtx);

  return {
    html: result.html,
    styles: result.styles,
    warnings: result.warnings.map((w) => `[${w.type}] ${w.message}`),
  };
}

/**
 * Create empty slide HTML for error cases.
 */
function createEmptySlideHtml(slideSize: SlideSize): string {
  return `<div class="slide" style="width:${slideSize.width}px;height:${slideSize.height}px;background:#fff;"></div>`;
}

// =============================================================================
// Integrated SVG Render Function
// =============================================================================

/**
 * Convert BackgroundFill from core to ResolvedBackgroundFill.
 *
 * This converts the legacy background resolution result (from getBackgroundFillData)
 * to the render ResolvedBackgroundFill type.
 */
function toResolvedBackgroundFill(
  bgFillData: ReturnType<typeof getBackgroundFillData>,
): ResolvedBackgroundFill | undefined {
  if (bgFillData.image !== undefined) {
    return {
      type: "image",
      dataUrl: bgFillData.image,
      mode: bgFillData.imageFillMode === "stretch" ? "stretch" : "tile",
    };
  }

  if (bgFillData.gradientData !== undefined) {
    const isRadial = bgFillData.gradientData.type === "path";
    const fillToRect = bgFillData.gradientData.fillToRect;

    // Calculate radial center from fillToRect
    // fillToRect values are in 1/100000 percentages (per ECMA-376)
    // Convert to 0-100 percentage for SVG
    let radialCenter: { cx: number; cy: number } | undefined;
    if (isRadial && fillToRect !== undefined) {
      radialCenter = {
        cx: (fillToRect.l + fillToRect.r) / 2000,
        cy: (fillToRect.t + fillToRect.b) / 2000,
      };
    }

    return {
      type: "gradient",
      angle: bgFillData.gradientData.angle,
      stops: bgFillData.gradientData.stops.map((stop) => ({
        position: stop.position,
        color: stop.color.startsWith("#") ? stop.color : `#${stop.color}`,
      })),
      isRadial,
      radialCenter,
    };
  }

  if (bgFillData.color !== undefined) {
    return {
      type: "solid",
      color: bgFillData.color.startsWith("#") ? bgFillData.color : `#${bgFillData.color}`,
    };
  }

  return undefined;
}

/**
 * Check if a shape is a placeholder.
 * Only SpShape can be a placeholder.
 */
function isPlaceholder(shape: Shape): boolean {
  if (shape.type !== "sp") {
    return false;
  }
  return (shape as SpShape).placeholder !== undefined;
}

/**
 * Get non-placeholder shapes from an array of shapes.
 * These are decorative shapes that should be rendered behind slide content.
 */
function getNonPlaceholderShapes(shapes: readonly Shape[]): readonly Shape[] {
  return shapes.filter((shape) => !isPlaceholder(shape));
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
  // Note: SVG rendering doesn't use StyleCollector but type requires it
  const coreCtx = createRenderContextFromSlideContext(ctx, slideSize, {
    resolvedBackground,
    layoutShapes,
  });
  const renderCtx = { ...coreCtx, styles: createStyleCollector() };
  const result = renderSlideSvg(enrichedSlide, renderCtx);

  return {
    svg: result.svg,
    warnings: result.warnings.map((w) => `[${w.type}] ${w.message}`),
  };
}

/**
 * Create empty slide SVG for error cases.
 */
function createEmptySlideSvg(slideSize: SlideSize): string {
  const { width, height } = slideSize;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="${width}" height="${height}" fill="#ffffff"/>
</svg>`;
}
