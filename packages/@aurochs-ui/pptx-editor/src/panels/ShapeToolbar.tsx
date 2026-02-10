/**
 * @file Shape toolbar component
 *
 * Provides quick action buttons for shape operations.
 * Uses lucide-react icons for consistent visual design.
 */

import { useCallback, useMemo } from "react";
import type { CSSProperties } from "react";
import { LinePickerPopover } from "../ui/line/index";
import { ToolbarButton, TOOLBAR_BUTTON_ICON_SIZE } from "@aurochs-ui/ui-components/primitives/ToolbarButton";
import { ToolbarSeparator } from "@aurochs-ui/ui-components/primitives/ToolbarSeparator";
import type { Line, Shape } from "@aurochs-office/pptx/domain/index";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import {
  TrashIcon,
  CopyIcon,
  UndoIcon,
  RedoIcon,
  BringToFrontIcon,
  SendToBackIcon,
  BringForwardIcon,
  SendBackwardIcon,
} from "@aurochs-ui/ui-components/icons";
import { iconTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Constants
// =============================================================================

// Default line for display when no line is available
const defaultLine: Line = {
  width: 1 as Pixels,
  cap: "flat",
  compound: "sng",
  alignment: "ctr",
  fill: {
    type: "solidFill",
    color: {
      spec: { type: "srgb", value: "000000" },
      transform: {},
    },
  },
  dash: "solid",
  join: "round",
};

// =============================================================================
// Types
// =============================================================================

export type ShapeToolbarProps = {
  /** Whether undo is available */
  readonly canUndo: boolean;
  /** Whether redo is available */
  readonly canRedo: boolean;
  /** Selected shape IDs */
  readonly selectedIds: readonly ShapeId[];
  /** Primary selected shape */
  readonly primaryShape: Shape | undefined;
  /** Callback to undo */
  readonly onUndo: () => void;
  /** Callback to redo */
  readonly onRedo: () => void;
  /** Callback to delete selected shapes */
  readonly onDelete: (shapeIds: readonly ShapeId[]) => void;
  /** Callback to duplicate selected shapes */
  readonly onDuplicate: () => void;
  /** Callback to reorder a shape */
  readonly onReorder: (shapeId: ShapeId, direction: "front" | "back" | "forward" | "backward") => void;
  /** Callback when shape is updated (for line changes) */
  readonly onShapeChange: (shapeId: ShapeId, updater: (shape: Shape) => Shape) => void;
  /** Custom class name */
  readonly className?: string;
  /** Custom style */
  readonly style?: CSSProperties;
  /** Layout direction */
  readonly direction?: "horizontal" | "vertical";
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get line property from a shape if it exists.
 */
function getShapeLine(shape: Shape | undefined): Line | undefined {
  if (!shape) {
    return undefined;
  }
  if (shape.type === "sp" || shape.type === "cxnSp") {
    return shape.properties.line;
  }
  return undefined;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Shape toolbar with quick action buttons.
 *
 * Props-based component that receives all state and callbacks as props.
 * Can be used with SlideEditor context or with PresentationEditor directly.
 */
export function ShapeToolbar({
  canUndo,
  canRedo,
  selectedIds,
  primaryShape,
  onUndo,
  onRedo,
  onDelete,
  onDuplicate,
  onReorder,
  onShapeChange,
  className,
  style,
  direction = "horizontal",
}: ShapeToolbarProps) {
  const hasSelection = selectedIds.length > 0;
  const isMultiSelect = selectedIds.length > 1;
  const primaryId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : undefined;

  // Get line from primary selected shape
  const primaryLine = useMemo(() => getShapeLine(primaryShape), [primaryShape]);

  const handleLineChange = useCallback(
    (line: Line) => {
      if (!primaryId) {
        return;
      }
      onShapeChange(primaryId, (shape) => {
        if (shape.type === "sp" || shape.type === "cxnSp") {
          return {
            ...shape,
            properties: {
              ...shape.properties,
              line,
            },
          };
        }
        return shape;
      });
    },
    [primaryId, onShapeChange],
  );

  const handleDelete = useCallback(() => {
    if (hasSelection) {
      onDelete(selectedIds);
    }
  }, [onDelete, selectedIds, hasSelection]);

  const handleDuplicate = useCallback(() => {
    if (hasSelection) {
      onDuplicate();
    }
  }, [onDuplicate, hasSelection]);

  const handleBringToFront = useCallback(() => {
    if (primaryId) {
      onReorder(primaryId, "front");
    }
  }, [primaryId, onReorder]);

  const handleSendToBack = useCallback(() => {
    if (primaryId) {
      onReorder(primaryId, "back");
    }
  }, [primaryId, onReorder]);

  const handleBringForward = useCallback(() => {
    if (primaryId) {
      onReorder(primaryId, "forward");
    }
  }, [primaryId, onReorder]);

  const handleSendBackward = useCallback(() => {
    if (primaryId) {
      onReorder(primaryId, "backward");
    }
  }, [primaryId, onReorder]);

  const containerStyle: CSSProperties = {
    display: "flex",
    flexDirection: direction === "horizontal" ? "row" : "column",
    alignItems: "center",
    gap: "4px",
    padding: "4px",
    ...style,
  };

  const iconSize = TOOLBAR_BUTTON_ICON_SIZE.sm.icon;
  const strokeWidth = iconTokens.strokeWidth;

  return (
    <div className={className} style={containerStyle}>
      {/* Undo/Redo */}
      <ToolbarButton
        icon={<UndoIcon size={iconSize} strokeWidth={strokeWidth} />}
        label="Undo (Ctrl+Z)"
        onClick={onUndo}
        disabled={!canUndo}
        size="sm"
      />
      <ToolbarButton
        icon={<RedoIcon size={iconSize} strokeWidth={strokeWidth} />}
        label="Redo (Ctrl+Y)"
        onClick={onRedo}
        disabled={!canRedo}
        size="sm"
      />

      <ToolbarSeparator direction={direction} />

      {/* Shape operations */}
      <ToolbarButton
        icon={<TrashIcon size={iconSize} strokeWidth={strokeWidth} />}
        label="Delete (Del)"
        onClick={handleDelete}
        disabled={!hasSelection}
        size="sm"
      />
      <ToolbarButton
        icon={<CopyIcon size={iconSize} strokeWidth={strokeWidth} />}
        label="Duplicate (Ctrl+D)"
        onClick={handleDuplicate}
        disabled={!hasSelection}
        size="sm"
      />

      <ToolbarSeparator direction={direction} />

      {/* Layer ordering */}
      <ToolbarButton
        icon={<BringToFrontIcon size={iconSize} strokeWidth={strokeWidth} />}
        label="Bring to Front"
        onClick={handleBringToFront}
        disabled={!hasSelection || isMultiSelect}
        size="sm"
      />
      <ToolbarButton
        icon={<SendToBackIcon size={iconSize} strokeWidth={strokeWidth} />}
        label="Send to Back"
        onClick={handleSendToBack}
        disabled={!hasSelection || isMultiSelect}
        size="sm"
      />
      <ToolbarButton
        icon={<BringForwardIcon size={iconSize} strokeWidth={strokeWidth} />}
        label="Bring Forward"
        onClick={handleBringForward}
        disabled={!hasSelection || isMultiSelect}
        size="sm"
      />
      <ToolbarButton
        icon={<SendBackwardIcon size={iconSize} strokeWidth={strokeWidth} />}
        label="Send Backward"
        onClick={handleSendBackward}
        disabled={!hasSelection || isMultiSelect}
        size="sm"
      />

      {/* Line style picker - always visible, disabled when no line */}
      <ToolbarSeparator direction={direction} />
      <LinePickerPopover
        value={primaryLine ?? defaultLine}
        onChange={handleLineChange}
        size="md"
        disabled={!primaryLine || isMultiSelect}
      />
    </div>
  );
}
