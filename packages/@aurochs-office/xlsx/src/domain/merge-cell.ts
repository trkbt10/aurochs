/**
 * @file MergeCell Type and Utilities
 *
 * Provides types and functions for working with merged cell regions.
 * A merged cell combines multiple cells into a single cell, where only
 * the top-left cell (origin) contains the value.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.55 (mergeCells)
 * @see ECMA-376 Part 4, Section 18.3.1.54 (mergeCell)
 */

import type { CellAddress, CellRange } from "./cell/address";

// =============================================================================
// Types
// =============================================================================

/**
 * A merged cell region.
 *
 * Represents a range of cells that are combined into one logical cell.
 * The value and formatting are stored in the top-left (origin) cell.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.54 (mergeCell)
 */
export type MergeCell = {
  readonly range: CellRange;
};

// =============================================================================
// Utilities
// =============================================================================

/**
 * Find the merge cell region that contains a given cell address.
 *
 * @param cell - Cell address to search for
 * @param mergeCells - Array of merge cell regions to search
 * @returns The containing MergeCell, or undefined if not in any merge region
 *
 * @example
 * const merges = [{ range: parseRange("A1:B2") }];
 * findMergeCell(parseCellRef("A1"), merges); // => { range: ... }
 * findMergeCell(parseCellRef("C3"), merges); // => undefined
 */
export function findMergeCell(
  cell: CellAddress,
  mergeCells: readonly MergeCell[],
): MergeCell | undefined {
  return mergeCells.find((mergeCell) => {
    const { start, end } = mergeCell.range;
    const minCol = Math.min(start.col as number, end.col as number);
    const maxCol = Math.max(start.col as number, end.col as number);
    const minRow = Math.min(start.row as number, end.row as number);
    const maxRow = Math.max(start.row as number, end.row as number);

    const col = cell.col as number;
    const row = cell.row as number;

    return col >= minCol && col <= maxCol && row >= minRow && row <= maxRow;
  });
}

/**
 * Check if a cell is the origin (top-left corner) of a merge region.
 *
 * The origin cell is the only cell in a merged region that contains
 * the actual value and primary formatting.
 *
 * @param cell - Cell address to check
 * @param mergeCell - Merge cell region
 * @returns true if the cell is at the origin of the merge region
 *
 * @example
 * const merge = { range: parseRange("B2:C3") };
 * isMergeOrigin(parseCellRef("B2"), merge); // => true
 * isMergeOrigin(parseCellRef("C3"), merge); // => false
 */
export function isMergeOrigin(
  cell: CellAddress,
  mergeCell: MergeCell,
): boolean {
  const { start, end } = mergeCell.range;
  const minCol = Math.min(start.col as number, end.col as number);
  const minRow = Math.min(start.row as number, end.row as number);

  return (cell.col as number) === minCol && (cell.row as number) === minRow;
}

/**
 * Get the size of a merge region in columns and rows.
 *
 * @param mergeCell - Merge cell region
 * @returns Object with cols and rows counts (both >= 1)
 *
 * @example
 * const merge = { range: parseRange("A1:C3") };
 * getMergeSize(merge); // => { cols: 3, rows: 3 }
 */
export function getMergeSize(
  mergeCell: MergeCell,
): { readonly cols: number; readonly rows: number } {
  const { start, end } = mergeCell.range;
  const minCol = Math.min(start.col as number, end.col as number);
  const maxCol = Math.max(start.col as number, end.col as number);
  const minRow = Math.min(start.row as number, end.row as number);
  const maxRow = Math.max(start.row as number, end.row as number);

  return {
    cols: maxCol - minCol + 1,
    rows: maxRow - minRow + 1,
  };
}

/**
 * Create a MergeCell from a CellRange.
 *
 * @param range - Cell range defining the merge region
 * @returns A new MergeCell
 *
 * @example
 * const range = parseRange("A1:B2");
 * const merge = createMergeCell(range);
 */
export function createMergeCell(range: CellRange): MergeCell {
  return { range };
}
