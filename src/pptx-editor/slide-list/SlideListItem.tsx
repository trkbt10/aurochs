/**
 * @file Slide list item component
 *
 * Individual slide thumbnail with selection, drag-and-drop, and delete support.
 */

import { useState } from "react";
import type { SlideListItemProps } from "./types";
import { SlideNumberBadge } from "./SlideNumberBadge";
import {
  getItemWrapperStyle,
  getThumbnailContainerStyle,
  thumbnailContentStyle,
  thumbnailFallbackStyle,
  getDragIndicatorStyle,
  getDeleteButtonStyle,
} from "./styles";

/**
 * Individual slide item in the list
 */
export function SlideListItem({
  slideWithId,
  index,
  aspectRatio,
  orientation,
  mode,
  isSelected,
  isPrimary,
  isActive,
  canDelete,
  renderThumbnail,
  onClick,
  onContextMenu,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  isDragTarget,
  dragPosition,
  itemRef,
}: SlideListItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isEditable = mode === "editable";
  const showDeleteButton = isEditable && canDelete && isHovered;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div ref={itemRef} style={getItemWrapperStyle(orientation)}>
      {/* Page number outside slide */}
      <SlideNumberBadge number={index + 1} orientation={orientation} />

      {/* Thumbnail wrapper (draggable area) */}
      <div
        style={{
          position: "relative",
          flex: 1,
          minWidth: orientation === "horizontal" ? "120px" : undefined,
          maxWidth: orientation === "vertical" ? "100%" : "180px",
        }}
        draggable={isEditable}
        onDragStart={isEditable ? onDragStart : undefined}
        onDragOver={isEditable ? onDragOver : undefined}
        onDrop={isEditable ? onDrop : undefined}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Drag indicator before */}
        {isDragTarget && dragPosition === "before" && (
          <div style={getDragIndicatorStyle("before", orientation)} />
        )}

        {/* Thumbnail */}
        <div
          style={getThumbnailContainerStyle(
            aspectRatio,
            isSelected,
            isPrimary,
            isActive
          )}
          onClick={onClick}
          onContextMenu={isEditable ? onContextMenu : undefined}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClick(e as unknown as React.MouseEvent);
            }
          }}
          aria-label={`Slide ${index + 1}`}
          aria-selected={isSelected || isActive}
        >
          <div style={thumbnailContentStyle}>
            {renderThumbnail ? (
              renderThumbnail(slideWithId, index)
            ) : (
              <span style={thumbnailFallbackStyle}>
                {slideWithId.slide.shapes.length} shapes
              </span>
            )}
          </div>

          {/* Delete button (inside thumbnail, shown on hover) */}
          {isEditable && canDelete && (
            <button
              type="button"
              style={getDeleteButtonStyle(showDeleteButton)}
              onClick={handleDeleteClick}
              aria-label="Delete slide"
              tabIndex={showDeleteButton ? 0 : -1}
            >
              ×
            </button>
          )}
        </div>

        {/* Drag indicator after */}
        {isDragTarget && dragPosition === "after" && (
          <div style={getDragIndicatorStyle("after", orientation)} />
        )}
      </div>
    </div>
  );
}
