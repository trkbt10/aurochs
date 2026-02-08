/**
 * @file DOCX Editor Drag Handlers
 *
 * Handlers for drag interactions (text selection, element move).
 */

import type { HandlerMap } from "./handler-types";
import {
  createIdleDragState,
  createTextSelectDragState,
  createElementMoveDragState,
  updateTextSelectDrag,
  updateElementMoveDrag,
  isDragTextSelect,
  isDragElementMove,
  createRangeSelection,
} from "../../state";

// =============================================================================
// Drag Handlers
// =============================================================================

export const dragHandlers: HandlerMap = {
  // -------------------------------------------------------------------------
  // Text Selection Drag (3-phase)
  // -------------------------------------------------------------------------

  START_TEXT_SELECT_DRAG: (state, action) => ({
    ...state,
    drag: createTextSelectDragState(action.anchor),
    selection: {
      ...state.selection,
      mode: "text",
    },
  }),

  UPDATE_TEXT_SELECT_DRAG: (state, action) => {
    if (!isDragTextSelect(state.drag)) {
      return state;
    }

    return {
      ...state,
      drag: updateTextSelectDrag(state.drag, action.current),
      selection: {
        ...state.selection,
        text: createRangeSelection(state.drag.anchor, action.current),
        mode: "text",
      },
    };
  },

  END_TEXT_SELECT_DRAG: (state) => {
    if (!isDragTextSelect(state.drag)) {
      return state;
    }

    // Finalize selection from drag state
    const finalSelection = createRangeSelection(state.drag.anchor, state.drag.current);

    return {
      ...state,
      drag: createIdleDragState(),
      selection: {
        ...state.selection,
        text: finalSelection,
        mode: "text",
      },
    };
  },

  // -------------------------------------------------------------------------
  // Element Move Drag (3-phase)
  // -------------------------------------------------------------------------

  START_ELEMENT_MOVE: (state, action) => ({
    ...state,
    drag: createElementMoveDragState(action.elementIds, action.position),
  }),

  UPDATE_ELEMENT_MOVE: (state, action) => {
    if (!isDragElementMove(state.drag)) {
      return state;
    }

    return {
      ...state,
      drag: updateElementMoveDrag(state.drag, action.position, action.dropIndex),
    };
  },

  COMMIT_ELEMENT_MOVE: (state) => {
    if (!isDragElementMove(state.drag)) {
      return state;
    }

    // TODO: Actually move the elements in the document
    // This will be implemented in Phase 4 (Mutation Utilities)
    // For now, just clear the drag state

    return {
      ...state,
      drag: createIdleDragState(),
    };
  },

  CANCEL_ELEMENT_MOVE: (state) => {
    if (!isDragElementMove(state.drag)) {
      return state;
    }

    return {
      ...state,
      drag: createIdleDragState(),
    };
  },

  // -------------------------------------------------------------------------
  // Cancel Any Drag
  // -------------------------------------------------------------------------

  CANCEL_DRAG: (state) => ({
    ...state,
    drag: createIdleDragState(),
  }),
};
