/**
 * @file DOCX Editor Selection Handlers
 *
 * Handlers for element and text selection operations.
 */

import type { HandlerMap } from "./handler-types";
import type { TextEditState } from "../types";
import type { ElementId, ElementSelectionState } from "../../state";
import {
  createEmptyDocxSelection,
  createSingleElementSelection,
  createMultiElementSelection,
  addToElementSelection,
  toggleElementSelection,
  createCursorSelection,
  createRangeSelection,
  extendTextSelection,
  collapseTextSelection,
  createEmptyTextSelection,
  switchToElementMode,
  switchToTextMode,
} from "../../state";
import { createInitialTextEditState } from "../types";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get text edit state when selecting element.
 */
function getTextEditOnSelect(currentTextEdit: TextEditState, elementId: ElementId): TextEditState {
  if (currentTextEdit.editingElementId !== elementId) {
    return createInitialTextEditState();
  }
  return currentTextEdit;
}

/**
 * Compute new element selection based on action flags.
 */
function computeElementSelection({
  current,
  elementId,
  toggle,
  addToSelection,
}: {
  current: ElementSelectionState;
  elementId: ElementId;
  toggle?: boolean;
  addToSelection?: boolean;
}): ElementSelectionState {
  if (toggle) {
    return toggleElementSelection(current, elementId);
  }
  if (addToSelection) {
    return addToElementSelection(current, elementId);
  }
  return createSingleElementSelection(elementId);
}

// =============================================================================
// Selection Handlers
// =============================================================================

export const selectionHandlers: HandlerMap = {
  // -------------------------------------------------------------------------
  // Element Selection
  // -------------------------------------------------------------------------

  SELECT_ELEMENT: (state, action) => {
    const { elementId, addToSelection, toggle } = action;
    const textEdit = getTextEditOnSelect(state.textEdit, elementId);
    const newElementSelection = computeElementSelection({
      current: state.selection.element,
      elementId,
      toggle,
      addToSelection,
    });

    return {
      ...state,
      selection: {
        ...switchToElementMode(state.selection),
        element: newElementSelection,
      },
      textEdit,
    };
  },

  SELECT_ELEMENTS: (state, action) => ({
    ...state,
    selection: {
      ...switchToElementMode(state.selection),
      element: createMultiElementSelection(action.elementIds),
    },
    textEdit: createInitialTextEditState(),
  }),

  CLEAR_ELEMENT_SELECTION: (state) => ({
    ...state,
    selection: {
      ...state.selection,
      element: {
        selectedIds: [],
        primaryId: undefined,
      },
    },
  }),

  // -------------------------------------------------------------------------
  // Text Selection
  // -------------------------------------------------------------------------

  SET_CURSOR: (state, action) => ({
    ...state,
    selection: {
      ...switchToTextMode(state.selection),
      text: createCursorSelection(action.position),
    },
  }),

  SET_TEXT_SELECTION: (state, action) => ({
    ...state,
    selection: {
      ...switchToTextMode(state.selection),
      text: createRangeSelection(action.start, action.end),
    },
  }),

  EXTEND_TEXT_SELECTION: (state, action) => ({
    ...state,
    selection: {
      ...state.selection,
      text: extendTextSelection(state.selection.text, action.position),
      mode: "text",
    },
  }),

  COLLAPSE_TEXT_SELECTION: (state, action) => ({
    ...state,
    selection: {
      ...state.selection,
      text: collapseTextSelection(state.selection.text, action.toEnd),
    },
  }),

  CLEAR_TEXT_SELECTION: (state) => ({
    ...state,
    selection: {
      ...state.selection,
      text: createEmptyTextSelection(),
    },
  }),

  // -------------------------------------------------------------------------
  // Combined Reset
  // -------------------------------------------------------------------------

  RESET_STATE: (state) => ({
    ...state,
    selection: createEmptyDocxSelection(),
    textEdit: createInitialTextEditState(),
  }),
};
