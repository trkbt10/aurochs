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

// HTML context
export type {
  StyleCollector,
  HtmlRenderContext,
  HtmlRenderContextConfig,
} from "./context";
export {
  createStyleCollector,
  createHtmlRenderContext,
  createEmptyHtmlRenderContext,
} from "./context";

// HTML fill rendering
export {
  resolvedFillToBackground,
  fillToBackground,
  resolvedLineToBorder,
  lineToBorder,
} from "./fill";
