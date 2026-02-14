/**
 * @file VBA Editor Action Handlers
 *
 * Individual handlers for each action type.
 */

import {
  createHistory,
  pushHistory,
  undoHistory,
  redoHistory,
} from "@aurochs-ui/editor-core/history";
import type {
  VbaEditorState,
  VbaEditorAction,
  ModifiedSourceMap,
} from "../types";
import { createInitialCursor } from "../types";

// =============================================================================
// Handler Type
// =============================================================================

type ActionHandler<A extends VbaEditorAction = VbaEditorAction> = (
  state: VbaEditorState,
  action: A,
) => VbaEditorState;

// =============================================================================
// Program Loading Handlers
// =============================================================================

export const handleLoadProgram: ActionHandler<
  Extract<VbaEditorAction, { type: "LOAD_PROGRAM" }>
> = (state, action) => {
  const firstModule = action.program.modules[0]?.name;
  return {
    ...state,
    program: action.program,
    sourceHistory: createHistory<ModifiedSourceMap>(new Map()),
    activeModuleName: firstModule,
    cursor: createInitialCursor(),
    selection: undefined,
    selectedProcedureName: undefined,
  };
};

export const handleClearProgram: ActionHandler<
  Extract<VbaEditorAction, { type: "CLEAR_PROGRAM" }>
> = (state) => {
  return {
    ...state,
    program: undefined,
    sourceHistory: createHistory<ModifiedSourceMap>(new Map()),
    activeModuleName: undefined,
    cursor: createInitialCursor(),
    selection: undefined,
    selectedProcedureName: undefined,
  };
};

// =============================================================================
// Module Navigation Handlers
// =============================================================================

export const handleSelectModule: ActionHandler<
  Extract<VbaEditorAction, { type: "SELECT_MODULE" }>
> = (state, action) => {
  // Verify module exists
  const moduleExists = state.program?.modules.some(
    (m) => m.name === action.moduleName
  );
  if (!moduleExists) {
    return state;
  }

  return {
    ...state,
    activeModuleName: action.moduleName,
    cursor: createInitialCursor(),
    selection: undefined,
    selectedProcedureName: undefined,
  };
};

export const handleSelectProcedure: ActionHandler<
  Extract<VbaEditorAction, { type: "SELECT_PROCEDURE" }>
> = (state, action) => {
  return {
    ...state,
    selectedProcedureName: action.procedureName,
  };
};

// =============================================================================
// Cursor and Selection Handlers
// =============================================================================

export const handleSetCursor: ActionHandler<
  Extract<VbaEditorAction, { type: "SET_CURSOR" }>
> = (state, action) => {
  return {
    ...state,
    cursor: { line: action.line, column: action.column },
    selection: undefined,
  };
};

export const handleSetSelection: ActionHandler<
  Extract<VbaEditorAction, { type: "SET_SELECTION" }>
> = (state, action) => {
  return {
    ...state,
    selection: {
      startLine: action.startLine,
      startColumn: action.startColumn,
      endLine: action.endLine,
      endColumn: action.endColumn,
    },
  };
};

export const handleClearSelection: ActionHandler<
  Extract<VbaEditorAction, { type: "CLEAR_SELECTION" }>
> = (state) => {
  return {
    ...state,
    selection: undefined,
  };
};

// =============================================================================
// Text Editing Handlers
// =============================================================================

export const handleUpdateModuleSource: ActionHandler<
  Extract<VbaEditorAction, { type: "UPDATE_MODULE_SOURCE" }>
> = (state, action) => {
  const newSourceMap = new Map(state.sourceHistory.present);
  newSourceMap.set(action.moduleName, {
    source: action.source,
    cursorOffset: action.cursorOffset,
  });

  // Set pendingCursorOffset if this is an action that needs cursor restoration
  // (like Tab insertion where cursor position differs from natural position)
  const isActiveModule = state.activeModuleName === action.moduleName;
  const pendingOffset = isActiveModule ? action.cursorOffset : undefined;

  return {
    ...state,
    sourceHistory: pushHistory(state.sourceHistory, newSourceMap),
    pendingCursorOffset: pendingOffset,
  };
};

// =============================================================================
// History Handlers
// =============================================================================

/**
 * Get cursor offset for active module from history.
 * Returns 0 if no entry exists (e.g., when undoing to initial state).
 */
function getActiveCursorOffset(
  activeModuleName: string | undefined,
  sourceMap: ModifiedSourceMap
): number | undefined {
  if (!activeModuleName) {
    return undefined;
  }
  const entry = sourceMap.get(activeModuleName);
  // If no entry (undoing to initial state), return 0 to position cursor at start
  return entry?.cursorOffset ?? 0;
}

export const handleUndo: ActionHandler<
  Extract<VbaEditorAction, { type: "UNDO" }>
> = (state) => {
  const newHistory = undoHistory(state.sourceHistory);

  return {
    ...state,
    sourceHistory: newHistory,
    pendingCursorOffset: getActiveCursorOffset(state.activeModuleName, newHistory.present),
  };
};

export const handleRedo: ActionHandler<
  Extract<VbaEditorAction, { type: "REDO" }>
> = (state) => {
  const newHistory = redoHistory(state.sourceHistory);

  return {
    ...state,
    sourceHistory: newHistory,
    pendingCursorOffset: getActiveCursorOffset(state.activeModuleName, newHistory.present),
  };
};

// =============================================================================
// Cursor Restoration Handlers
// =============================================================================

export const handleClearPendingCursor: ActionHandler<
  Extract<VbaEditorAction, { type: "CLEAR_PENDING_CURSOR" }>
> = (state) => {
  return {
    ...state,
    pendingCursorOffset: undefined,
  };
};

// =============================================================================
// Mode Handlers
// =============================================================================

export const handleSetMode: ActionHandler<
  Extract<VbaEditorAction, { type: "SET_MODE" }>
> = (state, action) => {
  return {
    ...state,
    mode: action.mode,
  };
};

// =============================================================================
// Handler Map
// =============================================================================

export const HANDLERS: {
  readonly [K in VbaEditorAction["type"]]: ActionHandler<
    Extract<VbaEditorAction, { type: K }>
  >;
} = {
  LOAD_PROGRAM: handleLoadProgram,
  CLEAR_PROGRAM: handleClearProgram,
  SELECT_MODULE: handleSelectModule,
  SELECT_PROCEDURE: handleSelectProcedure,
  SET_CURSOR: handleSetCursor,
  SET_SELECTION: handleSetSelection,
  CLEAR_SELECTION: handleClearSelection,
  UPDATE_MODULE_SOURCE: handleUpdateModuleSource,
  UNDO: handleUndo,
  REDO: handleRedo,
  CLEAR_PENDING_CURSOR: handleClearPendingCursor,
  SET_MODE: handleSetMode,
};
