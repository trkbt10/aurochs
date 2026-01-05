/**
 * @file SlideRenderContext builder for editor
 *
 * Creates SlideRenderContext from API Slide and file cache.
 * This enables proper re-rendering of edited slides with full theme/master/layout context.
 */

import type { Slide as ApiSlide } from "../../pptx/types/api";
import type { SlideRenderContext } from "../../pptx/reader/slide/accessor";
import { createSlideRenderContext } from "../../pptx/reader/slide/accessor";
import { createPlaceholderTable, createColorMap } from "../../pptx/parser/slide/resource-adapters";
import { parseTheme, parseMasterTextStyles } from "../../pptx/core/dml/parser/theme";
import { DEFAULT_RENDER_OPTIONS } from "../../pptx/render/render-options";
import { createRenderContextFromSlideContext } from "../../pptx/render/core/context";
import { getBackgroundFillData } from "../../pptx/core/dml/render/background";
import { parseShapeTree } from "../../pptx/parser/shape-parser";
import type { XmlElement, XmlDocument } from "../../xml";
import { getByPath, getChild } from "../../xml";
import type { FileCache } from "./types";
import type { SlideSize, Shape, SpShape } from "../../pptx/domain";
import type { ResolvedBackgroundFill, RenderContext } from "../../pptx/render/context";

// =============================================================================
// ZipFile Adapter
// =============================================================================

/**
 * Create a ZipFile adapter from file cache.
 * This allows SlideRenderContext to read resources from the cached PPTX files.
 */
function createZipFileAdapter(cache: FileCache) {
  return {
    file(path: string) {
      const entry = cache.get(path);
      if (!entry) {
        return null;
      }
      return {
        asArrayBuffer(): ArrayBuffer {
          return entry.buffer;
        },
        asText(): string {
          return entry.text;
        },
      };
    },
  };
}

// =============================================================================
// SlideRenderContext Builder
// =============================================================================

/**
 * Build SlideRenderContext from API Slide and file cache.
 *
 * This replicates the logic in slide-builder.ts's buildSlideRenderContext,
 * but works with API Slide (which has the same structure as SlideData).
 */
export function createSlideRenderContextFromApiSlide(
  apiSlide: ApiSlide,
  cache: FileCache,
  defaultTextStyle: XmlElement | null = null,
): SlideRenderContext {
  // Create ZipFile adapter from cache
  const zip = createZipFileAdapter(cache);

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
    renderOptions: DEFAULT_RENDER_OPTIONS,
    themeResources: apiSlide.themeRelationships,
  };

  return createSlideRenderContext(slide, layout, master, presentation);
}

// =============================================================================
// Background Resolution
// =============================================================================

/**
 * Convert BackgroundFill from core to ResolvedBackgroundFill.
 * (Same logic as slide-render.ts toResolvedBackgroundFill)
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
export function createRenderContextFromApiSlide(
  apiSlide: ApiSlide,
  cache: FileCache,
  slideSize: SlideSize,
  defaultTextStyle: XmlElement | null = null,
): RenderContext {
  // Build SlideRenderContext
  const slideRenderCtx = createSlideRenderContextFromApiSlide(apiSlide, cache, defaultTextStyle);

  // Resolve background from hierarchy
  const bgFillData = getBackgroundFillData(slideRenderCtx);
  const resolvedBackground = toResolvedBackgroundFill(bgFillData);

  // Extract layout non-placeholder shapes
  const layoutShapes = getLayoutNonPlaceholderShapes(apiSlide);

  // Create RenderContext with all resolved data
  return createRenderContextFromSlideContext(slideRenderCtx, slideSize, {
    resolvedBackground,
    layoutShapes,
  });
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
