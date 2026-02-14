/**
 * @file Grouped List Type Definitions
 *
 * Generic types for a grouped list component supporting:
 * - Items organized into collapsible groups
 * - Single/multi selection
 * - Inline rename editing
 * - Context menu operations (create, rename, delete)
 * - Keyboard navigation
 * - Drag-drop reordering within groups
 */

import type { ReactNode, CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import type { MenuEntry } from "../context-menu/types";

// =============================================================================
// Item Types
// =============================================================================

/**
 * Unique identifier for a list item.
 */
export type GroupedListItemId = string;

/**
 * Group identifier.
 */
export type GroupedListGroupId = string;

/**
 * Generic item in the grouped list.
 */
export type GroupedListItem<TMeta = unknown> = {
  /** Unique item identifier */
  readonly id: GroupedListItemId;
  /** Display label */
  readonly label: string;
  /** Group this item belongs to */
  readonly groupId: GroupedListGroupId;
  /** Optional icon element */
  readonly icon?: ReactNode;
  /** Whether item can be renamed (default: true in editable mode) */
  readonly canRename?: boolean;
  /** Whether item can be deleted (default: true in editable mode) */
  readonly canDelete?: boolean;
  /** Additional metadata (domain-specific) */
  readonly meta?: TMeta;
};

/**
 * Group definition.
 */
export type GroupedListGroup = {
  /** Unique group identifier */
  readonly id: GroupedListGroupId;
  /** Display label for group header */
  readonly label: string;
  /** Sort order (lower = earlier) */
  readonly order: number;
  /** Whether new items can be created in this group (default: true) */
  readonly canCreate?: boolean;
};

// =============================================================================
// State Types
// =============================================================================

/**
 * Selection state.
 */
export type GroupedListSelectionState = {
  /** Selected item IDs */
  readonly selectedIds: readonly GroupedListItemId[];
  /** Primary selection (for context menu) */
  readonly primaryId: GroupedListItemId | undefined;
};

/**
 * Create empty selection state.
 */
export function createEmptySelection(): GroupedListSelectionState {
  return { selectedIds: [], primaryId: undefined };
}

/**
 * Create single item selection.
 */
export function createSingleSelection(
  itemId: GroupedListItemId
): GroupedListSelectionState {
  return { selectedIds: [itemId], primaryId: itemId };
}

/**
 * Context menu state.
 */
export type GroupedListContextMenuState =
  | { readonly type: "closed" }
  | {
      readonly type: "open";
      readonly x: number;
      readonly y: number;
      readonly itemId: GroupedListItemId | null;
      readonly groupId: GroupedListGroupId | null;
    };

/**
 * Create closed context menu state.
 */
export function createClosedContextMenu(): GroupedListContextMenuState {
  return { type: "closed" };
}

/**
 * Edit state for inline rename.
 */
export type GroupedListEditState =
  | { readonly type: "idle" }
  | {
      readonly type: "renaming";
      readonly itemId: GroupedListItemId;
    };

/**
 * Create idle edit state.
 */
export function createIdleEditState(): GroupedListEditState {
  return { type: "idle" };
}

/**
 * Drag state for reordering.
 */
export type GroupedListDragState =
  | { readonly type: "idle" }
  | {
      readonly type: "dragging";
      readonly dragItemId: GroupedListItemId;
      readonly dragGroupId: GroupedListGroupId;
      readonly targetIndex: number | undefined;
    };

/**
 * Create idle drag state.
 */
export function createIdleDragState(): GroupedListDragState {
  return { type: "idle" };
}

/**
 * Drop target position for visual indicator.
 */
export type DropTargetPosition = "above" | "below" | undefined;

/**
 * Collapsed groups state.
 */
export type CollapsedGroupsState = ReadonlySet<GroupedListGroupId>;

// =============================================================================
// Mode
// =============================================================================

/**
 * List mode.
 */
export type GroupedListMode = "readonly" | "editable";

// =============================================================================
// Action Types (for callbacks)
// =============================================================================

/**
 * Standard context menu action IDs.
 */
export const GROUPED_LIST_ACTIONS = {
  CREATE: "create",
  RENAME: "rename",
  DELETE: "delete",
} as const;

export type GroupedListActionId =
  (typeof GROUPED_LIST_ACTIONS)[keyof typeof GROUPED_LIST_ACTIONS];

// =============================================================================
// Props Types
// =============================================================================

/**
 * Context for building custom context menu items.
 */
export type GroupedListMenuContext<TMeta = unknown> = {
  readonly itemId: GroupedListItemId | null;
  readonly groupId: GroupedListGroupId | null;
  readonly item: GroupedListItem<TMeta> | null;
  readonly group: GroupedListGroup | null;
};

/**
 * Props for GroupedList component.
 *
 * Follows patterns from SlideListProps:
 * - Stable callbacks receiving id as argument for memoization
 * - Mode for readonly vs editable
 * - External selection control
 */
export type GroupedListProps<TMeta = unknown> = {
  /** Items to display */
  readonly items: readonly GroupedListItem<TMeta>[];
  /** Group definitions */
  readonly groups: readonly GroupedListGroup[];
  /** List mode (default: readonly) */
  readonly mode?: GroupedListMode;
  /** Active item ID (for selection highlight) */
  readonly activeItemId?: GroupedListItemId;
  /** Initially collapsed group IDs */
  readonly initialCollapsedGroups?: readonly GroupedListGroupId[];
  /** Container class name */
  readonly className?: string;
  /** Container style */
  readonly style?: CSSProperties;
  /** Empty state message */
  readonly emptyMessage?: string;

  // Event handlers
  /** Called when item is clicked */
  readonly onItemClick?: (itemId: GroupedListItemId) => void;
  /** Called when item is renamed */
  readonly onItemRename?: (itemId: GroupedListItemId, newLabel: string) => void;
  /** Called when item is deleted */
  readonly onItemDelete?: (itemId: GroupedListItemId) => void;
  /** Called to create new item in group */
  readonly onItemCreate?: (groupId: GroupedListGroupId) => void;
  /** Called when item is reordered within group */
  readonly onItemReorder?: (
    itemId: GroupedListItemId,
    newIndex: number,
    groupId: GroupedListGroupId
  ) => void;
  /** Called when group collapse state changes */
  readonly onGroupCollapseChange?: (
    groupId: GroupedListGroupId,
    collapsed: boolean
  ) => void;

  // Customization
  /** Custom context menu items builder (extends default menu) */
  readonly buildContextMenuItems?: (
    context: GroupedListMenuContext<TMeta>
  ) => readonly MenuEntry[];
  /** Custom action handler for extended menu items */
  readonly onCustomAction?: (
    actionId: string,
    itemId: GroupedListItemId | null
  ) => void;
};

/**
 * Props for GroupedListItem component.
 */
export type GroupedListItemProps<TMeta = unknown> = {
  readonly item: GroupedListItem<TMeta>;
  readonly isActive: boolean;
  readonly isEditing: boolean;
  readonly mode: GroupedListMode;
  readonly isDragging: boolean;
  readonly isAnyDragging: boolean;
  readonly dropTargetPosition: DropTargetPosition;
  // Stable callbacks (item creates closures)
  readonly onItemClick: (itemId: GroupedListItemId) => void;
  readonly onItemDoubleClick: (itemId: GroupedListItemId) => void;
  readonly onItemContextMenu: (
    itemId: GroupedListItemId,
    e: ReactMouseEvent
  ) => void;
  readonly onRenameSubmit: (itemId: GroupedListItemId, newLabel: string) => void;
  readonly onRenameCancel: (itemId: GroupedListItemId) => void;
  readonly onDragStart: (itemId: GroupedListItemId, e: React.DragEvent) => void;
  readonly onDragOver: (itemId: GroupedListItemId, e: React.DragEvent) => void;
  readonly onDrop: (itemId: GroupedListItemId, e: React.DragEvent) => void;
  readonly onDragEnd: () => void;
};

/**
 * Props for GroupedListGroup component.
 */
export type GroupedListGroupProps = {
  readonly group: GroupedListGroup;
  readonly isCollapsed: boolean;
  readonly mode: GroupedListMode;
  readonly children: ReactNode;
  readonly onToggleCollapse: () => void;
  readonly onGroupContextMenu: (
    groupId: GroupedListGroupId,
    e: ReactMouseEvent
  ) => void;
};
