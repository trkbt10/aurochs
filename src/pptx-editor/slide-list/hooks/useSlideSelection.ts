/**
 * @file Slide selection hook
 *
 * Manages multi-select with Shift+click range selection and Ctrl/Cmd+click toggle.
 */

import { useCallback, useState } from "react";
import type { SlideId, SlideWithId } from "../../presentation/types";
import type { SlideSelectionState } from "../types";
import { createEmptySlideSelection, createSingleSlideSelection } from "../types";

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
    event: React.MouseEvent
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
      setSelection(createSingleSlideSelection(slideId, index));
    },
    [setSelection]
  );

  const selectRange = useCallback(
    (fromIndex: number, toIndex: number) => {
      const start = Math.min(fromIndex, toIndex);
      const end = Math.max(fromIndex, toIndex);
      const rangeIds = slides.slice(start, end + 1).map((s) => s.id);
      const primaryId = slides[toIndex]?.id;

      setSelection({
        selectedIds: rangeIds,
        primaryId,
        anchorIndex: fromIndex,
      });
    },
    [slides, setSelection]
  );

  const toggleSelection = useCallback(
    (slideId: SlideId, index: number) => {
      const isCurrentlySelected = selection.selectedIds.includes(slideId);

      if (isCurrentlySelected) {
        const newIds = selection.selectedIds.filter((id) => id !== slideId);
        setSelection({
          selectedIds: newIds,
          primaryId: newIds.length > 0 ? newIds[newIds.length - 1] : undefined,
          anchorIndex: newIds.length > 0 ? index : undefined,
        });
      } else {
        setSelection({
          selectedIds: [...selection.selectedIds, slideId],
          primaryId: slideId,
          anchorIndex: index,
        });
      }
    },
    [selection.selectedIds, setSelection]
  );

  const clearSelection = useCallback(() => {
    setSelection(createEmptySlideSelection());
  }, [setSelection]);

  const selectAll = useCallback(() => {
    if (slides.length === 0) return;

    setSelection({
      selectedIds: slides.map((s) => s.id),
      primaryId: slides[0]?.id,
      anchorIndex: 0,
    });
  }, [slides, setSelection]);

  const handleClick = useCallback(
    (slideId: SlideId, index: number, event: React.MouseEvent) => {
      const isMetaOrCtrl = event.metaKey || event.ctrlKey;

      if (event.shiftKey && selection.anchorIndex !== undefined) {
        // Shift+click: range selection from anchor to current
        selectRange(selection.anchorIndex, index);
      } else if (isMetaOrCtrl) {
        // Ctrl/Cmd+click: toggle selection
        toggleSelection(slideId, index);
      } else {
        // Normal click: single selection
        selectSingle(slideId, index);
      }
    },
    [selection.anchorIndex, selectRange, toggleSelection, selectSingle]
  );

  const isSelected = useCallback(
    (slideId: SlideId) => selection.selectedIds.includes(slideId),
    [selection.selectedIds]
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
