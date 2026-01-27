/**
 * @file Connector-specific menu items definition
 *
 * Menu items specific to cxnSp (connector) elements.
 */

import type { MenuEntry } from "../../../ui/context-menu";

/**
 * Get connector-specific menu items
 */
export function getConnectorMenuItems(): readonly MenuEntry[] {
  return [
    {
      type: "submenu",
      id: "editConnector",
      label: "Edit",
      children: [
        {
          id: "editLine",
          label: "Edit Line...",
        },
        {
          id: "editArrows",
          label: "Edit Arrows...",
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
