/**
 * @file Text edit handlers
 *
 * Handlers for text editing operations.
 */

import type {
  PresentationEditorState,
  PresentationEditorAction,
} from "../types";
import type { HandlerMap } from "./handler-types";
import { updateActiveSlideInDocument } from "./helpers";
import { findSlideById } from "../slide";
import { pushHistory } from "../../../slide/state";
import { findShapeById } from "../../../../shape/query";
import { updateShapeById } from "../../../../shape/mutation";
import { getShapeTransform } from "@oxen/pptx-render/svg";
import {
  createInactiveTextEditState,
  createActiveTextEditState,
} from "../../../../slide/text-edit";
import type { TextEditState } from "../../../../slide/text-edit";

type EnterTextEditAction = Extract<
  PresentationEditorAction,
  { type: "ENTER_TEXT_EDIT" }
>;
// Note: ExitTextEditAction type not needed since handler doesn't use action payload
type UpdateTextBodyAction = Extract<
  PresentationEditorAction,
  { type: "UPDATE_TEXT_BODY" }
>;
type UpdateTextBodyInEditAction = Extract<
  PresentationEditorAction,
  { type: "UPDATE_TEXT_BODY_IN_EDIT" }
>;
type ApplyRunFormatAction = Extract<
  PresentationEditorAction,
  { type: "APPLY_RUN_FORMAT" }
>;
type ApplyParagraphFormatAction = Extract<
  PresentationEditorAction,
  { type: "APPLY_PARAGRAPH_FORMAT" }
>;

function updateTextEditInPlace(
  state: PresentationEditorState,
  shapeId: UpdateTextBodyInEditAction["shapeId"],
  textBody: UpdateTextBodyInEditAction["textBody"]
): TextEditState {
  if (state.textEdit.type !== "active" || state.textEdit.shapeId !== shapeId) {
    return state.textEdit;
  }
  return { ...state.textEdit, initialTextBody: textBody };
}

/**
 * Get active slide for text editing
 */
function getActiveSlideForTextEdit(
  state: PresentationEditorState
): ReturnType<typeof findSlideById> {
  if (!state.activeSlideId) {
    return undefined;
  }
  return findSlideById(state.documentHistory.present, state.activeSlideId);
}

function handleEnterTextEdit(
  state: PresentationEditorState,
  action: EnterTextEditAction
): PresentationEditorState {
  const activeSlide = getActiveSlideForTextEdit(state);
  if (!activeSlide) {
    return state;
  }

  const shape = findShapeById(activeSlide.slide.shapes, action.shapeId);
  if (!shape || shape.type !== "sp" || !shape.textBody) {
    return state;
  }

  const transform = getShapeTransform(shape);
  if (!transform) {
    return state;
  }

  return {
    ...state,
    textEdit: createActiveTextEditState(
      action.shapeId,
      {
        x: transform.x,
        y: transform.y,
        width: transform.width,
        height: transform.height,
        rotation: transform.rotation as number,
      },
      shape.textBody
    ),
  };
}

function handleExitTextEdit(
  state: PresentationEditorState
): PresentationEditorState {
  return {
    ...state,
    textEdit: createInactiveTextEditState(),
  };
}

function handleUpdateTextBody(
  state: PresentationEditorState,
  action: UpdateTextBodyAction
): PresentationEditorState {
  const newDoc = updateActiveSlideInDocument(
    state.documentHistory.present,
    state.activeSlideId,
    (slide) => ({
      ...slide,
      shapes: updateShapeById(slide.shapes, action.shapeId, (shape) => {
        if (shape.type !== "sp") {
          return shape;
        }
        return { ...shape, textBody: action.textBody };
      }),
    })
  );

  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
    textEdit: createInactiveTextEditState(),
  };
}

/**
 * Update text body while keeping text edit active.
 * Creates an undo history entry.
 */
function handleUpdateTextBodyInEdit(
  state: PresentationEditorState,
  action: UpdateTextBodyInEditAction
): PresentationEditorState {
  const newDoc = updateActiveSlideInDocument(
    state.documentHistory.present,
    state.activeSlideId,
    (slide) => ({
      ...slide,
      shapes: updateShapeById(slide.shapes, action.shapeId, (shape) => {
        if (shape.type !== "sp") {
          return shape;
        }
        return { ...shape, textBody: action.textBody };
      }),
    })
  );

  const nextTextEdit = updateTextEditInPlace(state, action.shapeId, action.textBody);

  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
    textEdit: nextTextEdit,
  };
}

/**
 * Apply run formatting (e.g., bold, italic) without exiting text edit mode.
 * Creates an undo history entry.
 */
function handleApplyRunFormat(
  state: PresentationEditorState,
  action: ApplyRunFormatAction
): PresentationEditorState {
  const newDoc = updateActiveSlideInDocument(
    state.documentHistory.present,
    state.activeSlideId,
    (slide) => ({
      ...slide,
      shapes: updateShapeById(slide.shapes, action.shapeId, (shape) => {
        if (shape.type !== "sp") {
          return shape;
        }
        return { ...shape, textBody: action.textBody };
      }),
    })
  );

  // Stay in text edit mode (don't exit)
  const nextTextEdit = updateTextEditInPlace(state, action.shapeId, action.textBody);

  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
    textEdit: nextTextEdit,
  };
}

/**
 * Apply paragraph formatting (e.g., alignment) without exiting text edit mode.
 * Creates an undo history entry.
 */
function handleApplyParagraphFormat(
  state: PresentationEditorState,
  action: ApplyParagraphFormatAction
): PresentationEditorState {
  const newDoc = updateActiveSlideInDocument(
    state.documentHistory.present,
    state.activeSlideId,
    (slide) => ({
      ...slide,
      shapes: updateShapeById(slide.shapes, action.shapeId, (shape) => {
        if (shape.type !== "sp") {
          return shape;
        }
        return { ...shape, textBody: action.textBody };
      }),
    })
  );

  // Stay in text edit mode (don't exit)
  const nextTextEdit = updateTextEditInPlace(state, action.shapeId, action.textBody);

  return {
    ...state,
    documentHistory: pushHistory(state.documentHistory, newDoc),
    textEdit: nextTextEdit,
  };
}

/**
 * Text edit handlers
 */
export const TEXT_EDIT_HANDLERS: HandlerMap = {
  ENTER_TEXT_EDIT: handleEnterTextEdit,
  EXIT_TEXT_EDIT: handleExitTextEdit,
  UPDATE_TEXT_BODY: handleUpdateTextBody,
  UPDATE_TEXT_BODY_IN_EDIT: handleUpdateTextBodyInEdit,
  APPLY_RUN_FORMAT: handleApplyRunFormat,
  APPLY_PARAGRAPH_FORMAT: handleApplyParagraphFormat,
};
