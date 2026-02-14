/**
 * @file Editor element exports
 */

export { VirtualCodeDisplay, type VirtualCodeDisplayProps } from "./VirtualCodeDisplay";
export {
  DEFAULT_CHAR_WIDTH,
  DEFAULT_LINE_HEIGHT,
  CODE_AREA_PADDING_LEFT,
  CODE_AREA_PADDING_TOP,
  offsetToLineColumn,
  lineColumnToOffset,
  lineColumnToCoordinates,
  calculateSelectionRects,
  measureCharWidth,
  type CursorCoordinates,
  type SelectionRect,
  type MeasureTextFn,
  type CoordinateOptions,
  type LineColumnToCoordinatesOptions,
  type SelectionRectsOptions,
} from "./cursor-utils";
export { useFontMetrics, type FontMetrics } from "./use-font-metrics";

// Renderers
export {
  type RendererType,
  type CodeRendererProps,
  type CodeRendererComponent,
  type RgbColor,
  type TokenColorMap,
  type CursorRenderInfo,
  type SelectionRenderRect,
  TOKEN_COLORS_RGB,
  TOKEN_STYLES_CSS,
  rgbToCss,
  rgbToHex,
  getTokenColorRgb,
  getTokenColorCss,
  getTokenStyleCss,
  HtmlCodeRenderer,
  SvgCodeRenderer,
  CanvasCodeRenderer,
} from "./renderers";
