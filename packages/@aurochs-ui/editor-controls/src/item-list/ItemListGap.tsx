/**
 * @file Item list gap component
 *
 * Gap between items with:
 * - "+" button for adding new items (on hover)
 * - Drop indicator for drag-and-drop (when targeted)
 */

import type { ItemListGapProps } from "./types";
import { getGapStyle, getAddButtonStyle, getGapDropIndicatorStyle, getGapHoverZoneStyle } from "./styles";

/**
 * Gap component with add button and drop indicator
 */
export function ItemListGap({
  index,
  orientation,
  isHovered,
  isDragTarget,
  itemLabel,
  onPointerEnter,
  onPointerLeave,
  onClick,
  onDragOver,
  onDrop,
}: ItemListGapProps) {
  return (
    <div
      style={getGapStyle(orientation)}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Drop indicator line */}
      {isDragTarget && (
        <div style={getGapDropIndicatorStyle(orientation)} />
      )}

      {/* Hover zone with button inside - button is child so hovering it doesn't leave zone */}
      {!isDragTarget && (
        <div
          style={getGapHoverZoneStyle(orientation)}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
        >
          <button
            type="button"
            style={getAddButtonStyle(isHovered, orientation)}
            onClick={onClick}
            aria-label={`Add ${itemLabel} at position ${index + 1}`}
            tabIndex={isHovered ? 0 : -1}
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
