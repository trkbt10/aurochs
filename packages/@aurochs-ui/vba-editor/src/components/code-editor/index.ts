/**
 * @file Code editor exports
 */

export { VbaCodeEditor, type VbaCodeEditorProps } from "./VbaCodeEditor";

// Line-related
export {
  LineNumbers,
  type LineNumbersProps,
  useLineIndex,
  type LineIndex,
  useLineTokenCache,
  useModuleTokenCache,
  type LineTokenCache,
  useVirtualLines,
  type VirtualLinesState,
  type VirtualLinesConfig,
  type UseVirtualLinesResult,
} from "./line";

// Editor elements
export {
  VirtualCodeDisplay,
  type VirtualCodeDisplayProps,
  useFontMetrics,
  type FontMetrics,
  // Renderers
  type RendererType,
  type CodeRendererProps,
  type CodeRendererComponent,
  HtmlCodeRenderer,
  SvgCodeRenderer,
  CanvasCodeRenderer,
  TOKEN_COLORS_RGB,
  getTokenColorRgb,
  getTokenColorCss,
} from "./element";

// Code-related
export {
  tokenizeLine,
  getTokenColor,
  type Token,
  type TokenType,
  useScopedSelectionChange,
  useDebouncedHistory,
  type UseDebouncedHistoryConfig,
  type UseDebouncedHistoryResult,
} from "./code";
