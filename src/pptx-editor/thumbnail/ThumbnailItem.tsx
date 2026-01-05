/**
 * @file Slide thumbnail item component
 *
 * Individual slide thumbnail with drag-and-drop support.
 */

import { useState } from "react";
import type { ThumbnailItemProps } from "./types";
import {
  thumbnailWrapperStyle,
  getThumbnailStyle,
  getThumbnailActiveStyle,
  thumbnailNumberStyle,
  deleteButtonStyle,
  dragIndicatorStyle,
} from "./styles";

/**
 * Single slide thumbnail with hover effects and drag support
 */
export function ThumbnailItem({
  slideWithId,
  index,
  isActive,
  totalSlides,
  aspectRatio,
  renderThumbnail,
  onClick,
  onContextMenu,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
  dragPosition,
  itemRef,
}: ThumbnailItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const thumbnailStyle = getThumbnailStyle(aspectRatio);
  const thumbnailActiveStyle = getThumbnailActiveStyle(aspectRatio);

  return (
    <div
      ref={itemRef}
      style={{
        ...thumbnailWrapperStyle,
        position: "relative",
      }}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isDragOver && dragPosition === "before" && (
        <div style={{ ...dragIndicatorStyle, top: -3 }} />
      )}
      <div
        style={isActive ? thumbnailActiveStyle : thumbnailStyle}
        onClick={onClick}
        onContextMenu={onContextMenu}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onClick();
          }
        }}
        aria-label={`Slide ${index + 1}`}
        aria-selected={isActive}
      >
        {renderThumbnail ? (
          renderThumbnail(slideWithId, index)
        ) : (
          <span style={{ color: "#999", fontSize: "11px" }}>
            {slideWithId.slide.shapes.length} shapes
          </span>
        )}
        <span style={thumbnailNumberStyle}>{index + 1}</span>
        {totalSlides > 1 && (
          <button
            type="button"
            style={{
              ...deleteButtonStyle,
              opacity: isHovered ? 1 : 0,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="Delete slide"
          >
            ×
          </button>
        )}
      </div>
      {isDragOver && dragPosition === "after" && (
        <div style={{ ...dragIndicatorStyle, bottom: -3 }} />
      )}
    </div>
  );
}
