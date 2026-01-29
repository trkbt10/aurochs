/**
 * @file Layer panel component
 *
 * Displays shapes in a hierarchical tree view with:
 * - Selection by clicking
 * - Range selection with Shift+click
 * - Multi-selection with Ctrl/Cmd+click
 * - Context menu for group/ungroup/reorder/delete
 * - Expandable groups
 *
 * Props-based component that can be used with any state management.
 * Uses lucide-react icons for consistent visual design.
 */

import {
  useCallback,
  useState,
  useMemo,
  type CSSProperties,
  type DragEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { Slide, Shape, GrpShape } from "@oxen-office/pptx/domain/index";
import type { ShapeId } from "@oxen-office/pptx/domain/types";
import type { SelectionState } from "../context/slide/state";
import { getShapeId, hasShapeId } from "../shape/identity";
import { findShapeById, findShapeByIdWithParents, isTopLevelShape } from "../shape/query";
import type { ShapeHierarchyTarget } from "../shape/hierarchy";
import { ContextMenu } from "@oxen-ui/ui-components";
import type { MenuEntry } from "../ui/context-menu";
import {
  RectIcon,
  EllipseIcon,
  TriangleIcon,
  StarIcon,
  LineIcon,
  RightArrowIcon,
  DiamondIcon,
  PictureIcon,
  ConnectorIcon,
  FolderIcon,
  TableIcon,
  ChartIcon,
  DiagramIcon,
  OleObjectIcon,
  ChevronRightIcon,
  UnknownShapeIcon,
  VisibleIcon,
  HiddenIcon,
  LockIcon,
  UnlockIcon,
} from "@oxen-ui/ui-components/icons";
import { colorTokens, fontTokens, iconTokens } from "@oxen-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type LayerPanelProps = {
  /** Current slide */
  readonly slide: Slide;
  /** Current selection state */
  readonly selection: SelectionState;
  /** Primary selected shape */
  readonly primaryShape: Shape | undefined;
  /** Callback when a shape is selected */
  readonly onSelect: (shapeId: ShapeId, addToSelection: boolean, toggle?: boolean) => void;
  /** Callback when multiple shapes are selected */
  readonly onSelectMultiple: (shapeIds: readonly ShapeId[], primaryId?: ShapeId) => void;
  /** Callback to group shapes */
  readonly onGroup: (shapeIds: readonly ShapeId[]) => void;
  /** Callback to ungroup a shape */
  readonly onUngroup: (shapeId: ShapeId) => void;
  /** Callback to move a shape in the hierarchy */
  readonly onMoveShape: (shapeId: ShapeId, target: ShapeHierarchyTarget) => void;
  /** Callback to update multiple shapes */
  readonly onUpdateShapes: (
    shapeIds: readonly ShapeId[],
    updater: (shape: Shape) => Shape
  ) => void;
  /** Callback to clear selection */
  readonly onClearSelection: () => void;
  /** Custom class name */
  readonly className?: string;
  /** Custom style */
  readonly style?: CSSProperties;
};

type ShapeItemProps = {
  readonly shape: Shape;
  readonly depth: number;
  readonly parentId: ShapeId | null;
  readonly displayIndex: number;
  readonly isSelected: boolean;
  readonly isExpanded: boolean;
  readonly isHidden: boolean;
  readonly isLocked: boolean;
  readonly dropTarget: LayerDropTarget | null;
  readonly draggingId: ShapeId | null;
  readonly onSelect: (shapeId: string, modifiers: ShapeItemModifiers) => void;
  readonly onToggleExpand: (shapeId: string) => void;
  readonly onToggleVisibility: (shapeId: ShapeId) => void;
  readonly onToggleLock: (shapeId: ShapeId) => void;
  readonly onContextMenu: (shapeId: ShapeId, event: MouseEvent) => void;
  readonly onDragStart: (shapeId: ShapeId, event: DragEvent) => void;
  readonly onDragOver: (
    shape: Shape,
    parentId: ShapeId | null,
    displayIndex: number,
    event: DragEvent
  ) => void;
  readonly onDrop: (event: DragEvent) => void;
  readonly onDragEnd: () => void;
  readonly expandedGroups: ReadonlySet<string>;
  readonly selectedIds: readonly string[];
};

// =============================================================================
// Helper Functions
// =============================================================================

