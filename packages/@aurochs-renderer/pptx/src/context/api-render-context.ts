/**
 * @file SlideRenderContext builder for app usage
 *
 * Creates SlideRenderContext from API Slide and ZipFile.
 * This enables proper rendering with full theme/master/layout context.
 */

import type { Slide as ApiSlide } from "@aurochs-office/pptx/app/types";
import type { SlideContext } from "@aurochs-office/pptx/parser/slide/context";
import { createSlideContext } from "@aurochs-office/pptx/parser/slide/context";
import { createPlaceholderTable, createColorMap } from "@aurochs-office/pptx/parser/slide/resource-adapters";
import { parseTheme } from "@aurochs-office/pptx/parser/theme/theme-parser";
import { parseSlideMaster } from "@aurochs-office/pptx/parser/slide/slide-parser";
import { getBackgroundFillData } from "@aurochs-office/pptx/parser/slide/background-parser";
import { parseShapeTree } from "@aurochs-office/pptx/parser";
import type { XmlElement, XmlDocument } from "@aurochs/xml";
import { getByPath, getChild } from "@aurochs/xml";
import type { SlideSize, Shape, SpShape } from "@aurochs-office/pptx/domain";
import type { TextStyleLevels } from "@aurochs-office/pptx/domain/text-style";
import type { ZipFile } from "@aurochs-office/opc";
import type { CoreRenderContext } from "../render-context";
import { createCoreRenderContext } from "../render-context";
import type { RenderOptions } from "../render-options";
import { DEFAULT_RENDER_OPTIONS } from "../render-options";
import { toResolvedBackgroundFill } from "../background-fill";
import { createRenderContextFromSlideContext } from "./slide-context-adapter";
import { createResourceStore, type ResourceStore } from "@aurochs-office/pptx/domain/resource-store";
import type { FileReader } from "@aurochs-office/pptx/parser/slide/external-content-loader";

// =============================================================================
// Types
// =============================================================================

/**
 * Extended RenderContext with SlideContext for advanced usage.
 *
 * This is the main function for the editor to use when rendering edited slides.
 * It includes:
 * - Color context (theme colors + color map)
 * - Resource resolver (for images)
 * - Font scheme
 * - Resolved background (from slide → layout → master hierarchy)
 * - Layout shapes (non-placeholder shapes from layout)
 */
/**
 * Render context for slide rendering.
 *
 * Always has fileReader (null-object if no archive).
 * slideRenderContext is present only when apiSlide was provided.
 */
export type RenderContext = CoreRenderContext & {
  readonly slideRenderContext?: SlideContext;
  readonly fileReader: FileReader;
};

/**
 * Options for creating a RenderContext.
 * apiSlide and zip are optional — without them, a minimal context is created.
 */
export type CreateRenderContextOptions = {
  readonly apiSlide?: ApiSlide;
  readonly zip?: ZipFile;
  readonly slideSize: SlideSize;
  readonly defaultTextStyle?: TextStyleLevels | null;
  readonly renderOptions?: RenderOptions;
};

// =============================================================================
// Helpers
// =============================================================================

/** FileReader that reads nothing. Used when no PPTX archive is available. */
const NULL_FILE_READER: FileReader = {
  readFile: () => null,
  resolveResource: () => undefined,
  getResourceByType: () => undefined,
};

/** Build the SlideContext from API slide data with full theme context */
function buildSlideRenderContext(opts: {
  apiSlide: ApiSlide;
  zip: ZipFile;
  defaultTextStyle: TextStyleLevels | null;
  renderOptions: RenderOptions | undefined;
}): SlideContext {
  const { apiSlide, zip, defaultTextStyle, renderOptions } = opts;
  const slideClrMapOvr = getByPath(apiSlide.content, ["p:sld", "p:clrMapOvr", "a:overrideClrMapping"]);
  const slideContent = getByPath(apiSlide.content, ["p:sld"]);

  const slide = {
    content: slideContent as XmlElement,
    resources: apiSlide.relationships,
    colorMapOverride: slideClrMapOvr !== undefined ? createColorMap(slideClrMapOvr) : undefined,
  };

  const layoutContent = getByPath(apiSlide.layout, ["p:sldLayout"]);

  const layout = {
    placeholders: createPlaceholderTable(apiSlide.layoutTables),
    resources: apiSlide.layoutRelationships,
    content: layoutContent as XmlElement | undefined,
  };

  // Use parseSlideMaster as SoT for colorMap, textStyles, and background
  const parsedMaster = parseSlideMaster(apiSlide.master ?? undefined);

  const master = {
    textStyles: parsedMaster?.textStyles ?? { titleStyle: undefined, bodyStyle: undefined, otherStyle: undefined },
    placeholders: createPlaceholderTable(apiSlide.masterTables),
    colorMap: parsedMaster?.colorMap ?? {},
    resources: apiSlide.masterRelationships,
    background: parsedMaster?.background,
  };

  const theme = parseTheme(apiSlide.theme as XmlDocument, undefined);

  const presentation = {
    theme,
    defaultTextStyle,
    zip,
    renderOptions: renderOptions ?? DEFAULT_RENDER_OPTIONS,
    themeResources: apiSlide.themeRelationships,
  };

  return createSlideContext({ slide, layout, master, presentation });
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a RenderContext.
 *
 * When apiSlide + zip are provided: resolves theme, colors, fonts, background, layout.
 * When absent: creates minimal context with empty defaults and null-object fileReader.
 *
 * ResourceStore and fileReader are always present — no branching needed by callers.
 */
export function createRenderContext({
  apiSlide,
  zip,
  slideSize,
  defaultTextStyle = null,
  renderOptions,
}: CreateRenderContextOptions): RenderContext {
  const resourceStore = createResourceStore();

  if (!apiSlide || !zip) {
    const coreCtx = createCoreRenderContext({ slideSize, resourceStore });
    return { ...coreCtx, fileReader: NULL_FILE_READER };
  }

  const slideRenderCtx = buildSlideRenderContext({ apiSlide, zip, defaultTextStyle, renderOptions });
  const bgFillData = getBackgroundFillData(slideRenderCtx);
  const resolvedBackground = toResolvedBackgroundFill(bgFillData);
  const layoutShapes = getLayoutNonPlaceholderShapes(apiSlide);

  const fileReader: FileReader = {
    readFile: (path: string) => slideRenderCtx.readFile(path),
    resolveResource: (id: string) => slideRenderCtx.resolveResource(id),
    getResourceByType: (relType: string) => slideRenderCtx.slide.resources.getTargetByType(relType),
  };

  const renderContext = createRenderContextFromSlideContext(slideRenderCtx, slideSize, {
    resolvedBackground,
    layoutShapes,
    resourceStore,
  });

  return {
    slideRenderContext: slideRenderCtx,
    fileReader,
    slideSize: renderContext.slideSize,
    options: renderContext.options,
    colorContext: renderContext.colorContext,
    resources: renderContext.resources,
    resourceStore: renderContext.resourceStore,
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

  const layoutShapes = parseShapeTree({ spTree });
  return layoutShapes.filter((shape: Shape) => !isPlaceholder(shape));
}
