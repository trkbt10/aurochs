/**
 * @file Render context for PPTX processing
 *
 * Aggregates core and html modules for convenient access.
 */

import type { SlideSize } from "../domain";
import type { ColorContext } from "../domain/resolution";
import type { RenderOptions, ResourceResolver } from "./core";

// Core types
export type {
  RenderDialect,
  LineSpacingMode,
  BaselineMode,
  RenderOptions,
  ResourceResolver,
  RenderWarning,
  WarningCollector,
  ResolvedBackgroundFill,
} from "./core";

export {
  DEFAULT_RENDER_OPTIONS,
  createEmptyResourceResolver,
  createWarningCollector,
} from "./core";

// HTML types
export type { StyleCollector } from "./html/context";
export { createStyleCollector } from "./html/context";

// =============================================================================
// Render Context
// =============================================================================

import type { HtmlRenderContext } from "./html/context";

/**
 * Render context for slide rendering (HTML output)
 */
export type RenderContext = HtmlRenderContext;

import {
  createEmptyHtmlRenderContext,
  createHtmlRenderContext,
} from "./html/context";

/**
 * Create an empty render context for testing
 */
export function createEmptyRenderContext(): RenderContext {
  return createEmptyHtmlRenderContext();
}

/**
 * Create a render context with options
 */
export function createRenderContext(config: {
  slideSize: SlideSize;
  options?: Partial<RenderOptions>;
  colorContext?: ColorContext;
  resources?: ResourceResolver;
}): RenderContext {
  return createHtmlRenderContext(config);
}
