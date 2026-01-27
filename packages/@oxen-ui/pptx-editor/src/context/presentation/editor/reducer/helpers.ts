/**
 * @file Reducer helper functions
 *
 * Shared helper functions used across reducer handlers.
 */

import type { Slide } from "@oxen/pptx/domain";
import type { ShapeId } from "@oxen/pptx/domain/types";
import type { PresentationDocument, SlideWithId } from "@oxen/pptx/app";
import type { PresentationEditorState } from "../types";
import { findSlideById, updateSlide } from "../slide";
import {
  createInactiveTextEditState,
  isTextEditActive,
  type TextEditState,
} from "../../../../slide/text-edit";

/**
 * Get active slide from state
 */
export function getActiveSlide(
  state: PresentationEditorState
): SlideWithId | undefined {
  if (!state.activeSlideId) {
    return undefined;
  }
  return findSlideById(state.documentHistory.present, state.activeSlideId);
}

/**
 * Update active slide in document
 */
export function updateActiveSlideInDocument(
  document: PresentationDocument,
  activeSlideId: string | undefined,
  updater: (slide: Slide) => Slide
): PresentationDocument {
  if (!activeSlideId) {
    return document;
  }
  return updateSlide(document, activeSlideId, updater);
}

/**
 * Get primary ID after deletion
 */
export function getPrimaryIdAfterDeletion(
  remainingIds: readonly ShapeId[],
  currentPrimaryId: ShapeId | undefined
): ShapeId | undefined {
  if (remainingIds.includes(currentPrimaryId ?? "")) {
    return currentPrimaryId;
  }
  return remainingIds[0];
}

/**
 * Exit text edit if active, otherwise return current state
 */
export function exitTextEditIfActive(
  state: PresentationEditorState
): TextEditState {
  if (isTextEditActive(state.textEdit)) {
    return createInactiveTextEditState();
  }
  return state.textEdit;
}

/**
 * Exit text edit if active and selecting a different shape
 */
export function exitTextEditIfDifferentShape(
  state: PresentationEditorState,
  newShapeId: ShapeId
): TextEditState {
  if (
    isTextEditActive(state.textEdit) &&
    state.textEdit.shapeId !== newShapeId
  ) {
    return createInactiveTextEditState();
  }
  return state.textEdit;
}
