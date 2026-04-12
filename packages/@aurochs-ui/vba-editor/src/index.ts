/**
 * @file VBA Editor Package - Main exports
 *
 * @module @aurochs-ui/vba-editor
 */

// =============================================================================
// Main Editor Component
// =============================================================================

export { VbaEditor, type VbaEditorProps } from "./components/VbaEditor";

// =============================================================================
// Context and State Management
// =============================================================================

export {
  VbaEditorProvider,
  useVbaEditor,
  useCurrentProcedure,
  type VbaEditorProviderProps,
} from "./context/vba-editor";
export type { ProcedureRange } from "./utils/procedure-range";

export type {
  VbaEditorState,
  VbaEditorAction,
  VbaEditorContextValue,
  VbaEditorMode,
  CursorPosition,
  CodeSelectionRange,
  ModifiedSourceMap,
} from "./context/vba-editor";

export { vbaEditorReducer, createInitialState } from "./context/vba-editor";

// =============================================================================
// Individual Components
// =============================================================================

export {
  VbaCodeEditor,
  VbaProcedureDropdown,
  VbaEditorToolbar,
  VbaPropertiesPanel,
  VbaExecutionPanel,
  type VbaCodeEditorProps,
  type VbaProcedureDropdownProps,
  type VbaEditorToolbarProps,
  type VbaPropertiesPanelProps,
  type VbaExecutionPanelProps,
  type ExecutionState,
} from "./components";

// =============================================================================
// Syntax Highlighting
// =============================================================================

export {
  tokenizeLine,
  getTokenColor,
  type Token,
  type TokenType,
} from "./components/code-editor";

// =============================================================================
// VBA Tokenizer (for external use with CodeEditor from react-editor-ui)
// =============================================================================

export { vbaTokenizer, vbaTokenStyles } from "./components/code-editor/vba-tokenizer";
