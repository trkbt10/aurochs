/**
 * @file Slide list type definitions
 *
 * Types for the unified slide list component supporting both
 * readonly and editable modes with vertical/horizontal orientation.
 */

import type { SlideId, SlideWithId } from "@oxen/pptx/app";
import type { SlideTransition } from "@oxen/pptx/domain/transition";

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
  /** Target gap index (0 = before first slide, n = after nth slide) */
  readonly targetGapIndex: number | null;
};

/**
 * Create idle drag state
 */
export function createIdleDragState(): SlideDragState {
  return {
    isDragging: false,
    draggingIds: [],
    targetGapIndex: null,
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
  readonly onSlideClick?: (slideId: SlideId, event?: React.SyntheticEvent) => void;
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
  /** Called when slide transition changes */
  readonly onSlideTransitionChange?: (slideId: SlideId, transition: SlideTransition | undefined) => void;
};

/**
 * Props for individual slide list item
 *
 * Callbacks receive slideId/index as arguments to enable stable references.
 * This allows SlideListItem to be memoized effectively.
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
  /** This specific item is being dragged (for opacity) */
  readonly isDragging: boolean;
  /** Any drag operation is active (for suppressing hover UI) */
  readonly isAnyDragging: boolean;
  /** Whether this item is currently hovered (managed at list level) */
  readonly isHovered: boolean;
  readonly renderThumbnail?: (
    slide: SlideWithId,
    index: number
  ) => React.ReactNode;

  // Event handlers (stable callbacks - item creates its own closures)
  readonly onItemClick: (
    slideId: SlideId,
    index: number,
    e: React.MouseEvent | React.KeyboardEvent
  ) => void;
  readonly onItemContextMenu: (slideId: SlideId, e: React.MouseEvent) => void;
  readonly onItemDelete: (slideId: SlideId) => void;
  readonly onItemPointerEnter: (slideId: SlideId) => void;
  readonly onItemPointerLeave: (slideId: SlideId) => void;
  /** Called when the slide transition changes */
  readonly onItemTransitionChange?: (
    slideId: SlideId,
    transition: SlideTransition | undefined
  ) => void;
  /** Called when the Fx popover opens */
  readonly onItemFxOpen?: (slideId: SlideId, index: number, event: React.MouseEvent) => void;

  // Drag handlers (stable callbacks)
  readonly onItemDragStart: (e: React.DragEvent, slideId: SlideId) => void;
  readonly onItemDragOver: (e: React.DragEvent, index: number) => void;
  readonly onItemDrop: (e: React.DragEvent, index: number) => void;

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
  readonly isDragTarget: boolean;
  readonly onPointerEnter: () => void;
  readonly onPointerLeave: () => void;
  readonly onClick: () => void;
  readonly onDragOver: (e: React.DragEvent) => void;
  readonly onDrop: (e: React.DragEvent) => void;
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
