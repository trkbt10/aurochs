/**
 * @file Layer panel component
 *
 * Displays shapes in a hierarchical tree view with:
 * - Selection by clicking
 * - Multi-selection with Ctrl/Cmd+click
 * - Context menu for group/ungroup/reorder/delete
 * - Drag-and-drop reordering (top-level only)
 * - Expandable groups
 *
 * Note: This is pure content without container styles.
 * Use Panel component to wrap if needed.
 */

import {
  useCallback,
  useState,
  useMemo,
  type CSSProperties,
  type MouseEvent,
} from "react";
import type { Shape, GrpShape } from "../../pptx/domain";
import { useSlideEditor } from "../context/SlideEditorContext";
import { getShapeId, hasShapeId, isTopLevelShape } from "../context/shape";
import { Button } from "../ui/primitives";

// =============================================================================
// Types
// =============================================================================

export type LayerPanelProps = {
  /** Custom class name */
  readonly className?: string;
  /** Custom style */
  readonly style?: CSSProperties;
};

type ShapeItemProps = {
  readonly shape: Shape;
  readonly depth: number;
  readonly isSelected: boolean;
  readonly isPrimary: boolean;
  readonly isExpanded: boolean;
  readonly onSelect: (shapeId: string, addToSelection: boolean) => void;
  readonly onToggleExpand: (shapeId: string) => void;
  readonly onContextMenu: (e: MouseEvent, shapeId: string) => void;
  readonly expandedGroups: ReadonlySet<string>;
  readonly selectedIds: readonly string[];
};

type ContextMenuState = {
  readonly x: number;
  readonly y: number;
  readonly shapeId: string;
} | null;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get display icon for shape type
 */
function getShapeIcon(shape: Shape): string {
  switch (shape.type) {
    case "sp": {
      const geometry = shape.properties.geometry;
      if (geometry?.type === "preset") {
        switch (geometry.preset) {
          case "rect":
          case "roundRect":
            return "▢";
          case "ellipse":
            return "○";
          case "triangle":
          case "rtTriangle":
            return "△";
          case "star5":
          case "star6":
            return "★";
          case "line":
            return "─";
          case "rightArrow":
          case "leftArrow":
            return "→";
          default:
            return "◇";
        }
      }
      return "◇";
    }
    case "pic":
      return "🖼";
    case "cxnSp":
      return "⤤";
    case "grpSp":
      return "📁";
    case "graphicFrame": {
      switch (shape.content.type) {
        case "table":
          return "▦";
        case "chart":
          return "📊";
        case "diagram":
          return "🔀";
        case "oleObject":
          return "📎";
        default:
          return "▣";
      }
    }
    default:
      return "▣";
  }
}

/**
 * Get display name for shape
 */
function getShapeName(shape: Shape): string {
  if ("nonVisual" in shape && shape.nonVisual.name) {
    return shape.nonVisual.name;
  }

  switch (shape.type) {
    case "sp": {
      const geometry = shape.properties.geometry;
      return geometry?.type === "preset" ? geometry.preset : "Shape";
    }
    case "pic":
      return "Picture";
    case "cxnSp":
      return "Connector";
    case "grpSp":
      return "Group";
    case "graphicFrame":
      switch (shape.content.type) {
        case "table":
          return "Table";
        case "chart":
          return "Chart";
        case "diagram":
          return "Diagram";
        case "oleObject":
          return "OLE Object";
        default:
          return "Graphic";
      }
    default:
      return shape.type;
  }
}

// =============================================================================
// Sub-components
// =============================================================================

/**
 * Individual shape item in the tree
 */
