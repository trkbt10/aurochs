/**
 * @file Core render context
 *
 * Format-agnostic render context shared by HTML and SVG renderers.
 * ResourceStore is the single source of truth for all resource resolution.
 */

import type { SlideSize, Shape } from "@aurochs-office/pptx/domain";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FontScheme } from "@aurochs-office/ooxml/domain/font-scheme";
import type { ResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import { createResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { RenderOptions } from "./render-options";
import { DEFAULT_RENDER_OPTIONS } from "./render-options";
import type { ResolvedBackgroundFill } from "@aurochs-office/drawing-ml/domain/background-fill";
import type { WarningCollector } from "@aurochs-office/ooxml";
import { createWarningCollector } from "@aurochs-office/ooxml";
import type { TableStyleList } from "@aurochs-office/pptx/parser/table/style-parser";

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

  /** Warning collector */
  readonly warnings: WarningCollector;

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
   * @see ECMA-376 Part 1, Section 19.3.1.39 (sldLayout)
   */
  readonly layoutShapes?: readonly Shape[];

  /**
   * Table styles from ppt/tableStyles.xml.
   *
   * @see ECMA-376 Part 1, Section 20.1.4.2 (a:tblStyleLst)
   */
  readonly tableStyles?: TableStyleList;

  /**
   * Centralized resource store — single source of truth for all resolved resources.
   */
  readonly resourceStore: ResourceStore;
};

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Configuration for creating a core render context.
 */
export type CoreRenderContextConfig = {
  readonly slideSize: SlideSize;
  readonly options?: Partial<RenderOptions>;
  readonly colorContext?: ColorContext;
  readonly fontScheme?: FontScheme;
  readonly resolvedBackground?: ResolvedBackgroundFill;
  readonly layoutShapes?: readonly Shape[];
  readonly tableStyles?: TableStyleList;
  readonly resourceStore: ResourceStore;
};

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a core render context (format-agnostic).
 */
export function createCoreRenderContext(config: CoreRenderContextConfig): CoreRenderContext {
  return {
    slideSize: config.slideSize,
    options: { ...DEFAULT_RENDER_OPTIONS, ...config.options },
    colorContext: config.colorContext ?? { colorScheme: {}, colorMap: {} },
    warnings: createWarningCollector(),
    fontScheme: config.fontScheme,
    resolvedBackground: config.resolvedBackground,
    layoutShapes: config.layoutShapes,
    tableStyles: config.tableStyles,
    resourceStore: config.resourceStore,
  };
}

/**
 * Create an empty core render context (for testing)
 */
export function createEmptyCoreRenderContext(): CoreRenderContext {
  return createCoreRenderContext({
    slideSize: { width: px(960), height: px(540) },
    resourceStore: createResourceStore(),
  });
}
