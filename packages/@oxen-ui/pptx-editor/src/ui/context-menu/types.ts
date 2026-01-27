/**
 * @file Context menu type definitions
 *
 * Pure type definitions for context menu system.
 * No domain knowledge - just menu structure types.
 */

export type MenuItemId = string;

/**
 * A single clickable menu item
 */
export type MenuItem = {
  readonly type?: "item";
  readonly id: MenuItemId;
  readonly label: string;
  readonly shortcut?: string;
  readonly disabled?: boolean;
  readonly danger?: boolean;
};

/**
 * A menu item with a submenu
 */
export type MenuSubmenu = {
  readonly type: "submenu";
  readonly id: MenuItemId;
  readonly label: string;
  readonly children: readonly MenuEntry[];
  readonly disabled?: boolean;
};

/**
 * A visual separator between menu items
 */
export type MenuSeparator = {
  readonly type: "separator";
};

/**
 * Any entry that can appear in a menu
 */
export type MenuEntry = MenuItem | MenuSubmenu | MenuSeparator;

/**
 * Check if entry is a separator
 */
export function isSeparator(entry: MenuEntry): entry is MenuSeparator {
  return entry.type === "separator";
}

/**
 * Check if entry is a submenu
 */
export function isSubmenu(entry: MenuEntry): entry is MenuSubmenu {
  return entry.type === "submenu";
}

/**
 * Check if entry is a regular item
 */
export function isMenuItem(entry: MenuEntry): entry is MenuItem {
  return !isSeparator(entry) && !isSubmenu(entry);
}

