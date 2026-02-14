/**
 * @file VBA Editor Context
 *
 * Context provider and hook for VBA editor state management.
 */

import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  type ReactNode,
} from "react";
import type { VbaProgramIr, VbaModule, VbaProcedure } from "@aurochs-office/vba";
import { canUndo, canRedo } from "@aurochs-ui/editor-core/history";
import type { VbaEditorContextValue } from "./types";
import { vbaEditorReducer, createInitialState } from "./reducer";

// =============================================================================
// Context
// =============================================================================

const VbaEditorContext = createContext<VbaEditorContextValue | undefined>(
  undefined
);

// =============================================================================
// Provider
// =============================================================================

export type VbaEditorProviderProps = {
  readonly children: ReactNode;
  readonly program?: VbaProgramIr;
};

/**
 * VBA Editor Provider.
 *
 * Wraps children with VBA editor state context.
 */
export function VbaEditorProvider({
  children,
  program,
}: VbaEditorProviderProps): ReactNode {
  const [state, dispatch] = useReducer(
    vbaEditorReducer,
    program,
    createInitialState
  );

  // Derived: modules
  const modules = useMemo<readonly VbaModule[]>(
    () => state.program?.modules ?? [],
    [state.program]
  );

  // Derived: active module
  const activeModule = useMemo<VbaModule | undefined>(
    () => modules.find((m) => m.name === state.activeModuleName),
    [modules, state.activeModuleName]
  );

  // Derived: active module source (modified or original)
  const activeModuleSource = useMemo<string | undefined>(() => {
    if (!activeModule) {
      return undefined;
    }
    const entry = state.sourceHistory.present.get(activeModule.name);
    return entry?.source ?? activeModule.sourceCode;
  }, [activeModule, state.sourceHistory.present]);

  // Derived: procedures in active module
  const activeProcedures = useMemo<readonly VbaProcedure[]>(
    () => activeModule?.procedures ?? [],
    [activeModule]
  );

  // Context value
  const value = useMemo<VbaEditorContextValue>(
    () => ({
      state,
      dispatch,
      program: state.program,
      activeModule,
      activeModuleSource,
      activeProcedures,
      modules,
      canUndo: canUndo(state.sourceHistory),
      canRedo: canRedo(state.sourceHistory),
      pendingCursorOffset: state.pendingCursorOffset,
    }),
    [state, activeModule, activeModuleSource, activeProcedures, modules]
  );

  return (
    <VbaEditorContext.Provider value={value}>
      {children}
    </VbaEditorContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Use VBA Editor context.
 *
 * @throws Error if used outside VbaEditorProvider
 */
export function useVbaEditor(): VbaEditorContextValue {
  const context = useContext(VbaEditorContext);
  if (!context) {
    throw new Error("useVbaEditor must be used within VbaEditorProvider");
  }
  return context;
}

// =============================================================================
// Re-exports
// =============================================================================

export type {
  VbaEditorState,
  VbaEditorAction,
  VbaEditorContextValue,
  VbaEditorMode,
  CursorPosition,
  CodeSelectionRange,
  ModifiedSourceMap,
} from "./types";

export { vbaEditorReducer, createInitialState } from "./reducer";