function ShapeItem({
  shape,
  depth,
  isSelected,
  isPrimary,
  isExpanded,
  onSelect,
  onToggleExpand,
  onContextMenu,
  expandedGroups,
  selectedIds,
}: ShapeItemProps) {
  const shapeId = getShapeId(shape);
  const isGroup = shape.type === "grpSp";
  const hasChildren = isGroup && (shape as GrpShape).children.length > 0;

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (!shapeId) {
      return;
    }
    onSelect(shapeId, e.ctrlKey || e.metaKey);
  };

  const handleToggleExpand = (e: MouseEvent) => {
    e.stopPropagation();
    if (shapeId) {
      onToggleExpand(shapeId);
    }
  };

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (shapeId) {
      onContextMenu(e, shapeId);
    }
  };

  const getItemBackground = (): string => {
    if (isPrimary) { return "var(--accent-primary, #3b82f6)"; }
    if (isSelected) { return "var(--bg-secondary, #1a1a1a)"; }
    return "transparent";
  };

  const itemStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 8px",
    paddingLeft: `${8 + depth * 16}px`,
    cursor: "pointer",
    backgroundColor: getItemBackground(),
    color: isPrimary ? "white" : "var(--text-secondary, #a1a1a1)",
    borderRadius: "4px",
    fontSize: "12px",
    userSelect: "none",
    marginBottom: "2px",
  };

  const expandIconStyle: CSSProperties = {
    width: "16px",
    height: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    color: "var(--text-tertiary, #737373)",
    transition: "transform 0.15s",
    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
  };

  const iconStyle: CSSProperties = {
    fontSize: "12px",
    width: "16px",
    textAlign: "center",
  };

  const nameStyle: CSSProperties = {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  return (
    <>
      <div
        style={itemStyle}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        title={getShapeName(shape)}
      >
        {/* Expand/Collapse toggle for groups */}
        {hasChildren && (
          <span style={expandIconStyle} onClick={handleToggleExpand}>▶</span>
        )}
        {!hasChildren && <span style={{ width: "16px" }} />}

        {/* Shape icon */}
        <span style={iconStyle}>{getShapeIcon(shape)}</span>

        {/* Shape name */}
        <span style={nameStyle}>{getShapeName(shape)}</span>

        {/* Child count for groups */}
        {isGroup && (
          <span
            style={{
              fontSize: "10px",
              color: "var(--text-tertiary, #737373)",
              backgroundColor: "var(--bg-tertiary, #111111)",
              padding: "1px 4px",
              borderRadius: "3px",
            }}
          >
            {(shape as GrpShape).children.length}
          </span>
        )}
      </div>

      {/* Render children if expanded */}
      {isGroup && isExpanded && (
        <div>
          {(shape as GrpShape).children.map((child, idx) => {
            const childId = getShapeId(child) ?? `${shapeId}-${idx}`;
            const childSelected = selectedIds.includes(childId);
            const childPrimary =
              selectedIds.length > 0 && selectedIds[selectedIds.length - 1] === childId;

            return (
              <ShapeItem
                key={childId}
                shape={child}
                depth={depth + 1}
                isSelected={childSelected}
                isPrimary={childPrimary}
                isExpanded={expandedGroups.has(childId)}
                onSelect={onSelect}
                onToggleExpand={onToggleExpand}
                onContextMenu={onContextMenu}
                expandedGroups={expandedGroups}
                selectedIds={selectedIds}
              />
            );
          })}
        </div>
      )}
    </>
  );
}

/**
 * Shape list component
 */
type ShapeListProps = {
  readonly shapes: readonly Shape[];
  readonly selectedIds: readonly string[];
  readonly primaryId: string | undefined;
  readonly expandedGroups: ReadonlySet<string>;
  readonly onSelect: (shapeId: string, addToSelection: boolean) => void;
  readonly onToggleExpand: (shapeId: string) => void;
  readonly onContextMenu: (e: MouseEvent, shapeId: string) => void;
  readonly onEmptyClick: () => void;
};

function ShapeList({
  shapes,
  selectedIds,
  primaryId,
  expandedGroups,
  onSelect,
  onToggleExpand,
  onContextMenu,
  onEmptyClick,
}: ShapeListProps) {
  const listStyle: CSSProperties = {
    flex: 1,
    overflow: "auto",
    padding: "8px",
  };

  const emptyStyle: CSSProperties = {
    padding: "24px 16px",
    textAlign: "center",
    color: "var(--text-tertiary, #737373)",
    fontSize: "12px",
  };

  if (shapes.length === 0) {
    return (
      <div style={listStyle} onClick={onEmptyClick}>
        <div style={emptyStyle}>No shapes on this slide</div>
      </div>
    );
  }

  // Reversed order: bottom layer first in array, but we show top layer first
  const shapesReversed = [...shapes].reverse();

  return (
    <div style={listStyle} onClick={onEmptyClick}>
      {shapesReversed.map((shape, idx) => {
        const shapeId = getShapeId(shape) ?? `shape-${shapes.length - 1 - idx}`;
        const isSelected = selectedIds.includes(shapeId);
        const isPrimary = primaryId === shapeId;
        const isExpanded = expandedGroups.has(shapeId);

        return (
          <ShapeItem
            key={shapeId}
            shape={shape}
            depth={0}
            isSelected={isSelected}
            isPrimary={isPrimary}
            isExpanded={isExpanded}
            onSelect={onSelect}
            onToggleExpand={onToggleExpand}
            onContextMenu={onContextMenu}
            expandedGroups={expandedGroups}
            selectedIds={selectedIds}
          />
        );
      })}
    </div>
  );
}

/**
 * Toolbar with group/ungroup buttons
 */
