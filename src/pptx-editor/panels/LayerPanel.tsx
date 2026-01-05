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
  type MouseEvent,
  type ReactNode,
} from "react";
import type { Slide, Shape, GrpShape } from "../../pptx/domain/index";
import type { ShapeId } from "../../pptx/domain/types";
import type { SelectionState } from "../context/slide/state";
import { getShapeId, hasShapeId } from "../shape/identity";
import { isTopLevelShape } from "../shape/query";
import { Button } from "../ui/primitives/index";
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
} from "../ui/icons/index";
import { colorTokens, fontTokens, iconTokens } from "../ui/design-tokens/index";

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
  readonly isSelected: boolean;
  readonly isExpanded: boolean;
  readonly onSelect: (shapeId: string, modifiers: ShapeItemModifiers) => void;
  readonly onToggleExpand: (shapeId: string) => void;
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

function getVisibleShapeIds(
  shapes: readonly Shape[],
  expandedGroups: ReadonlySet<string>
): ShapeId[] {
  const visibleIds: ShapeId[] = [];
  const shapesReversed = [...shapes].reverse();

  const walk = (shapeList: readonly Shape[]) => {
    for (const shape of shapeList) {
      const shapeId = getShapeId(shape);
      if (shapeId) {
        visibleIds.push(shapeId);
      }

      if (shape.type === "grpSp" && shapeId && expandedGroups.has(shapeId)) {
        walk((shape as GrpShape).children);
      }
    }
  };

  walk(shapesReversed);
  return visibleIds;
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
  isExpanded,
  onSelect,
  onToggleExpand,
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
    onSelect(shapeId, {
      shiftKey: e.shiftKey,
      metaKey: e.metaKey,
      ctrlKey: e.ctrlKey,
    });
  };

  const handleToggleExpand = (e: MouseEvent) => {
    e.stopPropagation();
    if (shapeId) {
      onToggleExpand(shapeId);
    }
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

  return (
    <>
      <div
        style={itemStyle}
        onClick={handleClick}
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
          {(shape as GrpShape).children.map((child, idx) => {
            const childId = getShapeId(child) ?? `${shapeId}-${idx}`;
            const childSelected = selectedIds.includes(childId);

            return (
              <ShapeItem
                key={childId}
                shape={child}
                depth={depth + 1}
                isSelected={childSelected}
                isExpanded={expandedGroups.has(childId)}
                onSelect={onSelect}
                onToggleExpand={onToggleExpand}
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
  readonly onSelect: (shapeId: string, modifiers: ShapeItemModifiers) => void;
  readonly onToggleExpand: (shapeId: string) => void;
  readonly onEmptyClick: () => void;
};

function ShapeList({
  shapes,
  selectedIds,
  expandedGroups,
  onSelect,
  onToggleExpand,
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
        const isExpanded = expandedGroups.has(shapeId);

        return (
          <ShapeItem
            key={shapeId}
            shape={shape}
            depth={0}
            isSelected={isSelected}
            isExpanded={isExpanded}
            onSelect={onSelect}
            onToggleExpand={onToggleExpand}
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
    borderTop: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
    padding: "8px",
  };

  return (
    <div style={toolbarStyle}>
      <Button
        variant="secondary"
        title="Group (⌘G)"
        disabled={!canGroup}
        onClick={onGroup}
        style={{ flex: 1, fontSize: fontTokens.size.sm, padding: "6px" }}
      >
        Group
      </Button>
      <Button
        variant="secondary"
        title="Ungroup (⌘⇧G)"
        disabled={!canUngroup}
        onClick={onUngroup}
        style={{ flex: 1, fontSize: fontTokens.size.sm, padding: "6px" }}
      >
        Ungroup
      </Button>
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
  onClearSelection,
  className,
  style,
}: LayerPanelProps) {
  const selectedIds = selection.selectedIds;

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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

  // Clear selection when clicking empty area
  const handlePanelClick = useCallback(() => {
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
        onSelect={handleSelect}
        onToggleExpand={handleToggleExpand}
        onEmptyClick={handlePanelClick}
      />

      {/* Toolbar */}
      <LayerToolbar
        canGroup={canGroup}
        canUngroup={canUngroup}
        onGroup={handleGroup}
        onUngroup={handleUngroup}
      />
    </div>
  );
}
