/**
 * @file Sheet tab drag-and-drop hook
 *
 * Manages drag-and-drop for sheet tab reordering.
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
 * Calculate the final position after moving a tab.
 *
 * Uses cursor position to determine which gap to insert into.
 * Gaps are numbered: 0 (before first tab), 1 (between tab 0 and 1), etc.
 * If the target gap is adjacent to the dragging tab, it's a no-op.
 */
function calculateFinalPosition(
  draggingIndex: number,
  targetTabIndex: number,
  clientX: number,
  rectLeft: number,
  rectWidth: number,
): { position: number; gapIndex: number } | undefined {
  // Can't drop on self
  if (draggingIndex === targetTabIndex) {
    return undefined;
  }

  // Determine which gap based on cursor position
  const midX = rectLeft + rectWidth / 2;
  const insertBefore = clientX < midX;
  const targetGapIndex = insertBefore ? targetTabIndex : targetTabIndex + 1;

  // If targeting the gap immediately before or after the dragging tab, no-op
  if (targetGapIndex === draggingIndex || targetGapIndex === draggingIndex + 1) {
    return undefined;
  }

  // Calculate the final position after removal and insertion
  const position = targetGapIndex > draggingIndex ? targetGapIndex - 1 : targetGapIndex;

  return { position, gapIndex: targetGapIndex };
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

      const target = e.currentTarget as HTMLElement | null;
      if (!target) {
        return;
      }
      const rect = target.getBoundingClientRect();
      const clientX = e.clientX;

      setDragState((prev) => {
        if (prev.type !== "dragging") {
          return prev;
        }

        const result = calculateFinalPosition(
          prev.draggingIndex,
          itemIndex,
          clientX,
          rect.left,
          rect.width,
        );

        if (!result) {
          if (prev.targetGapIndex === undefined) {
            return prev;
          }
          return { ...prev, targetGapIndex: undefined };
        }

        if (prev.targetGapIndex === result.gapIndex) {
          return prev;
        }
        return { ...prev, targetGapIndex: result.gapIndex };
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

      if (draggingIndex !== targetIndex) {
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
