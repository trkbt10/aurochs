/**
 * @file Diagram-specific menu items definition
 *
 * Menu items specific to diagram (SmartArt) elements.
 */

import type { MenuEntry } from "@aurochs-ui/ui-components";

/**
 * Get diagram-specific menu items
 */
export function getDiagramMenuItems(): readonly MenuEntry[] {
  return [
    {
      type: "submenu",
      id: "editDiagram",
      label: "Edit",
      children: [
        {
          id: "editDiagramData",
          label: "Edit Diagram Data...",
        },
        {
          id: "editDiagramLayout",
          label: "Change Layout...",
        },
        { type: "separator" },
        {
          id: "editDiagramStyle",
          label: "Edit Diagram Style...",
        },
      ],
    },
  ];
}
