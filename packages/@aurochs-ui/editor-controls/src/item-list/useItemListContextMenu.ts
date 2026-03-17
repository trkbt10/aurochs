/**
 * @file Item list context menu hook
 *
 * Manages context menu state and actions for items.
 * Format-agnostic: uses `itemLabel` for menu text (e.g. "Slide", "Page").
 */

import { useCallback, useState } from "react";
import type { ListItem, ItemContextMenuState } from "./types";
import type { MenuEntry } from "@aurochs-ui/ui-components";

export type UseItemListContextMenuOptions<TItem extends ListItem<TId>, TId = string> = {
  /** Items array */
  readonly items: readonly TItem[];
  /** Currently selected item IDs */
  readonly selectedIds: readonly TId[];
  /** Label for the item type (e.g. "Slide", "Page") */
  readonly itemLabel: string;
  /** Called to delete items */
  readonly onDeleteItems?: (ids: readonly TId[]) => void;
  /** Called to duplicate items */
  readonly onDuplicateItems?: (ids: readonly TId[]) => void;
  /** Called to move items */
  readonly onMoveItems?: (ids: readonly TId[], toIndex: number) => void;
};

export type UseItemListContextMenuResult<TId = string> = {
  /** Current context menu state */
  readonly contextMenu: ItemContextMenuState<TId>;
  /** Open context menu at position */
  readonly openContextMenu: (x: number, y: number, itemId: TId) => void;
  /** Close context menu */
  readonly closeContextMenu: () => void;
  /** Handle menu action */
  readonly handleMenuAction: (actionId: string) => void;
  /** Get menu items for current context */
  readonly getMenuItems: () => readonly MenuEntry[];
};

/** Action IDs for item list context menu */
export const ITEM_LIST_MENU_ACTIONS = {
  DUPLICATE: "duplicate",
  MOVE_UP: "move-up",
  MOVE_DOWN: "move-down",
  DELETE: "delete",
} as const;

/**
 * Hook for managing item list context menu
 */
export function useItemListContextMenu<TItem extends ListItem<TId>, TId = string>(
  options: UseItemListContextMenuOptions<TItem, TId>,
): UseItemListContextMenuResult<TId> {
  const { items, selectedIds, itemLabel, onDeleteItems, onDuplicateItems, onMoveItems } = options;

  const [contextMenu, setContextMenu] = useState<ItemContextMenuState<TId>>({
    visible: false,
    x: 0,
    y: 0,
    itemId: null,
  });

  const openContextMenu = useCallback((x: number, y: number, itemId: TId) => {
    setContextMenu({ visible: true, x, y, itemId });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  // Get the effective selection (include right-clicked item if not selected)
  const getEffectiveSelection = useCallback((): readonly TId[] => {
    if (!contextMenu.itemId) {
      return selectedIds;
    }

    if (selectedIds.includes(contextMenu.itemId)) {
      return selectedIds;
    }

    // Right-clicked item is not in selection, use it alone
    return [contextMenu.itemId];
  }, [contextMenu.itemId, selectedIds]);

  const handleMenuAction = useCallback(
    (actionId: string) => {
      const effectiveIds = getEffectiveSelection();
      if (effectiveIds.length === 0) {
        return;
      }

      switch (actionId) {
        case ITEM_LIST_MENU_ACTIONS.DUPLICATE:
          onDuplicateItems?.(effectiveIds);
          break;

        case ITEM_LIST_MENU_ACTIONS.DELETE:
          onDeleteItems?.(effectiveIds);
          break;

        case ITEM_LIST_MENU_ACTIONS.MOVE_UP: {
          const minIndex = Math.min(...effectiveIds.map((id) => items.findIndex((s) => s.id === id)));
          if (minIndex > 0) {
            onMoveItems?.(effectiveIds, minIndex - 1);
          }
          break;
        }

        case ITEM_LIST_MENU_ACTIONS.MOVE_DOWN: {
          const maxIndex = Math.max(...effectiveIds.map((id) => items.findIndex((s) => s.id === id)));
          if (maxIndex < items.length - 1) {
            onMoveItems?.(effectiveIds, maxIndex + 2 - effectiveIds.length);
          }
          break;
        }
      }

      closeContextMenu();
    },
    [getEffectiveSelection, items, onDeleteItems, onDuplicateItems, onMoveItems, closeContextMenu],
  );

  const getMenuItems = useCallback((): readonly MenuEntry[] => {
    const effectiveIds = getEffectiveSelection();
    const count = effectiveIds.length;
    const isMultiple = count > 1;

    // Calculate position constraints
    const indices = effectiveIds.map((id) => items.findIndex((s) => s.id === id));
    const minIndex = Math.min(...indices);
    const maxIndex = Math.max(...indices);
    const canMoveUp = minIndex > 0;
    const canMoveDown = maxIndex < items.length - 1;
    const canDelete = items.length > count;

    const pluralLabel = isMultiple ? `${count} ${itemLabel}s` : itemLabel;
    const duplicateLabel = `Duplicate ${pluralLabel}`;
    const deleteLabel = `Delete ${pluralLabel}`;

    return [
      { id: ITEM_LIST_MENU_ACTIONS.DUPLICATE, label: duplicateLabel },
      { type: "separator" },
      {
        id: ITEM_LIST_MENU_ACTIONS.MOVE_UP,
        label: "Move Up",
        disabled: !canMoveUp,
      },
      {
        id: ITEM_LIST_MENU_ACTIONS.MOVE_DOWN,
        label: "Move Down",
        disabled: !canMoveDown,
      },
      { type: "separator" },
      {
        id: ITEM_LIST_MENU_ACTIONS.DELETE,
        label: deleteLabel,
        danger: true,
        disabled: !canDelete,
      },
    ];
  }, [getEffectiveSelection, items, itemLabel]);

  return {
    contextMenu,
    openContextMenu,
    closeContextMenu,
    handleMenuAction,
    getMenuItems,
  };
}
