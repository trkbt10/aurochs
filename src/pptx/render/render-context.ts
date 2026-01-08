/**
 * @file Core render context
 *
 * Format-agnostic render context shared by HTML and SVG renderers.
 */

import type { SlideSize, Shape } from "../domain";
import type { ColorContext, FontScheme } from "../domain/resolution";
import type { ResourceResolver } from "../domain/resource-resolver";
import { createEmptyResourceResolver } from "../domain/resource-resolver";
import { px } from "../domain/types";
import type { RenderOptions } from "./render-options";
import { DEFAULT_RENDER_OPTIONS } from "./render-options";
import type { ResolvedBackgroundFill } from "./background-fill";
import type { WarningCollector } from "./warnings";
import { createWarningCollector } from "./warnings";

// =============================================================================
// Types
// =============================================================================

/**
 * Core render context shared by both HTML and SVG renderers.
 * Does NOT include format-specific utilities like StyleCollector.
 */
export type CoreRenderContext = {
  /** Slide dimensions */
  readonly slideSize: SlideSize;

  /** Render options */
  readonly options: RenderOptions;

  /** Color resolution context */
  readonly colorContext: ColorContext;

  /** Resource resolver */
  readonly resources: ResourceResolver;

  /** Warning collector */
  readonly warnings: WarningCollector;

  /** Current shape ID counter */
  readonly getNextShapeId: () => string;

  /**
   * Pre-resolved background fill (after slide → layout → master inheritance).
   * If provided, this takes precedence over the slide's parsed background.
   */
  readonly resolvedBackground?: ResolvedBackgroundFill;

  /**
   * Font scheme for resolving theme font references (+mj-lt, +mn-lt, etc.).
   * @see ECMA-376 Part 1, Section 20.1.4.1.18 (a:fontScheme)
   */
  readonly fontScheme?: FontScheme;

  /**
   * Non-placeholder shapes from slide layout.
   * These are decorative shapes that should be rendered behind slide content.
   *
   * Per ECMA-376 Part 1, Section 19.3.1.39 (sldLayout):
   * Layout shapes provide visual decoration that is inherited by slides.
   * Only non-placeholder shapes are included here.
   *
   * @see ECMA-376 Part 1, Section 19.3.1.39 (sldLayout)
   */
  readonly layoutShapes?: readonly Shape[];
};

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Configuration for creating a core render context.
 *
 * This is the configuration type used by all render context factories.
 * All optional fields have sensible defaults when not provided.
 */
export type CoreRenderContextConfig = {
  readonly slideSize: SlideSize;
  readonly options?: Partial<RenderOptions>;
  readonly colorContext?: ColorContext;
  readonly resources?: ResourceResolver;
  readonly fontScheme?: FontScheme;
  readonly resolvedBackground?: ResolvedBackgroundFill;
  readonly layoutShapes?: readonly Shape[];
};

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a core render context (format-agnostic).
 *
 * This is the primary factory for creating render contexts.
 * HTML and SVG contexts extend this with format-specific features.
 */
export function createCoreRenderContext(config: CoreRenderContextConfig): CoreRenderContext {
  const shapeId = { value: 0 };

  return {
    slideSize: config.slideSize,
    options: { ...DEFAULT_RENDER_OPTIONS, ...config.options },
    colorContext: config.colorContext ?? { colorScheme: {}, colorMap: {} },
    resources: config.resources ?? createEmptyResourceResolver(),
    warnings: createWarningCollector(),
    getNextShapeId: () => `shape-${shapeId.value++}`,
    fontScheme: config.fontScheme,
    resolvedBackground: config.resolvedBackground,
    layoutShapes: config.layoutShapes,
  };
}

/**
 * Create an empty core render context (for testing)
 */
export function createEmptyCoreRenderContext(): CoreRenderContext {
  return createCoreRenderContext({
    slideSize: { width: px(960), height: px(540) },
  });
}
