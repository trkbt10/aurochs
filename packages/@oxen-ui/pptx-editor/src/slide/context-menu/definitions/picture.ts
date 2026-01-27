/**
 * @file Picture-specific menu items definition
 *
 * Menu items specific to pic (picture) elements.
 */

import type { MenuEntry } from "../../../ui/context-menu";

/**
 * Get picture-specific menu items
 */
export function getPictureMenuItems(): readonly MenuEntry[] {
  return [
    {
      type: "submenu",
      id: "editPicture",
      label: "Edit",
      children: [
        {
          id: "editCrop",
          label: "Edit Crop...",
        },
        {
          id: "editTransform",
          label: "Edit Transform...",
        },
        { type: "separator" },
        {
          id: "editEffects",
          label: "Edit Effects...",
        },
      ],
    },
  ];
}
