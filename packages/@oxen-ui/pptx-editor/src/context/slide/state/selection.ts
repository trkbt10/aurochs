/**
 * @file Selection state management
 *
 * Generic selection state for shape-based editors.
 */

import type { ShapeId } from "@oxen/pptx/domain/types";

// =============================================================================
// Types
// =============================================================================

/**
 * Selection state for shape editors
 */
export type SelectionState = {
  /** Currently selected shape IDs */
  readonly selectedIds: readonly ShapeId[];
  /** Primary selection (first selected or last clicked in multi-select) */
  readonly primaryId: ShapeId | undefined;
};

// =============================================================================
// Functions
// =============================================================================

/**
 * Create empty selection state
 */
export function createEmptySelection(): SelectionState {
  return {
    selectedIds: [],
    primaryId: undefined,
  };
}

/**
 * Create selection with single shape
 */
export function createSingleSelection(shapeId: ShapeId): SelectionState {
  return {
    selectedIds: [shapeId],
    primaryId: shapeId,
  };
}

/**
 * Create selection with multiple shapes
 */
export function createMultiSelection(
  shapeIds: readonly ShapeId[],
  primaryId?: ShapeId
): SelectionState {
  return {
    selectedIds: shapeIds,
    primaryId: primaryId ?? shapeIds[0],
  };
}

/**
 * Add shape to selection
 */
export function addToSelection(
  selection: SelectionState,
  shapeId: ShapeId
): SelectionState {
  if (selection.selectedIds.includes(shapeId)) {
    return selection;
  }
  return {
    selectedIds: [...selection.selectedIds, shapeId],
    primaryId: shapeId,
  };
}

/**
 * Remove shape from selection
 */
export function removeFromSelection(
  selection: SelectionState,
  shapeId: ShapeId
): SelectionState {
  const newSelectedIds = selection.selectedIds.filter((id) => id !== shapeId);
  return {
    selectedIds: newSelectedIds,
    primaryId:
      selection.primaryId === shapeId
        ? newSelectedIds[0]
        : selection.primaryId,
  };
}

/**
 * Toggle shape selection
 */
export function toggleSelection(
  selection: SelectionState,
  shapeId: ShapeId
): SelectionState {
  if (selection.selectedIds.includes(shapeId)) {
    return removeFromSelection(selection, shapeId);
  }
  return addToSelection(selection, shapeId);
}

/**
 * Check if shape is selected
 */
export function isSelected(
  selection: SelectionState,
  shapeId: ShapeId
): boolean {
  return selection.selectedIds.includes(shapeId);
}

/**
 * Check if selection is empty
 */
export function isSelectionEmpty(selection: SelectionState): boolean {
  return selection.selectedIds.length === 0;
}
