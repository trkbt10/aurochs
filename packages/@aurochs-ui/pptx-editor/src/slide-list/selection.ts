/**
 * @file Slide selection operations
 *
 * Pure functions for managing slide selection state.
 * Delegates to @aurochs-ui/editor-core/item-selection for generic logic.
 */

import type { SlideId, SlideWithId } from "@aurochs-office/pptx/app";
import type { SlideSelectionState } from "./types";
import {
  selectSingleItem,
  selectItemRange,
  toggleItemSelection,
  addItemToSelection as addItemToSelectionGeneric,
  removeItemFromSelection as removeItemFromSelectionGeneric,
  isItemSelected,
  isItemSelectionEmpty,
  selectAllItems,
  handleItemSelectionClick,
} from "@aurochs-ui/editor-core/item-selection";

/**
 * Select a single slide, replacing current selection
 */
export function selectSingle(slideId: SlideId, index: number): SlideSelectionState {
  return selectSingleItem(slideId, index);
}

/**
 * Select a range of slides from anchor to target
 */
export function selectRange(slides: readonly SlideWithId[], fromIndex: number, toIndex: number): SlideSelectionState {
  return selectItemRange(slides, fromIndex, toIndex);
}

/**
 * Toggle a slide in the selection (add if not selected, remove if selected)
 */
export function toggleSelection(
  currentSelection: SlideSelectionState,
  slideId: SlideId,
  index: number,
): SlideSelectionState {
  return toggleItemSelection(currentSelection, slideId, index);
}

/**
 * Add a slide to the selection
 */
export function addToSelection(
  currentSelection: SlideSelectionState,
  slideId: SlideId,
  index: number,
): SlideSelectionState {
  return addItemToSelectionGeneric(currentSelection, slideId, index);
}

/**
 * Remove a slide from the selection
 */
export function removeFromSelection(currentSelection: SlideSelectionState, slideId: SlideId): SlideSelectionState {
  return removeItemFromSelectionGeneric(currentSelection, slideId);
}

/**
 * Check if a slide is selected
 */
export function isSelected(selection: SlideSelectionState, slideId: SlideId): boolean {
  return isItemSelected(selection, slideId);
}

/**
 * Check if selection is empty
 */
export function isSelectionEmpty(selection: SlideSelectionState): boolean {
  return isItemSelectionEmpty(selection);
}

/**
 * Select all slides
 */
export function selectAll(slides: readonly SlideWithId[]): SlideSelectionState {
  return selectAllItems(slides);
}

/**
 * Handle click with modifier key support
 */
export function handleSelectionClick({
  slides,
  currentSelection,
  slideId,
  index,
  shiftKey,
  metaOrCtrlKey,
}: {
  slides: readonly SlideWithId[];
  currentSelection: SlideSelectionState;
  slideId: SlideId;
  index: number;
  shiftKey: boolean;
  metaOrCtrlKey: boolean;
}): SlideSelectionState {
  return handleItemSelectionClick({
    items: slides,
    currentSelection,
    id: slideId,
    index,
    shiftKey,
    metaOrCtrlKey,
  });
}
