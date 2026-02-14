/**
 * @file useGroupedListContextMenu
 *
 * Hook for managing context menu state in grouped list.
 */

import { useCallback, useState } from "react";
import type {
  GroupedListContextMenuState,
  GroupedListItemId,
  GroupedListGroupId,
} from "../types";
import { createClosedContextMenu } from "../types";

export type UseGroupedListContextMenuReturn = {
  readonly menuState: GroupedListContextMenuState;
  readonly openMenu: (
    x: number,
    y: number,
    itemId: GroupedListItemId | null,
    groupId: GroupedListGroupId | null
  ) => void;
  readonly closeMenu: () => void;
};

/**
 * Hook for managing context menu state.
 */
export function useGroupedListContextMenu(): UseGroupedListContextMenuReturn {
  const [menuState, setMenuState] = useState<GroupedListContextMenuState>(
    createClosedContextMenu()
  );

  const openMenu = useCallback(
    (
      x: number,
      y: number,
      itemId: GroupedListItemId | null,
      groupId: GroupedListGroupId | null
    ) => {
      setMenuState({
        type: "open",
        x,
        y,
        itemId,
        groupId,
      });
    },
    []
  );

  const closeMenu = useCallback(() => {
    setMenuState(createClosedContextMenu());
  }, []);

  return {
    menuState,
    openMenu,
    closeMenu,
  };
}
