/**
 * @file DOCX Editor Text Edit Handlers
 *
 * Handlers for text editing operations.
 */

import type { HandlerMap } from "./handler-types";
import type { TextPosition, DocxSelectionState } from "../../state";
import { createInitialTextEditState } from "../types";
import { switchToTextMode, createCursorSelection } from "../../state";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create selection state for text edit start.
 */
function createSelectionForTextEdit(
  currentSelection: DocxSelectionState,
  position: TextPosition | undefined,
): DocxSelectionState {
  const baseSelection = switchToTextMode(currentSelection);
  if (position) {
    return {
      ...baseSelection,
      text: createCursorSelection(position),
    };
  }
  return baseSelection;
}

// =============================================================================
// Text Edit Handlers
// =============================================================================

export const textEditHandlers: HandlerMap = {
  START_TEXT_EDIT: (state, action) => {
    const { elementId, position } = action;

    const textEdit = {
      isEditing: true,
      editingElementId: elementId,
      cursorPosition: position,
    };

    const selection = createSelectionForTextEdit(state.selection, position);

    return {
      ...state,
      textEdit,
      selection,
    };
  },

  END_TEXT_EDIT: (state) => ({
    ...state,
    textEdit: createInitialTextEditState(),
  }),

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- action will be used in Phase 4
  INSERT_TEXT: (state, _action) => {
    if (!state.textEdit.isEditing) {
      return state;
    }
    // TODO: Implement actual text insertion in Phase 4
    return state;
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- action will be used in Phase 4
  DELETE_TEXT: (state, _action) => {
    if (!state.textEdit.isEditing) {
      return state;
    }
    // TODO: Implement actual text deletion in Phase 4
    return state;
  },

  DELETE_SELECTION: (state) => {
    if (!state.selection.text.range) {
      return state;
    }
    // TODO: Implement selection deletion in Phase 4
    return state;
  },
};
