/**
 * @file Theme editor context
 *
 * React context provider for the potx-editor theme/layout editing state.
 */

import { createContext, useContext, useReducer, useMemo } from "react";
import type { ThemeEditorState, ThemeEditorAction, ThemeEditorInitProps } from "./types";
import { themeEditorReducer, createInitialThemeEditorState } from "./reducer";
import { canUndo as canUndoHistory, canRedo as canRedoHistory } from "@aurochs-ui/editor-core/history";

// =============================================================================
// Context Type
// =============================================================================

export type ThemeEditorContextValue = {
  readonly state: ThemeEditorState;
  readonly dispatch: (action: ThemeEditorAction) => void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
};

// =============================================================================
// Context
// =============================================================================

const ThemeEditorContext = createContext<ThemeEditorContextValue | undefined>(undefined);

// =============================================================================
// Provider
// =============================================================================

export type ThemeEditorProviderProps = {
  readonly initProps: ThemeEditorInitProps;
  readonly children: React.ReactNode;
};

/** Provider component that initializes and manages theme editor state. */
export function ThemeEditorProvider({ initProps, children }: ThemeEditorProviderProps) {
  const [state, dispatch] = useReducer(
    themeEditorReducer,
    initProps,
    (props) => createInitialThemeEditorState(props),
  );

  const value = useMemo<ThemeEditorContextValue>(() => ({
    state,
    dispatch,
    canUndo: canUndoHistory(state.layoutEdit.shapesHistory),
    canRedo: canRedoHistory(state.layoutEdit.shapesHistory),
  }), [state, dispatch]);

  return (
    <ThemeEditorContext.Provider value={value}>
      {children}
    </ThemeEditorContext.Provider>
  );
}

// =============================================================================
// Hooks
// =============================================================================

/** Hook to access the theme editor context; throws if used outside a provider. */
export function useThemeEditor(): ThemeEditorContextValue {
  const ctx = useContext(ThemeEditorContext);
  if (!ctx) {
    throw new Error("useThemeEditor must be used within a ThemeEditorProvider");
  }
  return ctx;
}

/** Hook to optionally access the theme editor context; returns undefined if outside a provider. */
export function useThemeEditorOptional(): ThemeEditorContextValue | undefined {
  return useContext(ThemeEditorContext);
}
