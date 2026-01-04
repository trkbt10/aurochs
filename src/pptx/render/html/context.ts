/**
 * @file HTML render context
 *
 * For backward compatibility only.
 * Use RenderContext from ../context instead.
 */

import { px } from "../../domain/types";
import type { RenderContext, RenderContextConfig } from "../context";
import { createRenderContext, createEmptyRenderContext } from "../context";

// =============================================================================
// Backward Compatibility Aliases
// =============================================================================

/**
 * @deprecated Use RenderContext instead
 */
export type HtmlRenderContext = RenderContext;

/**
 * @deprecated Use RenderContextConfig instead
 */
export type HtmlRenderContextConfig = RenderContextConfig;

/**
 * @deprecated Use createRenderContext instead
 */
export function createHtmlRenderContext(config: HtmlRenderContextConfig): HtmlRenderContext {
  return createRenderContext(config);
}

/**
 * @deprecated Use createEmptyRenderContext instead
 */
export function createEmptyHtmlRenderContext(): HtmlRenderContext {
  return createEmptyRenderContext();
}
