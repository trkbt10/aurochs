/**
 * @file Render context for PPTX processing
 *
 * Unified RenderContext used by all renderers (HTML, SVG, React).
 */

// Core types - single source of truth
export type {
  RenderDialect,
  LineSpacingMode,
  BaselineMode,
  RenderOptions,
  ResourceResolver,
  RenderWarning,
  WarningCollector,
  ResolvedBackgroundFill,
  CoreRenderContext,
  CoreRenderContextConfig,
} from "./core";

export {
  DEFAULT_RENDER_OPTIONS,
  createEmptyResourceResolver,
  createWarningCollector,
  createCoreRenderContext,
  createEmptyCoreRenderContext,
} from "./core";

// =============================================================================
// Unified Render Context
// =============================================================================

import type { CoreRenderContext, CoreRenderContextConfig } from "./core";
import { createCoreRenderContext, createEmptyCoreRenderContext } from "./core";

/**
 * Unified render context used by all renderers.
 *
 * This is the single context type for HTML, SVG, and React rendering.
 * Format-specific utilities (StyleCollector, DefsCollector) are created
 * internally by each renderer as needed.
 */
export type RenderContext = CoreRenderContext;

/**
 * Configuration for creating render context.
 */
export type RenderContextConfig = CoreRenderContextConfig;

/**
 * Create a render context.
 *
 * This is the primary factory for all rendering contexts.
 */
export function createRenderContext(config: RenderContextConfig): RenderContext {
  return createCoreRenderContext(config);
}

/**
 * Create an empty render context for testing.
 */
export function createEmptyRenderContext(): RenderContext {
  return createEmptyCoreRenderContext();
}
