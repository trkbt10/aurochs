/**
 * @file Slide thumbnail item component
 *
 * Individual slide thumbnail with drag-and-drop support.
 */

import { useState, type ReactNode } from "react";
import type { SlideWithId } from "@aurochs-office/pptx/app";
import type { ThumbnailItemProps } from "./types";
import {
  thumbnailWrapperStyle,
  getThumbnailStyle,
  getThumbnailActiveStyle,
  thumbnailNumberStyle,
  deleteButtonStyle,
  dragIndicatorStyle,
} from "./styles";

/** Resolve thumbnail content from render function or default */
function resolveThumbnailContent(
  renderThumbnail: ((slide: SlideWithId, index: number) => ReactNode) | undefined,
  slideWithId: SlideWithId,
  index: number,
): ReactNode {
  if (renderThumbnail) {
    return renderThumbnail(slideWithId, index);
  }
  return (
    <span style={{ color: "#999", fontSize: "11px" }}>
      {slideWithId.slide.shapes.length} shapes
    </span>
  );
}

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

  const thumbnailContent: ReactNode = resolveThumbnailContent(renderThumbnail, slideWithId, index);

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
        {thumbnailContent}
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
