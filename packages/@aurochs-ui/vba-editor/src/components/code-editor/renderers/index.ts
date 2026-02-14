/**
 * @file Code Renderers Index
 *
 * Exports renderer implementations. Each renderer is a separate export
 * to support tree-shaking - only imported renderers are bundled.
 */

export type {
  RendererType,
  CodeRendererProps,
  CodeRendererComponent,
  RgbColor,
  TokenColorMap,
  CursorRenderInfo,
  SelectionRenderRect,
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
