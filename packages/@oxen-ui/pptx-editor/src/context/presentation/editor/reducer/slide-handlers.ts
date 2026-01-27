/**
 * @file Slide management handlers
 *
 * Handlers for slide-level operations: add, delete, duplicate, move, select.
 */

import type { SlideId, PresentationDocument } from "@oxen/pptx/app";
import type { SlideSize } from "@oxen/pptx/domain";
import type {
  PresentationEditorState,
  PresentationEditorAction,
} from "../types";
import type { SelectionState } from "../../../slide/state";
import type { HandlerMap } from "./handler-types";
import {
  addSlide,
  deleteSlide,
  duplicateSlide,
  moveSlide,
  updateSlide,
  updateSlideEntry,
} from "../slide";
import { pushHistory, createEmptySelection, createIdleDragState } from "../../../slide/state";

type AddSlideAction = Extract<PresentationEditorAction, { type: "ADD_SLIDE" }>;

/**
 * Get new active slide ID after deletion
 */
function getActiveSlideAfterDelete(
  currentActiveId: SlideId | undefined,
  deletedSlideId: SlideId,
  deletedIndex: number,
  newDoc: PresentationDocument
): SlideId | undefined {
  if (currentActiveId !== deletedSlideId) {
    return currentActiveId;
  }
  const newIndex = Math.min(deletedIndex, newDoc.slides.length - 1);
  return newDoc.slides[newIndex]?.id;
}

/**
 * Get selection state after slide deletion
 */
function getSelectionAfterDelete(
  wasActiveSlideDeleted: boolean,
  currentSelection: SelectionState
): SelectionState {
  if (wasActiveSlideDeleted) {
    return createEmptySelection();
  }
  return currentSelection;
}
type DeleteSlideAction = Extract<PresentationEditorAction, { type: "DELETE_SLIDE" }>;
type DuplicateSlideAction = Extract<PresentationEditorAction, { type: "DUPLICATE_SLIDE" }>;
type MoveSlideAction = Extract<PresentationEditorAction, { type: "MOVE_SLIDE" }>;
type SelectSlideAction = Extract<PresentationEditorAction, { type: "SELECT_SLIDE" }>;
type UpdateSlideAction = Extract<PresentationEditorAction, { type: "UPDATE_SLIDE" }>;
type UpdateActiveSlideEntryAction = Extract<
  PresentationEditorAction,
  { type: "UPDATE_ACTIVE_SLIDE_ENTRY" }
>;
type SetSlideSizeAction = Extract<PresentationEditorAction, { type: "SET_SLIDE_SIZE" }>;

function handleAddSlide(
  state: PresentationEditorState,
  action: AddSlideAction
): PresentationEditorState {
  const { document: newDoc, newSlideId } = addSlide(
    state.documentHistory.present,
    action.slide,
    action.afterSlideId,
    action.atIndex
  );
  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
    activeSlideId: newSlideId,
    shapeSelection: createEmptySelection(),
  };
}

function handleDeleteSlide(
  state: PresentationEditorState,
  action: DeleteSlideAction
): PresentationEditorState {
  const currentDoc = state.documentHistory.present;
  if (currentDoc.slides.length <= 1) {
    return state; // Don't delete last slide
  }

  const deletedIndex = currentDoc.slides.findIndex(
    (s) => s.id === action.slideId
  );
  const newDoc = deleteSlide(currentDoc, action.slideId);
  const wasActiveSlideDeleted = state.activeSlideId === action.slideId;

  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
    activeSlideId: getActiveSlideAfterDelete(
      state.activeSlideId,
      action.slideId,
      deletedIndex,
      newDoc
    ),
    shapeSelection: getSelectionAfterDelete(
      wasActiveSlideDeleted,
      state.shapeSelection
    ),
  };
}

function handleDuplicateSlide(
  state: PresentationEditorState,
  action: DuplicateSlideAction
): PresentationEditorState {
  const result = duplicateSlide(state.documentHistory.present, action.slideId);
  if (!result) {
    return state;
  }
  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, result.document),
    activeSlideId: result.newSlideId,
    shapeSelection: createEmptySelection(),
  };
}

function handleMoveSlide(
  state: PresentationEditorState,
  action: MoveSlideAction
): PresentationEditorState {
  const newDoc = moveSlide(
    state.documentHistory.present,
    action.slideId,
    action.toIndex
  );
  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
  };
}

function handleSelectSlide(
  state: PresentationEditorState,
  action: SelectSlideAction
): PresentationEditorState {
  if (state.activeSlideId === action.slideId) {
    return state;
  }
  return {
    ...state,
    activeSlideId: action.slideId,
    shapeSelection: createEmptySelection(),
    drag: createIdleDragState(),
  };
}

function handleUpdateSlide(
  state: PresentationEditorState,
  action: UpdateSlideAction
): PresentationEditorState {
  const newDoc = updateSlide(
    state.documentHistory.present,
    action.slideId,
    action.updater
  );
  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
  };
}

function handleUpdateActiveSlideEntry(
  state: PresentationEditorState,
  action: UpdateActiveSlideEntryAction
): PresentationEditorState {
  const activeSlideId = state.activeSlideId;
  if (!activeSlideId) {
    return state;
  }
  const newDoc = updateSlideEntry(
    state.documentHistory.present,
    activeSlideId,
    action.updater
  );
  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
  };
}

/**
 * Update document with new slide size
 */
function updateSlideSizeInDocument(
  doc: PresentationDocument,
  slideSize: SlideSize
): PresentationDocument {
  return {
    ...doc,
    slideWidth: slideSize.width,
    slideHeight: slideSize.height,
    presentation: {
      ...doc.presentation,
      slideSize,
    },
  };
}

function handleSetSlideSize(
  state: PresentationEditorState,
  action: SetSlideSizeAction
): PresentationEditorState {
  const newDoc = updateSlideSizeInDocument(
    state.documentHistory.present,
    action.slideSize
  );
  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
  };
}

/**
 * Slide management handlers
 */
export const SLIDE_HANDLERS: HandlerMap = {
  ADD_SLIDE: handleAddSlide,
  DELETE_SLIDE: handleDeleteSlide,
  DUPLICATE_SLIDE: handleDuplicateSlide,
  MOVE_SLIDE: handleMoveSlide,
  SELECT_SLIDE: handleSelectSlide,
  UPDATE_SLIDE: handleUpdateSlide,
  UPDATE_ACTIVE_SLIDE_ENTRY: handleUpdateActiveSlideEntry,
  SET_SLIDE_SIZE: handleSetSlideSize,
};
