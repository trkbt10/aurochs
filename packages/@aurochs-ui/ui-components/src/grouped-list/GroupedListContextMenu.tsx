/**
 * @file GroupedListContextMenu
 *
 * Context menu for grouped list operations:
 * - New (with submenu for each group that allows creation)
 * - Rename (when item is selected and canRename)
 * - Delete (when item is selected and canDelete)
 */

import { useMemo } from "react";
import { ContextMenu } from "../context-menu/ContextMenu";
import type { MenuEntry } from "../context-menu/types";
import type {
  GroupedListContextMenuState,
  GroupedListGroup,
} from "./types";

export type GroupedListContextMenuProps = {
  readonly menuState: GroupedListContextMenuState;
  readonly groups: readonly GroupedListGroup[];
  readonly items: readonly MenuEntry[];
  readonly onAction: (actionId: string) => void;
  readonly onClose: () => void;
};

/**
 * Context menu for grouped list.
 *
 * Builds menu items based on context:
 * - On item: Rename, Delete
 * - On group or empty: New (with submenu)
 * - Plus any custom items passed via `items` prop
 */
export function GroupedListContextMenu({
  menuState,
  groups,
  items: customItems,
  onAction,
  onClose,
}: GroupedListContextMenuProps) {
  const menuItems = useMemo<readonly MenuEntry[]>(() => {
    if (menuState.type !== "open") return [];

    const { itemId, groupId } = menuState;
    const result: MenuEntry[] = [];

    // Build "New" submenu for groups that allow creation
    const creatableGroups = groups.filter((g) => g.canCreate !== false);
    if (creatableGroups.length > 0) {
      if (creatableGroups.length === 1) {
        // Single option - no submenu needed
        result.push({
          id: `create:${creatableGroups[0].id}`,
          label: `New ${creatableGroups[0].label}`,
        });
      } else {
        // Multiple options - use submenu
        result.push({
          type: "submenu",
          id: "new",
          label: "New",
          children: creatableGroups.map((g) => ({
            id: `create:${g.id}`,
            label: g.label,
          })),
        });
      }
    }

    // Add separator before item-specific actions
    if (itemId && result.length > 0) {
      result.push({ type: "separator" });
    }

    // Item-specific actions
    if (itemId) {
      result.push({
        id: "rename",
        label: "Rename",
        shortcut: "F2",
      });
      result.push({
        id: "delete",
        label: "Delete",
        shortcut: "Del",
        danger: true,
      });
    }

    // Add custom items
    if (customItems.length > 0) {
      if (result.length > 0) {
        result.push({ type: "separator" });
      }
      result.push(...customItems);
    }

    return result;
  }, [menuState, groups, customItems]);

  if (menuState.type === "closed" || menuItems.length === 0) {
    return null;
  }

  return (
    <ContextMenu
      x={menuState.x}
      y={menuState.y}
      items={menuItems}
      onAction={onAction}
      onClose={onClose}
    />
  );
}
