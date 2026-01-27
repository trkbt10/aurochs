/**
 * @file Group menu items definition
 *
 * Menu items for grouping and ungrouping shapes.
 */

import type { MenuEntry } from "../../../ui/context-menu";
import type { ContextMenuActions } from "../SlideContextMenu";

/**
 * Get group/ungroup menu items
 */
export function getGroupMenuItems(actions: ContextMenuActions): readonly MenuEntry[] {
  return [
    {
      id: "group",
      label: "Group",
      shortcut: "⌘G",
      disabled: !actions.canGroup,
    },
    {
      id: "ungroup",
      label: "Ungroup",
      shortcut: "⌘⇧G",
      disabled: !actions.canUngroup,
    },
  ];
}
