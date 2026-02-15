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
  type ProcedureRange,
} from "./context/vba-editor";

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
  VbaModuleList,
  VbaProcedureDropdown,
  VbaEditorToolbar,
  VbaPropertiesPanel,
  VbaExecutionPanel,
  type VbaCodeEditorProps,
  type VbaModuleListProps,
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
// Renderers
// =============================================================================

export {
  type RendererType,
  type CodeRendererProps,
  type CodeRendererComponent,
  HtmlCodeRenderer,
  SvgCodeRenderer,
  CanvasCodeRenderer,
} from "./components/code-editor";
