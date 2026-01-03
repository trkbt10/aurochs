/**
 * @file Slide context menu component
 *
 * Domain-aware context menu that builds menu items based on
 * the current selection and shape types.
 */

import { useCallback, useMemo } from "react";
import { ContextMenu, type MenuEntry } from "../../ui/context-menu";
import { useSlideEditor } from "../../context/SlideEditorContext";
import { useContextMenuActions } from "../hooks/useContextMenuActions";
import {
  getCommonMenuItems,
  getZOrderMenuItems,
  getGroupMenuItems,
  getAlignmentMenuItems,
  getShapeMenuItems,
  getPictureMenuItems,
  getTableMenuItems,
  getChartMenuItems,
  getDiagramMenuItems,
} from "./definitions";

// =============================================================================
// Types
// =============================================================================

export type SlideContextMenuProps = {
  /** X coordinate (client) */
  readonly x: number;
  /** Y coordinate (client) */
  readonly y: number;
  /** Callback when menu should close */
  readonly onClose: () => void;
};

// =============================================================================
// Helper
// =============================================================================

/**
 * Flatten menu groups with separators between them
 */
function flattenWithSeparators(groups: readonly (readonly MenuEntry[])[]): readonly MenuEntry[] {
  const result: MenuEntry[] = [];

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    if (group.length === 0) continue;

    if (result.length > 0) {
      result.push({ type: "separator" });
    }
    result.push(...group);
  }

  return result;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Slide context menu component
 *
 * Builds menu items based on:
 * - Common operations (copy, paste, delete)
 * - Selection state (single vs multi)
 * - Shape type (sp, pic, table, chart, diagram)
 */
export function SlideContextMenu({ x, y, onClose }: SlideContextMenuProps) {
  const { primaryShape, selectedShapes } = useSlideEditor();
  const actions = useContextMenuActions();

  // Build menu items based on selection
  const menuItems = useMemo((): readonly MenuEntry[] => {
    const groups: (readonly MenuEntry[])[] = [];

    // Common operations (always present)
    groups.push(getCommonMenuItems(actions));

    // Z-order operations (single selection only makes sense)
    if (selectedShapes.length === 1) {
      groups.push(getZOrderMenuItems(actions));
    }

    // Alignment (2+ shapes)
    if (selectedShapes.length >= 2) {
      groups.push(getAlignmentMenuItems(actions));
    }

    // Grouping
    groups.push(getGroupMenuItems(actions));

    // Element-specific items (only for single selection or same-type multi-selection)
    if (primaryShape && selectedShapes.length === 1) {
      switch (primaryShape.type) {
        case "sp":
          groups.push(getShapeMenuItems());
          break;
        case "pic":
          groups.push(getPictureMenuItems());
          break;
        case "graphicFrame": {
          const content = primaryShape.content;
          if (content.type === "table") {
            groups.push(getTableMenuItems());
          } else if (content.type === "chart") {
            groups.push(getChartMenuItems());
          } else if (content.type === "diagram") {
            groups.push(getDiagramMenuItems());
          }
          break;
        }
      }
    }

    return flattenWithSeparators(groups);
  }, [primaryShape, selectedShapes, actions]);

  // Handle menu action
  const handleAction = useCallback(
    (actionId: string) => {
      switch (actionId) {
        // Clipboard
        case "copy":
          actions.copy();
          break;
        case "cut":
          actions.cut();
          break;
        case "paste":
          actions.paste();
          break;

        // Edit
        case "duplicate":
          actions.duplicateSelected();
          break;
        case "delete":
          actions.deleteSelected();
          break;

        // Z-order
        case "bringToFront":
          actions.bringToFront();
          break;
        case "bringForward":
          actions.bringForward();
          break;
        case "sendBackward":
          actions.sendBackward();
          break;
        case "sendToBack":
          actions.sendToBack();
          break;

        // Group
        case "group":
          actions.group();
          break;
        case "ungroup":
          actions.ungroup();
          break;

        // Alignment
        case "alignLeft":
          actions.alignLeft();
          break;
        case "alignCenter":
          actions.alignCenter();
          break;
        case "alignRight":
          actions.alignRight();
          break;
        case "alignTop":
          actions.alignTop();
          break;
        case "alignMiddle":
          actions.alignMiddle();
          break;
        case "alignBottom":
          actions.alignBottom();
          break;
        case "distributeHorizontally":
          actions.distributeHorizontally();
          break;
        case "distributeVertically":
          actions.distributeVertically();
          break;

        // Element-specific (property panel navigation)
        // These are placeholders for now - will be implemented later
        case "editText":
        case "editGeometry":
        case "editFill":
        case "editLine":
        case "editEffects":
        case "editCrop":
        case "editTransform":
        case "editTableProperties":
        case "editTableStyle":
        case "editChartData":
        case "editChartType":
        case "editChartStyle":
        case "editDiagramData":
        case "editDiagramLayout":
        case "editDiagramStyle":
          // TODO: Open corresponding property panel section
          console.log(`Open property panel for: ${actionId}`);
          break;
      }
    },
    [actions]
  );

  return (
    <ContextMenu
      x={x}
      y={y}
      items={menuItems}
      onAction={handleAction}
      onClose={onClose}
    />
  );
}
