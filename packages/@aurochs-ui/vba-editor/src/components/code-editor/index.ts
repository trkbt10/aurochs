/**
 * @file Code editor exports
 */

export { VbaCodeEditor, type VbaCodeEditorProps } from "./VbaCodeEditor";
export { LineNumbers, type LineNumbersProps } from "./LineNumbers";
export {
  tokenizeLine,
  getTokenColor,
  type Token,
  type TokenType,
} from "./syntax-highlight";
export { useLineTokenCache, type LineTokenCache } from "./use-line-token-cache";
export { useScopedSelectionChange } from "./use-scoped-selection-change";
export { useDebouncedHistory, type UseDebouncedHistoryConfig, type UseDebouncedHistoryResult } from "./use-debounced-history";
export { useVirtualLines, type VirtualLinesState, type VirtualLinesConfig, type UseVirtualLinesResult } from "./use-virtual-lines";
export { VirtualCodeDisplay, type VirtualCodeDisplayProps } from "./VirtualCodeDisplay";

// Renderers
export {
  // Types
  type RendererType,
  type CodeRendererProps,
  type CodeRendererComponent,
  type RendererRegistry,
  // Components
  HtmlCodeRenderer,
  SvgCodeRenderer,
  CanvasCodeRenderer,
  // Registry
  RENDERER_REGISTRY,
  getRenderer,
  DEFAULT_RENDERER,
  // Token colors
  TOKEN_COLORS_RGB,
  getTokenColorRgb,
  getTokenColorCss,
} from "./renderers";
