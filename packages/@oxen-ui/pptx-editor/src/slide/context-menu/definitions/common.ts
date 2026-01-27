/**
 * @file Common menu items definition
 *
 * Menu items that appear in all context menus:
 * copy, cut, paste, duplicate, delete
 */

import type { MenuEntry } from "../../../ui/context-menu";
import type { ContextMenuActions } from "../SlideContextMenu";

/**
 * Get common menu items (clipboard and edit operations)
 */
export function getCommonMenuItems(actions: ContextMenuActions): readonly MenuEntry[] {
  return [
    {
      id: "copy",
      label: "Copy",
      shortcut: "⌘C",
      disabled: !actions.hasSelection,
    },
    {
      id: "cut",
      label: "Cut",
      shortcut: "⌘X",
      disabled: !actions.hasSelection,
    },
    {
      id: "paste",
      label: "Paste",
      shortcut: "⌘V",
      disabled: !actions.hasClipboard,
    },
    { type: "separator" },
    {
      id: "duplicate",
      label: "Duplicate",
      shortcut: "⌘D",
      disabled: !actions.hasSelection,
    },
    {
      id: "delete",
      label: "Delete",
      shortcut: "⌫",
      disabled: !actions.hasSelection,
      danger: true,
    },
  ];
}
