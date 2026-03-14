/**
 * @file Item selection state management
 *
 * Generic multi-select state and operations for ordered item lists
 * (slides, pages, sheets, etc.). Supports single, range, and toggle selection.
 *
 * All functions are pure — no React dependency.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Multi-select state for an ordered item list.
 * TId: the item identifier type (e.g., SlideId, PageId, string).
 */
export type ItemSelectionState<TId = string> = {
  /** Currently selected item IDs */
  readonly selectedIds: readonly TId[];
  /** Primary selection (for context menu operations) */
  readonly primaryId: TId | undefined;
  /** Last clicked index for Shift+click range selection */
  readonly anchorIndex: number | undefined;
};

/**
 * An item with an ID, for use in selection operations.
 */
export type ItemWithId<TId = string> = {
  readonly id: TId;
};

// =============================================================================
// Constructors
// =============================================================================

/**
 * Create empty selection state.
 */
export function createEmptyItemSelection<TId>(): ItemSelectionState<TId> {
  return {
    selectedIds: [],
    primaryId: undefined,
    anchorIndex: undefined,
  };
}

/**
 * Create single-item selection state.
 */
export function createSingleItemSelection<TId>(id: TId, index: number): ItemSelectionState<TId> {
  return {
    selectedIds: [id],
    primaryId: id,
    anchorIndex: index,
  };
}

// =============================================================================
// Operations
// =============================================================================

/**
 * Select a single item, replacing current selection.
 */
export function selectSingleItem<TId>(id: TId, index: number): ItemSelectionState<TId> {
  return createSingleItemSelection(id, index);
}

/**
 * Select a range of items from anchor to target index.
 */
export function selectItemRange<TId>(
  items: readonly ItemWithId<TId>[],
  fromIndex: number,
  toIndex: number,
): ItemSelectionState<TId> {
  const start = Math.min(fromIndex, toIndex);
  const end = Math.max(fromIndex, toIndex);
  const rangeIds = items.slice(start, end + 1).map((s) => s.id);
  const primaryId = items[toIndex]?.id;

  return {
    selectedIds: rangeIds,
    primaryId,
    anchorIndex: fromIndex,
  };
}

/**
 * Toggle an item in the selection (add if not selected, remove if selected).
 */
export function toggleItemSelection<TId>(
  currentSelection: ItemSelectionState<TId>,
  id: TId,
  index: number,
): ItemSelectionState<TId> {
  const isCurrentlySelected = currentSelection.selectedIds.includes(id);

  if (isCurrentlySelected) {
    const newIds = currentSelection.selectedIds.filter((existingId) => existingId !== id);
    return {
      selectedIds: newIds,
      primaryId: newIds.length > 0 ? newIds[newIds.length - 1] : undefined,
      anchorIndex: newIds.length > 0 ? index : undefined,
    };
  }

  return {
    selectedIds: [...currentSelection.selectedIds, id],
    primaryId: id,
    anchorIndex: index,
  };
}

/**
 * Add an item to the selection.
 */
export function addItemToSelection<TId>(
  currentSelection: ItemSelectionState<TId>,
  id: TId,
  index: number,
): ItemSelectionState<TId> {
  if (currentSelection.selectedIds.includes(id)) {
    return currentSelection;
  }

  return {
    selectedIds: [...currentSelection.selectedIds, id],
    primaryId: id,
    anchorIndex: index,
  };
}

/**
 * Remove an item from the selection.
 */
export function removeItemFromSelection<TId>(
  currentSelection: ItemSelectionState<TId>,
  id: TId,
): ItemSelectionState<TId> {
  const newIds = currentSelection.selectedIds.filter((existingId) => existingId !== id);

  if (newIds.length === currentSelection.selectedIds.length) {
    return currentSelection; // Not in selection
  }

  const primaryId = currentSelection.primaryId === id ? newIds[newIds.length - 1] : currentSelection.primaryId;

  return {
    selectedIds: newIds,
    primaryId,
    anchorIndex: newIds.length > 0 ? currentSelection.anchorIndex : undefined,
  };
}

/**
 * Check if an item is selected.
 */
export function isItemSelected<TId>(selection: ItemSelectionState<TId>, id: TId): boolean {
  return selection.selectedIds.includes(id);
}

/**
 * Check if selection is empty.
 */
export function isItemSelectionEmpty<TId>(selection: ItemSelectionState<TId>): boolean {
  return selection.selectedIds.length === 0;
}

/**
 * Select all items.
 */
export function selectAllItems<TId>(items: readonly ItemWithId<TId>[]): ItemSelectionState<TId> {
  if (items.length === 0) {
    return createEmptyItemSelection<TId>();
  }

  return {
    selectedIds: items.map((s) => s.id),
    primaryId: items[0]?.id,
    anchorIndex: 0,
  };
}

/**
 * Handle click with modifier key support.
 */
export function handleItemSelectionClick<TId>({
  items,
  currentSelection,
  id,
  index,
  shiftKey,
  metaOrCtrlKey,
}: {
  items: readonly ItemWithId<TId>[];
  currentSelection: ItemSelectionState<TId>;
  id: TId;
  index: number;
  shiftKey: boolean;
  metaOrCtrlKey: boolean;
}): ItemSelectionState<TId> {
  if (shiftKey && currentSelection.anchorIndex !== undefined) {
    return selectItemRange(items, currentSelection.anchorIndex, index);
  }

  if (metaOrCtrlKey) {
    return toggleItemSelection(currentSelection, id, index);
  }

  return selectSingleItem(id, index);
}
