/**
 * @file Generic item list component
 *
 * Unified item list supporting both readonly and editable modes
 * with vertical/horizontal orientation. Format-agnostic: works with
 * any item type that has an `id` field.
 *
 * Features:
 * - Multi-select (Ctrl+click, Shift+click range)
 * - Keyboard navigation (arrow keys, Home/End)
 * - Drag-and-drop reordering (gap-based targeting)
 * - Add item at gap (click "+" button)
 * - Delete item (hover button or context menu)
 * - Duplicate / Move up / Move down (context menu)
 * - Format-specific extras via renderItemExtras render prop
 */

import { useCallback, useRef, useEffect } from "react";
import type { ItemListProps, ListItem } from "./types";
import type { ItemSelectionState } from "@aurochs-ui/editor-core/item-selection";
import { ItemListItem } from "./ItemListItem";
import { ItemListGap } from "./ItemListGap";
import { getContainerStyle } from "./styles";
import { useItemSelection, useItemKeyNavigation, useListItemHover } from "../list-selection";
import { useItemListDragDrop } from "./useItemListDragDrop";
import { useItemListGapHover } from "./useItemListGapHover";
import { useItemListContextMenu } from "./useItemListContextMenu";
import { ContextMenu } from "@aurochs-ui/ui-components";

function buildControlledSelection<TId>(
  selectedIds: readonly TId[],
  items: readonly { readonly id: TId }[],
): ItemSelectionState<TId> {
  if (selectedIds.length === 0) {
    return {
      selectedIds,
      primaryId: undefined,
      anchorIndex: undefined,
    };
  }
  const primaryId = selectedIds[selectedIds.length - 1];
  const anchorIndex = items.findIndex((item) => item.id === primaryId);
  return {
    selectedIds,
    primaryId,
    anchorIndex: anchorIndex === -1 ? undefined : anchorIndex,
  };
}

/**
 * Generic item list component
 */
