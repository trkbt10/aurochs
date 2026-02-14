/**
 * @file GroupedList
 *
 * Main container component for grouped list.
 * Orchestrates groups, items, selection, editing, and drag-drop.
 */

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { colorTokens, spacingTokens, fontTokens } from "../design-tokens";
import type {
  GroupedListProps,
  GroupedListItem as GroupedListItemType,
  GroupedListItemId,
  GroupedListGroupId,
  GroupedListEditState,
  GroupedListDragState,
  CollapsedGroupsState,
  DropTargetPosition,
} from "./types";
import { createIdleEditState, createIdleDragState } from "./types";
import { GroupedListItem } from "./GroupedListItem";
import { GroupedListGroup } from "./GroupedListGroup";
import { GroupedListContextMenu } from "./GroupedListContextMenu";
import { useGroupedListContextMenu } from "./hooks/useGroupedListContextMenu";

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "auto",
  backgroundColor: `var(--bg-primary, ${colorTokens.background.primary})`,
};

const emptyMessageStyle: CSSProperties = {
  padding: spacingTokens.md,
  textAlign: "center",
  color: `var(--text-secondary, ${colorTokens.text.secondary})`,
  fontSize: fontTokens.size.sm,
};

/**
 * Grouped list component.
 *
 * Displays items organized into collapsible groups with support for:
 * - Selection
 * - Inline rename
 * - Context menu
 * - Drag-drop reordering within groups
 */
