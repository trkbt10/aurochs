/**
 * @file Layer panel component
 *
 * Displays shapes in a hierarchical tree view using react-editor-ui LayerItem.
 * PPTX-specific logic (shape types, icons, visibility/lock, group hierarchy)
 * is mapped to LayerItem's format-agnostic props.
 */

import {
  useCallback,
  useState,
  useMemo,
  type CSSProperties,
  type DragEvent,
  type MouseEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Slide, Shape, GrpShape } from "@aurochs-office/pptx/domain/index";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import type { SelectionState } from "@aurochs-ui/pptx-slide-canvas/context/slide/state";
import { getShapeId } from "@aurochs-ui/pptx-slide-canvas/shape/identity";
import { hasShapeId, isTopLevelShape } from "@aurochs-ui/editor-controls/shape-editor";
import { findShapeById, findShapeByIdWithParents } from "@aurochs-ui/pptx-slide-canvas/shape/query";
import type { ShapeHierarchyTarget } from "@aurochs-ui/pptx-slide-canvas/shape/hierarchy";
import { ContextMenu, type MenuEntry } from "@aurochs-ui/ui-components";
import { LayerItem, type DropPosition } from "react-editor-ui/LayerItem";
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
  UnknownShapeIcon,
} from "@aurochs-ui/ui-components/icons";
import { iconTokens, fontTokens, colorTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type LayerPanelProps = {
  readonly slide: Slide;
  readonly selection: SelectionState;
  readonly primaryShape: Shape | undefined;
  readonly onSelect: (shapeId: ShapeId, addToSelection: boolean, toggle?: boolean) => void;
  readonly onSelectMultiple: (shapeIds: readonly ShapeId[], primaryId?: ShapeId) => void;
  readonly onGroup: (shapeIds: readonly ShapeId[]) => void;
  readonly onUngroup: (shapeId: ShapeId) => void;
  readonly onMoveShape: (shapeId: ShapeId, target: ShapeHierarchyTarget) => void;
  readonly onUpdateShapes: (shapeIds: readonly ShapeId[], updater: (shape: Shape) => Shape) => void;
  readonly className?: string;
  readonly style?: CSSProperties;
};

type LayerDropTarget = {
  readonly targetId: ShapeId | null;
  readonly parentId: ShapeId | null;
  readonly index: number;
  readonly position: "before" | "after" | "inside";
};

// =============================================================================
// Shape helpers
// =============================================================================

const ICON_SIZE = iconTokens.size.sm;
const ICON_STROKE = iconTokens.strokeWidth;


function getShapeIcon(shape: Shape): ReactNode {
  const p = { size: ICON_SIZE, strokeWidth: ICON_STROKE };
  switch (shape.type) {
    case "sp": {
      const g = shape.properties.geometry;
      if (g?.type === "preset") {
        switch (g.preset) {
          case "rect": case "roundRect": return <RectIcon {...p} />;
          case "ellipse": return <EllipseIcon {...p} />;
          case "triangle": case "rtTriangle": return <TriangleIcon {...p} />;
          case "star5": case "star6": return <StarIcon {...p} />;
          case "line": return <LineIcon {...p} />;
          case "rightArrow": case "leftArrow": return <RightArrowIcon {...p} />;
          default: return <DiamondIcon {...p} />;
        }
      }
      return <DiamondIcon {...p} />;
    }
    case "pic": return <PictureIcon {...p} />;
    case "cxnSp": return <ConnectorIcon {...p} />;
    case "grpSp": return <FolderIcon {...p} />;
    case "graphicFrame":
      switch (shape.content.type) {
        case "table": return <TableIcon {...p} />;
        case "chart": return <ChartIcon {...p} />;
        case "diagram": return <DiagramIcon {...p} />;
        case "oleObject": return <OleObjectIcon {...p} />;
        default: return <UnknownShapeIcon {...p} />;
      }
    default: return <UnknownShapeIcon {...p} />;
  }
}

function getShapeName(shape: Shape): string {
  if ("nonVisual" in shape && shape.nonVisual.name) { return shape.nonVisual.name; }
  switch (shape.type) {
    case "sp": {
      const g = shape.properties.geometry;
      return g?.type === "preset" ? g.preset : "Shape";
    }
    case "pic": return "Picture";
    case "cxnSp": return "Connector";
    case "grpSp": return "Group";
    case "graphicFrame":
      switch (shape.content.type) {
        case "table": return "Table";
        case "chart": return "Chart";
        case "diagram": return "Diagram";
        case "oleObject": return "OLE Object";
        default: return "Graphic";
      }
    default: return shape.type;
  }
}

function isShapeHidden(shape: Shape): boolean {
  return "nonVisual" in shape && shape.nonVisual.hidden === true;
}

function isShapeLocked(shape: Shape): boolean {
  switch (shape.type) {
    case "sp": return shape.nonVisual.shapeLocks?.noMove === true || shape.nonVisual.shapeLocks?.noResize === true || shape.nonVisual.shapeLocks?.noRot === true;
    case "pic": return shape.nonVisual.pictureLocks?.noMove === true || shape.nonVisual.pictureLocks?.noResize === true || shape.nonVisual.pictureLocks?.noRot === true;
    case "grpSp": return shape.nonVisual.groupLocks?.noMove === true || shape.nonVisual.groupLocks?.noResize === true || shape.nonVisual.groupLocks?.noRot === true;
    case "graphicFrame": return shape.nonVisual.graphicFrameLocks?.noMove === true || shape.nonVisual.graphicFrameLocks?.noResize === true;
    default: return false;
  }
}

function setLockFields<T extends Record<string, boolean | undefined>>(locks: T | undefined, fields: readonly (keyof T)[], locked: boolean): T | undefined {
  if (!locks && !locked) { return undefined; }
  const next: Record<string, boolean | undefined> = { ...(locks ?? {}) };
  for (const f of fields) { if (locked) { next[f as string] = true; } else { delete next[f as string]; } }
  return Object.keys(next).length > 0 ? (next as T) : undefined;
}

function updateShapeLock(shape: Shape, locked: boolean): Shape {
  switch (shape.type) {
    case "sp": return { ...shape, nonVisual: { ...shape.nonVisual, shapeLocks: setLockFields(shape.nonVisual.shapeLocks, ["noMove", "noResize", "noRot"], locked) } };
    case "pic": return { ...shape, nonVisual: { ...shape.nonVisual, pictureLocks: setLockFields(shape.nonVisual.pictureLocks, ["noMove", "noResize", "noRot"], locked) } };
    case "grpSp": return { ...shape, nonVisual: { ...shape.nonVisual, groupLocks: setLockFields(shape.nonVisual.groupLocks, ["noMove", "noResize", "noRot"], locked) } };
    case "graphicFrame": return { ...shape, nonVisual: { ...shape.nonVisual, graphicFrameLocks: setLockFields(shape.nonVisual.graphicFrameLocks, ["noMove", "noResize"], locked) } };
    default: return shape;
  }
}

function getDisplayOrder(shapes: readonly Shape[]): readonly Shape[] {
  return [...shapes].reverse();
}

function getVisibleShapeIds(shapes: readonly Shape[], expandedGroups: ReadonlySet<string>): ShapeId[] {
  const ids: ShapeId[] = [];
  const walk = (list: readonly Shape[]) => {
    for (const shape of list) {
      const id = getShapeId(shape);
      if (id) { ids.push(id); }
      if (shape.type === "grpSp" && id && expandedGroups.has(id)) {
        walk(getDisplayOrder((shape as GrpShape).children));
      }
    }
  };
  walk(getDisplayOrder(shapes));
  return ids;
}

function getGroupBadge(shape: Shape): ReactNode {
  if (shape.type !== "grpSp") { return undefined; }
  return (
    <span style={{ fontSize: fontTokens.size.xs, color: colorTokens.text.tertiary, backgroundColor: colorTokens.background.tertiary, padding: "1px 4px", borderRadius: "3px" }}>
      {(shape as GrpShape).children.length}
    </span>
  );
}

function getDropPositionFromEvent(event: DragEvent, isGroup: boolean): "before" | "after" | "inside" {
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const ratio = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0;
  if (isGroup && ratio > 0.25 && ratio < 0.75) { return "inside"; }
  return ratio < 0.5 ? "before" : "after";
}

// =============================================================================
// Recursive shape renderer using LayerItem
// =============================================================================

function ShapeLayerItems({
  shapes,
  depth,
  parentId,
  selectedIds,
  expandedGroups,
  dropTarget,
  draggingId,
  onPointerDown,
  onToggle,
  onVisibilityChange,
  onLockChange,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  shapes: readonly Shape[];
  depth: number;
  parentId: ShapeId | null;
  selectedIds: readonly string[];
  expandedGroups: ReadonlySet<string>;
  dropTarget: LayerDropTarget | null;
  draggingId: ShapeId | null;
  onPointerDown: (shapeId: ShapeId, e: ReactPointerEvent) => void;
  onToggle: (shapeId: ShapeId) => void;
  onVisibilityChange: (shapeId: ShapeId, visible: boolean) => void;
  onLockChange: (shapeId: ShapeId, locked: boolean) => void;
  onContextMenu: (shapeId: ShapeId, e: MouseEvent) => void;
  onDragStart: (shapeId: ShapeId, e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (shape: Shape, parentId: ShapeId | null, displayIndex: number, e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd: (e: DragEvent<HTMLDivElement>) => void;
}) {
  const reversed = getDisplayOrder(shapes);

  return (
    <>
      {reversed.map((shape, displayIndex) => {
        const shapeId = getShapeId(shape);
        if (!shapeId) { return null; }
        const isGroup = shape.type === "grpSp";
        const hasChildren = isGroup && (shape as GrpShape).children.length > 0;
        const isExpanded = expandedGroups.has(shapeId);
        const hidden = isShapeHidden(shape);
        const locked = isShapeLocked(shape);

        // Map dropTarget to LayerItem dropPosition
        // eslint-disable-next-line no-restricted-syntax -- mutable for conditional assignment
        let dropPosition: DropPosition = null;
        if (dropTarget?.targetId === shapeId) {
          dropPosition = dropTarget.position;
        }

        return (
          <div key={shapeId}>
            <LayerItem
              id={shapeId}
              label={getShapeName(shape)}
              icon={getShapeIcon(shape)}
              depth={depth}
              hasChildren={hasChildren}
              expanded={isExpanded}
              onToggle={() => onToggle(shapeId)}
              selected={selectedIds.includes(shapeId)}
              onPointerDown={(e) => onPointerDown(shapeId, e)}
              visible={!hidden}
              onVisibilityChange={(v) => onVisibilityChange(shapeId, v)}
              locked={locked}
              onLockChange={(l) => onLockChange(shapeId, l)}
              draggable={!locked}
              onDragStart={(e) => onDragStart(shapeId, e)}
              onDragOver={(e) => onDragOver(shape, parentId, displayIndex, e)}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              dropPosition={dropPosition}
              canHaveChildren={isGroup}
              badge={getGroupBadge(shape)}
            />

            {/* Render children if expanded */}
            {isGroup && isExpanded && hasChildren && (
              <ShapeLayerItems
                shapes={(shape as GrpShape).children}
                depth={depth + 1}
                parentId={shapeId}
                selectedIds={selectedIds}
                expandedGroups={expandedGroups}
                dropTarget={dropTarget}
                draggingId={draggingId}
                onPointerDown={onPointerDown}
                onToggle={onToggle}
                onVisibilityChange={onVisibilityChange}
                onLockChange={onLockChange}
                onContextMenu={onContextMenu}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onDragEnd={onDragEnd}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/** Layer panel displaying shapes in a hierarchical tree view. */
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
  className,
  style,
}: LayerPanelProps) {
  const selectedIds = selection.selectedIds;
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ readonly x: number; readonly y: number } | null>(null);
  const [draggingId, setDraggingId] = useState<ShapeId | null>(null);
  const [dropTarget, setDropTarget] = useState<LayerDropTarget | null>(null);

  // --- Selection ---

  const visibleShapeIds = useMemo(() => getVisibleShapeIds(slide.shapes, expandedGroups), [slide.shapes, expandedGroups]);
  const visibleIndexById = useMemo(() => new Map(visibleShapeIds.map((id, i) => [id, i])), [visibleShapeIds]);

  const handlePointerDown = useCallback(
    (shapeId: ShapeId, e: ReactPointerEvent) => {
      const isToggle = e.metaKey || e.ctrlKey;
      if (e.shiftKey) {
        const anchorId = selection.primaryId ?? shapeId;
        const anchorIndex = visibleIndexById.get(anchorId);
        const targetIndex = visibleIndexById.get(shapeId);
        if (anchorIndex !== undefined && targetIndex !== undefined) {
          const start = Math.min(anchorIndex, targetIndex);
          const end = Math.max(anchorIndex, targetIndex);
          onSelectMultiple(visibleShapeIds.slice(start, end + 1) as ShapeId[], shapeId);
          return;
        }
      }
      onSelect(shapeId, isToggle, isToggle);
    },
    [onSelect, onSelectMultiple, selection.primaryId, visibleIndexById, visibleShapeIds],
  );

  const handleToggle = useCallback((shapeId: ShapeId) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(shapeId)) { next.delete(shapeId); } else { next.add(shapeId); }
      return next;
    });
  }, []);

  // --- Visibility / Lock ---

  const getToggleTargetIds = useCallback(
    (shapeId: ShapeId) => (selectedIds.includes(shapeId) ? selectedIds : [shapeId]),
    [selectedIds],
  );

  const handleVisibilityChange = useCallback(
    (shapeId: ShapeId, _visible: boolean) => {
      const shape = findShapeById(slide.shapes, shapeId);
      if (!shape || !("nonVisual" in shape)) { return; }
      const targetIds = getToggleTargetIds(shapeId);
      const hidden = !isShapeHidden(shape);
      onUpdateShapes(targetIds, (s) => {
        if (!("nonVisual" in s)) { return s; }
        return { ...s, nonVisual: { ...s.nonVisual, hidden: hidden ? true : undefined } };
      });
    },
    [onUpdateShapes, getToggleTargetIds, slide.shapes],
  );

  const handleLockChange = useCallback(
    (shapeId: ShapeId, _locked: boolean) => {
      const shape = findShapeById(slide.shapes, shapeId);
      if (!shape) { return; }
      const targetIds = getToggleTargetIds(shapeId);
      const locked = !isShapeLocked(shape);
      onUpdateShapes(targetIds, (s) => updateShapeLock(s, locked));
    },
    [onUpdateShapes, getToggleTargetIds, slide.shapes],
  );

  // --- Context Menu ---

  const handleContextMenu = useCallback(
    (shapeId: ShapeId, event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (!selectedIds.includes(shapeId)) { onSelect(shapeId, false); }
      setContextMenu({ x: event.clientX, y: event.clientY });
    },
    [onSelect, selectedIds],
  );

  const selectedShapes = useMemo(() => selectedIds.map((id) => findShapeById(slide.shapes, id as ShapeId)).filter((s): s is Shape => !!s), [selectedIds, slide.shapes]);
  const canGroup = selectedIds.length >= 2 && selectedIds.every((id) => isTopLevelShape(slide.shapes, id));
  const canUngroup = selectedIds.length === 1 && primaryShape?.type === "grpSp";
  const canHide = selectedShapes.some((s) => !isShapeHidden(s));
  const canShow = selectedShapes.some((s) => isShapeHidden(s));
  const canLock = selectedShapes.some((s) => !isShapeLocked(s));
  const canUnlock = selectedShapes.some((s) => isShapeLocked(s));

  const menuItems = useMemo<readonly MenuEntry[]>(() => [
    { id: "group", label: "Group", shortcut: "⌘G", disabled: !canGroup },
    { id: "ungroup", label: "Ungroup", shortcut: "⌘⇧G", disabled: !canUngroup },
    { type: "separator" },
    { id: "show", label: "Show", disabled: !canShow },
    { id: "hide", label: "Hide", disabled: !canHide },
    { type: "separator" },
    { id: "lock", label: "Lock", disabled: !canLock },
    { id: "unlock", label: "Unlock", disabled: !canUnlock },
  ], [canGroup, canUngroup, canShow, canHide, canLock, canUnlock]);

  const handleMenuAction = useCallback(
    (actionId: string) => {
      setContextMenu(null);
      switch (actionId) {
        case "group": if (canGroup) { onGroup(selectedIds); } break;
        case "ungroup": if (canUngroup && primaryShape && hasShapeId(primaryShape)) { onUngroup(primaryShape.nonVisual.id); } break;
        case "show": onUpdateShapes(selectedIds, (s) => ("nonVisual" in s) ? { ...s, nonVisual: { ...s.nonVisual, hidden: undefined } } : s); break;
        case "hide": onUpdateShapes(selectedIds, (s) => ("nonVisual" in s) ? { ...s, nonVisual: { ...s.nonVisual, hidden: true } } : s); break;
        case "lock": onUpdateShapes(selectedIds, (s) => updateShapeLock(s, true)); break;
        case "unlock": onUpdateShapes(selectedIds, (s) => updateShapeLock(s, false)); break;
      }
    },
    [canGroup, canUngroup, onGroup, onUngroup, onUpdateShapes, primaryShape, selectedIds],
  );

  // --- Drag & Drop ---

  const isDropForbidden = useCallback(
    (targetParentId: ShapeId | null) => {
      if (!draggingId) { return true; }
      if (!targetParentId) { return false; }
      if (targetParentId === draggingId) { return true; }
      const info = findShapeByIdWithParents(slide.shapes, targetParentId);
      return info ? info.parentGroups.some((g) => g.nonVisual.id === draggingId) : true;
    },
    [draggingId, slide.shapes],
  );

  const handleDragStart = useCallback((shapeId: ShapeId, e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/shape-id", shapeId);
    setDraggingId(shapeId);
  }, []);

  const handleDragOver = useCallback(
    // eslint-disable-next-line custom/max-params -- event handler with shape context
    (shape: Shape, parentId: ShapeId | null, displayIndex: number, e: DragEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault();
      if (!draggingId) { return; }
      const shapeId = getShapeId(shape);
      if (!shapeId) { return; }
      const position = getDropPositionFromEvent(e, shape.type === "grpSp");
      const computeTarget = (): { parentId: ShapeId | null; index: number } => {
        if (position === "inside" && shape.type === "grpSp") { return { parentId: shapeId, index: getDisplayOrder(shape.children).length }; }
        if (position === "after") { return { parentId, index: displayIndex + 1 }; }
        return { parentId, index: displayIndex };
      };
      const target = computeTarget();
      if (isDropForbidden(target.parentId)) { setDropTarget(null); return; }
      e.dataTransfer.dropEffect = "move";
      setDropTarget({ targetId: shapeId, parentId: target.parentId, index: target.index, position });
    },
    [draggingId, isDropForbidden],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault();
      if (draggingId && dropTarget) {
        onMoveShape(draggingId, { parentId: dropTarget.parentId, index: dropTarget.index });
      }
      setDraggingId(null);
      setDropTarget(null);
    },
    [draggingId, dropTarget, onMoveShape],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDropTarget(null);
  }, []);

  // --- Render ---

  const layoutStyle: CSSProperties = { display: "flex", flexDirection: "column", height: "100%", ...style };

  const listStyle: CSSProperties = { flex: 1, overflow: "auto", padding: "4px" };
  const emptyStyle: CSSProperties = { padding: "24px 16px", textAlign: "center", color: colorTokens.text.tertiary, fontSize: fontTokens.size.md };

  function renderShapeList(): ReactNode {
    if (slide.shapes.length === 0) {
      return <div style={emptyStyle}>No shapes on this slide</div>;
    }
    return (
      <ShapeLayerItems
        shapes={slide.shapes}
        depth={0}
        parentId={null}
        selectedIds={selectedIds}
        expandedGroups={expandedGroups}
        dropTarget={dropTarget}
        draggingId={draggingId}
        onPointerDown={handlePointerDown}
        onToggle={handleToggle}
        onVisibilityChange={handleVisibilityChange}
        onLockChange={handleLockChange}
        onContextMenu={handleContextMenu}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
      />
    );
  }

  return (
    <div className={className} style={layoutStyle}>
      <div
        style={listStyle}
        role="tree"
        aria-label="Layers"
        onClick={() => { setContextMenu(null); }}
        onContextMenu={(e) => { if (selectedIds.length > 0) { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY }); } }}
      >
        {renderShapeList()}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={menuItems}
          onAction={handleMenuAction}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
