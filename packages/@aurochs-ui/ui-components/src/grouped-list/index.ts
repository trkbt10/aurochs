/**
 * @file Grouped List
 *
 * A generic grouped list component with:
 * - Items organized into collapsible groups
 * - Context menu (create, rename, delete)
 * - Inline rename editing
 * - Drag-drop reordering within groups
 * - Keyboard navigation
 */

// Types - rename data types to avoid collision with component names
export type {
  GroupedListItemId,
  GroupedListGroupId,
  GroupedListItem as GroupedListItemData,
  GroupedListGroup as GroupedListGroupData,
  GroupedListSelectionState,
  GroupedListContextMenuState,
  GroupedListEditState,
  GroupedListDragState,
  DropTargetPosition,
  CollapsedGroupsState,
  GroupedListMode,
  GroupedListActionId,
  GroupedListMenuContext,
  GroupedListProps,
  GroupedListItemProps,
  GroupedListGroupProps,
} from "./types";

// Factory functions
export {
  createEmptySelection,
  createSingleSelection,
  createClosedContextMenu,
  createIdleEditState,
  createIdleDragState,
  GROUPED_LIST_ACTIONS,
} from "./types";

// Components
export { GroupedList } from "./GroupedList";
export { GroupedListItem } from "./GroupedListItem";
export { GroupedListGroup } from "./GroupedListGroup";
export { GroupedListContextMenu } from "./GroupedListContextMenu";
export type { GroupedListContextMenuProps } from "./GroupedListContextMenu";

// Hooks
export {
  useGroupedListContextMenu,
  useGroupedListKeyboard,
  useGroupedListDragDrop,
  type UseGroupedListContextMenuReturn,
  type UseGroupedListKeyboardOptions,
  type UseGroupedListDragDropOptions,
  type UseGroupedListDragDropReturn,
} from "./hooks";
