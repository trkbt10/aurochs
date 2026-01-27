/**
 * @file DOCX Editor History Handlers
 *
 * Handlers for undo/redo operations.
 */

import type { HandlerMap } from "./handler-types";
import {
  undoHistory,
  redoHistory,
  clearHistory,
  createEmptyDocxSelection,
  createIdleDragState,
} from "../../state";
import { createInitialTextEditState } from "../types";

// =============================================================================
// History Handlers
// =============================================================================

export const historyHandlers: HandlerMap = {
  UNDO: (state) => {
    const documentHistory = undoHistory(state.documentHistory);

    // If document didn't change, return as-is
    if (documentHistory === state.documentHistory) {
      return state;
    }

    // Reset UI state on undo
    return {
      ...state,
      documentHistory,
      selection: createEmptyDocxSelection(),
      drag: createIdleDragState(),
      textEdit: createInitialTextEditState(),
    };
  },

  REDO: (state) => {
    const documentHistory = redoHistory(state.documentHistory);

    // If document didn't change, return as-is
    if (documentHistory === state.documentHistory) {
      return state;
    }

    // Reset UI state on redo
    return {
      ...state,
      documentHistory,
      selection: createEmptyDocxSelection(),
      drag: createIdleDragState(),
      textEdit: createInitialTextEditState(),
    };
  },

  CLEAR_HISTORY: (state) => ({
    ...state,
    documentHistory: clearHistory(state.documentHistory),
  }),
};
