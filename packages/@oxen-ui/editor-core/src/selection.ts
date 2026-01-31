/**
 * @file Generic selection state
 *
 * Provides immutable selection utilities for ID-based editors.
 */

// =============================================================================
// Types
// =============================================================================

export type SelectionState<TId> = {
  readonly selectedIds: readonly TId[];
  readonly primaryId: TId | undefined;
};

export type SelectionPrimaryFallback = "first" | "last";

// =============================================================================
// Factories
// =============================================================================


























/**
 * Create an empty selection state with no selected items.
 */
export function createEmptySelection<TId>(): SelectionState<TId> {
  return {
    selectedIds: [],
    primaryId: undefined,
  };
}


























/**
 * Create a selection state with a single selected item.
 */
export function createSingleSelection<TId>(id: TId): SelectionState<TId> {
  return {
    selectedIds: [id],
    primaryId: id,
  };
}


























/**
 * Create a selection state with multiple selected items.
 */
export function createMultiSelection<TId>(params: {
  readonly selectedIds: readonly TId[];
  readonly primaryId: TId;
}): SelectionState<TId> {
  const { selectedIds, primaryId } = params;
  if (selectedIds.length === 0) {
    throw new Error("createMultiSelection selectedIds must not be empty");
  }
  if (!selectedIds.includes(primaryId)) {
    throw new Error("createMultiSelection primaryId must be included in selectedIds");
  }
  return { selectedIds, primaryId };
}

// =============================================================================
// Mutations
// =============================================================================


























/**
 * Add an item to the selection, making it the primary item.
 */
export function addToSelection<TId>(
  selection: SelectionState<TId>,
  id: TId,
): SelectionState<TId> {
  if (selection.selectedIds.includes(id)) {
    return { ...selection, primaryId: id };
  }
  return {
    selectedIds: [...selection.selectedIds, id],
    primaryId: id,
  };
}


























/**
 * Remove an item from the selection.
 */
export function removeFromSelection<TId>(params: {
  readonly selection: SelectionState<TId>;
  readonly id: TId;
  readonly primaryFallback: SelectionPrimaryFallback;
}): SelectionState<TId> {
  const { selection, id, primaryFallback } = params;
  const remaining = selection.selectedIds.filter((x) => x !== id);

  if (selection.primaryId !== id) {
    return {
      selectedIds: remaining,
      primaryId: selection.primaryId,
    };
  }

  const nextPrimary = getFallbackPrimaryId(remaining, primaryFallback);
  return {
    selectedIds: remaining,
    primaryId: nextPrimary,
  };
}


























/**
 * Toggle an item in the selection (add if not present, remove if present).
 */
export function toggleSelection<TId>(params: {
  readonly selection: SelectionState<TId>;
  readonly id: TId;
  readonly primaryFallback: SelectionPrimaryFallback;
}): SelectionState<TId> {
  const { selection, id, primaryFallback } = params;
  if (selection.selectedIds.includes(id)) {
    return removeFromSelection({ selection, id, primaryFallback });
  }
  return addToSelection(selection, id);
}

// =============================================================================
// Queries
// =============================================================================


























/**
 * Check if an item is selected.
 */
export function isSelected<TId>(selection: SelectionState<TId>, id: TId): boolean {
  return selection.selectedIds.includes(id);
}


























/**
 * Check if the selection is empty.
 */
export function isSelectionEmpty<TId>(selection: SelectionState<TId>): boolean {
  return selection.selectedIds.length === 0;
}

// =============================================================================
// Helpers
// =============================================================================

function getFallbackPrimaryId<TId>(
  remaining: readonly TId[],
  primaryFallback: SelectionPrimaryFallback,
): TId | undefined {
  if (remaining.length === 0) {
    return undefined;
  }

  switch (primaryFallback) {
    case "first":
      return remaining[0];
    case "last":
      return remaining[remaining.length - 1];
  }
}

