/**
 * @file Item list item component
 *
 * Individual item thumbnail with selection and delete support.
 * Hover state is managed at the list level to ensure at most one
 * item is hovered at any time.
 *
 * Format-specific extras (e.g. transition editor) are injected via
 * the `renderItemExtras` render prop.
 */

import { memo } from "react";
import type { ListItem, ItemListItemProps } from "./types";
import { ItemNumberBadge } from "./ItemNumberBadge";
import {
  getItemWrapperStyle,
  getThumbnailContainerStyle,
  thumbnailContentStyle,
  thumbnailFallbackStyle,
  getDeleteButtonStyle,
} from "./styles";

/**
 * Individual item in the list
 *
 * Memoized to prevent unnecessary re-renders when hovering other items.
 * Receives stable callbacks and creates its own closures internally.
 */
function ItemListItemInner<TItem extends ListItem<TId>, TId = string>({
  item,
  index,
  aspectRatio,
  orientation,
  mode,
  isSelected,
  isPrimary,
  isActive,
  canDelete,
  isDragging,
  isAnyDragging,
  isHovered,
  itemLabel,
  renderThumbnail,
  renderItemExtras,
  onItemClick,
  onItemContextMenu,
  onItemDelete,
  onItemPointerEnter,
  onItemPointerLeave,
  onItemDragStart,
  onItemDragOver,
  onItemDrop,
  itemRef,
}: ItemListItemProps<TItem, TId>) {
  const isEditable = mode === "editable";
  const id = item.id;

  // Show delete button when hovered and not dragging
  const showDeleteButton = isEditable && canDelete && isHovered && !isAnyDragging;

  // Create item-specific handlers (closures are fine since component is memoized)
  const handleClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    onItemClick(id, index, e);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onItemClick(id, index, e);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    onItemContextMenu(id, e);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onItemDelete(id);
  };

  const handlePointerEnter = () => {
    onItemPointerEnter(id);
  };

  const handlePointerLeave = () => {
    onItemPointerLeave(id);
  };

  const handleDragStart = (e: React.DragEvent) => {
    onItemDragStart(e, id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    onItemDragOver(e, index);
  };

  const handleDrop = (e: React.DragEvent) => {
    onItemDrop(e, index);
  };

  function renderThumbnailContent(): React.ReactNode {
    if (renderThumbnail !== undefined) {
      return renderThumbnail(item, index);
    }
    return <span style={thumbnailFallbackStyle}>{itemLabel} {index + 1}</span>;
  }

  const thumbnailContent = renderThumbnailContent();

  return (
    <div ref={itemRef} style={getItemWrapperStyle(orientation)}>
      {/* Number outside item */}
      <ItemNumberBadge number={index + 1} orientation={orientation} />

      {/* Thumbnail wrapper */}
      <div
        style={{
          position: "relative",
          width: orientation === "vertical" ? "100%" : undefined,
          minWidth: orientation === "horizontal" ? "100px" : undefined,
          maxWidth: orientation === "horizontal" ? "140px" : undefined,
          opacity: isDragging ? 0.4 : 1,
          transition: "opacity 0.1s ease",
        }}
        draggable={isEditable}
        onDragStart={isEditable ? handleDragStart : undefined}
        onDragOver={isEditable ? handleDragOver : undefined}
        onDrop={isEditable ? handleDrop : undefined}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        {/* Thumbnail */}
        <div
          style={getThumbnailContainerStyle({
            aspectRatio,
            isSelected,
            isPrimary,
            isActive,
          })}
          onClick={handleClick}
          onContextMenu={isEditable ? handleContextMenu : undefined}
          role="button"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          aria-label={`${itemLabel} ${index + 1}`}
          aria-selected={isSelected || isActive}
        >
          <div style={thumbnailContentStyle}>{thumbnailContent}</div>

          {/* Delete button (inside thumbnail, shown on hover) */}
          {isEditable && canDelete && (
            <button
              type="button"
              style={getDeleteButtonStyle(showDeleteButton)}
              onClick={handleDeleteClick}
              aria-label={`Delete ${itemLabel}`}
              tabIndex={showDeleteButton ? 0 : -1}
            >
              ×
            </button>
          )}

          {/* Format-specific extras via render prop */}
          {renderItemExtras?.(item, index, { isHovered, isAnyDragging })}
        </div>
      </div>
    </div>
  );
}

// Memoize with a type assertion to preserve generics
export const ItemListItem = memo(ItemListItemInner) as typeof ItemListItemInner;
