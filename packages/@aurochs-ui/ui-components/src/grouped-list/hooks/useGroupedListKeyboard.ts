/**
 * @file useGroupedListKeyboard
 *
 * Hook for keyboard navigation in grouped list.
 * - Arrow keys for navigation
 * - F2 for rename
 * - Delete for delete
 * - Enter/Space for select
 */

import { useCallback, useEffect } from "react";
import type {
  GroupedListItemId,
  GroupedListGroupId,
  GroupedListItem,
  GroupedListGroup,
  GroupedListMode,
} from "../types";

export type UseGroupedListKeyboardOptions<TMeta = unknown> = {
  readonly items: readonly GroupedListItem<TMeta>[];
  readonly groups: readonly GroupedListGroup[];
  readonly activeItemId: GroupedListItemId | undefined;
  readonly mode: GroupedListMode;
  readonly containerRef: React.RefObject<HTMLElement | null>;
  readonly onItemClick: (itemId: GroupedListItemId) => void;
  readonly onStartRename: (itemId: GroupedListItemId) => void;
  readonly onItemDelete: (itemId: GroupedListItemId) => void;
};

/**
 * Hook for keyboard navigation.
 */
export function useGroupedListKeyboard<TMeta = unknown>({
  items,
  groups,
  activeItemId,
  mode,
  containerRef,
  onItemClick,
  onStartRename,
  onItemDelete,
}: UseGroupedListKeyboardOptions<TMeta>): void {
  // Sort items by group order
  const getSortedItems = useCallback(() => {
    const sortedGroups = [...groups].sort((a, b) => a.order - b.order);
    const result: GroupedListItem<TMeta>[] = [];
    for (const group of sortedGroups) {
      const groupItems = items.filter((i) => i.groupId === group.id);
      result.push(...groupItems);
    }
    return result;
  }, [items, groups]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Only handle if container or child is focused
      if (
        !containerRef.current ||
        !containerRef.current.contains(document.activeElement)
      ) {
        return;
      }

      const sortedItems = getSortedItems();
      const activeIndex = activeItemId
        ? sortedItems.findIndex((i) => i.id === activeItemId)
        : -1;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const nextIndex = activeIndex + 1;
          if (nextIndex < sortedItems.length) {
            onItemClick(sortedItems[nextIndex].id);
          }
          break;
        }

        case "ArrowUp": {
          e.preventDefault();
          const prevIndex = activeIndex - 1;
          if (prevIndex >= 0) {
            onItemClick(sortedItems[prevIndex].id);
          }
          break;
        }

        case "Home": {
          e.preventDefault();
          if (sortedItems.length > 0) {
            onItemClick(sortedItems[0].id);
          }
          break;
        }

        case "End": {
          e.preventDefault();
          if (sortedItems.length > 0) {
            onItemClick(sortedItems[sortedItems.length - 1].id);
          }
          break;
        }

        case "F2": {
          if (mode === "editable" && activeItemId) {
            const item = items.find((i) => i.id === activeItemId);
            if (item?.canRename !== false) {
              e.preventDefault();
              onStartRename(activeItemId);
            }
          }
          break;
        }

        case "Delete": {
          if (mode === "editable" && activeItemId) {
            const item = items.find((i) => i.id === activeItemId);
            if (item?.canDelete !== false) {
              e.preventDefault();
              onItemDelete(activeItemId);
            }
          }
          break;
        }
      }
    },
    [
      containerRef,
      getSortedItems,
      activeItemId,
      mode,
      items,
      onItemClick,
      onStartRename,
      onItemDelete,
    ]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [containerRef, handleKeyDown]);
}
