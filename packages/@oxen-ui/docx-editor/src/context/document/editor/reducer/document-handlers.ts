/**
 * @file DOCX Editor Document Handlers
 *
 * Handlers for document-level operations.
 */

import type { HandlerMap } from "./handler-types";
import {
  createHistory,
  pushHistory,
  createEmptyDocxSelection,
  createIdleDragState,
} from "../../state";
import { createInitialTextEditState } from "../types";

// =============================================================================
// Document Handlers
// =============================================================================

/**
 * Get text edit state based on mode.
 */
function getTextEditForMode(state: Parameters<NonNullable<HandlerMap["SET_MODE"]>>[0], mode: string) {
  return mode === "readonly" ? createInitialTextEditState() : state.textEdit;
}

export const documentHandlers: HandlerMap = {
  SET_DOCUMENT: (state, action) => ({
    ...state,
    documentHistory: createHistory(action.document),
    selection: createEmptyDocxSelection(),
    drag: createIdleDragState(),
    textEdit: createInitialTextEditState(),
  }),

  REPLACE_DOCUMENT: (state, action) => ({
    ...state,
    documentHistory: pushHistory(state.documentHistory, action.document),
  }),

  SET_MODE: (state, action) => ({
    ...state,
    mode: action.mode,
    textEdit: getTextEditForMode(state, action.mode),
  }),

  SET_ACTIVE_SECTION: (state, action) => ({
    ...state,
    activeSectionIndex: action.index,
  }),

  // -------------------------------------------------------------------------
  // Paragraph Operations (implemented in Phase 4)
  // -------------------------------------------------------------------------

   
  INSERT_PARAGRAPH: (state, _action) => state,

   
  DELETE_PARAGRAPH: (state, _action) => state,

   
  MERGE_PARAGRAPHS: (state, _action) => state,

   
  SPLIT_PARAGRAPH: (state, _action) => state,

  // -------------------------------------------------------------------------
  // Table Operations (implemented in Phase 4)
  // -------------------------------------------------------------------------

   
  INSERT_TABLE: (state, _action) => state,

   
  DELETE_TABLE: (state, _action) => state,

   
  INSERT_TABLE_ROW: (state, _action) => state,

   
  DELETE_TABLE_ROW: (state, _action) => state,

   
  INSERT_TABLE_COLUMN: (state, _action) => state,

   
  DELETE_TABLE_COLUMN: (state, _action) => state,

   
  MERGE_TABLE_CELLS: (state, _action) => state,

   
  SPLIT_TABLE_CELL: (state, _action) => state,
};
