/**
 * @file History handlers
 *
 * Handlers for undo/redo and document mutations.
 */

import type { SlideId, PresentationDocument } from "@aurochs-office/pptx/app";
import type { PresentationEditorState, PresentationEditorAction } from "../types";
import type { HandlerMap } from "./handler-types";
import { pushHistory, redoHistory, undoHistory } from "@aurochs-ui/editor-core/history";
import { createEmptySelection } from "@aurochs-ui/editor-core/selection";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import { findSlideById } from "../slide";
import { findShapeById } from "@aurochs-ui/pptx-slide-canvas/shape/query";
import { createInactiveTextEditState } from "@aurochs-ui/ooxml-components/text-edit";
import type { TextEditState } from "@aurochs-ui/ooxml-components/text-edit";

type SetDocumentAction = Extract<PresentationEditorAction, { type: "SET_DOCUMENT" }>;
type ApplyThemeAction = Extract<PresentationEditorAction, { type: "APPLY_THEME" }>;

// Note: UndoAction and RedoAction types not needed since handlers don't use action payload

/**
 * Get active slide ID after history change
 */
function getActiveSlideAfterHistoryChange(
  currentActiveId: SlideId | undefined,
  newDoc: PresentationDocument,
): SlideId | undefined {
  const slideExists = newDoc.slides.some((s) => s.id === currentActiveId);
  if (slideExists) {
    return currentActiveId;
  }
  return newDoc.slides[0]?.id;
}

function handleSetDocument(state: PresentationEditorState, action: SetDocumentAction): PresentationEditorState {
  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, action.document),
  };
}

function getTextEditAfterHistoryChange(
  state: PresentationEditorState,
  newDoc: PresentationDocument,
  activeSlideId: SlideId | undefined,
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

function handleUndo(state: PresentationEditorState): PresentationEditorState {
  const newHistory = undoHistory(state.documentHistory);
  if (newHistory === state.documentHistory) {
    return state;
  }
  const nextActiveSlideId = getActiveSlideAfterHistoryChange(state.activeSlideId, newHistory.present);
  const nextTextEdit = getTextEditAfterHistoryChange(state, newHistory.present, nextActiveSlideId);
  return {
    ...state,
    documentHistory: newHistory,
    activeSlideId: nextActiveSlideId,
    shapeSelection: createEmptySelection<ShapeId>(),
    textEdit: nextTextEdit,
  };
}

function handleRedo(state: PresentationEditorState): PresentationEditorState {
  const newHistory = redoHistory(state.documentHistory);
  if (newHistory === state.documentHistory) {
    return state;
  }
  const nextActiveSlideId = getActiveSlideAfterHistoryChange(state.activeSlideId, newHistory.present);
  const nextTextEdit = getTextEditAfterHistoryChange(state, newHistory.present, nextActiveSlideId);
  return {
    ...state,
    documentHistory: newHistory,
    activeSlideId: nextActiveSlideId,
    shapeSelection: createEmptySelection<ShapeId>(),
    textEdit: nextTextEdit,
  };
}

/**
 * Apply a complete theme replacement.
 *
 * Updates the document-level theme SoT, rendering context (colorContext, fontScheme),
 * and all apiSlide.theme XML documents atomically. This ensures both rendering paths
 * (document fallback and apiSlide renderContext) reflect the new theme.
 */
function handleApplyTheme(state: PresentationEditorState, action: ApplyThemeAction): PresentationEditorState {
  const doc = state.documentHistory.present;
  const newSlides = doc.slides.map((slideWithId) => {
    if (!slideWithId.apiSlide) { return slideWithId; }
    return {
      ...slideWithId,
      apiSlide: { ...slideWithId.apiSlide, theme: action.themeXml },
    };
  });
  const newDoc: PresentationDocument = {
    ...doc,
    theme: action.theme,
    colorContext: action.colorContext,
    fontScheme: action.theme.fontScheme,
    slides: newSlides,
  };
  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
  };
}

/**
 * History handlers
 */
export const HISTORY_HANDLERS: HandlerMap = {
  SET_DOCUMENT: handleSetDocument,
  APPLY_THEME: handleApplyTheme,
  UNDO: handleUndo,
  REDO: handleRedo,
};
