/**
 * @file VbaModuleGroupedList
 *
 * VBA module list using the generic GroupedList component.
 * Handles VBA-specific logic via adapter and dispatches actions to VBA editor context.
 * Includes a filter input for searching modules.
 */

import { useCallback, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { VbaModuleType } from "@aurochs-office/vba";
import {
  GroupedList,
  FilterInput,
  type GroupedListItemId,
  type GroupedListGroupId,
} from "@aurochs-ui/ui-components";
import { useVbaEditor } from "../../context/vba-editor";
import { generateUniqueModuleName, getModuleNamePrefix } from "../../context/vba-editor/reducer";
import {
  VBA_GROUPS,
  vbaModulesToListItems,
  groupIdToModuleType,
  type VbaModuleMeta,
} from "./vba-module-adapter";

export type VbaModuleGroupedListProps = {
  readonly style?: CSSProperties;
};

/**
 * VBA Module list component using GroupedList.
 *
 * Provides:
 * - Module grouping by type (Document, UserForms, Modules, Class Modules)
 * - Context menu for create/rename/delete operations
 * - Inline rename editing
 * - Drag-drop reordering within groups
 */
const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "hidden",
};

const listContainerStyle: CSSProperties = {
  flex: 1,
  overflow: "auto",
};

export function VbaModuleGroupedList({
  style,
}: VbaModuleGroupedListProps): ReactNode {
  const { modules, state, dispatch } = useVbaEditor();
  const [filterValue, setFilterValue] = useState("");

  // Convert VBA modules to GroupedList items
  const allItems = useMemo(
    () => vbaModulesToListItems(modules),
    [modules]
  );

  // Filter items based on filter value
  const items = useMemo(() => {
    if (!filterValue.trim()) {
      return allItems;
    }
    const lowerFilter = filterValue.toLowerCase();
    return allItems.filter((item) =>
      item.label.toLowerCase().includes(lowerFilter)
    );
  }, [allItems, filterValue]);

  // Handlers
  const handleItemClick = useCallback(
    (itemId: GroupedListItemId) => {
      dispatch({ type: "SELECT_MODULE", moduleName: itemId });
    },
    [dispatch]
  );

  const handleItemRename = useCallback(
    (itemId: GroupedListItemId, newLabel: string) => {
      dispatch({
        type: "RENAME_MODULE",
        oldName: itemId,
        newName: newLabel,
      });
    },
    [dispatch]
  );

  const handleItemDelete = useCallback(
    (itemId: GroupedListItemId) => {
      dispatch({ type: "DELETE_MODULE", moduleName: itemId });
    },
    [dispatch]
  );

  const handleItemCreate = useCallback(
    (groupId: GroupedListGroupId) => {
      const moduleType = groupIdToModuleType(groupId);
      if (!moduleType || moduleType === "document") {
        return;
      }

      // Generate unique name
      const existingNames = modules.map((m) => m.name);
      const prefix = getModuleNamePrefix(moduleType);
      const moduleName = generateUniqueModuleName(prefix, existingNames);

      dispatch({
        type: "CREATE_MODULE",
        moduleType,
        moduleName,
      });
    },
    [modules, dispatch]
  );

  const handleItemReorder = useCallback(
    (
      itemId: GroupedListItemId,
      newIndex: number,
      groupId: GroupedListGroupId
    ) => {
      // Get items in this group
      const groupItems = items.filter((i) => i.groupId === groupId);
      const currentIndex = groupItems.findIndex((i) => i.id === itemId);

      if (currentIndex === -1 || currentIndex === newIndex) {
        return;
      }

      // Create new order for this group
      const reorderedGroupItems = [...groupItems];
      const [removed] = reorderedGroupItems.splice(currentIndex, 1);
      reorderedGroupItems.splice(newIndex, 0, removed);

      // Build full module order (keeping other groups in place)
      const otherItems = items.filter((i) => i.groupId !== groupId);
      const allItemIds = [...otherItems, ...reorderedGroupItems].map((i) => i.id);

      dispatch({
        type: "REORDER_MODULES",
        moduleNames: allItemIds,
      });
    },
    [items, dispatch]
  );

  return (
    <div style={{ ...containerStyle, ...style }}>
      <div style={listContainerStyle}>
        <GroupedList<VbaModuleMeta>
          items={items}
          groups={VBA_GROUPS}
          mode="editable"
          activeItemId={state.activeModuleName}
          emptyMessage={filterValue ? "No matching modules" : "No modules"}
          onItemClick={handleItemClick}
          onItemRename={handleItemRename}
          onItemDelete={handleItemDelete}
          onItemCreate={handleItemCreate}
          onItemReorder={handleItemReorder}
        />
      </div>
      <FilterInput
        value={filterValue}
        onChange={setFilterValue}
        placeholder="Filter modules"
      />
    </div>
  );
}
