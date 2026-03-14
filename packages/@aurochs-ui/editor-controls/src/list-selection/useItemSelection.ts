/**
 * @file Item selection hook
 *
 * Manages multi-select with Shift+click range selection and Ctrl/Cmd+click toggle.
 * Format-agnostic — works with any ordered item list.
 */

import { useCallback, useState } from "react";
import {
  type ItemSelectionState,
  type ItemWithId,
  createEmptyItemSelection,
  selectSingleItem,
  selectItemRange,
  toggleItemSelection,
  selectAllItems,
  isItemSelected,
  handleItemSelectionClick,
} from "@aurochs-ui/editor-core/item-selection";

export type UseItemSelectionOptions<TId> = {
  /** Items array for index lookup */
  readonly items: readonly ItemWithId<TId>[];
  /** Initial selection state */
  readonly initialSelection?: ItemSelectionState<TId>;
  /** Callback when selection changes */
  readonly onSelectionChange?: (selection: ItemSelectionState<TId>) => void;
};

export type UseItemSelectionResult<TId> = {
  /** Current selection state */
  readonly selection: ItemSelectionState<TId>;
  /** Handle click with modifier key support */
  readonly handleClick: (id: TId, index: number, event: React.MouseEvent | React.KeyboardEvent) => void;
  /** Select a single item */
  readonly selectSingle: (id: TId, index: number) => void;
  /** Select a range of items */
  readonly selectRange: (fromIndex: number, toIndex: number) => void;
  /** Toggle an item in selection */
  readonly toggleSelection: (id: TId, index: number) => void;
  /** Clear all selection */
  readonly clearSelection: () => void;
  /** Select all items */
  readonly selectAll: () => void;
  /** Check if an item is selected */
  readonly isSelected: (id: TId) => boolean;
  /** Update selection externally */
  readonly setSelection: (selection: ItemSelectionState<TId>) => void;
};

/**
 * Hook for managing item selection with multi-select support.
 */
export function useItemSelection<TId>(options: UseItemSelectionOptions<TId>): UseItemSelectionResult<TId> {
  const { items, initialSelection, onSelectionChange } = options;

  const [selection, setSelectionState] = useState<ItemSelectionState<TId>>(
    initialSelection ?? createEmptyItemSelection<TId>(),
  );

  const setSelection = useCallback(
    (newSelection: ItemSelectionState<TId>) => {
      setSelectionState(newSelection);
      onSelectionChange?.(newSelection);
    },
    [onSelectionChange],
  );

  const selectSingle = useCallback(
    (id: TId, index: number) => setSelection(selectSingleItem(id, index)),
    [setSelection],
  );

  const selectRange = useCallback(
    (fromIndex: number, toIndex: number) => setSelection(selectItemRange(items, fromIndex, toIndex)),
    [items, setSelection],
  );

  const toggleSelection = useCallback(
    (id: TId, index: number) => setSelection(toggleItemSelection(selection, id, index)),
    [selection, setSelection],
  );

  const clearSelection = useCallback(
    () => setSelection(createEmptyItemSelection<TId>()),
    [setSelection],
  );

  const selectAll = useCallback(
    () => setSelection(selectAllItems(items)),
    [items, setSelection],
  );

  const handleClick = useCallback(
    (id: TId, index: number, event: React.MouseEvent | React.KeyboardEvent) => {
      const isMetaOrCtrl = event.metaKey || event.ctrlKey;
      setSelection(handleItemSelectionClick({
        items,
        currentSelection: selection,
        id,
        index,
        shiftKey: event.shiftKey,
        metaOrCtrlKey: isMetaOrCtrl,
      }));
    },
    [items, selection, setSelection],
  );

  const isSelected = useCallback(
    (id: TId) => isItemSelected(selection, id),
    [selection],
  );

  return {
    selection,
    handleClick,
    selectSingle,
    selectRange,
    toggleSelection,
    clearSelection,
    selectAll,
    isSelected,
    setSelection,
  };
}
