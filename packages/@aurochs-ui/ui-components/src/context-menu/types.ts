/**
 * @file Context menu type definitions
 *
 * Pure UI menu structure types (no domain knowledge).
 */

export type MenuItemId = string;

export type MenuItem = {
  readonly type?: "item";
  readonly id: MenuItemId;
  readonly label: string;
  readonly shortcut?: string;
  readonly disabled?: boolean;
  readonly danger?: boolean;
};

export type MenuSubmenu = {
  readonly type: "submenu";
  readonly id: MenuItemId;
  readonly label: string;
  readonly children: readonly MenuEntry[];
  readonly disabled?: boolean;
};

export type MenuSeparator = {
  readonly type: "separator";
};

export type MenuEntry = MenuItem | MenuSubmenu | MenuSeparator;

/**
 * Type guard for a separator entry.
 */
export function isSeparator(entry: MenuEntry): entry is MenuSeparator {
  return entry.type === "separator";
}

/**
 * Type guard for a submenu entry.
 */
export function isSubmenu(entry: MenuEntry): entry is MenuSubmenu {
  return entry.type === "submenu";
}

/**
 * Type guard for a regular menu item entry.
 */
export function isMenuItem(entry: MenuEntry): entry is MenuItem {
  return !isSeparator(entry) && !isSubmenu(entry);
}
