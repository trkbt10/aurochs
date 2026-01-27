/**
 * @file Merge range helpers
 *
 * Normalizes SpreadsheetML merge ranges and provides lookup helpers for merge-aware rendering.
 */

import type { CellAddress, CellRange } from "@oxen/xlsx/domain/cell/address";
import { colIdx, rowIdx } from "@oxen/xlsx/domain/types";

export type NormalizedMergeRange = {
  readonly key: string;
  readonly range: { readonly start: CellAddress; readonly end: CellAddress };
  readonly minRow: number;
  readonly maxRow: number;
  readonly minCol: number;
  readonly maxCol: number;
  readonly origin: CellAddress;
};

/**
 * Normalize a merge range so `start` is the top-left and `end` is the bottom-right.
 *
 * Also computes numeric bounds and a stable key for caching/lookup.
 */
export function normalizeMergeRange(range: Pick<CellRange, "start" | "end">): NormalizedMergeRange {
  const startRow = range.start.row as number;
  const endRow = range.end.row as number;
  const startCol = range.start.col as number;
  const endCol = range.end.col as number;

  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);
  const minCol = Math.min(startCol, endCol);
  const maxCol = Math.max(startCol, endCol);

  const origin: CellAddress = { col: colIdx(minCol), row: rowIdx(minRow), colAbsolute: false, rowAbsolute: false };
  const normalizedRange = {
    start: origin,
    end: { col: colIdx(maxCol), row: rowIdx(maxRow), colAbsolute: false, rowAbsolute: false },
  };

  return {
    key: `${minCol},${minRow}-${maxCol},${maxRow}`,
    range: normalizedRange,
    minRow,
    maxRow,
    minCol,
    maxCol,
    origin,
  };
}

/**
 * Find the merge range that contains `address`, if any.
 */
export function findMergeForCell(
  merges: readonly NormalizedMergeRange[],
  address: CellAddress,
): NormalizedMergeRange | undefined {
  const col = address.col as number;
  const row = address.row as number;
  return merges.find((m) => col >= m.minCol && col <= m.maxCol && row >= m.minRow && row <= m.maxRow);
}
