/**
 * @file Slide list type definitions
 *
 * Types for the unified slide list component supporting both
 * readonly and editable modes with vertical/horizontal orientation.
 */

import type { SlideId, SlideWithId } from "../presentation/types";

/**
 * Scroll orientation for the slide list
 */
export type SlideListOrientation = "vertical" | "horizontal";

/**
 * Mode for the slide list
 */
export type SlideListMode = "readonly" | "editable";

/**
 * Slide selection state with multi-select support
 */
export type SlideSelectionState = {
  /** Currently selected slide IDs */
  readonly selectedIds: readonly SlideId[];
  /** Primary selection (for context menu operations) */
  readonly primaryId: SlideId | undefined;
  /** Last clicked index for Shift+click range selection */
  readonly anchorIndex: number | undefined;
};

/**
 * Create empty selection state
 */
export function createEmptySlideSelection(): SlideSelectionState {
  return {
    selectedIds: [],
    primaryId: undefined,
    anchorIndex: undefined,
  };
}

/**
 * Create single slide selection
 */
export function createSingleSlideSelection(
  slideId: SlideId,
  index: number
): SlideSelectionState {
  return {
    selectedIds: [slideId],
    primaryId: slideId,
    anchorIndex: index,
  };
}

/**
 * Drag state for multi-slide reordering
 */
export type SlideDragState = {
  /** Whether dragging is active */
  readonly isDragging: boolean;
  /** IDs of slides being dragged */
  readonly draggingIds: readonly SlideId[];
  /** Target position indicator */
  readonly targetPosition: {
    readonly slideId: SlideId;
    readonly position: "before" | "after";
  } | null;
};

/**
 * Create idle drag state
 */
export function createIdleDragState(): SlideDragState {
  return {
    isDragging: false,
    draggingIds: [],
    targetPosition: null,
  };
}

/**
 * Context menu state
 */
export type SlideContextMenuState = {
  readonly visible: boolean;
  readonly x: number;
  readonly y: number;
  readonly slideId: SlideId | null;
};

/**
 * Gap hover state for "+" button visibility
 */
export type GapHoverState = {
  /** Index of the gap being hovered (0 = before first slide) */
  readonly hoveredGapIndex: number | null;
};

/**
 * Props for the unified SlideList component
 */
export type SlideListProps = {
  /** Slides to display */
  readonly slides: readonly SlideWithId[];
  /** Slide width for aspect ratio calculation */
  readonly slideWidth: number;
  /** Slide height for aspect ratio calculation */
  readonly slideHeight: number;
  /** Scroll orientation (default: vertical) */
  readonly orientation?: SlideListOrientation;
  /** Editor mode (default: readonly) */
  readonly mode?: SlideListMode;
  /** Currently selected slide IDs (controlled) */
  readonly selectedIds?: readonly SlideId[];
  /** Currently active slide ID (for navigation highlight) */
  readonly activeSlideId?: SlideId;
  /** Render function for slide thumbnail content */
  readonly renderThumbnail?: (
    slide: SlideWithId,
    index: number
  ) => React.ReactNode;
  /** Container class name */
  readonly className?: string;

  // Event handlers
  /** Called when a slide is clicked */
  readonly onSlideClick?: (slideId: SlideId, event: React.MouseEvent) => void;
  /** Called when selection changes (editable mode) */
  readonly onSelectionChange?: (selection: SlideSelectionState) => void;
  /** Called to add a new slide after the specified index */
  readonly onAddSlide?: (afterIndex: number) => void;
  /** Called to delete slides */
  readonly onDeleteSlides?: (slideIds: readonly SlideId[]) => void;
  /** Called to duplicate slides */
  readonly onDuplicateSlides?: (slideIds: readonly SlideId[]) => void;
  /** Called to move slides to a new position */
  readonly onMoveSlides?: (slideIds: readonly SlideId[], toIndex: number) => void;
};

/**
 * Props for individual slide list item
 */
export type SlideListItemProps = {
  readonly slideWithId: SlideWithId;
  readonly index: number;
  readonly aspectRatio: string;
  readonly orientation: SlideListOrientation;
  readonly mode: SlideListMode;
  readonly isSelected: boolean;
  readonly isPrimary: boolean;
  readonly isActive: boolean;
  readonly canDelete: boolean;
  readonly renderThumbnail?: (
    slide: SlideWithId,
    index: number
  ) => React.ReactNode;

  // Event handlers
  readonly onClick: (e: React.MouseEvent) => void;
  readonly onContextMenu: (e: React.MouseEvent) => void;
  readonly onDelete: () => void;

  // Drag handlers
  readonly onDragStart: (e: React.DragEvent) => void;
  readonly onDragOver: (e: React.DragEvent) => void;
  readonly onDrop: (e: React.DragEvent) => void;
  readonly isDragTarget: boolean;
  readonly dragPosition: "before" | "after" | null;

  /** Ref for scroll-into-view */
  readonly itemRef?: React.RefObject<HTMLDivElement | null>;
};

/**
 * Props for gap component between slides
 */
export type SlideListGapProps = {
  readonly index: number;
  readonly orientation: SlideListOrientation;
  readonly isHovered: boolean;
  readonly onMouseEnter: () => void;
  readonly onMouseLeave: () => void;
  readonly onClick: () => void;
};

/**
 * Props for slide number badge
 */
export type SlideNumberBadgeProps = {
  readonly number: number;
  readonly orientation: SlideListOrientation;
};

/**
 * Props for delete button
 */
export type DeleteButtonProps = {
  readonly visible: boolean;
  readonly onClick: (e: React.MouseEvent) => void;
};
