/**
 * @file SlideRenderContext builder for app usage
 *
 * Creates SlideRenderContext from API Slide and ZipFile.
 * This enables proper rendering with full theme/master/layout context.
 */

import type { Slide as ApiSlide } from "./types";
import type { SlideContext } from "../parser/slide/context";
import { createSlideContext } from "../parser/slide/context";
import { createPlaceholderTable, createColorMap } from "../parser/slide/resource-adapters";
import { parseTheme, parseMasterTextStyles } from "../parser/drawing-ml";
import { DEFAULT_RENDER_OPTIONS, type RenderOptions } from "../render/render-options";
import { createRenderContextFromSlideContext } from "./slide-context-adapter";
import { getBackgroundFillData } from "../parser/drawing-ml";
import { toResolvedBackgroundFill } from "../render/background-fill";
import { parseShapeTree } from "../parser/shape-parser";
import type { XmlElement, XmlDocument } from "@oxen/xml";
import { getByPath, getChild } from "@oxen/xml";
import type { SlideSize, Shape, SpShape, ZipFile } from "../domain";
import type { CoreRenderContext } from "../render/render-context";

// =============================================================================
// SlideRenderContext Builder
// =============================================================================

/**
 * Build SlideRenderContext from API Slide and ZipFile.
 *
 * This replicates the logic in slide-builder.ts's buildSlideRenderContext,
 * but works with API Slide (which has the same structure as SlideData).
 */
// =============================================================================
// Full Render Context Builder
// =============================================================================

/**
 * Create a RenderContext from API Slide.
 *
 * This is the main function for the editor to use when rendering edited slides.
 * It includes:
 * - Color context (theme colors + color map)
 * - Resource resolver (for images)
 * - Font scheme
 * - Resolved background (from slide → layout → master hierarchy)
 * - Layout shapes (non-placeholder shapes from layout)
 */
export type RenderContext = CoreRenderContext & {
  readonly slideRenderContext: SlideContext;
};
export function createRenderContext(
  apiSlide: ApiSlide,
  zip: ZipFile,
  slideSize: SlideSize,
  defaultTextStyle: XmlElement | null = null,
  renderOptions?: RenderOptions,
): RenderContext {
  // Build SlideRenderContext
  const slideRenderCtx = (() => {
    // Extract color map from master
    const masterClrMap = getByPath(apiSlide.master, ["p:sldMaster", "p:clrMap"]);

    // Extract color map override from slide (if present)
    const slideClrMapOvr = getByPath(apiSlide.content, ["p:sld", "p:clrMapOvr", "a:overrideClrMapping"]);

    // Get slide content element
    const slideContent = getByPath(apiSlide.content, ["p:sld"]);

    const slide = {
      content: slideContent as XmlElement,
      resources: apiSlide.relationships,
      colorMapOverride: slideClrMapOvr !== undefined ? createColorMap(slideClrMapOvr) : undefined,
    };

    // Get layout content element for background lookup
    const layoutContent = getByPath(apiSlide.layout, ["p:sldLayout"]);

    // Get master content element for background lookup
    const masterContent = getByPath(apiSlide.master, ["p:sldMaster"]);

    const layout = {
      placeholders: createPlaceholderTable(apiSlide.layoutTables),
      resources: apiSlide.layoutRelationships,
      content: layoutContent as XmlElement | undefined,
    };

    const master = {
      textStyles: parseMasterTextStyles(apiSlide.masterTextStyles as XmlElement | undefined),
      placeholders: createPlaceholderTable(apiSlide.masterTables),
      colorMap: createColorMap(masterClrMap),
      resources: apiSlide.masterRelationships,
      content: masterContent as XmlElement | undefined,
    };

    const theme = parseTheme(apiSlide.theme as XmlDocument, undefined);

    const presentation = {
      theme,
      defaultTextStyle,
      zip,
      renderOptions: renderOptions ?? DEFAULT_RENDER_OPTIONS,
      themeResources: apiSlide.themeRelationships,
    };

    return createSlideContext(slide, layout, master, presentation);
  })();

  // Resolve background from hierarchy
  const bgFillData = getBackgroundFillData(slideRenderCtx);
  const resolvedBackground = toResolvedBackgroundFill(bgFillData);

  // Extract layout non-placeholder shapes
  const layoutShapes = getLayoutNonPlaceholderShapes(apiSlide);

  // Create RenderContext with all resolved data
  const renderContext = createRenderContextFromSlideContext(slideRenderCtx, slideSize, {
    resolvedBackground,
    layoutShapes,
  });

  return {
    slideRenderContext: slideRenderCtx,
    slideSize: renderContext.slideSize,
    options: renderContext.options,
    colorContext: renderContext.colorContext,
    resources: renderContext.resources,
    warnings: renderContext.warnings,
    getNextShapeId: renderContext.getNextShapeId,
    fontScheme: renderContext.fontScheme,
    resolvedBackground: renderContext.resolvedBackground,
    layoutShapes: renderContext.layoutShapes,
  };
}

// =============================================================================
// Layout Shape Extraction
// =============================================================================

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
 * Get non-placeholder shapes from slide layout.
 * These are decorative shapes that should be rendered behind slide content.
 *
 * @param apiSlide - The API slide containing layout data
 * @returns Array of non-placeholder shapes from the layout
 *
 * @see ECMA-376 Part 1, Section 19.3.1.39 (sldLayout)
 */
export function getLayoutNonPlaceholderShapes(apiSlide: ApiSlide): readonly Shape[] {
  const layoutContent = getByPath(apiSlide.layout, ["p:sldLayout"]);
  if (layoutContent === undefined) {
    return [];
  }

  const cSld = getChild(layoutContent, "p:cSld");
  if (cSld === undefined) {
    return [];
  }

  const spTree = getChild(cSld, "p:spTree");
  if (spTree === undefined) {
    return [];
  }

  const layoutShapes = parseShapeTree(spTree);
  return layoutShapes.filter((shape) => !isPlaceholder(shape));
}
