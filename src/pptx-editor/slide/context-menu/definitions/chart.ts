/**
 * @file Chart-specific menu items definition
 *
 * Menu items specific to chart elements.
 */

import type { MenuEntry } from "../../../ui/context-menu";

/**
 * Get chart-specific menu items
 */
export function getChartMenuItems(): readonly MenuEntry[] {
  return [
    {
      type: "submenu",
      id: "editChart",
      label: "Edit",
      children: [
        {
          id: "editChartData",
          label: "Edit Chart Data...",
        },
        {
          id: "editChartType",
          label: "Change Chart Type...",
        },
        { type: "separator" },
        {
          id: "editChartStyle",
          label: "Edit Chart Style...",
        },
      ],
    },
  ];
}