function LayerToolbar({
  canGroup,
  canUngroup,
  onGroup,
  onUngroup,
}: {
  readonly canGroup: boolean;
  readonly canUngroup: boolean;
  readonly onGroup: () => void;
  readonly onUngroup: () => void;
}) {
  const toolbarStyle: CSSProperties = {
    display: "flex",
    gap: "4px",
    borderTop: "1px solid var(--border-subtle, #222)",
    padding: "8px",
  };

  return (
    <div style={toolbarStyle}>
      <Button
        variant="secondary"
        title="Group (⌘G)"
        disabled={!canGroup}
        onClick={onGroup}
        style={{ flex: 1, fontSize: "11px", padding: "6px" }}
      >
        Group
      </Button>
      <Button
        variant="secondary"
        title="Ungroup (⌘⇧G)"
        disabled={!canUngroup}
        onClick={onUngroup}
        style={{ flex: 1, fontSize: "11px", padding: "6px" }}
      >
        Ungroup
      </Button>
    </div>
  );
}

/**
 * Context menu for layer actions
 */
function ContextMenu({
  x,
  y,
  canGroup,
  canUngroup,
  onGroup,
  onUngroup,
  onBringToFront,
  onSendToBack,
  onBringForward,
  onSendBackward,
  onDelete,
  onClose,
}: {
  readonly x: number;
  readonly y: number;
  readonly canGroup: boolean;
  readonly canUngroup: boolean;
  readonly onGroup: () => void;
  readonly onUngroup: () => void;
  readonly onBringToFront: () => void;
  readonly onSendToBack: () => void;
  readonly onBringForward: () => void;
  readonly onSendBackward: () => void;
  readonly onDelete: () => void;
  readonly onClose: () => void;
}) {
  const menuStyle: CSSProperties = {
    position: "fixed",
    left: x,
    top: y,
    backgroundColor: "var(--bg-primary, #0a0a0a)",
    border: "1px solid var(--border-subtle, #333)",
    borderRadius: "6px",
    padding: "4px 0",
    zIndex: 1000,
    minWidth: "160px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
  };

  const menuItemStyle: CSSProperties = {
    padding: "6px 12px",
    fontSize: "12px",
    cursor: "pointer",
    color: "var(--text-secondary, #a1a1a1)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  };

  const menuItemDisabledStyle: CSSProperties = {
    ...menuItemStyle,
    color: "var(--text-tertiary, #555)",
    cursor: "default",
  };

  const separatorStyle: CSSProperties = {
    height: "1px",
    backgroundColor: "var(--border-subtle, #333)",
    margin: "4px 0",
  };

  const MenuItem = ({
    label,
    shortcut,
    disabled,
    onClick,
  }: {
    label: string;
    shortcut?: string;
    disabled?: boolean;
    onClick: () => void;
  }) => (
    <div
      style={disabled ? menuItemDisabledStyle : menuItemStyle}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = "var(--bg-secondary, #1a1a1a)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <span style={{ flex: 1 }}>{label}</span>
      {shortcut && (
        <span style={{ color: "var(--text-tertiary, #555)", fontSize: "10px" }}>
          {shortcut}
        </span>
      )}
    </div>
  );

  return (
    <>
      {/* Backdrop to close menu */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999,
        }}
        onClick={onClose}
      />
      <div style={menuStyle}>
        <MenuItem
          label="Group"
          shortcut="⌘G"
          disabled={!canGroup}
          onClick={() => {
            onGroup();
            onClose();
          }}
        />
        <MenuItem
          label="Ungroup"
          shortcut="⌘⇧G"
          disabled={!canUngroup}
          onClick={() => {
            onUngroup();
            onClose();
          }}
        />
        <div style={separatorStyle} />
        <MenuItem
          label="Bring to Front"
          onClick={() => {
            onBringToFront();
            onClose();
          }}
        />
        <MenuItem
          label="Send to Back"
          onClick={() => {
            onSendToBack();
            onClose();
          }}
        />
        <MenuItem
          label="Bring Forward"
          onClick={() => {
            onBringForward();
            onClose();
          }}
        />
        <MenuItem
          label="Send Backward"
          onClick={() => {
            onSendBackward();
            onClose();
          }}
        />
        <div style={separatorStyle} />
        <MenuItem
          label="Delete"
          shortcut="⌫"
          onClick={() => {
            onDelete();
            onClose();
          }}
        />
      </div>
    </>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Layer panel showing shape hierarchy.
 *
 * Features:
 * - Tree view of all shapes
 * - Click to select, Ctrl/Cmd+click for multi-select
 * - Right-click context menu for actions
 * - Expandable group shapes
 *
 * Note: This is pure content without container styles.
 * Use Panel component to wrap if needed.
 */
export function LayerPanel({ className, style }: LayerPanelProps) {
  const { slide, state, dispatch, primaryShape } = useSlideEditor();
  const { selection } = state;
  const selectedIds = selection.selectedIds;

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);

  // Toggle group expansion
  const handleToggleExpand = useCallback((shapeId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(shapeId)) {
        next.delete(shapeId);
      } else {
        next.add(shapeId);
      }
      return next;
    });
  }, []);

  // Handle shape selection
  const handleSelect = useCallback(
    (shapeId: string, addToSelection: boolean) => {
      dispatch({ type: "SELECT", shapeId, addToSelection });
    },
    [dispatch]
  );

  // Handle context menu
  const handleContextMenu = useCallback(
    (e: MouseEvent, shapeId: string) => {
      // If right-clicked shape is not selected, select it first
      if (!selectedIds.includes(shapeId)) {
        dispatch({ type: "SELECT", shapeId, addToSelection: false });
      }
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        shapeId,
      });
    },
    [dispatch, selectedIds]
  );

  // Close context menu
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Check if can group (2+ top-level shapes selected)
  const canGroup = useMemo(() => {
    if (selectedIds.length < 2) {
      return false;
    }
    // All selected shapes must be at top level
    return selectedIds.every((id) => isTopLevelShape(slide.shapes, id));
  }, [selectedIds, slide.shapes]);

  // Check if can ungroup (single group selected)
  const canUngroup = useMemo(() => {
    if (selectedIds.length !== 1) {
      return false;
    }
    return primaryShape?.type === "grpSp";
  }, [selectedIds, primaryShape]);

  // Actions
  const handleGroup = useCallback(() => {
    if (canGroup) {
      dispatch({ type: "GROUP_SHAPES", shapeIds: selectedIds });
    }
  }, [dispatch, selectedIds, canGroup]);

  const handleUngroup = useCallback(() => {
    if (canUngroup && primaryShape && hasShapeId(primaryShape)) {
      dispatch({ type: "UNGROUP_SHAPE", shapeId: primaryShape.nonVisual.id });
    }
  }, [dispatch, primaryShape, canUngroup]);

  const handleBringToFront = useCallback(() => {
    if (selectedIds.length === 1) {
      dispatch({ type: "REORDER_SHAPE", shapeId: selectedIds[0], direction: "front" });
    }
  }, [dispatch, selectedIds]);

  const handleSendToBack = useCallback(() => {
    if (selectedIds.length === 1) {
      dispatch({ type: "REORDER_SHAPE", shapeId: selectedIds[0], direction: "back" });
    }
  }, [dispatch, selectedIds]);

  const handleBringForward = useCallback(() => {
    if (selectedIds.length === 1) {
      dispatch({ type: "REORDER_SHAPE", shapeId: selectedIds[0], direction: "forward" });
    }
  }, [dispatch, selectedIds]);

  const handleSendBackward = useCallback(() => {
    if (selectedIds.length === 1) {
      dispatch({ type: "REORDER_SHAPE", shapeId: selectedIds[0], direction: "backward" });
    }
  }, [dispatch, selectedIds]);

  const handleDelete = useCallback(() => {
    if (selectedIds.length > 0) {
      dispatch({ type: "DELETE_SHAPES", shapeIds: selectedIds });
    }
  }, [dispatch, selectedIds]);

  // Clear selection when clicking empty area
  const handlePanelClick = useCallback(() => {
    dispatch({ type: "CLEAR_SELECTION" });
  }, [dispatch]);

  // Internal flex layout for list + toolbar structure
  // Note: No bg/border here - those are provided by Panel wrapper
  const layoutStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    ...style,
  };

  return (
    <div className={className} style={layoutStyle}>
      <ShapeList
        shapes={slide.shapes}
        selectedIds={selectedIds}
        primaryId={selection.primaryId}
        expandedGroups={expandedGroups}
        onSelect={handleSelect}
        onToggleExpand={handleToggleExpand}
        onContextMenu={handleContextMenu}
        onEmptyClick={handlePanelClick}
      />

      {/* Toolbar */}
      <LayerToolbar
        canGroup={canGroup}
        canUngroup={canUngroup}
        onGroup={handleGroup}
        onUngroup={handleUngroup}
      />

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          canGroup={canGroup}
          canUngroup={canUngroup}
          onGroup={handleGroup}
          onUngroup={handleUngroup}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
          onBringForward={handleBringForward}
          onSendBackward={handleSendBackward}
          onDelete={handleDelete}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  );
}
