/**
 * @file Shape-specific menu items definition
 *
 * Menu items specific to sp (shape) elements.
 */

import type { MenuEntry } from "../../../ui/context-menu";

/**
 * Get shape-specific menu items
 */
export function getShapeMenuItems(): readonly MenuEntry[] {
  return [
    {
      type: "submenu",
      id: "editShape",
      label: "Edit",
      children: [
        {
          id: "editText",
          label: "Edit Text...",
        },
        {
          id: "editGeometry",
          label: "Edit Geometry...",
        },
        { type: "separator" },
        {
          id: "editFill",
          label: "Edit Fill...",
        },
        {
          id: "editLine",
          label: "Edit Line...",
        },
        {
          id: "editEffects",
          label: "Edit Effects...",
        },
      ],
    },
  ];
}