const LAYER_ICON_SIZE = iconTokens.size.sm;
const LAYER_ICON_STROKE = iconTokens.strokeWidth;

type ShapeItemModifiers = {
  readonly shiftKey: boolean;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
};

type DropPosition = "before" | "after" | "inside";

type LayerDropTarget = {
  readonly targetId: ShapeId | null;
  readonly parentId: ShapeId | null;
  readonly index: number;
  readonly position: DropPosition;
};

/**
 * Get display icon for shape type
 */
function getShapeIcon(shape: Shape): ReactNode {
  const iconProps = { size: LAYER_ICON_SIZE, strokeWidth: LAYER_ICON_STROKE };

  switch (shape.type) {
    case "sp": {
      const geometry = shape.properties.geometry;
      if (geometry?.type === "preset") {
        switch (geometry.preset) {
          case "rect":
          case "roundRect":
            return <RectIcon {...iconProps} />;
          case "ellipse":
            return <EllipseIcon {...iconProps} />;
          case "triangle":
          case "rtTriangle":
            return <TriangleIcon {...iconProps} />;
          case "star5":
          case "star6":
            return <StarIcon {...iconProps} />;
          case "line":
            return <LineIcon {...iconProps} />;
          case "rightArrow":
          case "leftArrow":
            return <RightArrowIcon {...iconProps} />;
          default:
            return <DiamondIcon {...iconProps} />;
        }
      }
      return <DiamondIcon {...iconProps} />;
    }
    case "pic":
      return <PictureIcon {...iconProps} />;
    case "cxnSp":
      return <ConnectorIcon {...iconProps} />;
    case "grpSp":
      return <FolderIcon {...iconProps} />;
    case "graphicFrame": {
      switch (shape.content.type) {
        case "table":
          return <TableIcon {...iconProps} />;
        case "chart":
          return <ChartIcon {...iconProps} />;
        case "diagram":
          return <DiagramIcon {...iconProps} />;
        case "oleObject":
          return <OleObjectIcon {...iconProps} />;
        default:
          return <UnknownShapeIcon {...iconProps} />;
      }
    }
    default:
      return <UnknownShapeIcon {...iconProps} />;
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

function getDisplayOrder(shapes: readonly Shape[]): readonly Shape[] {
  return [...shapes].reverse();
}

function getVisibleShapeIds(
  shapes: readonly Shape[],
  expandedGroups: ReadonlySet<string>
): ShapeId[] {
  const visibleIds: ShapeId[] = [];
  const shapesReversed = getDisplayOrder(shapes);

  const walk = (shapeList: readonly Shape[]) => {
    for (const shape of shapeList) {
      const shapeId = getShapeId(shape);
      if (shapeId) {
        visibleIds.push(shapeId);
      }

      if (shape.type === "grpSp" && shapeId && expandedGroups.has(shapeId)) {
        walk(getDisplayOrder((shape as GrpShape).children));
      }
    }
  };

  walk(shapesReversed);
  return visibleIds;
}

function isShapeHidden(shape: Shape): boolean {
  if ("nonVisual" in shape) {
    return shape.nonVisual.hidden === true;
  }
  return false;
}

function setLockFields<T extends Record<string, boolean | undefined>>(
  locks: T | undefined,
  fields: readonly (keyof T)[],
  locked: boolean
): T | undefined {
  if (!locks && !locked) {
    return undefined;
  }
  const nextLocks: Record<string, boolean | undefined> = { ...(locks ?? {}) };
  for (const field of fields) {
    if (locked) {
      nextLocks[field as string] = true;
    } else {
      delete nextLocks[field as string];
    }
  }
  return Object.keys(nextLocks).length > 0 ? (nextLocks as T) : undefined;
}

function isShapeLocked(shape: Shape): boolean {
  switch (shape.type) {
    case "sp":
      return (
        shape.nonVisual.shapeLocks?.noMove === true ||
        shape.nonVisual.shapeLocks?.noResize === true ||
        shape.nonVisual.shapeLocks?.noRot === true
      );
    case "pic":
      return (
        shape.nonVisual.pictureLocks?.noMove === true ||
        shape.nonVisual.pictureLocks?.noResize === true ||
        shape.nonVisual.pictureLocks?.noRot === true
      );
    case "grpSp":
      return (
        shape.nonVisual.groupLocks?.noMove === true ||
        shape.nonVisual.groupLocks?.noResize === true ||
        shape.nonVisual.groupLocks?.noRot === true
      );
    case "graphicFrame":
      return (
        shape.nonVisual.graphicFrameLocks?.noMove === true ||
        shape.nonVisual.graphicFrameLocks?.noResize === true
      );
    default:
      return false;
  }
}

function updateShapeLock(shape: Shape, locked: boolean): Shape {
  switch (shape.type) {
    case "sp":
      return {
        ...shape,
        nonVisual: {
          ...shape.nonVisual,
          shapeLocks: setLockFields(
            shape.nonVisual.shapeLocks,
            ["noMove", "noResize", "noRot"],
            locked
          ),
        },
      };
    case "pic":
      return {
        ...shape,
        nonVisual: {
          ...shape.nonVisual,
          pictureLocks: setLockFields(
            shape.nonVisual.pictureLocks,
            ["noMove", "noResize", "noRot"],
            locked
          ),
        },
      };
    case "grpSp":
      return {
        ...shape,
        nonVisual: {
          ...shape.nonVisual,
          groupLocks: setLockFields(
            shape.nonVisual.groupLocks,
            ["noMove", "noResize", "noRot"],
            locked
          ),
        },
      };
    case "graphicFrame":
      return {
        ...shape,
        nonVisual: {
          ...shape.nonVisual,
          graphicFrameLocks: setLockFields(
            shape.nonVisual.graphicFrameLocks,
            ["noMove", "noResize"],
            locked
          ),
        },
      };
    default:
      return shape;
  }
}

function getDropPosition(event: DragEvent, isGroup: boolean): DropPosition {
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const ratio = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0;

  if (isGroup && ratio > 0.25 && ratio < 0.75) {
    return "inside";
  }
  return ratio < 0.5 ? "before" : "after";
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
  parentId,
  displayIndex,
  isSelected,
  isExpanded,
  isHidden,
  isLocked,
  dropTarget,
  draggingId,
  onSelect,
  onToggleExpand,
  onToggleVisibility,
  onToggleLock,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  expandedGroups,
  selectedIds,
}: ShapeItemProps) {
  const shapeId = getShapeId(shape);
  const isGroup = shape.type === "grpSp";
  const hasChildren = isGroup && (shape as GrpShape).children.length > 0;
  const isDragging = shapeId ? draggingId === shapeId : false;

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (!shapeId) {
      return;
    }
    onSelect(shapeId, {
      shiftKey: e.shiftKey,
      metaKey: e.metaKey,
      ctrlKey: e.ctrlKey,
    });
  };

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (shapeId) {
      onContextMenu(shapeId, e);
    }
  };

  const handleToggleExpand = (e: MouseEvent) => {
    e.stopPropagation();
    if (shapeId) {
      onToggleExpand(shapeId);
    }
  };

  const handleToggleVisibility = (e: MouseEvent) => {
    e.stopPropagation();
    if (shapeId) {
      onToggleVisibility(shapeId);
    }
  };

  const handleToggleLock = (e: MouseEvent) => {
    e.stopPropagation();
    if (shapeId) {
      onToggleLock(shapeId);
    }
  };

  const handleDragStart = (e: DragEvent) => {
    if (!shapeId || isLocked) {
      return;
    }
    onDragStart(shapeId, e);
  };

  const handleDragOver = (e: DragEvent) => {
    if (!shapeId) {
      return;
    }
    onDragOver(shape, parentId, displayIndex, e);
  };

  const handleDrop = (e: DragEvent) => {
    onDrop(e);
  };

  const getDropIndicatorStyle = (): CSSProperties => {
    if (!dropTarget || dropTarget.targetId !== shapeId) {
      return {};
    }
    const accent = `var(--accent-primary, ${colorTokens.accent.primary})`;
    if (dropTarget.position === "inside") {
      return {
        outline: `1px solid ${accent}`,
        outlineOffset: "-1px",
      };
    }
    if (dropTarget.position === "before") {
      return { boxShadow: `inset 0 2px 0 0 ${accent}` };
    }
    return { boxShadow: `inset 0 -2px 0 0 ${accent}` };
  };

  const getItemBackground = (): string => {
    if (!isSelected) { return "transparent"; }
    // Multi-selection: all selected items use the same highlight (for common editing)
    // Single selection: primary color
    return `var(--selection-primary, ${colorTokens.selection.primary})`;
  };

  const getItemTextColor = (): string => {
    if (!isSelected) { return `var(--text-secondary, ${colorTokens.text.secondary})`; }
    // Selected items (single or multi): white text on primary background
    return "#ffffff";
  };

  const itemStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 8px",
    paddingLeft: `${8 + depth * 16}px`,
    cursor: "pointer",
    backgroundColor: getItemBackground(),
    color: getItemTextColor(),
    borderRadius: "4px",
    fontSize: "12px",
    userSelect: "none",
    marginBottom: "2px",
    opacity: isDragging ? 0.6 : 1,
  };

  const expandIconStyle: CSSProperties = {
    width: "16px",
    height: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: isSelected ? "#ffffff" : `var(--text-tertiary, ${colorTokens.text.tertiary})`,
    transition: "transform 0.15s",
    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
  };

  const iconStyle: CSSProperties = {
    width: "16px",
    height: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: isSelected ? "#ffffff" : `var(--text-secondary, ${colorTokens.text.secondary})`,
  };

  const nameStyle: CSSProperties = {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const actionButtonStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "18px",
    height: "18px",
    border: "none",
    borderRadius: "3px",
    backgroundColor: "transparent",
    color: isSelected ? "#ffffff" : `var(--text-tertiary, ${colorTokens.text.tertiary})`,
    cursor: "pointer",
  };

  const actionIconProps = {
    size: 12,
    strokeWidth: iconTokens.strokeWidth,
  };

  const itemDropStyle = getDropIndicatorStyle();

  return (
    <>
      <div
        style={{ ...itemStyle, ...itemDropStyle }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        draggable={!!shapeId && !isLocked}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={onDragEnd}
        title={getShapeName(shape)}
      >
        {/* Expand/Collapse toggle for groups */}
        {hasChildren && (
          <div style={expandIconStyle} onClick={handleToggleExpand}>
            <ChevronRightIcon size={12} strokeWidth={iconTokens.strokeWidth} />
          </div>
        )}
        {!hasChildren && <div style={{ width: "16px" }} />}

        {/* Shape icon */}
        <div style={iconStyle}>{getShapeIcon(shape)}</div>

        {/* Shape name */}
        <span style={nameStyle}>{getShapeName(shape)}</span>

        {/* Visibility toggle */}
        {"nonVisual" in shape && (
          <button
            type="button"
            style={actionButtonStyle}
            title={isHidden ? "Show" : "Hide"}
            onClick={handleToggleVisibility}
          >
            {isHidden ? <HiddenIcon {...actionIconProps} /> : <VisibleIcon {...actionIconProps} />}
          </button>
        )}

        {/* Lock toggle */}
        {"nonVisual" in shape && (
          <button
            type="button"
            style={actionButtonStyle}
            title={isLocked ? "Unlock" : "Lock"}
            onClick={handleToggleLock}
          >
            {isLocked ? <LockIcon {...actionIconProps} /> : <UnlockIcon {...actionIconProps} />}
          </button>
        )}

        {/* Child count for groups */}
        {isGroup && (
          <span
            style={{
              fontSize: fontTokens.size.xs,
              color: `var(--text-tertiary, ${colorTokens.text.tertiary})`,
              backgroundColor: `var(--bg-tertiary, ${colorTokens.background.tertiary})`,
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
          {getDisplayOrder((shape as GrpShape).children).map((child, idx) => {
            const childId = getShapeId(child) ?? `${shapeId}-${idx}`;
            const childSelected = selectedIds.includes(childId);

            return (
              <ShapeItem
                key={childId}
                shape={child}
                depth={depth + 1}
                parentId={shapeId ?? null}
                displayIndex={idx}
                isSelected={childSelected}
                isExpanded={expandedGroups.has(childId)}
                isHidden={isShapeHidden(child)}
                isLocked={isShapeLocked(child)}
                dropTarget={dropTarget}
                draggingId={draggingId}
                onSelect={onSelect}
                onToggleExpand={onToggleExpand}
                onToggleVisibility={onToggleVisibility}
                onToggleLock={onToggleLock}
                onContextMenu={onContextMenu}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onDragEnd={onDragEnd}
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
  readonly expandedGroups: ReadonlySet<string>;
  readonly dropTarget: LayerDropTarget | null;
  readonly draggingId: ShapeId | null;
  readonly onSelect: (shapeId: string, modifiers: ShapeItemModifiers) => void;
  readonly onToggleExpand: (shapeId: string) => void;
  readonly onToggleVisibility: (shapeId: ShapeId) => void;
  readonly onToggleLock: (shapeId: ShapeId) => void;
  readonly onContextMenu: (shapeId: ShapeId, event: MouseEvent) => void;
  readonly onDragStart: (shapeId: ShapeId, event: DragEvent) => void;
  readonly onDragOver: (
    shape: Shape,
    parentId: ShapeId | null,
    displayIndex: number,
    event: DragEvent
  ) => void;
  readonly onDrop: (event: DragEvent) => void;
  readonly onDragEnd: () => void;
  readonly onListDragOver: (event: DragEvent) => void;
  readonly onListDrop: (event: DragEvent) => void;
  readonly onEmptyClick: () => void;
};

function ShapeList({
  shapes,
  selectedIds,
  expandedGroups,
  dropTarget,
  draggingId,
  onSelect,
  onToggleExpand,
  onToggleVisibility,
  onToggleLock,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onListDragOver,
  onListDrop,
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
    color: `var(--text-tertiary, ${colorTokens.text.tertiary})`,
    fontSize: fontTokens.size.md,
  };

  if (shapes.length === 0) {
    return (
      <div
        style={listStyle}
        onClick={onEmptyClick}
        onDragOver={onListDragOver}
        onDrop={onListDrop}
      >
        <div style={emptyStyle}>No shapes on this slide</div>
      </div>
    );
  }

  // Reversed order: bottom layer first in array, but we show top layer first
  const shapesReversed = getDisplayOrder(shapes);

  return (
    <div
      style={listStyle}
      onClick={onEmptyClick}
      onDragOver={onListDragOver}
      onDrop={onListDrop}
    >
      {shapesReversed.map((shape, idx) => {
        const shapeId = getShapeId(shape) ?? `shape-${shapes.length - 1 - idx}`;
        const isSelected = selectedIds.includes(shapeId);
        const isExpanded = expandedGroups.has(shapeId);

        return (
          <ShapeItem
            key={shapeId}
            shape={shape}
            depth={0}
            parentId={null}
            displayIndex={idx}
            isSelected={isSelected}
            isExpanded={isExpanded}
            isHidden={isShapeHidden(shape)}
            isLocked={isShapeLocked(shape)}
            dropTarget={dropTarget}
            draggingId={draggingId}
            onSelect={onSelect}
            onToggleExpand={onToggleExpand}
            onToggleVisibility={onToggleVisibility}
            onToggleLock={onToggleLock}
            onContextMenu={onContextMenu}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            expandedGroups={expandedGroups}
            selectedIds={selectedIds}
          />
        );
      })}
    </div>
  );
}


// =============================================================================
// Main Component
// =============================================================================

/**
 * Layer panel showing shape hierarchy.
 *
 * Props-based component that receives all state and callbacks as props.
 * Can be used with SlideEditor context or with PresentationEditor directly.
 */
export function LayerPanel({
  slide,
  selection,
  primaryShape,
  onSelect,
  onSelectMultiple,
  onGroup,
  onUngroup,
  onMoveShape,
  onUpdateShapes,
  onClearSelection,
  className,
  style,
}: LayerPanelProps) {
  const selectedIds = selection.selectedIds;

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ readonly x: number; readonly y: number } | null>(null);
  const [draggingId, setDraggingId] = useState<ShapeId | null>(null);
  const [dropTarget, setDropTarget] = useState<LayerDropTarget | null>(null);

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
  const visibleShapeIds = useMemo(
    () => getVisibleShapeIds(slide.shapes, expandedGroups),
    [slide.shapes, expandedGroups]
  );

  const visibleIndexById = useMemo(() => {
    return new Map(visibleShapeIds.map((id, index) => [id, index]));
  }, [visibleShapeIds]);

  const handleSelect = useCallback(
    (shapeId: string, modifiers: ShapeItemModifiers) => {
      const isToggle = modifiers.metaKey || modifiers.ctrlKey;

      if (modifiers.shiftKey) {
        const anchorId = selection.primaryId ?? shapeId;
        const anchorIndex = visibleIndexById.get(anchorId);
        const targetIndex = visibleIndexById.get(shapeId);

        if (anchorIndex !== undefined && targetIndex !== undefined) {
          const start = Math.min(anchorIndex, targetIndex);
          const end = Math.max(anchorIndex, targetIndex);
          const rangeIds = visibleShapeIds.slice(start, end + 1) as ShapeId[];
          onSelectMultiple(rangeIds, shapeId as ShapeId);
          return;
        }
      }

      onSelect(shapeId as ShapeId, isToggle, isToggle);
    },
    [onSelect, onSelectMultiple, selection.primaryId, visibleIndexById, visibleShapeIds]
  );

  const selectedShapes = useMemo(() => {
    const result: Shape[] = [];
    for (const id of selectedIds) {
      const shape = findShapeById(slide.shapes, id as ShapeId);
      if (shape) {
        result.push(shape);
      }
    }
    return result;
  }, [selectedIds, slide.shapes]);

  const canHide = useMemo(
    () => selectedShapes.some((shape) => !isShapeHidden(shape)),
    [selectedShapes]
  );
  const canShow = useMemo(
    () => selectedShapes.some((shape) => isShapeHidden(shape)),
    [selectedShapes]
  );
  const canLock = useMemo(
    () => selectedShapes.some((shape) => !isShapeLocked(shape)),
    [selectedShapes]
  );
  const canUnlock = useMemo(
    () => selectedShapes.some((shape) => isShapeLocked(shape)),
    [selectedShapes]
  );

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
      onGroup(selectedIds);
    }
  }, [onGroup, selectedIds, canGroup]);

  const handleUngroup = useCallback(() => {
    if (canUngroup && primaryShape && hasShapeId(primaryShape)) {
      onUngroup(primaryShape.nonVisual.id);
    }
  }, [onUngroup, primaryShape, canUngroup]);

  const applyVisibility = useCallback(
    (shapeIds: readonly ShapeId[], hidden: boolean) => {
      if (shapeIds.length === 0) {
        return;
      }
      onUpdateShapes(shapeIds, (shape) => {
        if (!("nonVisual" in shape)) {
          return shape;
        }
        return {
          ...shape,
          nonVisual: {
            ...shape.nonVisual,
            hidden: hidden ? true : undefined,
          },
        };
      });
    },
    [onUpdateShapes]
  );

  const applyLock = useCallback(
    (shapeIds: readonly ShapeId[], locked: boolean) => {
      if (shapeIds.length === 0) {
        return;
      }
      onUpdateShapes(shapeIds, (shape) => updateShapeLock(shape, locked));
    },
    [onUpdateShapes]
  );

  const getToggleTargetIds = useCallback(
    (shapeId: ShapeId) =>
      selectedIds.includes(shapeId) ? selectedIds : [shapeId],
    [selectedIds]
  );

  const handleToggleVisibility = useCallback(
    (shapeId: ShapeId) => {
      const shape = findShapeById(slide.shapes, shapeId);
      if (!shape) {
        return;
      }
      const targetIds = getToggleTargetIds(shapeId);
      applyVisibility(targetIds, !isShapeHidden(shape));
    },
    [applyVisibility, getToggleTargetIds, slide.shapes]
  );

  const handleToggleLock = useCallback(
    (shapeId: ShapeId) => {
      const shape = findShapeById(slide.shapes, shapeId);
      if (!shape) {
        return;
      }
      const targetIds = getToggleTargetIds(shapeId);
      applyLock(targetIds, !isShapeLocked(shape));
    },
    [applyLock, getToggleTargetIds, slide.shapes]
  );

  const handleContextMenu = useCallback(
    (shapeId: ShapeId, event: MouseEvent) => {
      if (!selectedIds.includes(shapeId)) {
        onSelect(shapeId, false);
      }
      setContextMenu({ x: event.clientX, y: event.clientY });
    },
    [onSelect, selectedIds]
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const menuItems = useMemo<readonly MenuEntry[]>(() => {
    return [
      {
        id: "group",
        label: "Group",
        shortcut: "⌘G",
        disabled: !canGroup,
      },
      {
        id: "ungroup",
        label: "Ungroup",
        shortcut: "⌘⇧G",
        disabled: !canUngroup,
      },
      { type: "separator" },
      {
        id: "show",
        label: "Show",
        disabled: !canShow,
      },
      {
        id: "hide",
        label: "Hide",
        disabled: !canHide,
      },
      { type: "separator" },
      {
        id: "lock",
        label: "Lock",
        disabled: !canLock,
      },
      {
        id: "unlock",
        label: "Unlock",
        disabled: !canUnlock,
      },
    ];
  }, [canGroup, canUngroup, canShow, canHide, canLock, canUnlock]);

  const handleMenuAction = useCallback(
    (actionId: string) => {
      switch (actionId) {
        case "group":
          handleGroup();
          break;
        case "ungroup":
          handleUngroup();
          break;
        case "show":
          applyVisibility(selectedIds, false);
          break;
        case "hide":
          applyVisibility(selectedIds, true);
          break;
        case "lock":
          applyLock(selectedIds, true);
          break;
        case "unlock":
          applyLock(selectedIds, false);
          break;
      }
    },
    [applyLock, applyVisibility, handleGroup, handleUngroup, selectedIds]
  );

  const isDropForbidden = useCallback(
    (targetParentId: ShapeId | null) => {
      if (!draggingId) {
        return true;
      }
      if (!targetParentId) {
        return false;
      }
      if (targetParentId === draggingId) {
        return true;
      }
      const targetInfo = findShapeByIdWithParents(slide.shapes, targetParentId);
      if (!targetInfo) {
        return true;
      }
      return targetInfo.parentGroups.some((group) => group.nonVisual.id === draggingId);
    },
    [draggingId, slide.shapes]
  );

  const handleDragStart = useCallback(
    (shapeId: ShapeId, event: DragEvent) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("application/shape-id", shapeId);
      setDraggingId(shapeId);
    },
    []
  );

  const handleDragOver = useCallback(
    (...args: readonly [shape: Shape, parentId: ShapeId | null, displayIndex: number, event: DragEvent]) => {
      const [shape, parentId, displayIndex, event] = args;
      event.stopPropagation();
      event.preventDefault();
      if (!draggingId) {
        return;
      }

      const shapeId = getShapeId(shape);
      if (!shapeId) {
        return;
      }

      const position = getDropPosition(event, shape.type === "grpSp");
      let targetParentId = parentId;
      let targetIndex = displayIndex;

      if (position === "inside" && shape.type === "grpSp") {
        targetParentId = shapeId;
        targetIndex = getDisplayOrder(shape.children).length;
      } else if (position === "after") {
        targetIndex = displayIndex + 1;
      }

      if (isDropForbidden(targetParentId)) {
        setDropTarget(null);
        return;
      }

      event.dataTransfer.dropEffect = "move";
      setDropTarget({
        targetId: shapeId,
        parentId: targetParentId,
        index: targetIndex,
        position,
      });
    },
    [draggingId, isDropForbidden]
  );

  const handleListDragOver = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      if (!draggingId) {
        return;
      }
      const length = getDisplayOrder(slide.shapes).length;
      event.dataTransfer.dropEffect = "move";
      setDropTarget({
        targetId: null,
        parentId: null,
        index: length,
        position: "after",
      });
    },
    [draggingId, slide.shapes]
  );

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.stopPropagation();
      event.preventDefault();
      if (!draggingId || !dropTarget) {
        return;
      }
      onMoveShape(draggingId, { parentId: dropTarget.parentId, index: dropTarget.index });
      setDraggingId(null);
      setDropTarget(null);
    },
    [draggingId, dropTarget, onMoveShape]
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDropTarget(null);
  }, []);

  // Clear selection when clicking empty area
  const handlePanelClick = useCallback(() => {
    setContextMenu(null);
    onClearSelection();
  }, [onClearSelection]);

  // Internal flex layout for list + toolbar structure
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
        expandedGroups={expandedGroups}
        dropTarget={dropTarget}
        draggingId={draggingId}
        onSelect={handleSelect}
        onToggleExpand={handleToggleExpand}
        onToggleVisibility={handleToggleVisibility}
        onToggleLock={handleToggleLock}
        onContextMenu={handleContextMenu}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        onListDragOver={handleListDragOver}
        onListDrop={handleDrop}
        onEmptyClick={handlePanelClick}
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={menuItems}
          onAction={handleMenuAction}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  );
}
