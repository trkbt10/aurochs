/**
 * @file OLE object-specific menu items definition
 *
 * Menu items specific to oleObject elements within graphicFrame.
 */

import type { MenuEntry } from "../../../ui/context-menu";

/**
 * Get OLE object-specific menu items
 */
export function getOleObjectMenuItems(): readonly MenuEntry[] {
  return [
    {
      type: "submenu",
      id: "editOleObject",
      label: "Edit",
      children: [
        {
          id: "editOleProperties",
          label: "Edit Properties...",
        },
        { type: "separator" },
        {
          id: "editTransform",
          label: "Edit Transform...",
        },
      ],
    },
  ];
}
