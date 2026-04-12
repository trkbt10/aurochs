/**
 * @file Undo/redo action handlers
 */

import { undoHistory, redoHistory } from "@aurochs-ui/editor-core/history";
import type { HandlerMap } from "./handler-types";

export const HISTORY_HANDLERS: HandlerMap = {
  UNDO(state) {
    return {
      ...state,
      documentHistory: undoHistory(state.documentHistory),
    };
  },

  REDO(state) {
    return {
      ...state,
      documentHistory: redoHistory(state.documentHistory),
    };
  },
};
