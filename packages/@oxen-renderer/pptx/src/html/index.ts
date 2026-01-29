/**
 * @file HTML renderer module
 *
 * HTML-specific rendering utilities.
 */

// HTML primitives
export type { HtmlString } from "./primitives";
export {
  escapeHtml,
  unsafeHtml,
  joinHtml,
  EMPTY_HTML,
  buildAttrs,
  buildClass,
  buildStyle,
  createElement,
  div,
  span,
  p,
  img,
  a,
} from "./primitives";

// HTML context (backward compatibility - use RenderContext instead)
export type { HtmlRenderContext, HtmlRenderContextConfig } from "./context";
export { createHtmlRenderContext, createEmptyHtmlRenderContext } from "./context";

// HTML fill rendering
export { resolvedFillToBackground, fillToBackground, resolvedLineToBorder, lineToBorder } from "./fill";

// Slide rendering
export type { HtmlRenderResult } from "./slide-render";
export { renderSlideToHtml } from "./slide-render";
