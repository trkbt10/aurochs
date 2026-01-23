/**
 * @file Sheet tab drag-and-drop hook
 *
 * Manages drag-and-drop for sheet tab reordering.
 * Uses target-based approach: shows indicator on left/right of target tab.
 */

import { useCallback, useState } from "react";
import { type SheetTabDragState, createIdleDragState } from "./types";

export type UseSheetTabDragDropOptions = {
  readonly sheetCount: number;
  readonly onMoveSheet: (fromIndex: number, toIndex: number) => void;
};

export type UseSheetTabDragDropResult = {
  readonly dragState: SheetTabDragState;
  readonly handleDragStart: (e: React.DragEvent, sheetIndex: number) => void;
  readonly handleDragOver: (e: React.DragEvent, sheetIndex: number) => void;
  readonly handleDrop: (e: React.DragEvent) => void;
  readonly handleDragEnd: () => void;
  readonly isDragging: (sheetIndex: number) => boolean;
  readonly isDropTarget: (gapIndex: number) => boolean;
};

/**
 * Calculate the target position based on cursor position over a tab.
 * Returns the index where the dragged item should be inserted.
 */
function calculateTargetPosition(
  e: React.DragEvent,
  targetTabIndex: number,
  rect: DOMRect,
  draggingIndex: number,
): number {
  const midX = rect.left + rect.width / 2;
  const insertBefore = e.clientX < midX;

  if (insertBefore) {
    // Insert before the target tab
    if (draggingIndex < targetTabIndex) {
      return targetTabIndex - 1;
    }
    return targetTabIndex;
  }
  // Insert after the target tab
  if (draggingIndex > targetTabIndex) {
    return targetTabIndex + 1;
  }
  return targetTabIndex;
}

/**
 * Check if the drop would result in an actual position change.
 */
function wouldPositionChange(draggingIndex: number, targetIndex: number): boolean {
  return draggingIndex !== targetIndex;
}

/**
 * Get the gap index for visual indicator.
 * Gap 0 is before tab 0, gap 1 is between tab 0 and 1, etc.
 */
function calculateVisualGapIndex(
  e: React.DragEvent,
  targetTabIndex: number,
  rect: DOMRect,
): number {
  const midX = rect.left + rect.width / 2;
  return e.clientX < midX ? targetTabIndex : targetTabIndex + 1;
}

/**
 * Hook for managing sheet tab drag-and-drop
 */
export function useSheetTabDragDrop(
  options: UseSheetTabDragDropOptions,
): UseSheetTabDragDropResult {
  const { onMoveSheet } = options;

  const [dragState, setDragState] = useState<SheetTabDragState>(
    createIdleDragState(),
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, sheetIndex: number) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("application/sheet-index", String(sheetIndex));

      setDragState({
        type: "dragging",
        draggingIndex: sheetIndex,
        targetGapIndex: undefined,
      });
    },
    [],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, itemIndex: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      setDragState((prev) => {
        if (prev.type !== "dragging") {
          return prev;
        }

        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();

        // Calculate the actual target position
        const targetPosition = calculateTargetPosition(e, itemIndex, rect, prev.draggingIndex);

        // Only show visual indicator if the drop would result in a change
        if (!wouldPositionChange(prev.draggingIndex, targetPosition)) {
          if (prev.targetGapIndex === undefined) {
            return prev;
          }
          return { ...prev, targetGapIndex: undefined };
        }

        const gapIndex = calculateVisualGapIndex(e, itemIndex, rect);
        if (prev.targetGapIndex === gapIndex) {
          return prev;
        }
        return { ...prev, targetGapIndex: gapIndex };
      });
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      if (dragState.type !== "dragging" || dragState.targetGapIndex === undefined) {
        setDragState(createIdleDragState());
        return;
      }

      const { draggingIndex, targetGapIndex } = dragState;

      // Calculate the actual target index from the gap
      const targetIndex = targetGapIndex > draggingIndex ? targetGapIndex - 1 : targetGapIndex;

      if (wouldPositionChange(draggingIndex, targetIndex)) {
        onMoveSheet(draggingIndex, targetIndex);
      }

      setDragState(createIdleDragState());
    },
    [dragState, onMoveSheet],
  );

  const handleDragEnd = useCallback(() => {
    setDragState(createIdleDragState());
  }, []);

  const isDragging = useCallback(
    (sheetIndex: number) =>
      dragState.type === "dragging" && dragState.draggingIndex === sheetIndex,
    [dragState],
  );

  const isDropTarget = useCallback(
    (gapIndex: number) =>
      dragState.type === "dragging" && dragState.targetGapIndex === gapIndex,
    [dragState],
  );

  return {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    isDragging,
    isDropTarget,
  };
}
