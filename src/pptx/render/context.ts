/**
 * @file Render context for PPTX processing
 *
 * Provides the unified RenderContext type used by all renderers.
 */

import type { CoreRenderContext, CoreRenderContextConfig } from "./render-context";
import { createCoreRenderContext, createEmptyCoreRenderContext } from "./render-context";

// =============================================================================
// Unified Render Context
// =============================================================================

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
