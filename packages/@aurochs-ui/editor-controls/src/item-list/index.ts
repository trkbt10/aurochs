/**
 * @file Generic item list module exports
 *
 * Format-agnostic item list component with selection, drag-and-drop,
 * add/delete/reorder, and context menu support.
 */

// Main component
export { ItemList } from "./ItemList";

// Sub-components
export { ItemListItem } from "./ItemListItem";
export { ItemListGap } from "./ItemListGap";
export { ItemNumberBadge } from "./ItemNumberBadge";

// Hooks
export { useItemListDragDrop } from "./useItemListDragDrop";
export type { UseItemListDragDropOptions, UseItemListDragDropResult } from "./useItemListDragDrop";

export { useItemListGapHover } from "./useItemListGapHover";
export type { UseItemListGapHoverResult } from "./useItemListGapHover";

export { useItemListContextMenu, ITEM_LIST_MENU_ACTIONS } from "./useItemListContextMenu";
export type { UseItemListContextMenuOptions, UseItemListContextMenuResult } from "./useItemListContextMenu";

// Styles (for consumers that need to compose custom layouts)
export {
  getContainerStyle,
  getItemWrapperStyle,
  getNumberBadgeStyle,
  getThumbnailContainerStyle,
  thumbnailContentStyle,
  thumbnailInnerStyle,
  thumbnailFillStyle,
  thumbnailFallbackStyle,
  getDeleteButtonStyle,
  getGapStyle,
  getGapDropIndicatorStyle,
  getGapHoverZoneStyle,
  getAddButtonStyle,
} from "./styles";

// Types
export type {
  ListOrientation,
  ListMode,
  ListItem,
  ItemContextMenuState,
  GapHoverState,
  ItemExtraRenderState,
  ItemListProps,
  ItemListItemProps,
  ItemListGapProps,
  ItemNumberBadgeProps,
} from "./types";
