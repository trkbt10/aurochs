/**
 * @file Code-related exports
 */

export {
  tokenizeLine,
  getTokenColor,
  type Token,
  type TokenType,
} from "./syntax-highlight";
export {
  useCodeComposition,
  INITIAL_COMPOSITION_STATE,
  type CompositionState,
} from "./use-code-composition";
export { useCodeKeyHandlers } from "./use-code-key-handlers";
export {
  useCodeEditInput,
  INITIAL_CURSOR_STATE,
  type CodeCursorState,
} from "./use-code-edit-input";
export { useScopedSelectionChange } from "./use-scoped-selection-change";
export {
  useDebouncedHistory,
  type UseDebouncedHistoryConfig,
  type UseDebouncedHistoryResult,
} from "./use-debounced-history";
