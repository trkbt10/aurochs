/**
 * @file Alignment menu items definition
 *
 * Menu items for aligning and distributing shapes.
 */

import type { MenuEntry } from "../../../ui/context-menu";
import type { ContextMenuActions } from "../SlideContextMenu";

/**
 * Get alignment menu items (as submenus)
 */
export function getAlignmentMenuItems(actions: ContextMenuActions): readonly MenuEntry[] {
  return [
    {
      type: "submenu",
      id: "align",
      label: "Align",
      disabled: !actions.canAlign,
      children: [
        {
          id: "alignLeft",
          label: "Align Left",
          disabled: !actions.canAlign,
        },
        {
          id: "alignCenter",
          label: "Align Center",
          disabled: !actions.canAlign,
        },
        {
          id: "alignRight",
          label: "Align Right",
          disabled: !actions.canAlign,
        },
        { type: "separator" },
        {
          id: "alignTop",
          label: "Align Top",
          disabled: !actions.canAlign,
        },
        {
          id: "alignMiddle",
          label: "Align Middle",
          disabled: !actions.canAlign,
        },
        {
          id: "alignBottom",
          label: "Align Bottom",
          disabled: !actions.canAlign,
        },
      ],
    },
    {
      type: "submenu",
      id: "distribute",
      label: "Distribute",
      disabled: !actions.canDistribute,
      children: [
        {
          id: "distributeHorizontally",
          label: "Distribute Horizontally",
          disabled: !actions.canDistribute,
        },
        {
          id: "distributeVertically",
          label: "Distribute Vertically",
          disabled: !actions.canDistribute,
        },
      ],
    },
  ];
}
