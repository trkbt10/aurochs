/**
 * @file Generic item list type definitions
 *
 * Types for the unified item list component supporting both
 * readonly and editable modes with vertical/horizontal orientation.
 * Format-agnostic: works with any item type that has an `id` field.
 */

import type { ItemSelectionState } from "@aurochs-ui/editor-core/item-selection";

/**
 * Scroll orientation for the item list
 */
export type ListOrientation = "vertical" | "horizontal";

/**
 * Mode for the item list
 */
export type ListMode = "readonly" | "editable";

/**
 * Minimal item constraint (matches editor-core's ItemWithId)
 */
export type ListItem<TId = string> = { readonly id: TId };

/**
 * Context menu state
 */
export type ItemContextMenuState<TId> = {
  readonly visible: boolean;
  readonly x: number;
  readonly y: number;
  readonly itemId: TId | null;
};

/**
 * Gap hover state for "+" button visibility
 */
export type GapHoverState = {
  /** Index of the gap being hovered (0 = before first item) */
  readonly hoveredGapIndex: number | null;
};

/**
 * State passed to renderItemExtras render prop
 */
export type ItemExtraRenderState = {
  readonly isHovered: boolean;
  readonly isAnyDragging: boolean;
};

/**
 * Props for the generic ItemList component
 */
export type ItemListProps<TItem extends ListItem<TId>, TId = string> = {
  /** Items to display */
  readonly items: readonly TItem[];
  /** Item width for aspect ratio calculation */
  readonly itemWidth: number;
  /** Item height for aspect ratio calculation */
  readonly itemHeight: number;
  /** Scroll orientation (default: vertical) */
  readonly orientation?: ListOrientation;
  /** Editor mode (default: readonly) */
  readonly mode?: ListMode;
  /** Currently selected item IDs (controlled) */
  readonly selectedIds?: readonly TId[];
  /** Currently active item ID (for navigation highlight) */
  readonly activeItemId?: TId;
  /** Label for the item type (e.g. "Slide", "Page") — used in context menu and aria labels */
  readonly itemLabel?: string;
  /** Render function for item thumbnail content */
  readonly renderThumbnail?: (item: TItem, index: number) => React.ReactNode;
  /** Render function for format-specific extras (e.g. transition editor) */
  readonly renderItemExtras?: (item: TItem, index: number, state: ItemExtraRenderState) => React.ReactNode;
  /** Container class name */
  readonly className?: string;

  // Event handlers
  /** Called when an item is clicked */
  readonly onItemClick?: (id: TId, event?: React.SyntheticEvent) => void;
  /** Called when selection changes (editable mode) */
  readonly onSelectionChange?: (selection: ItemSelectionState<TId>) => void;
  /** Called to add a new item at the specified index */
  readonly onAddItem?: (atIndex: number) => void;
  /** Called to delete items */
  readonly onDeleteItems?: (ids: readonly TId[]) => void;
  /** Called to duplicate items */
  readonly onDuplicateItems?: (ids: readonly TId[]) => void;
  /** Called to move items to a new position */
  readonly onMoveItems?: (ids: readonly TId[], toIndex: number) => void;
};

/**
 * Props for individual item list item
 *
 * Callbacks receive id/index as arguments to enable stable references.
 * This allows ItemListItem to be memoized effectively.
 */
export type ItemListItemProps<TItem extends ListItem<TId>, TId = string> = {
  readonly item: TItem;
  readonly index: number;
  readonly aspectRatio: string;
  readonly orientation: ListOrientation;
  readonly mode: ListMode;
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
  /** Label for the item type */
  readonly itemLabel: string;
  readonly renderThumbnail?: (item: TItem, index: number) => React.ReactNode;
  readonly renderItemExtras?: (item: TItem, index: number, state: ItemExtraRenderState) => React.ReactNode;

  // Event handlers (stable callbacks - item creates its own closures)
  readonly onItemClick: (id: TId, index: number, e: React.MouseEvent | React.KeyboardEvent) => void;
  readonly onItemContextMenu: (id: TId, e: React.MouseEvent) => void;
  readonly onItemDelete: (id: TId) => void;
  readonly onItemPointerEnter: (id: TId) => void;
  readonly onItemPointerLeave: (id: TId) => void;

  // Drag handlers (stable callbacks)
  readonly onItemDragStart: (e: React.DragEvent, id: TId) => void;
  readonly onItemDragOver: (e: React.DragEvent, index: number) => void;
  readonly onItemDrop: (e: React.DragEvent, index: number) => void;

  /** Ref for scroll-into-view */
  readonly itemRef?: React.RefObject<HTMLDivElement | null>;
};

/**
 * Props for gap component between items
 */
export type ItemListGapProps = {
  readonly index: number;
  readonly orientation: ListOrientation;
  readonly isHovered: boolean;
  readonly isDragTarget: boolean;
  readonly itemLabel: string;
  readonly onPointerEnter: () => void;
  readonly onPointerLeave: () => void;
  readonly onClick: () => void;
  readonly onDragOver: (e: React.DragEvent) => void;
  readonly onDrop: (e: React.DragEvent) => void;
};

/**
 * Props for item number badge
 */
export type ItemNumberBadgeProps = {
  readonly number: number;
  readonly orientation: ListOrientation;
};
