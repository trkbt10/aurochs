/**
 * @file SlideRenderContext builder for app usage
 *
 * Creates SlideRenderContext from API Slide and ZipFile.
 * This enables proper rendering with full theme/master/layout context.
 */

import type { Slide as ApiSlide } from "@aurochs-office/pptx/app/types";
import type { SlideContext } from "@aurochs-office/pptx/parser/slide/context";
import { createSlideContextFromApiSlide, getLayoutNonPlaceholderShapes } from "@aurochs-office/pptx/parser/slide/context";
import { getBackgroundFillData } from "@aurochs-office/pptx/parser/slide/background-parser";
import type { SlideSize } from "@aurochs-office/pptx/domain";
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

/**
 * Create FileReader from SlideContext.
 *
 * This is the single source of truth for FileReader construction from SlideContext.
 * FileReader provides archive access scoped to the slide's relationships.
 */
export function createFileReaderFromSlideContext(ctx: SlideContext): FileReader {
  return {
    readFile: (path: string) => ctx.readFile(path),
    resolveResource: (id: string) => ctx.resolveResource(id),
    getResourceByType: (relType: string) => ctx.slide.resources.getTargetByType(relType),
  };
}

/**
 * Create FileReader for layout shapes from SlideContext.
 *
 * Layout shapes reference images via layout-scoped rIds that may differ
 * from slide-scoped rIds. This FileReader resolves from layout resources first,
 * then falls back to master resources.
 */
export function createLayoutFileReader(ctx: SlideContext): FileReader {
  return {
    readFile: (path: string) => ctx.readFile(path),
    resolveResource: (rId: string) =>
      ctx.layout.resources.getTarget(rId) ?? ctx.master.resources.getTarget(rId),
    getResourceByType: (relType: string) =>
      ctx.layout.resources.getTargetByType(relType) ?? ctx.master.resources.getTargetByType(relType),
  };
}

/**
 * Build SlideContext from API Slide.
 * Delegates to parser layer's createSlideContextFromApiSlide (SoT).
 */
export function buildSlideRenderContext(opts: {
  apiSlide: ApiSlide;
  zip: ZipFile;
  defaultTextStyle: TextStyleLevels | null;
  renderOptions: RenderOptions | undefined;
}): SlideContext {
  return createSlideContextFromApiSlide(opts.apiSlide, opts.renderOptions ?? DEFAULT_RENDER_OPTIONS);
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
  const layoutShapes = getLayoutNonPlaceholderShapes(slideRenderCtx);

  const fileReader = createFileReaderFromSlideContext(slideRenderCtx);

  const coreContext = createRenderContextFromSlideContext(slideRenderCtx, slideSize, {
    resolvedBackground,
    layoutShapes,
    resourceStore,
  });

  return {
    ...coreContext,
    slideRenderContext: slideRenderCtx,
    fileReader,
  };
}

// =============================================================================
// Layout Shape Extraction
// =============================================================================

