/**
 * @file Slide list gap component
 *
 * Gap between slides with a "+" button for adding new slides.
 */

import type { SlideListGapProps } from "./types";
import { getGapStyle, getAddButtonStyle } from "./styles";

/**
 * Gap component with add button appearing on hover
 */
export function SlideListGap({
  index,
  orientation,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: SlideListGapProps) {
  return (
    <div
      style={getGapStyle(orientation)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        type="button"
        style={getAddButtonStyle(isHovered)}
        onClick={onClick}
        aria-label={`Add slide at position ${index + 1}`}
        tabIndex={isHovered ? 0 : -1}
      >
        +
      </button>
    </div>
  );
}
