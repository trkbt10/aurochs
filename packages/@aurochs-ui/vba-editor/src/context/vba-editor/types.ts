/**
 * @file VBA Editor State and Action Types
 *
 * State management types for the VBA editor.
 * Follows patterns from docx-editor and xlsx-editor.
 */

import type { VbaProgramIr, VbaModule, VbaProcedure, VbaModuleType } from "@aurochs-office/vba";
import type { UndoRedoHistory } from "@aurochs-ui/editor-core/history";

// =============================================================================
// Editor Mode
// =============================================================================

/**
 * VBA editor mode.
 */
export type VbaEditorMode = "editing" | "readonly";

// =============================================================================
// Search Types
// =============================================================================

/**
 * Search match within text.
 */
export type SearchMatch = {
  /** Start offset in source text */
  readonly startOffset: number;
  /** End offset in source text */
  readonly endOffset: number;
  /** Line number (1-based) */
  readonly line: number;
  /** Start column (1-based) */
  readonly startColumn: number;
  /** End column (1-based) */
  readonly endColumn: number;
  /** Matched text */
  readonly text: string;
};

/**
 * Search options.
 */
export type SearchOptions = {
  readonly caseSensitive: boolean;
  readonly useRegex: boolean;
  readonly wholeWord: boolean;
};

/**
 * Search mode.
 */
export type SearchMode = "in-file" | "project-wide";

/**
 * Project-wide match with module context.
 */
export type ProjectSearchMatch = SearchMatch & {
  readonly moduleName: string;
  /** Line text for preview */
  readonly lineText: string;
};

/**
 * Search state.
 */
export type SearchState = {
  /** Is search panel visible */
  readonly isOpen: boolean;
  /** Search mode */
  readonly mode: SearchMode;
  /** Search query string */
  readonly query: string;
  /** Replace string */
  readonly replaceText: string;
  /** Search options */
  readonly options: SearchOptions;
  /** Current matches in active module */
  readonly matches: readonly SearchMatch[];
  /** Currently selected match index (-1 = none) */
  readonly currentMatchIndex: number;
  /** Project-wide matches (grouped by module) */
  readonly projectMatches: ReadonlyMap<string, readonly ProjectSearchMatch[]>;
  /** Total project match count */
  readonly projectMatchCount: number;
};

/**
 * Initial search state.
 */
export const INITIAL_SEARCH_STATE: SearchState = {
  isOpen: false,
  mode: "in-file",
  query: "",
  replaceText: "",
  options: { caseSensitive: false, useRegex: false, wholeWord: false },
  matches: [],
  currentMatchIndex: -1,
  projectMatches: new Map(),
  projectMatchCount: 0,
};

// =============================================================================
// Cursor and Selection
// =============================================================================

/**
 * Cursor position in code (1-based line/column).
 */
export type CursorPosition = {
  readonly line: number;
  readonly column: number;
};

/**
 * Text selection range within code (1-based, inclusive).
 */
export type CodeSelectionRange = {
  readonly startLine: number;
  readonly startColumn: number;
  readonly endLine: number;
  readonly endColumn: number;
};

// =============================================================================
// Module Source State
// =============================================================================

/**
 * Source entry with cursor position for undo/redo restoration.
 */
export type SourceEntry = {
  readonly source: string;
  readonly cursorOffset: number;
};

/**
 * Track modified source code per module.
 *
 * Key is module name, value is source with cursor position.
 * Modules not in this map use original source from VbaProgramIr.
 */
export type ModifiedSourceMap = ReadonlyMap<string, SourceEntry>;

// =============================================================================
// Main Editor State
// =============================================================================

/**
 * VBA Editor State.
 */
export type VbaEditorState = {
  /** Original VBA program IR (read-only after load) */
  readonly program: VbaProgramIr | undefined;
  /** Modified source code per module (undo/redo tracked) */
  readonly sourceHistory: UndoRedoHistory<ModifiedSourceMap>;
  /** Active module name */
  readonly activeModuleName: string | undefined;
  /** Cursor position */
  readonly cursor: CursorPosition;
  /** Selection range (undefined = no selection) */
  readonly selection: CodeSelectionRange | undefined;
  /** Editor mode */
  readonly mode: VbaEditorMode;
  /** Selected procedure name (for procedure dropdown) */
  readonly selectedProcedureName: string | undefined;
  /** Pending cursor offset to restore after undo/redo (undefined = no restore needed) */
  readonly pendingCursorOffset: number | undefined;
  /** Search state */
  readonly search: SearchState;
};

