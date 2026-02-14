/**
 * @file useGroupedListDragDrop
 *
 * Hook for drag-drop reordering within groups.
 * Only allows reordering within the same group.
 */

import { useCallback, useState } from "react";
import type {
  GroupedListDragState,
  GroupedListItemId,
  GroupedListGroupId,
  GroupedListItem,
  DropTargetPosition,
} from "../types";
import { createIdleDragState } from "../types";

export type UseGroupedListDragDropOptions<TMeta = unknown> = {
  readonly items: readonly GroupedListItem<TMeta>[];
  readonly onItemReorder?: (
    itemId: GroupedListItemId,
    newIndex: number,
    groupId: GroupedListGroupId
  ) => void;
};

export type UseGroupedListDragDropReturn = {
  readonly dragState: GroupedListDragState;
  readonly handleDragStart: (
    itemId: GroupedListItemId,
    e: React.DragEvent
  ) => void;
  readonly handleDragOver: (
    itemId: GroupedListItemId,
    e: React.DragEvent
  ) => void;
  readonly handleDrop: (itemId: GroupedListItemId, e: React.DragEvent) => void;
  readonly handleDragEnd: () => void;
  readonly getDropTargetPosition: (
    itemId: GroupedListItemId
  ) => DropTargetPosition;
};

/**
 * Hook for drag-drop reordering.
 */
export function useGroupedListDragDrop<TMeta = unknown>({
  items,
  onItemReorder,
}: UseGroupedListDragDropOptions<TMeta>): UseGroupedListDragDropReturn {
  const [dragState, setDragState] = useState<GroupedListDragState>(
    createIdleDragState()
  );

  // Group items by groupId
  const getGroupItems = useCallback(
    (groupId: GroupedListGroupId): readonly GroupedListItem<TMeta>[] => {
      return items.filter((i) => i.groupId === groupId);
    },
    [items]
  );

  const handleDragStart = useCallback(
    (itemId: GroupedListItemId, e: React.DragEvent) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", itemId);

      setDragState({
        type: "dragging",
        dragItemId: itemId,
        dragGroupId: item.groupId,
        targetIndex: undefined,
      });
    },
    [items]
  );

  const handleDragOver = useCallback(
    (itemId: GroupedListItemId, e: React.DragEvent) => {
      if (dragState.type !== "dragging") return;

      const targetItem = items.find((i) => i.id === itemId);
      if (!targetItem) return;

      // Only allow drag within the same group
      if (targetItem.groupId !== dragState.dragGroupId) {
        e.dataTransfer.dropEffect = "none";
        return;
      }

      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      // Find index of target item within its group
      const groupItems = getGroupItems(targetItem.groupId);
      const targetIndex = groupItems.findIndex((i) => i.id === itemId);

      setDragState((prev) =>
        prev.type === "dragging" ? { ...prev, targetIndex } : prev
      );
    },
    [dragState, items, getGroupItems]
  );

  const handleDrop = useCallback(
    (itemId: GroupedListItemId, e: React.DragEvent) => {
      e.preventDefault();

      if (dragState.type !== "dragging") return;

      const targetItem = items.find((i) => i.id === itemId);
      if (!targetItem || targetItem.groupId !== dragState.dragGroupId) {
        setDragState(createIdleDragState());
        return;
      }

      // Find indices
      const groupItems = getGroupItems(targetItem.groupId);
      const targetIndex = groupItems.findIndex((i) => i.id === itemId);
      const sourceIndex = groupItems.findIndex(
        (i) => i.id === dragState.dragItemId
      );

      if (
        targetIndex !== -1 &&
        sourceIndex !== -1 &&
        targetIndex !== sourceIndex
      ) {
        onItemReorder?.(
          dragState.dragItemId,
          targetIndex,
          dragState.dragGroupId
        );
      }

      setDragState(createIdleDragState());
    },
    [dragState, items, getGroupItems, onItemReorder]
  );

  const handleDragEnd = useCallback(() => {
    setDragState(createIdleDragState());
  }, []);

  const getDropTargetPosition = useCallback(
    (itemId: GroupedListItemId): DropTargetPosition => {
      if (dragState.type !== "dragging") return undefined;
      if (dragState.dragItemId === itemId) return undefined;

      const item = items.find((i) => i.id === itemId);
      if (!item || item.groupId !== dragState.dragGroupId) return undefined;

      const groupItems = getGroupItems(item.groupId);
      const itemIndex = groupItems.findIndex((i) => i.id === itemId);
      const dragIndex = groupItems.findIndex(
        (i) => i.id === dragState.dragItemId
      );

      if (itemIndex === dragState.targetIndex) {
        return itemIndex > dragIndex ? "below" : "above";
      }

      return undefined;
    },
    [dragState, items, getGroupItems]
  );

  return {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    getDropTargetPosition,
  };
}
