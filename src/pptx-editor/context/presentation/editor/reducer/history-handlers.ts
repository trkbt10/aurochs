/**
 * @file History handlers
 *
 * Handlers for undo/redo and document mutations.
 */

import type { SlideId, PresentationDocument } from "../../../../../pptx/app";
import type {
  PresentationEditorState,
  PresentationEditorAction,
} from "../types";
import type { HandlerMap } from "./handler-types";
import {
  pushHistory,
  undoHistory,
  redoHistory,
  createEmptySelection,
} from "../../../slide/state";

type SetDocumentAction = Extract<
  PresentationEditorAction,
  { type: "SET_DOCUMENT" }
>;

// Note: UndoAction and RedoAction types not needed since handlers don't use action payload

/**
 * Get active slide ID after history change
 */
function getActiveSlideAfterHistoryChange(
  currentActiveId: SlideId | undefined,
  newDoc: PresentationDocument
): SlideId | undefined {
  const slideExists = newDoc.slides.some((s) => s.id === currentActiveId);
  if (slideExists) {
    return currentActiveId;
  }
  return newDoc.slides[0]?.id;
}

function handleSetDocument(
  state: PresentationEditorState,
  action: SetDocumentAction
): PresentationEditorState {
  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, action.document),
  };
}

function handleUndo(
  state: PresentationEditorState
): PresentationEditorState {
  const newHistory = undoHistory(state.documentHistory);
  if (newHistory === state.documentHistory) {
    return state;
  }
  return {
    ...state,
    documentHistory: newHistory,
    activeSlideId: getActiveSlideAfterHistoryChange(
      state.activeSlideId,
      newHistory.present
    ),
    shapeSelection: createEmptySelection(),
  };
}

function handleRedo(
  state: PresentationEditorState
): PresentationEditorState {
  const newHistory = redoHistory(state.documentHistory);
  if (newHistory === state.documentHistory) {
    return state;
  }
  return {
    ...state,
    documentHistory: newHistory,
    activeSlideId: getActiveSlideAfterHistoryChange(
      state.activeSlideId,
      newHistory.present
    ),
    shapeSelection: createEmptySelection(),
  };
}

/**
 * History handlers
 */
export const HISTORY_HANDLERS: HandlerMap = {
  SET_DOCUMENT: handleSetDocument,
  UNDO: handleUndo,
  REDO: handleRedo,
};
