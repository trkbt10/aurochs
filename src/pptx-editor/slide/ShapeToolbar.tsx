/**
 * @file Shape toolbar component
 *
 * Provides quick action buttons for shape operations.
 * Includes line style picker for shapes with stroke properties.
 */

import { useCallback, useMemo } from "react";
import type { CSSProperties } from "react";
import { useSlideEditor } from "../context/SlideEditorContext";
import { useSlideState } from "./hooks/useSlideState";
import { useSelection } from "./hooks/useSelection";
import { Button } from "../ui/primitives/Button";
import { LinePickerPopover } from "../ui/line";
import type { Line, Shape } from "../../pptx/domain";

// =============================================================================
// Types
// =============================================================================

export type ShapeToolbarProps = {
  /** Custom class name */
  readonly className?: string;
  /** Custom style */
  readonly style?: CSSProperties;
  /** Layout direction */
  readonly direction?: "horizontal" | "vertical";
};

// =============================================================================
// Icons
// =============================================================================

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function BringToFrontIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="8" width="12" height="12" rx="1" />
      <rect x="10" y="4" width="12" height="12" rx="1" fill="currentColor" opacity="0.2" />
    </svg>
  );
}

function SendToBackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="10" y="4" width="12" height="12" rx="1" />
      <rect x="2" y="8" width="12" height="12" rx="1" fill="currentColor" opacity="0.2" />
    </svg>
  );
}

function BringForwardIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="12 4 12 1 12 4" />
      <polyline points="8 8 12 4 16 8" />
      <rect x="6" y="10" width="12" height="10" rx="1" />
    </svg>
  );
}

function SendBackwardIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="12 20 12 23 12 20" />
      <polyline points="8 16 12 20 16 16" />
      <rect x="6" y="4" width="12" height="10" rx="1" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Get line property from a shape if it exists.
 */
function getShapeLine(shape: Shape | undefined): Line | undefined {
  if (!shape) return undefined;
  if (shape.type === "sp" || shape.type === "cxnSp") {
    return shape.properties.line;
  }
  return undefined;
}

/**
 * Shape toolbar with quick action buttons.
 */
export function ShapeToolbar({
  className,
  style,
  direction = "horizontal",
}: ShapeToolbarProps) {
  const { canUndo, canRedo, primaryShape } = useSlideEditor();
  const { deleteSelected, duplicateSelected, reorderShape, undo, redo, updateShape } = useSlideState();
  const { hasSelection, primaryId, isMultiSelect } = useSelection();

  // Get line from primary selected shape
  const primaryLine = useMemo(() => getShapeLine(primaryShape), [primaryShape]);

  const handleLineChange = useCallback(
    (line: Line) => {
      if (!primaryId) return;
      updateShape(primaryId, (shape) => {
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
    [primaryId, updateShape]
  );

  const handleDelete = useCallback(() => {
    deleteSelected();
  }, [deleteSelected]);

  const handleDuplicate = useCallback(() => {
    duplicateSelected();
  }, [duplicateSelected]);

  const handleBringToFront = useCallback(() => {
    if (primaryId) {
      reorderShape(primaryId, "front");
    }
  }, [primaryId, reorderShape]);

  const handleSendToBack = useCallback(() => {
    if (primaryId) {
      reorderShape(primaryId, "back");
    }
  }, [primaryId, reorderShape]);

  const handleBringForward = useCallback(() => {
    if (primaryId) {
      reorderShape(primaryId, "forward");
    }
  }, [primaryId, reorderShape]);

  const handleSendBackward = useCallback(() => {
    if (primaryId) {
      reorderShape(primaryId, "backward");
    }
  }, [primaryId, reorderShape]);

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
    backgroundColor: "var(--editor-border, #333)",
    margin: direction === "horizontal" ? "0 4px" : "4px 0",
  };

  return (
    <div className={className} style={containerStyle}>
      {/* Undo/Redo */}
      <Button
        variant="ghost"
        onClick={undo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        style={{ padding: "4px 6px" }}
      >
        <UndoIcon />
      </Button>
      <Button
        variant="ghost"
        onClick={redo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
        style={{ padding: "4px 6px" }}
      >
        <RedoIcon />
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
        <TrashIcon />
      </Button>
      <Button
        variant="ghost"
        onClick={handleDuplicate}
        disabled={!hasSelection}
        title="Duplicate (Ctrl+D)"
        style={{ padding: "4px 6px" }}
      >
        <CopyIcon />
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
        <BringToFrontIcon />
      </Button>
      <Button
        variant="ghost"
        onClick={handleSendToBack}
        disabled={!hasSelection || isMultiSelect}
        title="Send to Back"
        style={{ padding: "4px 6px" }}
      >
        <SendToBackIcon />
      </Button>
      <Button
        variant="ghost"
        onClick={handleBringForward}
        disabled={!hasSelection || isMultiSelect}
        title="Bring Forward"
        style={{ padding: "4px 6px" }}
      >
        <BringForwardIcon />
      </Button>
      <Button
        variant="ghost"
        onClick={handleSendBackward}
        disabled={!hasSelection || isMultiSelect}
        title="Send Backward"
        style={{ padding: "4px 6px" }}
      >
        <SendBackwardIcon />
      </Button>

      {/* Line style picker */}
      {primaryLine && (
        <>
          <div style={separatorStyle} />
          <LinePickerPopover
            value={primaryLine}
            onChange={handleLineChange}
            size="md"
            disabled={!hasSelection || isMultiSelect}
          />
        </>
      )}
    </div>
  );
}
