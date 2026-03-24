/**
 * @file SlideContext to CoreRenderContext adapter
 *
 * Bridges the parser layer (SlideContext) to the render layer (CoreRenderContext).
 * All domain object construction is delegated to SlideContext methods (parser layer SoT).
 *
 * @see ECMA-376 Part 1 (Fundamentals and Markup Language Reference)
 */

import type { SlideSize, Shape } from "@aurochs-office/pptx/domain";
import type { ResourceStore } from "@aurochs-office/pptx/domain/resource-store";
import type { SlideContext } from "@aurochs-office/pptx/parser/slide/context";
import type { CoreRenderContext } from "../render-context";
import { createCoreRenderContext } from "../render-context";
import type { RenderOptions } from "../render-options";
import type { ResolvedBackgroundFill } from "@aurochs-office/drawing-ml/domain/background-fill";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for creating render context from SlideContext
 */
export type RenderContextFromSlideOptions = {
  readonly renderOptions?: Partial<RenderOptions>;
  readonly resolvedBackground?: ResolvedBackgroundFill;
  readonly layoutShapes?: readonly Shape[];
  readonly resourceStore: ResourceStore;
};

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create CoreRenderContext from SlideContext.
 *
 * Delegates all domain object construction to SlideContext methods.
 */
export function createRenderContextFromSlideContext(
  ctx: SlideContext,
  slideSize: SlideSize,
  options: RenderContextFromSlideOptions,
): CoreRenderContext {
  return createCoreRenderContext({
    slideSize,
    options: options.renderOptions,
    colorContext: ctx.toRendererColorContext(),
    resources: ctx.toResourceResolver(options.resourceStore),
    fontScheme: ctx.toFontScheme(),
    resolvedBackground: options.resolvedBackground,
    layoutShapes: options.layoutShapes,
    tableStyles: ctx.presentation.tableStyles,
    resourceStore: options.resourceStore,
  });
}
