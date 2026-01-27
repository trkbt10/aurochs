/**
 * @file Slide context menu component
 *
 * Domain-aware context menu that builds menu items based on
 * the current selection and shape types.
 *
 * Props-based component that receives all state and callbacks as props.
 */

import { useCallback, useMemo } from "react";
import type { Shape } from "@oxen/pptx/domain";
import { ContextMenu, type MenuEntry } from "../../ui/context-menu";
import { getCommonMenuItems } from "./definitions/common";
import { getZOrderMenuItems } from "./definitions/z-order";
import { getGroupMenuItems } from "./definitions/group";
import { getAlignmentMenuItems } from "./definitions/alignment";
import { getShapeMenuItems } from "./definitions/shape";
import { getPictureMenuItems } from "./definitions/picture";
import { getConnectorMenuItems } from "./definitions/connector";
import { getTableMenuItems } from "./definitions/table";
import { getChartMenuItems } from "./definitions/chart";
import { getDiagramMenuItems } from "./definitions/diagram";
import { getOleObjectMenuItems } from "./definitions/ole";

// =============================================================================
// Types
// =============================================================================

/**
 * Context menu actions interface.
 * All actions that can be performed from the context menu.
 */
export type ContextMenuActions = {
  // State flags
  readonly hasSelection: boolean;
  readonly hasClipboard: boolean;
  readonly isMultiSelect: boolean;
  readonly canGroup: boolean;
  readonly canUngroup: boolean;
  readonly canAlign: boolean;
  readonly canDistribute: boolean;
  // Clipboard
  readonly copy: () => void;
  readonly cut: () => void;
  readonly paste: () => void;
  // Edit
  readonly duplicateSelected: () => void;
  readonly deleteSelected: () => void;
  // Z-order
  readonly bringToFront: () => void;
  readonly bringForward: () => void;
  readonly sendBackward: () => void;
  readonly sendToBack: () => void;
  // Group
  readonly group: () => void;
  readonly ungroup: () => void;
  // Alignment
  readonly alignLeft: () => void;
  readonly alignCenter: () => void;
  readonly alignRight: () => void;
  readonly alignTop: () => void;
  readonly alignMiddle: () => void;
  readonly alignBottom: () => void;
  readonly distributeHorizontally: () => void;
  readonly distributeVertically: () => void;
};

export type SlideContextMenuProps = {
  /** X coordinate (client) */
  readonly x: number;
  /** Y coordinate (client) */
  readonly y: number;
  /** Primary selected shape */
  readonly primaryShape: Shape | undefined;
  /** Selected shapes */
  readonly selectedShapes: readonly Shape[];
  /** Context menu actions */
  readonly actions: ContextMenuActions;
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
    if (group.length === 0) {continue;}

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
export function SlideContextMenu({
  x,
  y,
  primaryShape,
  selectedShapes,
  actions,
  onClose,
}: SlideContextMenuProps) {
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
        case "cxnSp":
          groups.push(getConnectorMenuItems());
          break;
        case "graphicFrame": {
          const content = primaryShape.content;
          if (content.type === "table") {
            groups.push(getTableMenuItems());
          } else if (content.type === "chart") {
            groups.push(getChartMenuItems());
          } else if (content.type === "diagram") {
            groups.push(getDiagramMenuItems());
          } else if (content.type === "oleObject") {
            groups.push(getOleObjectMenuItems());
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
        case "editArrows":
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
        case "editOleProperties":
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
