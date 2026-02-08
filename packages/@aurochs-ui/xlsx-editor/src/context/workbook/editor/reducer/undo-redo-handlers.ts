/**
 * @file Undo/Redo handlers
 *
 * Handlers for workbook-level undo/redo operations.
 */

import type { HandlerMap } from "./handler-types";
import { redoHistory, undoHistory } from "@aurochs-ui/editor-core/history";
import type { XlsxEditorState } from "../types";
import { createEmptyCellSelection, createIdleDragState } from "../types";

function normalizeActiveSheetIndex(activeSheetIndex: number | undefined, sheetCount: number): number | undefined {
  if (sheetCount <= 0) {
    return undefined;
  }
  if (activeSheetIndex === undefined) {
    return 0;
  }
  if (activeSheetIndex < 0) {
    return 0;
  }
  if (activeSheetIndex >= sheetCount) {
    return sheetCount - 1;
  }
  return activeSheetIndex;
}

function getUiStateAfterActiveSheetChange(
  state: XlsxEditorState,
  didActiveSheetChange: boolean,
): Pick<XlsxEditorState, "cellSelection" | "drag" | "editingCell"> {
  if (didActiveSheetChange) {
    return {
      cellSelection: createEmptyCellSelection(),
      drag: createIdleDragState(),
      editingCell: undefined,
    };
  }

  return {
    cellSelection: state.cellSelection,
    drag: state.drag,
    editingCell: state.editingCell,
  };
}

export const undoRedoHandlers: HandlerMap = {
  UNDO: (state) => {
    const workbookHistory = undoHistory(state.workbookHistory);
    const activeSheetIndex = normalizeActiveSheetIndex(state.activeSheetIndex, workbookHistory.present.sheets.length);

    const didActiveSheetChange = activeSheetIndex !== state.activeSheetIndex;
    const uiState = getUiStateAfterActiveSheetChange(state, didActiveSheetChange);
    return {
      ...state,
      workbookHistory,
      activeSheetIndex,
      ...uiState,
    };
  },
  REDO: (state) => {
    const workbookHistory = redoHistory(state.workbookHistory);
    const activeSheetIndex = normalizeActiveSheetIndex(state.activeSheetIndex, workbookHistory.present.sheets.length);

    const didActiveSheetChange = activeSheetIndex !== state.activeSheetIndex;
    const uiState = getUiStateAfterActiveSheetChange(state, didActiveSheetChange);
    return {
      ...state,
      workbookHistory,
      activeSheetIndex,
      ...uiState,
    };
  },
};
