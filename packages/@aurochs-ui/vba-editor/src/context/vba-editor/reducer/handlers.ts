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

/**
 * Replace module source without creating undo point.
 *
 * Used by debounced history to immediately update UI while
 * delaying the history push for grouping rapid keystrokes.
 */
export const handleReplaceModuleSource: ActionHandler<
  Extract<VbaEditorAction, { type: "REPLACE_MODULE_SOURCE" }>
> = (state, action) => {
  const newSourceMap = new Map(state.sourceHistory.present);
  newSourceMap.set(action.moduleName, {
    source: action.source,
    cursorOffset: action.cursorOffset,
  });

  return {
    ...state,
    sourceHistory: {
      ...state.sourceHistory,
      present: newSourceMap, // No history push - just replace present
    },
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
// Module Management Handlers
// =============================================================================

import type { VbaModule, VbaProgramIr } from "@aurochs-office/vba";
import { createModule } from "./module-factory";
import { SEARCH_HANDLERS } from "./search-handlers";

export const handleCreateModule: ActionHandler<
  Extract<VbaEditorAction, { type: "CREATE_MODULE" }>
> = (state, action) => {
  if (!state.program) {
    return state;
  }

  // Check for duplicate name
  const nameExists = state.program.modules.some(
    (m) => m.name === action.moduleName
  );
  if (nameExists) {
    return state;
  }

  // Create module
  const newModule = createModule(action.moduleName, action.moduleType);

  const newProgram: VbaProgramIr = {
    ...state.program,
    modules: [...state.program.modules, newModule],
  };

  return {
    ...state,
    program: newProgram,
    activeModuleName: newModule.name, // Auto-select new module
    cursor: createInitialCursor(),
    selection: undefined,
    selectedProcedureName: undefined,
  };
};

export const handleDeleteModule: ActionHandler<
  Extract<VbaEditorAction, { type: "DELETE_MODULE" }>
> = (state, action) => {
  if (!state.program) {
    return state;
  }

  const moduleIndex = state.program.modules.findIndex(
    (m) => m.name === action.moduleName
  );
  if (moduleIndex === -1) {
    return state;
  }

  // Cannot delete document modules
  const module = state.program.modules[moduleIndex];
  if (module.type === "document") {
    return state;
  }

  const newModules = state.program.modules.filter(
    (m) => m.name !== action.moduleName
  );

  // If deleted module was active, select another
  let newActiveModuleName = state.activeModuleName;
  if (state.activeModuleName === action.moduleName) {
    // Select previous module, or first module, or undefined
    newActiveModuleName =
      newModules[Math.max(0, moduleIndex - 1)]?.name ?? newModules[0]?.name;
  }

  // Clean up modified source for deleted module
  const newSourceMap = new Map(state.sourceHistory.present);
  newSourceMap.delete(action.moduleName);

  return {
    ...state,
    program: {
      ...state.program,
      modules: newModules,
    },
    sourceHistory: pushHistory(state.sourceHistory, newSourceMap),
    activeModuleName: newActiveModuleName,
    cursor: createInitialCursor(),
    selection: undefined,
    selectedProcedureName: undefined,
  };
};

export const handleRenameModule: ActionHandler<
  Extract<VbaEditorAction, { type: "RENAME_MODULE" }>
> = (state, action) => {
  if (!state.program) {
    return state;
  }

  // Check source module exists
  const moduleIndex = state.program.modules.findIndex(
    (m) => m.name === action.oldName
  );
  if (moduleIndex === -1) {
    return state;
  }

  // Cannot rename document modules
  const module = state.program.modules[moduleIndex];
  if (module.type === "document") {
    return state;
  }

  // Check target name not taken
  const nameExists = state.program.modules.some(
    (m) => m.name === action.newName
  );
  if (nameExists) {
    return state;
  }

  // Update module
  const newModule: VbaModule = {
    ...module,
    name: action.newName,
  };

  const newModules = [...state.program.modules];
  newModules[moduleIndex] = newModule;

  // Update source map key if needed
  const newSourceMap = new Map(state.sourceHistory.present);
  const sourceEntry = newSourceMap.get(action.oldName);
  if (sourceEntry) {
    newSourceMap.delete(action.oldName);
    newSourceMap.set(action.newName, sourceEntry);
  }

  // Update active module name if renamed
  const newActiveModuleName =
    state.activeModuleName === action.oldName
      ? action.newName
      : state.activeModuleName;

  return {
    ...state,
    program: {
      ...state.program,
      modules: newModules,
    },
    sourceHistory: pushHistory(state.sourceHistory, newSourceMap),
    activeModuleName: newActiveModuleName,
  };
};

export const handleReorderModules: ActionHandler<
  Extract<VbaEditorAction, { type: "REORDER_MODULES" }>
> = (state, action) => {
  if (!state.program) {
    return state;
  }

  // Build a map of module name -> module
  const moduleMap = new Map<string, VbaModule>();
  for (const mod of state.program.modules) {
    moduleMap.set(mod.name, mod);
  }

  // Reorder modules based on provided names
  // Any modules not in the list are appended at the end
  const reorderedModules: VbaModule[] = [];
  const usedNames = new Set<string>();

  for (const name of action.moduleNames) {
    const mod = moduleMap.get(name);
    if (mod && !usedNames.has(name)) {
      reorderedModules.push(mod);
      usedNames.add(name);
    }
  }

  // Append remaining modules
  for (const mod of state.program.modules) {
    if (!usedNames.has(mod.name)) {
      reorderedModules.push(mod);
    }
  }

  return {
    ...state,
    program: {
      ...state.program,
      modules: reorderedModules,
    },
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
  REPLACE_MODULE_SOURCE: handleReplaceModuleSource,
  UNDO: handleUndo,
  REDO: handleRedo,
  CLEAR_PENDING_CURSOR: handleClearPendingCursor,
  SET_MODE: handleSetMode,
  CREATE_MODULE: handleCreateModule,
  DELETE_MODULE: handleDeleteModule,
  RENAME_MODULE: handleRenameModule,
  REORDER_MODULES: handleReorderModules,
  // Search handlers
  ...SEARCH_HANDLERS,
};
