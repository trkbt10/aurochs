/**
 * @file Selection state management
 *
 * Generic selection state for shape-based editors.
 */

import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import type { SelectionState as CoreSelectionState } from "@aurochs-ui/editor-core/selection";
import {
  createMultiSelection as createCoreMultiSelection,
  removeFromSelection as removeFromCoreSelection,
  toggleSelection as toggleCoreSelection,
} from "@aurochs-ui/editor-core/selection";

// =============================================================================
// Types
// =============================================================================

/**
 * Selection state for shape editors
 */
export type SelectionState = CoreSelectionState<ShapeId>;

// =============================================================================
// Functions
// =============================================================================

/**
 * Create selection with multiple shapes
 */
export function createMultiSelection(shapeIds: readonly ShapeId[], primaryId?: ShapeId): SelectionState {
  const actualPrimaryId = primaryId ?? shapeIds[0];
  if (!actualPrimaryId) {
    throw new Error("createMultiSelection shapeIds must not be empty");
  }
  return createCoreMultiSelection({
    selectedIds: shapeIds,
    primaryId: actualPrimaryId,
  });
}

/**
 * Add shape to selection
 */
export function addToSelection(selection: SelectionState, shapeId: ShapeId): SelectionState {
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
export function removeFromSelection(selection: SelectionState, shapeId: ShapeId): SelectionState {
  return removeFromCoreSelection({
    selection,
    id: shapeId,
    primaryFallback: "first",
  });
}

/**
 * Toggle shape selection
 */
export function toggleSelection(selection: SelectionState, shapeId: ShapeId): SelectionState {
  if (selection.selectedIds.includes(shapeId)) {
    return toggleCoreSelection({
      selection,
      id: shapeId,
      primaryFallback: "first",
    });
  }
  return addToSelection(selection, shapeId);
}

