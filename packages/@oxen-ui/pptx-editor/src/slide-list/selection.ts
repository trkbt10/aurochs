/**
 * @file Slide selection operations
 *
 * Pure functions for managing slide selection state.
 * These can be tested without React.
 */

import type { SlideId, SlideWithId } from "@oxen/pptx/app";
import type { SlideSelectionState } from "./types";
import { createEmptySlideSelection, createSingleSlideSelection } from "./types";

/**
 * Select a single slide, replacing current selection
 */
export function selectSingle(
  slideId: SlideId,
  index: number
): SlideSelectionState {
  return createSingleSlideSelection(slideId, index);
}

/**
 * Select a range of slides from anchor to target
 */
export function selectRange(
  slides: readonly SlideWithId[],
  fromIndex: number,
  toIndex: number
): SlideSelectionState {
  const start = Math.min(fromIndex, toIndex);
  const end = Math.max(fromIndex, toIndex);
  const rangeIds = slides.slice(start, end + 1).map((s) => s.id);
  const primaryId = slides[toIndex]?.id;

  return {
    selectedIds: rangeIds,
    primaryId,
    anchorIndex: fromIndex,
  };
}

/**
 * Toggle a slide in the selection (add if not selected, remove if selected)
 */
export function toggleSelection(
  currentSelection: SlideSelectionState,
  slideId: SlideId,
  index: number
): SlideSelectionState {
  const isCurrentlySelected = currentSelection.selectedIds.includes(slideId);

  if (isCurrentlySelected) {
    const newIds = currentSelection.selectedIds.filter((id) => id !== slideId);
    return {
      selectedIds: newIds,
      primaryId: newIds.length > 0 ? newIds[newIds.length - 1] : undefined,
      anchorIndex: newIds.length > 0 ? index : undefined,
    };
  }

  return {
    selectedIds: [...currentSelection.selectedIds, slideId],
    primaryId: slideId,
    anchorIndex: index,
  };
}

/**
 * Add a slide to the selection
 */
export function addToSelection(
  currentSelection: SlideSelectionState,
  slideId: SlideId,
  index: number
): SlideSelectionState {
  if (currentSelection.selectedIds.includes(slideId)) {
    return currentSelection;
  }

  return {
    selectedIds: [...currentSelection.selectedIds, slideId],
    primaryId: slideId,
    anchorIndex: index,
  };
}

/**
 * Remove a slide from the selection
 */
export function removeFromSelection(
  currentSelection: SlideSelectionState,
  slideId: SlideId
): SlideSelectionState {
  const newIds = currentSelection.selectedIds.filter((id) => id !== slideId);

  if (newIds.length === currentSelection.selectedIds.length) {
    return currentSelection; // Not in selection
  }

  return {
    selectedIds: newIds,
    primaryId:
      currentSelection.primaryId === slideId
        ? newIds[newIds.length - 1]
        : currentSelection.primaryId,
    anchorIndex: newIds.length > 0 ? currentSelection.anchorIndex : undefined,
  };
}

/**
 * Check if a slide is selected
 */
export function isSelected(
  selection: SlideSelectionState,
  slideId: SlideId
): boolean {
  return selection.selectedIds.includes(slideId);
}

/**
 * Check if selection is empty
 */
export function isSelectionEmpty(selection: SlideSelectionState): boolean {
  return selection.selectedIds.length === 0;
}

/**
 * Select all slides
 */
export function selectAll(slides: readonly SlideWithId[]): SlideSelectionState {
  if (slides.length === 0) {
    return createEmptySlideSelection();
  }

  return {
    selectedIds: slides.map((s) => s.id),
    primaryId: slides[0]?.id,
    anchorIndex: 0,
  };
}

/**
 * Handle click with modifier key support
 */
export function handleSelectionClick(
  slides: readonly SlideWithId[],
  currentSelection: SlideSelectionState,
  slideId: SlideId,
  index: number,
  shiftKey: boolean,
  metaOrCtrlKey: boolean
): SlideSelectionState {
  if (shiftKey && currentSelection.anchorIndex !== undefined) {
    return selectRange(slides, currentSelection.anchorIndex, index);
  }

  if (metaOrCtrlKey) {
    return toggleSelection(currentSelection, slideId, index);
  }

  return selectSingle(slideId, index);
}
