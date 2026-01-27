/**
 * @file DOCX Editor Reducer
 *
 * Main reducer that combines all action handlers.
 */

import type { DocxDocument } from "@oxen/docx/domain/document";
import type { DocxEditorState, DocxEditorAction } from "../types";
import type { HandlerMap } from "./handler-types";
import { combineHandlers } from "./handler-types";
import { historyHandlers } from "./history-handlers";
import { selectionHandlers } from "./selection-handlers";
import { dragHandlers } from "./drag-handlers";
import { clipboardHandlers } from "./clipboard-handlers";
import { textEditHandlers } from "./text-edit-handlers";
import { formatHandlers } from "./format-handlers";
import { documentHandlers } from "./document-handlers";
import {
  createHistory,
  createEmptyDocxSelection,
  createIdleDragState,
} from "../../state";
import { createInitialTextEditState } from "../types";

// =============================================================================
// Combined Handler Map
// =============================================================================

/**
 * All handlers combined into a single map.
 *
 * Handler order matters only for overlapping action types.
 * Later handlers override earlier ones.
 */
const ALL_HANDLERS: HandlerMap = combineHandlers(
  documentHandlers,
  historyHandlers,
  selectionHandlers,
  dragHandlers,
  clipboardHandlers,
  textEditHandlers,
  formatHandlers,
);

// =============================================================================
// Initial State
// =============================================================================

/**
 * Create initial editor state.
 */
export function createInitialState(document: DocxDocument): DocxEditorState {
  return {
    documentHistory: createHistory(document),
    selection: createEmptyDocxSelection(),
    drag: createIdleDragState(),
    clipboard: undefined,
    textEdit: createInitialTextEditState(),
    mode: "editing",
    activeSectionIndex: 0,
  };
}

/**
 * Create initial state with an empty document.
 */
export function createEmptyEditorState(): DocxEditorState {
  const emptyDocument: DocxDocument = {
    body: {
      content: [],
    },
  };

  return createInitialState(emptyDocument);
}

// =============================================================================
// Main Reducer
// =============================================================================

/**
 * Main reducer function.
 *
 * Dispatches actions to appropriate handlers.
 * Returns unchanged state for unknown actions.
 */
export function reducer(
  state: DocxEditorState,
  action: DocxEditorAction,
): DocxEditorState {
  const handler = ALL_HANDLERS[action.type];

  if (handler) {
    // Type assertion needed due to handler map typing
    return handler(state, action as never);
  }

  // Unknown action, return unchanged state
  return state;
}

// =============================================================================
// Exports
// =============================================================================

export { ALL_HANDLERS };
