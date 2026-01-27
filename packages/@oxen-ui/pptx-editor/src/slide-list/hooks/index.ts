/**
 * @file Slide list hooks exports
 */

export { useSlideSelection } from "./useSlideSelection";
export type {
  UseSlideSelectionOptions,
  UseSlideSelectionResult,
} from "./useSlideSelection";

export { useSlideKeyNavigation } from "./useSlideKeyNavigation";
export type {
  UseSlideKeyNavigationOptions,
  UseSlideKeyNavigationResult,
} from "./useSlideKeyNavigation";

export { useSlideDragDrop } from "./useSlideDragDrop";
export type {
  UseSlideDragDropOptions,
  UseSlideDragDropResult,
} from "./useSlideDragDrop";

export { useSlideGapHover } from "./useSlideGapHover";
export type { UseSlideGapHoverResult } from "./useSlideGapHover";

export { useSlideItemHover } from "./useSlideItemHover";
export type {
  SlideItemHoverState,
  UseSlideItemHoverResult,
} from "./useSlideItemHover";

export { useSlideContextMenu, SLIDE_LIST_MENU_ACTIONS } from "./useSlideContextMenu";
export type {
  UseSlideContextMenuOptions,
  UseSlideContextMenuResult,
} from "./useSlideContextMenu";

export { useItemHover } from "./useItemHover";
export type {
  UseItemHoverOptions,
  UseItemHoverResult,
} from "./useItemHover";

// Pure logic exports (for testing and advanced usage)
export {
  createInitialHoverState,
  hoverReducer,
  shouldShowHover,
} from "./item-hover-logic";
export type {
  ItemHoverState,
  ItemHoverAction,
} from "./item-hover-logic";
