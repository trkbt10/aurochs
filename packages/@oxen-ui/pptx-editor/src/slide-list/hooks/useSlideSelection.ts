/**
 * @file Slide selection hook
 *
 * Manages multi-select with Shift+click range selection and Ctrl/Cmd+click toggle.
 * Uses pure functions from selection.ts for testable logic.
 */

import { useCallback, useState } from "react";
import type { SlideId, SlideWithId } from "@oxen/pptx/app";
import type { SlideSelectionState } from "../types";
import { createEmptySlideSelection } from "../types";
import {
  selectSingle as selectSingleFn,
  selectRange as selectRangeFn,
  toggleSelection as toggleSelectionFn,
  selectAll as selectAllFn,
  isSelected as isSelectedFn,
  handleSelectionClick,
} from "../selection";

export type UseSlideSelectionOptions = {
  /** Slides array for index lookup */
  readonly slides: readonly SlideWithId[];
  /** Initial selection state */
  readonly initialSelection?: SlideSelectionState;
  /** Callback when selection changes */
  readonly onSelectionChange?: (selection: SlideSelectionState) => void;
};

export type UseSlideSelectionResult = {
  /** Current selection state */
  readonly selection: SlideSelectionState;
  /** Handle click with modifier key support */
  readonly handleClick: (
    slideId: SlideId,
    index: number,
    event: React.MouseEvent | React.KeyboardEvent
  ) => void;
  /** Select a single slide */
  readonly selectSingle: (slideId: SlideId, index: number) => void;
  /** Select a range of slides */
  readonly selectRange: (fromIndex: number, toIndex: number) => void;
  /** Toggle a slide in selection */
  readonly toggleSelection: (slideId: SlideId, index: number) => void;
  /** Clear all selection */
  readonly clearSelection: () => void;
  /** Select all slides */
  readonly selectAll: () => void;
  /** Check if a slide is selected */
  readonly isSelected: (slideId: SlideId) => boolean;
  /** Update selection externally */
  readonly setSelection: (selection: SlideSelectionState) => void;
};

/**
 * Hook for managing slide selection with multi-select support
 */
export function useSlideSelection(
  options: UseSlideSelectionOptions
): UseSlideSelectionResult {
  const { slides, initialSelection, onSelectionChange } = options;

  const [selection, setSelectionState] = useState<SlideSelectionState>(
    initialSelection ?? createEmptySlideSelection()
  );

  const setSelection = useCallback(
    (newSelection: SlideSelectionState) => {
      setSelectionState(newSelection);
      onSelectionChange?.(newSelection);
    },
    [onSelectionChange]
  );

  const selectSingle = useCallback(
    (slideId: SlideId, index: number) => {
      setSelection(selectSingleFn(slideId, index));
    },
    [setSelection]
  );

  const selectRange = useCallback(
    (fromIndex: number, toIndex: number) => {
      setSelection(selectRangeFn(slides, fromIndex, toIndex));
    },
    [slides, setSelection]
  );

  const toggleSelection = useCallback(
    (slideId: SlideId, index: number) => {
      setSelection(toggleSelectionFn(selection, slideId, index));
    },
    [selection, setSelection]
  );

  const clearSelection = useCallback(() => {
    setSelection(createEmptySlideSelection());
  }, [setSelection]);

  const selectAll = useCallback(() => {
    setSelection(selectAllFn(slides));
  }, [slides, setSelection]);

  const handleClick = useCallback(
    (slideId: SlideId, index: number, event: React.MouseEvent | React.KeyboardEvent) => {
      const isMetaOrCtrl = event.metaKey || event.ctrlKey;
      const newSelection = handleSelectionClick(
        slides,
        selection,
        slideId,
        index,
        event.shiftKey,
        isMetaOrCtrl
      );
      setSelection(newSelection);
    },
    [slides, selection, setSelection]
  );

  const isSelected = useCallback(
    (slideId: SlideId) => isSelectedFn(selection, slideId),
    [selection]
  );

  return {
    selection,
    handleClick,
    selectSingle,
    selectRange,
    toggleSelection,
    clearSelection,
    selectAll,
    isSelected,
    setSelection,
  };
}