// =============================================================================
// Action Types
// =============================================================================

/**
 * VBA Editor actions.
 */
export type VbaEditorAction =
  // Program loading
  | { readonly type: "LOAD_PROGRAM"; readonly program: VbaProgramIr }
  | { readonly type: "CLEAR_PROGRAM" }

  // Module navigation
  | { readonly type: "SELECT_MODULE"; readonly moduleName: string }
  | { readonly type: "SELECT_PROCEDURE"; readonly procedureName: string }

  // Cursor and selection
  | { readonly type: "SET_CURSOR"; readonly line: number; readonly column: number }
  | {
      readonly type: "SET_SELECTION";
      readonly startLine: number;
      readonly startColumn: number;
      readonly endLine: number;
      readonly endColumn: number;
    }
  | { readonly type: "CLEAR_SELECTION" }

  // Text editing
  | {
      readonly type: "UPDATE_MODULE_SOURCE";
      readonly moduleName: string;
      readonly source: string;
      readonly cursorOffset: number;
    }
  | {
      readonly type: "REPLACE_MODULE_SOURCE";
      readonly moduleName: string;
      readonly source: string;
      readonly cursorOffset: number;
    }

  // History
  | { readonly type: "UNDO" }
  | { readonly type: "REDO" }

  // Cursor restoration
  | { readonly type: "CLEAR_PENDING_CURSOR" }

  // Mode
  | { readonly type: "SET_MODE"; readonly mode: VbaEditorMode }

  // Module management
  | {
      readonly type: "CREATE_MODULE";
      readonly moduleType: VbaModuleType;
      readonly moduleName: string;
    }
  | { readonly type: "DELETE_MODULE"; readonly moduleName: string }
  | {
      readonly type: "RENAME_MODULE";
      readonly oldName: string;
      readonly newName: string;
    }
  | {
      readonly type: "REORDER_MODULES";
      readonly moduleNames: readonly string[];
    }

  // Search
  | { readonly type: "OPEN_SEARCH"; readonly mode?: SearchMode }
  | { readonly type: "CLOSE_SEARCH" }
  | { readonly type: "SET_SEARCH_QUERY"; readonly query: string }
  | { readonly type: "SET_REPLACE_TEXT"; readonly replaceText: string }
  | {
      readonly type: "SET_SEARCH_OPTIONS";
      readonly options: Partial<SearchOptions>;
    }
  | { readonly type: "SET_SEARCH_MODE"; readonly mode: SearchMode }
  | {
      readonly type: "UPDATE_MATCHES";
      readonly matches: readonly SearchMatch[];
    }
  | {
      readonly type: "UPDATE_PROJECT_MATCHES";
      readonly projectMatches: ReadonlyMap<string, readonly ProjectSearchMatch[]>;
      readonly totalCount: number;
    }
  | { readonly type: "NAVIGATE_MATCH"; readonly direction: "next" | "previous" }
  | { readonly type: "SELECT_MATCH"; readonly matchIndex: number }
  | { readonly type: "REPLACE_CURRENT" }
  | { readonly type: "REPLACE_ALL" };

/**
 * Action type string union.
 */
export type VbaEditorActionType = VbaEditorAction["type"];

// =============================================================================
// Context Value
// =============================================================================

/**
 * VBA Editor Context Value.
 *
 * Provides state, dispatch, and derived selectors.
 */
export type VbaEditorContextValue = {
  readonly state: VbaEditorState;
  readonly dispatch: (action: VbaEditorAction) => void;

  // Derived selectors
  /** Current program */
  readonly program: VbaProgramIr | undefined;
  /** Active module */
  readonly activeModule: VbaModule | undefined;
  /** Active module source code (potentially modified) */
  readonly activeModuleSource: string | undefined;
  /** Procedures in active module */
  readonly activeProcedures: readonly VbaProcedure[];
  /** All modules */
  readonly modules: readonly VbaModule[];
  /** Can undo */
  readonly canUndo: boolean;
  /** Can redo */
  readonly canRedo: boolean;
  /** Pending cursor offset to restore after undo/redo */
  readonly pendingCursorOffset: number | undefined;
};

// =============================================================================
// Initial State Factories
// =============================================================================

/**
 * Create initial cursor position.
 */
export function createInitialCursor(): CursorPosition {
  return { line: 1, column: 1 };
}
