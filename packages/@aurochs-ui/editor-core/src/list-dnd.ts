/**
 * @file List drag-and-drop operations
 *
 * Pure functions for gap-based D&D logic in ordered item lists.
 * Works for slide lists, page lists, or any ordered item collection.
 *
 * Gap-based targeting: drop indicator appears between items, not on them.
 * Gap index 0 = before first item, gap index N = after last item.
 */

// =============================================================================
// Types
// =============================================================================

/** Minimal item with an ID for DnD operations. */
export type ItemWithId<TId = string> = { readonly id: TId };

/** Drag state for list reordering. */
export type ListDragState<TId = string> = {
  readonly isDragging: boolean;
  readonly draggingIds: readonly TId[];
  readonly targetGapIndex: number | null;
};

// =============================================================================
// Drag State Management
// =============================================================================

/** Determine which items to drag based on selection. */
export function getDraggingIds<TId>(selectedIds: readonly TId[], draggedId: TId): readonly TId[] {
  if (selectedIds.includes(draggedId)) {
    return [...selectedIds];
  }
  return [draggedId];
}

/** Create drag state for starting a drag operation. */
export function createDragStartState<TId>(draggingIds: readonly TId[]): ListDragState<TId> {
  return { isDragging: true, draggingIds, targetGapIndex: null };
}

/** Create idle (no drag) state. */
export function createIdleListDragState<TId>(): ListDragState<TId> {
  return { isDragging: false, draggingIds: [], targetGapIndex: null };
}

/** Update drag state when hovering over a gap. */
export function updateDragOverGap<TId>(currentState: ListDragState<TId>, gapIndex: number): ListDragState<TId> {
  return { ...currentState, targetGapIndex: gapIndex };
}

// =============================================================================
// Validation & Targeting
// =============================================================================

/** Check if a gap is a valid drop target. */
export function isValidGapDrop<TId>(dragState: ListDragState<TId>, gapIndex: number, items: readonly ItemWithId<TId>[]): boolean {
  if (!dragState.isDragging || dragState.draggingIds.length === 0) {
    return false;
  }

  const draggingIndices = dragState.draggingIds
    .map((id) => items.findIndex((s) => s.id === id))
    .filter((idx) => idx >= 0)
    .sort((a, b) => a - b);

  if (draggingIndices.length === 0) {
    return false;
  }

  // Check for contiguous selection — only then check for no-op
  const isContiguous = draggingIndices.every((idx, i) => i === 0 || idx === draggingIndices[i - 1] + 1);

  if (isContiguous) {
    const firstDragging = draggingIndices[0];
    const lastDragging = draggingIndices[draggingIndices.length - 1];
    // Gap immediately before first or after last = no movement
    if (gapIndex === firstDragging || gapIndex === lastDragging + 1) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate the final target index for a drop on a gap.
 * Adjusts for items being removed from before the target position.
 */
export function calculateTargetIndexFromGap<TId>(
  items: readonly ItemWithId<TId>[],
  draggingIds: readonly TId[],
  gapIndex: number,
): number {
  const itemsMovingFromBefore = draggingIds.filter((id) => {
    const idx = items.findIndex((s) => s.id === id);
    return idx >= 0 && idx < gapIndex;
  }).length;
  return gapIndex - itemsMovingFromBefore;
}

/** Check if a gap is the current drag target. */
export function isGapDragTarget<TId>(dragState: ListDragState<TId>, gapIndex: number): boolean {
  return dragState.isDragging && dragState.targetGapIndex === gapIndex;
}

/**
 * Calculate gap index from cursor position over an item.
 * Uses cursor position relative to item center to determine before/after.
 */
export function calculateGapIndexFromItemDragOver(args: {
  readonly itemIndex: number;
  readonly orientation: "vertical" | "horizontal";
  readonly clientX: number;
  readonly clientY: number;
  readonly itemRect: DOMRect;
}): number {
  const { itemIndex, orientation, clientX, clientY, itemRect } = args;
  if (orientation === "vertical") {
    const mid = itemRect.top + itemRect.height / 2;
    return clientY < mid ? itemIndex : itemIndex + 1;
  } else {
    const mid = itemRect.left + itemRect.width / 2;
    return clientX < mid ? itemIndex : itemIndex + 1;
  }
}

// =============================================================================
// Reorder Helper
// =============================================================================

/**
 * Reorder items in a list: move items at the given indices to a target position.
 * Returns a new array with the items moved.
 */
export function reorderItems<T>(items: readonly T[], fromIndices: readonly number[], toIndex: number): readonly T[] {
  const sortedIndices = [...fromIndices].sort((a, b) => a - b);
  const movedItems = sortedIndices.map((i) => items[i]);
  const remaining = items.filter((_, i) => !sortedIndices.includes(i));
  const result = [...remaining];
  result.splice(toIndex, 0, ...movedItems);
  return result;
}
