/**
 * @file Item list drag-and-drop hook
 *
 * Manages multi-item drag-and-drop for item reordering.
 * Uses gap-based targeting: indicator appears between items, not on them.
 */

import { useCallback, useState } from "react";
import type { ListItem, ListOrientation } from "./types";
import {
  type ListDragState,
  getDraggingIds,
  createDragStartState,
  createIdleListDragState,
  updateDragOverGap,
  isValidGapDrop,
  calculateTargetIndexFromGap,
  isGapDragTarget,
  calculateGapIndexFromItemDragOver,
} from "@aurochs-ui/editor-core/list-dnd";

export type UseItemListDragDropOptions<TItem extends ListItem<TId>, TId = string> = {
  /** Items array */
  readonly items: readonly TItem[];
  /** Currently selected item IDs */
  readonly selectedIds: readonly TId[];
  /** Scroll orientation */
  readonly orientation: ListOrientation;
  /** Called when items are moved */
  readonly onMoveItems?: (ids: readonly TId[], toIndex: number) => void;
};

export type UseItemListDragDropResult<TId = string> = {
  /** Current drag state */
  readonly dragState: ListDragState<TId>;
  /** Handle drag start for an item */
  readonly handleDragStart: (e: React.DragEvent, id: TId) => void;
  /** Handle drag over an item (calculates target gap) */
  readonly handleItemDragOver: (e: React.DragEvent, itemIndex: number) => void;
  /** Handle drag over a gap */
  readonly handleGapDragOver: (e: React.DragEvent, gapIndex: number) => void;
  /** Handle drop on a gap */
  readonly handleGapDrop: (e: React.DragEvent, gapIndex: number) => void;
  /** Handle drop on an item */
  readonly handleItemDrop: (e: React.DragEvent, itemIndex: number) => void;
  /** Handle drag end */
  readonly handleDragEnd: () => void;
  /** Check if an item is being dragged */
  readonly isDragging: (id: TId) => boolean;
  /** Check if a gap is the drag target */
  readonly isGapTarget: (gapIndex: number) => boolean;
};

/**
 * Hook for managing item list drag-and-drop with gap-based targeting
 */
export function useItemListDragDrop<TItem extends ListItem<TId>, TId = string>(
  options: UseItemListDragDropOptions<TItem, TId>,
): UseItemListDragDropResult<TId> {
  const { items, selectedIds, orientation, onMoveItems } = options;

  const [dragState, setDragState] = useState<ListDragState<TId>>(createIdleListDragState<TId>());

  const handleDragStart = useCallback(
    (e: React.DragEvent, id: TId) => {
      const draggingIds = getDraggingIds(selectedIds, id);

      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("application/item-ids", JSON.stringify(draggingIds));

      setDragState(createDragStartState(draggingIds));
    },
    [selectedIds],
  );

  const handleItemDragOver = useCallback(
    (e: React.DragEvent, itemIndex: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const gapIndex = calculateGapIndexFromItemDragOver({
        itemIndex,
        orientation,
        clientX: e.clientX,
        clientY: e.clientY,
        itemRect: rect,
      });

      setDragState((prev) => updateDragOverGap(prev, gapIndex));
    },
    [orientation],
  );

  const handleGapDragOver = useCallback((e: React.DragEvent, gapIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragState((prev) => updateDragOverGap(prev, gapIndex));
  }, []);

  const handleItemDrop = useCallback(
    (e: React.DragEvent, itemIndex: number) => {
      e.preventDefault();

      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const gapIndex = calculateGapIndexFromItemDragOver({
        itemIndex,
        orientation,
        clientX: e.clientX,
        clientY: e.clientY,
        itemRect: rect,
      });

      if (!isValidGapDrop(dragState, gapIndex, items)) {
        setDragState(createIdleListDragState<TId>());
        return;
      }

      const targetIndex = calculateTargetIndexFromGap(items, dragState.draggingIds, gapIndex);

      onMoveItems?.(dragState.draggingIds, targetIndex);
      setDragState(createIdleListDragState<TId>());
    },
    [orientation, dragState, items, onMoveItems],
  );

  const handleGapDrop = useCallback(
    (e: React.DragEvent, gapIndex: number) => {
      e.preventDefault();

      if (!isValidGapDrop(dragState, gapIndex, items)) {
        setDragState(createIdleListDragState<TId>());
        return;
      }

      const targetIndex = calculateTargetIndexFromGap(items, dragState.draggingIds, gapIndex);

      onMoveItems?.(dragState.draggingIds, targetIndex);
      setDragState(createIdleListDragState<TId>());
    },
    [dragState, items, onMoveItems],
  );

  const handleDragEnd = useCallback(() => {
    setDragState(createIdleListDragState<TId>());
  }, []);

  const isDragging = useCallback(
    (id: TId) => dragState.draggingIds.includes(id),
    [dragState.draggingIds],
  );

  const isGapTarget = useCallback((gapIndex: number) => isGapDragTarget(dragState, gapIndex), [dragState]);

  return {
    dragState,
    handleDragStart,
    handleItemDragOver,
    handleGapDragOver,
    handleGapDrop,
    handleItemDrop,
    handleDragEnd,
    isDragging,
    isGapTarget,
  };
}
