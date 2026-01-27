/**
 * @file History handlers
 *
 * Handlers for undo/redo and document mutations.
 */

import type { SlideId, PresentationDocument } from "@oxen/pptx/app";
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
import { findSlideById } from "../slide";
import { findShapeById } from "../../../../shape/query";
import { createInactiveTextEditState } from "../../../../slide/text-edit";
import type { TextEditState } from "../../../../slide/text-edit";

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

function getTextEditAfterHistoryChange(
  state: PresentationEditorState,
  newDoc: PresentationDocument,
  activeSlideId: SlideId | undefined
): TextEditState {
  if (state.textEdit.type !== "active" || !activeSlideId) {
    return state.textEdit;
  }
  const activeSlide = findSlideById(newDoc, activeSlideId);
  const shape = activeSlide ? findShapeById(activeSlide.slide.shapes, state.textEdit.shapeId) : undefined;
  if (!shape || shape.type !== "sp" || !shape.textBody) {
    return createInactiveTextEditState();
  }
  return { ...state.textEdit, initialTextBody: shape.textBody };
}

function handleUndo(
  state: PresentationEditorState
): PresentationEditorState {
  const newHistory = undoHistory(state.documentHistory);
  if (newHistory === state.documentHistory) {
    return state;
  }
  const nextActiveSlideId = getActiveSlideAfterHistoryChange(
    state.activeSlideId,
    newHistory.present
  );
  const nextTextEdit = getTextEditAfterHistoryChange(state, newHistory.present, nextActiveSlideId);
  return {
    ...state,
    documentHistory: newHistory,
    activeSlideId: nextActiveSlideId,
    shapeSelection: createEmptySelection(),
    textEdit: nextTextEdit,
  };
}

function handleRedo(
  state: PresentationEditorState
): PresentationEditorState {
  const newHistory = redoHistory(state.documentHistory);
  if (newHistory === state.documentHistory) {
    return state;
  }
  const nextActiveSlideId = getActiveSlideAfterHistoryChange(
    state.activeSlideId,
    newHistory.present
  );
  const nextTextEdit = getTextEditAfterHistoryChange(state, newHistory.present, nextActiveSlideId);
  return {
    ...state,
    documentHistory: newHistory,
    activeSlideId: nextActiveSlideId,
    shapeSelection: createEmptySelection(),
    textEdit: nextTextEdit,
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
