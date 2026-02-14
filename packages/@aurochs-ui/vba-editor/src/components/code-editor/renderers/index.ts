/**
 * @file Code Renderers Index
 *
 * Exports all renderer implementations and the registry for dynamic selection.
 */

export type {
  RendererType,
  CodeRendererProps,
  CodeRendererComponent,
  RgbColor,
  TokenColorMap,
  CursorRenderInfo,
  SelectionRenderRect,
  RendererRegistry,
} from "./types";
export {
  TOKEN_COLORS_RGB,
  TOKEN_STYLES_CSS,
  rgbToCss,
  rgbToHex,
  getTokenColorRgb,
  getTokenColorCss,
  getTokenStyleCss,
} from "./token-colors";
export { HtmlCodeRenderer } from "./HtmlCodeRenderer";
export { SvgCodeRenderer } from "./SvgCodeRenderer";
export { CanvasCodeRenderer } from "./CanvasCodeRenderer";

// =============================================================================
// Renderer Registry
// =============================================================================

import type { RendererType, CodeRendererComponent, RendererRegistry } from "./types";
import { HtmlCodeRenderer } from "./HtmlCodeRenderer";
import { SvgCodeRenderer } from "./SvgCodeRenderer";
import { CanvasCodeRenderer } from "./CanvasCodeRenderer";

/**
 * Built-in renderer registry.
 */
export const RENDERER_REGISTRY: RendererRegistry = {
  html: HtmlCodeRenderer,
  svg: SvgCodeRenderer,
  canvas: CanvasCodeRenderer,
};

/**
 * Get a renderer component by type.
 */
export function getRenderer(type: RendererType): CodeRendererComponent {
  return RENDERER_REGISTRY[type];
}

/**
 * Default renderer type.
 */
export const DEFAULT_RENDERER: RendererType = "html";
