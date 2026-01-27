/**
 * @file Cell selection state management
 *
 * Provides immutable operations for cell selection within a worksheet.
 */

import type { CellAddress, CellRange } from "@oxen/xlsx/domain/cell/address";
import type { CellSelectionState } from "../editor/types";
import { createEmptyCellSelection } from "../editor/types";

// =============================================================================
// Single Cell Selection
// =============================================================================

/**
 * Create selection for a single cell
 */
export function createSingleCellSelection(address: CellAddress): CellSelectionState {
  return {
    selectedRange: {
      start: address,
      end: address,
    },
    activeCell: address,
    multiRanges: undefined,
  };
}

// =============================================================================
// Range Selection
// =============================================================================

/**
 * Create selection for a range
 */
export function createRangeSelection(range: CellRange, activeCell?: CellAddress): CellSelectionState {
  return {
    selectedRange: range,
    activeCell: activeCell ?? range.start,
    multiRanges: undefined,
  };
}

/**
 * Extend selection to include a new cell (Shift+Click behavior)
 */
export function extendSelection(
  selection: CellSelectionState,
  toAddress: CellAddress,
): CellSelectionState {
  if (!selection.activeCell) {
    return createSingleCellSelection(toAddress);
  }

  return {
    ...selection,
    selectedRange: {
      start: selection.activeCell,
      end: toAddress,
    },
  };
}

// =============================================================================
// Multi-Range Selection
// =============================================================================

/**
 * Add a range to the selection (Ctrl+Click behavior)
 */
export function addRangeToSelection(
  selection: CellSelectionState,
  range: CellRange,
): CellSelectionState {
  const existingRanges = selection.selectedRange ? [selection.selectedRange, ...(selection.multiRanges ?? [])] : [];

  return {
    selectedRange: range,
    activeCell: range.start,
    multiRanges: existingRanges.length > 0 ? existingRanges : undefined,
  };
}

/**
 * Get all selected ranges (including multiRanges)
 */
export function getAllSelectedRanges(selection: CellSelectionState): readonly CellRange[] {
  if (!selection.selectedRange) {
    return [];
  }

  if (!selection.multiRanges || selection.multiRanges.length === 0) {
    return [selection.selectedRange];
  }

  return [...selection.multiRanges, selection.selectedRange];
}

// =============================================================================
// Selection Queries
// =============================================================================

/**
 * Check if a cell is within the selection
 */
export function isCellSelected(
  selection: CellSelectionState,
  address: CellAddress,
): boolean {
  const allRanges = getAllSelectedRanges(selection);
  return allRanges.some((range) => isCellInRange(address, range));
}

/**
 * Check if a cell is within a range
 */
function isCellInRange(address: CellAddress, range: CellRange): boolean {
  const minCol = Math.min(range.start.col as number, range.end.col as number);
  const maxCol = Math.max(range.start.col as number, range.end.col as number);
  const minRow = Math.min(range.start.row as number, range.end.row as number);
  const maxRow = Math.max(range.start.row as number, range.end.row as number);

  const col = address.col as number;
  const row = address.row as number;

  return col >= minCol && col <= maxCol && row >= minRow && row <= maxRow;
}

/**
 * Check if selection is empty
 */
export function isSelectionEmpty(selection: CellSelectionState): boolean {
  return selection.selectedRange === undefined && selection.activeCell === undefined;
}

/**
 * Check if selection is a single cell
 */
export function isSingleCellSelection(selection: CellSelectionState): boolean {
  if (!selection.selectedRange) {
    return false;
  }

  const { start, end } = selection.selectedRange;
  return (
    start.col === end.col &&
    start.row === end.row &&
    (!selection.multiRanges || selection.multiRanges.length === 0)
  );
}

// =============================================================================
// Clear Selection
// =============================================================================

/**
 * Clear the selection
 */
export function clearSelection(): CellSelectionState {
  return createEmptyCellSelection();
}
