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
import type { CoreRenderContext } from "../render-context";
import type { RenderOptions } from "../render-options";
import { DEFAULT_RENDER_OPTIONS } from "../render-options";
import { toResolvedBackgroundFill } from "../background-fill";
import { createRenderContextFromSlideContext } from "./slide-context-adapter";
import { createResourceStore } from "@aurochs-office/pptx/domain/resource-store";
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

// CreateRenderContextOptions removed — createRenderContext now takes an inline parameter type
// with required apiSlide and zip.

// =============================================================================
// Helpers
// =============================================================================

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a RenderContext from an API Slide.
 *
 * Resolves theme, colors, fonts, background, layout from the PPTX archive.
 * apiSlide is required — if no archive is available,
 * use createCoreRenderContext directly.
 */
export function createRenderContext({
  apiSlide,
  slideSize,
  renderOptions,
}: {
  readonly apiSlide: ApiSlide;
  readonly slideSize: SlideSize;
  readonly renderOptions?: RenderOptions;
}): RenderContext {
  const resourceStore = createResourceStore();

  const slideRenderCtx = createSlideContextFromApiSlide(apiSlide, renderOptions ?? DEFAULT_RENDER_OPTIONS);
  const bgFillData = getBackgroundFillData(slideRenderCtx);
  const resolvedBackground = toResolvedBackgroundFill(bgFillData);
  const layoutShapes = getLayoutNonPlaceholderShapes(slideRenderCtx);

  const fileReader = slideRenderCtx.toFileReader();

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

