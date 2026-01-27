/**
 * @file Table-specific menu items definition
 *
 * Menu items specific to table elements.
 */

import type { MenuEntry } from "../../../ui/context-menu";

/**
 * Get table-specific menu items
 */
export function getTableMenuItems(): readonly MenuEntry[] {
  return [
    {
      type: "submenu",
      id: "editTable",
      label: "Edit",
      children: [
        {
          id: "editTableProperties",
          label: "Edit Table Properties...",
        },
        {
          id: "editTableStyle",
          label: "Edit Table Style...",
        },
      ],
    },
  ];
}
