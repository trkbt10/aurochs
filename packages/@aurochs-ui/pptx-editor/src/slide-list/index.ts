/**
 * @file Slide list module exports
 *
 * Unified slide list component for both readonly and editable modes
 * with vertical/horizontal orientation support.
 */

// Main component
export { SlideList } from "./SlideList";

// Sub-components
export { SlideListItem } from "./SlideListItem";
export { SlideListGap } from "./SlideListGap";
export { SlideNumberBadge } from "./SlideNumberBadge";
export { DeleteButton } from "./DeleteButton";

// Selection functions
export {
  selectSingle,
  selectRange,
  toggleSelection,
  addToSelection,
  removeFromSelection,
  isSelected as isSlideSelected,
  isSelectionEmpty as isSlideSelectionEmpty,
  selectAll as selectAllSlides,
  handleSelectionClick,
} from "./selection";

// Drag-drop functions (gap-based targeting)
export {
  getDraggingIds,
  createDragStartState,
  updateDragOverGap,
  isValidGapDrop,
  calculateTargetIndexFromGap,
  isGapDragTarget,
  // Legacy exports for backwards compatibility
  getVerticalDropPosition,
  getHorizontalDropPosition,
  calculateTargetIndex,
} from "./drag-drop";

// Types
export type {
  SlideListProps,
  SlideListItemProps,
  SlideListGapProps,
  SlideNumberBadgeProps,
  DeleteButtonProps,
  SlideListOrientation,
  SlideListMode,
  SlideSelectionState,
  SlideDragState,
  SlideContextMenuState,
  GapHoverState,
} from "./types";

export {
  createEmptySlideSelection,
  createSingleSlideSelection,
  createIdleDragState,
} from "./types";

// Hooks
export {
  useSlideSelection,
  useSlideKeyNavigation,
  useSlideDragDrop,
  useSlideGapHover,
  useSlideContextMenu,
  SLIDE_LIST_MENU_ACTIONS,
} from "./hooks";

export type {
  UseSlideSelectionOptions,
  UseSlideSelectionResult,
  UseSlideKeyNavigationOptions,
  UseSlideKeyNavigationResult,
  UseSlideDragDropOptions,
  UseSlideDragDropResult,
  UseSlideGapHoverResult,
  UseSlideContextMenuOptions,
  UseSlideContextMenuResult,
} from "./hooks";