export function ItemList<TItem extends ListItem<TId>, TId = string>({
  items,
  itemWidth,
  itemHeight,
  orientation = "vertical",
  mode = "readonly",
  selectedIds: controlledSelectedIds,
  activeItemId,
  itemLabel = "Item",
  renderThumbnail,
  renderItemExtras,
  className,
  onItemClick,
  onSelectionChange,
  onAddItem,
  onDeleteItems,
  onDuplicateItems,
  onMoveItems,
}: ItemListProps<TItem, TId>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);
  const aspectRatio = String(itemWidth / itemHeight);
  const isEditable = mode === "editable";

  // Selection management
  const {
    selection,
    handleClick: handleSelectionClick,
    selectSingle,
    selectRange,
    isSelected,
    setSelection,
  } = useItemSelection<TId>({
    items,
    onSelectionChange,
  });

  // Sync with controlled selectedIds
  useEffect(() => {
    if (controlledSelectedIds) {
      setSelection(buildControlledSelection(controlledSelectedIds, items));
    }
  }, [controlledSelectedIds, items, setSelection]);

  // Keyboard navigation
  const { handleKeyDown } = useItemKeyNavigation<TId>({
    items,
    selection,
    orientation,
    enabled: isEditable,
    containerRef,
    onNavigate: (itemId: TId, index: number) => {
      selectSingle(itemId, index);
      onItemClick?.(itemId);
    },
    onExtendSelection: selectRange,
  });

  // Drag and drop (gap-based targeting)
  const {
    dragState,
    handleDragStart,
    handleItemDragOver,
    handleGapDragOver,
    handleGapDrop,
    handleItemDrop,
    handleDragEnd,
    isDragging,
    isGapTarget,
  } = useItemListDragDrop<TItem, TId>({
    items,
    selectedIds: selection.selectedIds,
    orientation,
    onMoveItems,
  });

  // Gap hover for add button
  const { handleGapEnter, handleGapLeave, isGapHovered } = useItemListGapHover();

  // Item hover (list-level management for single hover invariant)
  const { handleItemEnter, handleItemLeave, clearHover: clearItemHover, isItemHovered } = useListItemHover<TId>();

  // Clear item hover when drag starts
  useEffect(() => {
    if (dragState.isDragging) {
      clearItemHover();
    }
  }, [dragState.isDragging, clearItemHover]);

  // Context menu
  const { contextMenu, openContextMenu, closeContextMenu, handleMenuAction, getMenuItems } = useItemListContextMenu<TItem, TId>({
    items,
    selectedIds: selection.selectedIds,
    itemLabel,
    onDeleteItems,
    onDuplicateItems,
    onMoveItems,
  });

  // Scroll active item into view
  useEffect(() => {
    const item = activeItemRef.current;
    const container = containerRef.current;
    if (!item || !container) {
      return;
    }

    requestAnimationFrame(() => {
      const itemRect = item.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      if (orientation === "vertical") {
        if (itemRect.top < containerRect.top) {
          container.scrollTop -= containerRect.top - itemRect.top + 8;
        } else if (itemRect.bottom > containerRect.bottom) {
          container.scrollTop += itemRect.bottom - containerRect.bottom + 8;
        }
      } else {
        if (itemRect.left < containerRect.left) {
          container.scrollLeft -= containerRect.left - itemRect.left + 8;
        } else if (itemRect.right > containerRect.right) {
          container.scrollLeft += itemRect.right - containerRect.right + 8;
        }
      }
    });
  }, [activeItemId, orientation]);

  // Handle item click
  const handleItemClick = useCallback(
    (id: TId, index: number, event: React.MouseEvent | React.KeyboardEvent) => {
      if (isEditable) {
        handleSelectionClick(id, index, event);
      } else {
        selectSingle(id, index);
      }
      onItemClick?.(id, event);
    },
    [isEditable, handleSelectionClick, selectSingle, onItemClick],
  );

  // Handle context menu
  const handleContextMenu = useCallback(
    (id: TId, event: React.MouseEvent) => {
      event.preventDefault();
      openContextMenu(event.clientX, event.clientY, id);
    },
    [openContextMenu],
  );

  // Handle delete
  const handleDelete = useCallback(
    (id: TId) => {
      // Delete selected items if the deleted item is selected, otherwise just this one
      if (selection.selectedIds.includes(id)) {
        onDeleteItems?.(selection.selectedIds);
        return;
      }
      onDeleteItems?.([id]);
    },
    [selection.selectedIds, onDeleteItems],
  );

  // Handle add at gap
  const handleAddAtGap = useCallback(
    (gapIndex: number) => {
      onAddItem?.(gapIndex);
    },
    [onAddItem],
  );

  return (
    <div
      ref={containerRef}
      style={getContainerStyle(orientation)}
      className={className}
      onKeyDown={isEditable ? handleKeyDown : undefined}
      onDragEnd={handleDragEnd}
      tabIndex={0}
      role="listbox"
      aria-multiselectable={isEditable}
      aria-label={`${itemLabel} list`}
    >
      {items.map((itemWithId, index) => {
        const isActive = itemWithId.id === activeItemId;
        const isItemSelected = isSelected(itemWithId.id);
        const isPrimary = selection.primaryId === itemWithId.id;
        const canDelete = items.length > 1;
        const isItemDragging = isDragging(itemWithId.id);

        return (
          <div key={String(itemWithId.id)}>
            {/* Gap before item - uses zero height with overflow for interactivity */}
            {isEditable && (
              <ItemListGap
                index={index}
                orientation={orientation}
                isHovered={isGapHovered(index) && !dragState.isDragging}
                isDragTarget={isGapTarget(index)}
                itemLabel={itemLabel}
                onPointerEnter={() => handleGapEnter(index)}
                onPointerLeave={handleGapLeave}
                onClick={() => handleAddAtGap(index)}
                onDragOver={(e) => handleGapDragOver(e, index)}
                onDrop={(e) => handleGapDrop(e, index)}
              />
            )}

            {/* Item */}
            <ItemListItem<TItem, TId>
              item={itemWithId}
              index={index}
              aspectRatio={aspectRatio}
              orientation={orientation}
              mode={mode}
              isSelected={isItemSelected}
              isPrimary={isPrimary}
              isActive={isActive}
              canDelete={canDelete}
              isDragging={isItemDragging}
              isAnyDragging={dragState.isDragging}
              isHovered={isItemHovered(itemWithId.id)}
              itemLabel={itemLabel}
              renderThumbnail={renderThumbnail}
              renderItemExtras={renderItemExtras}
              onItemClick={handleItemClick}
              onItemContextMenu={handleContextMenu}
              onItemDelete={handleDelete}
              onItemPointerEnter={handleItemEnter}
              onItemPointerLeave={handleItemLeave}
              onItemDragStart={handleDragStart}
              onItemDragOver={handleItemDragOver}
              onItemDrop={handleItemDrop}
              itemRef={isActive ? activeItemRef : undefined}
            />
          </div>
        );
      })}

      {/* Gap after last item */}
      {isEditable && items.length > 0 && (
        <ItemListGap
          index={items.length}
          orientation={orientation}
          isHovered={isGapHovered(items.length) && !dragState.isDragging}
          isDragTarget={isGapTarget(items.length)}
          itemLabel={itemLabel}
          onPointerEnter={() => handleGapEnter(items.length)}
          onPointerLeave={handleGapLeave}
          onClick={() => handleAddAtGap(items.length)}
          onDragOver={(e) => handleGapDragOver(e, items.length)}
          onDrop={(e) => handleGapDrop(e, items.length)}
        />
      )}

      {/* Context menu */}
      {isEditable && contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getMenuItems()}
          onAction={handleMenuAction}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}
