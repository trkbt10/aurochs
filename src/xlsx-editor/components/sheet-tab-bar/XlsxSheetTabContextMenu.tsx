/**
 * @file XlsxSheetTabContextMenu
 *
 * Context menu for sheet tab operations:
 * - Rename
 * - Duplicate
 * - Delete
 */

import { useMemo } from "react";
import { ContextMenu, type MenuEntry } from "../../../office-editor-components";
import type { SheetTabContextMenuState } from "./types";

export type XlsxSheetTabContextMenuAction = "rename" | "duplicate" | "delete";

export type XlsxSheetTabContextMenuProps = {
  readonly menuState: SheetTabContextMenuState;
  readonly canDelete: boolean;
  readonly onAction: (action: XlsxSheetTabContextMenuAction, sheetIndex: number) => void;
  readonly onClose: () => void;
};

/**
 * Context menu for sheet tab operations
 */
export function XlsxSheetTabContextMenu({
  menuState,
  canDelete,
  onAction,
  onClose,
}: XlsxSheetTabContextMenuProps) {
  const items = useMemo<readonly MenuEntry[]>(() => [
    {
      id: "rename",
      label: "Rename",
      shortcut: "F2",
    },
    {
      id: "duplicate",
      label: "Duplicate",
    },
    {
      type: "separator",
    },
    {
      id: "delete",
      label: "Delete",
      disabled: !canDelete,
      danger: true,
    },
  ], [canDelete]);

  if (menuState.type === "closed") {
    return null;
  }

  return (
    <ContextMenu
      x={menuState.x}
      y={menuState.y}
      items={items}
      onAction={(actionId) => {
        onAction(actionId as XlsxSheetTabContextMenuAction, menuState.sheetIndex);
      }}
      onClose={onClose}
    />
  );
}
