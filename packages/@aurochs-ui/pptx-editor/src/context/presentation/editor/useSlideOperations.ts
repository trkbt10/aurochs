/**
 * @file useSlideOperations hook
 *
 * Provides async slide operations that update both domain model and PPTX file structure.
 * Uses @aurochs-builder/pptx/slide-ops for file-level synchronization.
 */

import { useCallback } from "react";
import type { SlideId, PresentationDocument } from "@aurochs-office/pptx/app";
import {
  addSlide as addSlideToDocument,
  deleteSlide,
  moveSlide,
  duplicateSlide as duplicateSlideToDocument,
  getSlideIndex,
} from "./slide";
import { pushHistory } from "@aurochs-ui/editor-core/history";
import { createEmptySelection } from "../../slide/state";
import type { PresentationEditorState, PresentationEditorAction } from "./types";

export type SlideOperationsResult = {
  /** Add a new slide at the specified position */
  readonly addSlide: (layoutPath: string, atIndex?: number) => Promise<void>;
  /** Delete a slide by ID */
  readonly deleteSlide: (slideId: SlideId) => void;
  /** Duplicate a slide by ID */
  readonly duplicateSlide: (slideId: SlideId) => Promise<void>;
  /** Move a slide to a new position */
  readonly moveSlide: (slideId: SlideId, toIndex: number) => void;
  /** Delete multiple slides by IDs */
  readonly deleteSlides: (slideIds: readonly SlideId[]) => void;
  /** Duplicate multiple slides by IDs */
  readonly duplicateSlides: (slideIds: readonly SlideId[]) => Promise<void>;
};

/**
 * Hook for slide operations that require async file-level updates
 *
 * These operations update both the domain model and the underlying PPTX
 * file structure (presentation.xml, relationships, content types).
 */
export function useSlideOperations(
  state: PresentationEditorState,
  dispatch: (action: PresentationEditorAction) => void,
): SlideOperationsResult {
  const document = state.documentHistory.present;

  const handleAddSlide = useCallback(
    async (layoutPath: string, atIndex?: number) => {
      const result = await addSlideToDocument({
        document,
        layoutPath,
        position: atIndex,
      });

      // Update state via SET_DOCUMENT
      dispatch({ type: "SET_DOCUMENT", document: result.document });
      // Select the new slide
      dispatch({ type: "SELECT_SLIDE", slideId: result.newSlideId });
    },
    [document, dispatch],
  );

  const handleDeleteSlide = useCallback(
    (slideId: SlideId) => {
      if (document.slides.length <= 1) {
        return; // Don't delete last slide
      }

      const deletedIndex = getSlideIndex(document, slideId);
      const newDoc = deleteSlide(document, slideId);
      const wasActiveSlide = state.activeSlideId === slideId;

      // Update document
      dispatch({
        type: "SET_DOCUMENT",
        document: newDoc,
      });

      // Update active slide if needed
      if (wasActiveSlide) {
        const newIndex = Math.min(deletedIndex, newDoc.slides.length - 1);
        const newActiveId = newDoc.slides[newIndex]?.id;
        if (newActiveId) {
          dispatch({ type: "SELECT_SLIDE", slideId: newActiveId });
        }
      }
    },
    [document, state.activeSlideId, dispatch],
  );

  const handleMoveSlide = useCallback(
    (slideId: SlideId, toIndex: number) => {
      const newDoc = moveSlide(document, slideId, toIndex);
      dispatch({ type: "SET_DOCUMENT", document: newDoc });
    },
    [document, dispatch],
  );

  const handleDuplicateSlide = useCallback(
    async (slideId: SlideId) => {
      const result = await duplicateSlideToDocument(document, slideId);
      if (!result) {
        return;
      }

      dispatch({ type: "SET_DOCUMENT", document: result.document });
      dispatch({ type: "SELECT_SLIDE", slideId: result.newSlideId });
    },
    [document, dispatch],
  );

  const handleDeleteSlides = useCallback(
    (slideIds: readonly SlideId[]) => {
      // Delete slides one by one, keeping at least one
      const maxDeletions = document.slides.length - 1;
      const slidesToDelete = slideIds.slice(0, maxDeletions);

      let currentDoc = document;
      for (const slideId of slidesToDelete) {
        currentDoc = deleteSlide(currentDoc, slideId);
      }

      dispatch({ type: "SET_DOCUMENT", document: currentDoc });

      // If active slide was deleted, select another
      if (state.activeSlideId && slidesToDelete.includes(state.activeSlideId)) {
        const newActiveId = currentDoc.slides[0]?.id;
        if (newActiveId) {
          dispatch({ type: "SELECT_SLIDE", slideId: newActiveId });
        }
      }
    },
    [document, state.activeSlideId, dispatch],
  );

  const handleDuplicateSlides = useCallback(
    async (slideIds: readonly SlideId[]) => {
      let currentDoc = document;
      let lastNewSlideId: SlideId | undefined;

      for (const slideId of slideIds) {
        const result = await duplicateSlideToDocument(currentDoc, slideId);
        if (result) {
          currentDoc = result.document;
          lastNewSlideId = result.newSlideId;
        }
      }

      dispatch({ type: "SET_DOCUMENT", document: currentDoc });

      // Select the last duplicated slide
      if (lastNewSlideId) {
        dispatch({ type: "SELECT_SLIDE", slideId: lastNewSlideId });
      }
    },
    [document, dispatch],
  );

  return {
    addSlide: handleAddSlide,
    deleteSlide: handleDeleteSlide,
    duplicateSlide: handleDuplicateSlide,
    moveSlide: handleMoveSlide,
    deleteSlides: handleDeleteSlides,
    duplicateSlides: handleDuplicateSlides,
  };
}
