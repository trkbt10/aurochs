/**
 * @file XLSX workbook editor context
 *
 * Provides workbook editor state + dispatch and small derived selectors.
 */

import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import type { XlsxWorkbook, XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import type { CellSelectionState, XlsxEditorAction, XlsxEditorState } from "./editor/types";
import { xlsxEditorReducer, createInitialState } from "./editor/reducer";
import { canRedo, canUndo } from "./state/history";

export type XlsxWorkbookEditorContextValue = {
  readonly state: XlsxEditorState;
  readonly dispatch: (action: XlsxEditorAction) => void;

  readonly workbook: XlsxWorkbook;
  readonly activeSheetIndex: number | undefined;
  readonly activeSheet: XlsxWorksheet | undefined;
  readonly selection: CellSelectionState;

  readonly canUndo: boolean;
  readonly canRedo: boolean;
};

const XlsxWorkbookEditorContext = createContext<XlsxWorkbookEditorContextValue | null>(null);

/**
 * Context provider for the XLSX workbook editor.
 *
 * Owns the reducer state and exposes it (plus derived selectors) to child components.
 */
export function XlsxWorkbookEditorProvider({
  children,
  initialWorkbook,
  onWorkbookChange,
}: {
  readonly children: ReactNode;
  readonly initialWorkbook: XlsxWorkbook;
  readonly onWorkbookChange?: (workbook: XlsxWorkbook) => void;
}) {
  const [state, dispatch] = useReducer(
    xlsxEditorReducer,
    initialWorkbook,
    createInitialState,
  );

  const workbook = state.workbookHistory.present;
  const activeSheetIndex = state.activeSheetIndex;
  const activeSheet =
    activeSheetIndex === undefined ? undefined : workbook.sheets[activeSheetIndex];

  useEffect(() => {
    onWorkbookChange?.(workbook);
  }, [onWorkbookChange, workbook]);

  const value = useMemo<XlsxWorkbookEditorContextValue>(
    () => ({
      state,
      dispatch,
      workbook,
      activeSheetIndex,
      activeSheet,
      selection: state.cellSelection,
      canUndo: canUndo(state.workbookHistory),
      canRedo: canRedo(state.workbookHistory),
    }),
    [activeSheet, activeSheetIndex, dispatch, state, workbook],
  );

  return (
    <XlsxWorkbookEditorContext.Provider value={value}>
      {children}
    </XlsxWorkbookEditorContext.Provider>
  );
}

/**
 * Hook to access the XLSX workbook editor context.
 *
 * Throws when used outside `XlsxWorkbookEditorProvider`.
 */
export function useXlsxWorkbookEditor(): XlsxWorkbookEditorContextValue {
  const context = useContext(XlsxWorkbookEditorContext);
  if (!context) {
    throw new Error("useXlsxWorkbookEditor must be used within XlsxWorkbookEditorProvider");
  }
  return context;
}

/**
 * Hook to access the XLSX workbook editor context, returning `null` outside the provider.
 */
export function useXlsxWorkbookEditorOptional(): XlsxWorkbookEditorContextValue | null {
  return useContext(XlsxWorkbookEditorContext);
}
