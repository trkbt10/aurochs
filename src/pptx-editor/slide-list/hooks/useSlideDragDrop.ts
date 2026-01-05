/**
 * @file Slide drag-and-drop hook
 *
 * Manages multi-item drag-and-drop for slide reordering.
 */

import { useCallback, useState } from "react";
import type { SlideId, SlideWithId } from "../../presentation/types";
import type { SlideDragState, SlideListOrientation } from "../types";
import { createIdleDragState } from "../types";

export type UseSlideDragDropOptions = {
  /** Slides array */
  readonly slides: readonly SlideWithId[];
  /** Currently selected slide IDs */
  readonly selectedIds: readonly SlideId[];
  /** Scroll orientation */
  readonly orientation: SlideListOrientation;
  /** Called when slides are moved */
  readonly onMoveSlides?: (
    slideIds: readonly SlideId[],
    toIndex: number
  ) => void;
};

export type UseSlideDragDropResult = {
  /** Current drag state */
  readonly dragState: SlideDragState;
  /** Create drag start handler for a slide */
  readonly handleDragStart: (
    e: React.DragEvent,
    slideId: SlideId
  ) => void;
  /** Create drag over handler for a slide */
  readonly handleDragOver: (
    e: React.DragEvent,
    slideId: SlideId,
    index: number
  ) => void;
  /** Create drop handler for a slide */
  readonly handleDrop: (
    e: React.DragEvent,
    slideId: SlideId,
    index: number
  ) => void;
  /** Handle drag end */
  readonly handleDragEnd: () => void;
  /** Check if a slide is being dragged */
  readonly isDragging: (slideId: SlideId) => boolean;
  /** Check if a slide is a drag target */
  readonly isDragTarget: (slideId: SlideId) => boolean;
  /** Get drag position for a slide */
  readonly getDragPosition: (slideId: SlideId) => "before" | "after" | null;
};

/**
 * Hook for managing slide drag-and-drop
 */
export function useSlideDragDrop(
  options: UseSlideDragDropOptions
): UseSlideDragDropResult {
  const { slides, selectedIds, orientation, onMoveSlides } = options;

  const [dragState, setDragState] = useState<SlideDragState>(
    createIdleDragState()
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, slideId: SlideId) => {
      // If dragging a selected item, drag all selected
      // If dragging unselected item, drag only that item
      const draggingIds = selectedIds.includes(slideId)
        ? [...selectedIds]
        : [slideId];

      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData(
        "application/slide-ids",
        JSON.stringify(draggingIds)
      );

      setDragState({
        isDragging: true,
        draggingIds,
        targetPosition: null,
      });
    },
    [selectedIds]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, slideId: SlideId, index: number) => {
      e.preventDefault();

      // Don't show indicator on items being dragged
      if (dragState.draggingIds.includes(slideId)) {
        setDragState((prev) => ({ ...prev, targetPosition: null }));
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const position = getDropPosition(e, rect, orientation);

      setDragState((prev) => ({
        ...prev,
        targetPosition: { slideId, position },
      }));
    },
    [dragState.draggingIds, orientation]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, slideId: SlideId, index: number) => {
      e.preventDefault();

      if (!dragState.isDragging || dragState.draggingIds.length === 0) {
        setDragState(createIdleDragState());
        return;
      }

      // Don't drop on self
      if (dragState.draggingIds.includes(slideId)) {
        setDragState(createIdleDragState());
        return;
      }

      // Calculate target index
      let targetIndex = index;
      if (dragState.targetPosition?.position === "after") {
        targetIndex = index + 1;
      }

      // Adjust for items being moved from before target
      const itemsMovingFromBefore = dragState.draggingIds.filter((id) => {
        const idx = slides.findIndex((s) => s.id === id);
        return idx < targetIndex;
      }).length;

      targetIndex -= itemsMovingFromBefore;

      onMoveSlides?.(dragState.draggingIds, targetIndex);
      setDragState(createIdleDragState());
    },
    [dragState, slides, onMoveSlides]
  );

  const handleDragEnd = useCallback(() => {
    setDragState(createIdleDragState());
  }, []);

  const isDragging = useCallback(
    (slideId: SlideId) => dragState.draggingIds.includes(slideId),
    [dragState.draggingIds]
  );

  const isDragTarget = useCallback(
    (slideId: SlideId) => dragState.targetPosition?.slideId === slideId,
    [dragState.targetPosition]
  );

  const getDragPosition = useCallback(
    (slideId: SlideId): "before" | "after" | null => {
      if (dragState.targetPosition?.slideId === slideId) {
        return dragState.targetPosition.position;
      }
      return null;
    },
    [dragState.targetPosition]
  );

  return {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    isDragging,
    isDragTarget,
    getDragPosition,
  };
}

/**
 * Calculate drop position based on cursor location
 */
function getDropPosition(
  e: React.DragEvent,
  rect: DOMRect,
  orientation: SlideListOrientation
): "before" | "after" {
  if (orientation === "vertical") {
    const midY = rect.top + rect.height / 2;
    return e.clientY < midY ? "before" : "after";
  }
  // horizontal
  const midX = rect.left + rect.width / 2;
  return e.clientX < midX ? "before" : "after";
}
