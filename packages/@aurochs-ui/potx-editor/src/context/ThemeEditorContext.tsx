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

export function ThemeEditorProvider({ initProps, children }: ThemeEditorProviderProps) {
  const [state, dispatch] = useReducer(
    themeEditorReducer,
    { colorScheme: initProps.colorScheme, fontScheme: initProps.fontScheme },
    ({ colorScheme, fontScheme }) => createInitialThemeEditorState(colorScheme, fontScheme),
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

export function useThemeEditor(): ThemeEditorContextValue {
  const ctx = useContext(ThemeEditorContext);
  if (!ctx) {
    throw new Error("useThemeEditor must be used within a ThemeEditorProvider");
  }
  return ctx;
}

export function useThemeEditorOptional(): ThemeEditorContextValue | undefined {
  return useContext(ThemeEditorContext);
}
