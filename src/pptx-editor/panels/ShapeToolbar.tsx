/**
 * @file Shape toolbar component
 *
 * Provides quick action buttons for shape operations.
 * Uses lucide-react icons for consistent visual design.
 */

import { useCallback, useMemo } from "react";
import type { CSSProperties } from "react";
import { Button } from "../ui/primitives/Button";
import { LinePickerPopover } from "../ui/line/index";
import type { Line, Shape } from "../../pptx/domain/index";
import type { Pixels, ShapeId } from "../../pptx/domain/types";
import {
  TrashIcon,
  CopyIcon,
  UndoIcon,
  RedoIcon,
  BringToFrontIcon,
  SendToBackIcon,
  BringForwardIcon,
  SendBackwardIcon,
} from "../ui/icons/index";
import { colorTokens, iconTokens } from "../ui/design-tokens/index";

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

  const separatorStyle: CSSProperties = {
    width: direction === "horizontal" ? "1px" : "100%",
    height: direction === "horizontal" ? "20px" : "1px",
    backgroundColor: `var(--border-strong, ${colorTokens.border.strong})`,
    margin: direction === "horizontal" ? "0 4px" : "4px 0",
  };

  const iconSize = iconTokens.size.sm;
  const strokeWidth = iconTokens.strokeWidth;

  return (
    <div className={className} style={containerStyle}>
      {/* Undo/Redo */}
      <Button variant="ghost" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" style={{ padding: "4px 6px" }}>
        <UndoIcon size={iconSize} strokeWidth={strokeWidth} />
      </Button>
      <Button variant="ghost" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)" style={{ padding: "4px 6px" }}>
        <RedoIcon size={iconSize} strokeWidth={strokeWidth} />
      </Button>

      <div style={separatorStyle} />

      {/* Shape operations */}
      <Button
        variant="ghost"
        onClick={handleDelete}
        disabled={!hasSelection}
        title="Delete (Del)"
        style={{ padding: "4px 6px" }}
      >
        <TrashIcon size={iconSize} strokeWidth={strokeWidth} />
      </Button>
      <Button
        variant="ghost"
        onClick={handleDuplicate}
        disabled={!hasSelection}
        title="Duplicate (Ctrl+D)"
        style={{ padding: "4px 6px" }}
      >
        <CopyIcon size={iconSize} strokeWidth={strokeWidth} />
      </Button>

      <div style={separatorStyle} />

      {/* Layer ordering */}
      <Button
        variant="ghost"
        onClick={handleBringToFront}
        disabled={!hasSelection || isMultiSelect}
        title="Bring to Front"
        style={{ padding: "4px 6px" }}
      >
        <BringToFrontIcon size={iconSize} strokeWidth={strokeWidth} />
      </Button>
      <Button
        variant="ghost"
        onClick={handleSendToBack}
        disabled={!hasSelection || isMultiSelect}
        title="Send to Back"
        style={{ padding: "4px 6px" }}
      >
        <SendToBackIcon size={iconSize} strokeWidth={strokeWidth} />
      </Button>
      <Button
        variant="ghost"
        onClick={handleBringForward}
        disabled={!hasSelection || isMultiSelect}
        title="Bring Forward"
        style={{ padding: "4px 6px" }}
      >
        <BringForwardIcon size={iconSize} strokeWidth={strokeWidth} />
      </Button>
      <Button
        variant="ghost"
        onClick={handleSendBackward}
        disabled={!hasSelection || isMultiSelect}
        title="Send Backward"
        style={{ padding: "4px 6px" }}
      >
        <SendBackwardIcon size={iconSize} strokeWidth={strokeWidth} />
      </Button>

      {/* Line style picker - always visible, disabled when no line */}
      <div style={separatorStyle} />
      <LinePickerPopover
        value={primaryLine ?? defaultLine}
        onChange={handleLineChange}
        size="md"
        disabled={!primaryLine || isMultiSelect}
      />
    </div>
  );
}
