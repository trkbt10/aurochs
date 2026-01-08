/**
 * @file HTML render context
 *
 * For backward compatibility only.
 * Use RenderContext from ../context instead.
 */

import { px } from "../../domain/types";
import type { CoreRenderContext, CoreRenderContextConfig } from "../render-context";
import { createCoreRenderContext, createEmptyCoreRenderContext } from "../render-context";

// =============================================================================
// Backward Compatibility Aliases
// =============================================================================

/**
 * @deprecated Use CoreRenderContext instead
 */
export type HtmlRenderContext = CoreRenderContext;

/**
 * @deprecated Use CoreRenderContextConfig instead
 */
export type HtmlRenderContextConfig = CoreRenderContextConfig;

/**
 * @deprecated Use createCoreRenderContext instead
 */
export function createHtmlRenderContext(config: HtmlRenderContextConfig): HtmlRenderContext {
  return createCoreRenderContext(config);
}

/**
 * @deprecated Use createEmptyCoreRenderContext instead
 */
export function createEmptyHtmlRenderContext(): HtmlRenderContext {
  return createEmptyCoreRenderContext();
}
