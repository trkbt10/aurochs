/**
 * @file Z-order menu items definition
 *
 * Menu items for reordering shapes in the z-order.
 */

import type { MenuEntry } from "@aurochs-ui/ui-components";
import type { ContextMenuActions } from "../SlideContextMenu";

/**
 * Get z-order menu items
 */
export function getZOrderMenuItems(actions: ContextMenuActions): readonly MenuEntry[] {
  const disabled = !actions.hasSelection || actions.isMultiSelect;

  return [
    {
      id: "bringToFront",
      label: "Bring to Front",
      disabled,
    },
    {
      id: "bringForward",
      label: "Bring Forward",
      disabled,
    },
    {
      id: "sendBackward",
      label: "Send Backward",
      disabled,
    },
    {
      id: "sendToBack",
      label: "Send to Back",
      disabled,
    },
  ];
}
