/**
 * @file RenderContext factory and archive slide context resolver
 *
 * Single factory: createRenderContext — takes all fields explicitly.
 * Archive helper: resolveArchiveSlideContext — extracts rendering fields from ApiSlide.
 *
 * FileReader is NOT part of RenderContext — it belongs on SlideWithId (SoT for file resolution).
 */

import type { Slide as ApiSlide } from "@aurochs-office/pptx/app/types";
import type { SlideContext } from "@aurochs-office/pptx/parser/slide/context";
import { createSlideContextFromApiSlide, getLayoutNonPlaceholderShapes } from "@aurochs-office/pptx/parser/slide/context";
import { getBackgroundFillData } from "@aurochs-office/pptx/parser/slide/background-parser";
import type { SlideSize, Shape } from "@aurochs-office/pptx/domain";
import { createCoreRenderContext } from "../render-context";
import type { RenderOptions } from "../render-options";
import { DEFAULT_RENDER_OPTIONS } from "../render-options";
import { toResolvedBackgroundFill } from "@aurochs-office/pptx/parser/slide/background-parser";
import type { ResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FontScheme } from "@aurochs-office/ooxml/domain/font-scheme";
import type { ResolvedBackgroundFill } from "@aurochs-office/drawing-ml/domain/background-fill";
import type { TableStyleList } from "@aurochs-office/pptx/parser/table/style-parser";

// =============================================================================
// Types
// =============================================================================

/**
 * Render context for slide rendering.
 *
 * slideRenderContext is present only for archive slides.
 * FileReader is NOT included — it belongs on SlideWithId.
 */
export type RenderContext = {
  readonly slideSize: SlideSize;
  readonly options: RenderOptions;
  readonly colorContext: ColorContext;
  readonly warnings: import("@aurochs-office/ooxml").WarningCollector;
  readonly resolvedBackground?: ResolvedBackgroundFill;
  readonly fontScheme?: FontScheme;
  readonly layoutShapes?: readonly Shape[];
  readonly tableStyles?: TableStyleList;
  readonly resourceStore: ResourceStore;
  readonly slideRenderContext?: SlideContext;
};

/**
 * Configuration for createRenderContext.
 * All fields are explicit — no derivation inside the factory.
 */
export type RenderContextConfig = {
  readonly slideSize: SlideSize;
  readonly resourceStore: ResourceStore;
  readonly colorContext?: ColorContext;
  readonly fontScheme?: FontScheme;
  readonly resolvedBackground?: ResolvedBackgroundFill;
  readonly layoutShapes?: readonly Shape[];
  readonly tableStyles?: TableStyleList;
  readonly slideRenderContext?: SlideContext;
  readonly renderOptions?: Partial<RenderOptions>;
};

/**
 * Values extracted from an ApiSlide for constructing a RenderContext.
 * Returned by resolveArchiveSlideContext.
 *
 * Does NOT include fileReader — that belongs on SlideWithId.
 */
export type ArchiveSlideContext = {
  readonly colorContext: ColorContext;
  readonly fontScheme: FontScheme;
  readonly resolvedBackground: ResolvedBackgroundFill | undefined;
  readonly layoutShapes: readonly Shape[];
  readonly tableStyles: TableStyleList | undefined;
  readonly slideRenderContext: SlideContext;
};

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a RenderContext from explicit configuration.
 *
 * Single construction path for all slides (archive and editor-created).
 * For archive slides, use resolveArchiveSlideContext to extract fields from ApiSlide.
 */
export function createRenderContext(config: RenderContextConfig): RenderContext {
  const coreContext = createCoreRenderContext({
    slideSize: config.slideSize,
    options: config.renderOptions,
    colorContext: config.colorContext,
    fontScheme: config.fontScheme,
    resolvedBackground: config.resolvedBackground,
    layoutShapes: config.layoutShapes,
    tableStyles: config.tableStyles,
    resourceStore: config.resourceStore,
  });

  return {
    ...coreContext,
    slideRenderContext: config.slideRenderContext,
  };
}

// =============================================================================
// Archive Slide Context Resolver
// =============================================================================

/**
 * Extract rendering context fields from an ApiSlide.
 *
 * Resolves theme, colors, fonts, background, layout shapes from the PPTX archive.
 * FileReader is NOT included — it is set on SlideWithId at slide creation time.
 *
 * Usage:
 *   const archive = resolveArchiveSlideContext(apiSlide);
 *   const ctx = createRenderContext({ slideSize, resourceStore, ...archive });
 */
function resolveArchiveSlideContext(
  apiSlide: ApiSlide,
  renderOptions?: RenderOptions,
): ArchiveSlideContext {
  const slideCtx = createSlideContextFromApiSlide(apiSlide, renderOptions ?? DEFAULT_RENDER_OPTIONS);
  const bgFillData = getBackgroundFillData(slideCtx);

  return {
    colorContext: slideCtx.toRendererColorContext(),
    fontScheme: slideCtx.toFontScheme(),
    resolvedBackground: toResolvedBackgroundFill(bgFillData),
    layoutShapes: getLayoutNonPlaceholderShapes(slideCtx),
    tableStyles: slideCtx.presentation.tableStyles,
    slideRenderContext: slideCtx,
  };
}