export function GroupedList<TMeta = unknown>({
  items,
  groups,
  mode = "readonly",
  activeItemId,
  initialCollapsedGroups,
  className,
  style,
  emptyMessage = "No items",
  onItemClick,
  onItemRename,
  onItemDelete,
  onItemCreate,
  onItemReorder,
  onGroupCollapseChange,
  buildContextMenuItems,
  onCustomAction,
}: GroupedListProps<TMeta>) {
  // State
  const [editState, setEditState] = useState<GroupedListEditState>(
    createIdleEditState()
  );
  const [dragState, setDragState] = useState<GroupedListDragState>(
    createIdleDragState()
  );
  const [collapsedGroups, setCollapsedGroups] = useState<CollapsedGroupsState>(
    () => new Set(initialCollapsedGroups ?? [])
  );

  // Context menu hook
  const {
    menuState,
    openMenu,
    closeMenu,
  } = useGroupedListContextMenu();

  // Group items by groupId
  const groupedItems = useMemo(() => {
    const map = new Map<GroupedListGroupId, GroupedListItemType<TMeta>[]>();
    for (const item of items) {
      const list = map.get(item.groupId) ?? [];
      list.push(item);
      map.set(item.groupId, list);
    }
    return map;
  }, [items]);

  // Sort groups by order
  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.order - b.order),
    [groups]
  );

  // Handlers
  const handleItemClick = useCallback(
    (itemId: GroupedListItemId) => {
      onItemClick?.(itemId);
    },
    [onItemClick]
  );

  const handleItemDoubleClick = useCallback(
    (itemId: GroupedListItemId) => {
      if (mode === "editable") {
        setEditState({ type: "renaming", itemId });
      }
    },
    [mode]
  );

  const handleItemContextMenu = useCallback(
    (itemId: GroupedListItemId, e: React.MouseEvent) => {
      const item = items.find((i) => i.id === itemId);
      const group = item ? groups.find((g) => g.id === item.groupId) : null;
      openMenu(e.clientX, e.clientY, itemId, item?.groupId ?? null);
    },
    [items, groups, openMenu]
  );

  const handleGroupContextMenu = useCallback(
    (groupId: GroupedListGroupId, e: React.MouseEvent) => {
      openMenu(e.clientX, e.clientY, null, groupId);
    },
    [openMenu]
  );

  const handleRenameSubmit = useCallback(
    (itemId: GroupedListItemId, newLabel: string) => {
      onItemRename?.(itemId, newLabel);
      setEditState(createIdleEditState());
    },
    [onItemRename]
  );

  const handleRenameCancel = useCallback(() => {
    setEditState(createIdleEditState());
  }, []);

  const handleToggleCollapse = useCallback(
    (groupId: GroupedListGroupId) => {
      setCollapsedGroups((prev) => {
        const next = new Set(prev);
        const isCollapsed = next.has(groupId);
        if (isCollapsed) {
          next.delete(groupId);
        } else {
          next.add(groupId);
        }
        onGroupCollapseChange?.(groupId, !isCollapsed);
        return next;
      });
    },
    [onGroupCollapseChange]
  );

  // Drag handlers
  const handleDragStart = useCallback(
    (itemId: GroupedListItemId, e: React.DragEvent) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", itemId);
      setDragState({
        type: "dragging",
        dragItemId: itemId,
        dragGroupId: item.groupId,
        targetIndex: undefined,
      });
    },
    [items]
  );

  const handleDragOver = useCallback(
    (itemId: GroupedListItemId, e: React.DragEvent) => {
      if (dragState.type !== "dragging") return;

      const targetItem = items.find((i) => i.id === itemId);
      if (!targetItem || targetItem.groupId !== dragState.dragGroupId) return;

      // Find index of target item within its group
      const groupItems = groupedItems.get(targetItem.groupId) ?? [];
      const targetIndex = groupItems.findIndex((i) => i.id === itemId);

      setDragState((prev) =>
        prev.type === "dragging" ? { ...prev, targetIndex } : prev
      );
    },
    [dragState, items, groupedItems]
  );

  const handleDrop = useCallback(
    (itemId: GroupedListItemId, _e: React.DragEvent) => {
      if (dragState.type !== "dragging") return;

      const targetItem = items.find((i) => i.id === itemId);
      if (!targetItem || targetItem.groupId !== dragState.dragGroupId) {
        setDragState(createIdleDragState());
        return;
      }

      // Find indices
      const groupItems = groupedItems.get(targetItem.groupId) ?? [];
      const targetIndex = groupItems.findIndex((i) => i.id === itemId);
      const sourceIndex = groupItems.findIndex(
        (i) => i.id === dragState.dragItemId
      );

      if (targetIndex !== -1 && sourceIndex !== -1 && targetIndex !== sourceIndex) {
        onItemReorder?.(dragState.dragItemId, targetIndex, dragState.dragGroupId);
      }

      setDragState(createIdleDragState());
    },
    [dragState, items, groupedItems, onItemReorder]
  );

  const handleDragEnd = useCallback(() => {
    setDragState(createIdleDragState());
  }, []);

  // Context menu action handler
  const handleMenuAction = useCallback(
    (actionId: string) => {
      if (menuState.type !== "open") return;

      const { itemId, groupId } = menuState;

      switch (actionId) {
        case "rename":
          if (itemId) {
            setEditState({ type: "renaming", itemId });
          }
          break;
        case "delete":
          if (itemId) {
            onItemDelete?.(itemId);
          }
          break;
        default:
          // Check if it's a create action (create:<groupId>)
          if (actionId.startsWith("create:")) {
            const createGroupId = actionId.slice(7);
            onItemCreate?.(createGroupId);
          } else {
            onCustomAction?.(actionId, itemId);
          }
          break;
      }

      closeMenu();
    },
    [menuState, onItemDelete, onItemCreate, onCustomAction, closeMenu]
  );

  // Get drop target position for an item
  const getDropTargetPosition = useCallback(
    (itemId: GroupedListItemId): DropTargetPosition => {
      if (dragState.type !== "dragging") return undefined;
      if (dragState.dragItemId === itemId) return undefined;

      const item = items.find((i) => i.id === itemId);
      if (!item || item.groupId !== dragState.dragGroupId) return undefined;

      const groupItems = groupedItems.get(item.groupId) ?? [];
      const itemIndex = groupItems.findIndex((i) => i.id === itemId);
      const dragIndex = groupItems.findIndex(
        (i) => i.id === dragState.dragItemId
      );

      if (itemIndex === dragState.targetIndex) {
        return itemIndex > dragIndex ? "below" : "above";
      }

      return undefined;
    },
    [dragState, items, groupedItems]
  );

  // Build context menu items
  const contextMenuItems = useMemo(() => {
    if (menuState.type !== "open") return [];

    const { itemId, groupId } = menuState;
    const item = itemId ? items.find((i) => i.id === itemId) ?? null : null;
    const group = groupId ? groups.find((g) => g.id === groupId) ?? null : null;

    return buildContextMenuItems?.({ itemId, groupId, item, group }) ?? [];
  }, [menuState, items, groups, buildContextMenuItems]);

  // Empty state
  if (items.length === 0) {
    return (
      <div className={className} style={{ ...containerStyle, ...style }}>
        <div style={emptyMessageStyle}>{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className={className} style={{ ...containerStyle, ...style }}>
      {sortedGroups.map((group) => {
        const groupItems = groupedItems.get(group.id) ?? [];
        if (groupItems.length === 0) return null;

        return (
          <GroupedListGroup
            key={group.id}
            group={group}
            isCollapsed={collapsedGroups.has(group.id)}
            mode={mode}
            onToggleCollapse={() => handleToggleCollapse(group.id)}
            onGroupContextMenu={handleGroupContextMenu}
          >
            {groupItems.map((item) => (
              <GroupedListItem<TMeta>
                key={item.id}
                item={item}
                isActive={item.id === activeItemId}
                isEditing={
                  editState.type === "renaming" && editState.itemId === item.id
                }
                mode={mode}
                isDragging={
                  dragState.type === "dragging" &&
                  dragState.dragItemId === item.id
                }
                isAnyDragging={dragState.type === "dragging"}
                dropTargetPosition={getDropTargetPosition(item.id)}
                onItemClick={handleItemClick}
                onItemDoubleClick={handleItemDoubleClick}
                onItemContextMenu={handleItemContextMenu}
                onRenameSubmit={handleRenameSubmit}
                onRenameCancel={handleRenameCancel}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              />
            ))}
          </GroupedListGroup>
        );
      })}

      {menuState.type === "open" && (
        <GroupedListContextMenu
          menuState={menuState}
          groups={groups}
          items={contextMenuItems}
          onAction={handleMenuAction}
          onClose={closeMenu}
        />
      )}
    </div>
  );
}
