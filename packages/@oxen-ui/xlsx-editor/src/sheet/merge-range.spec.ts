/**
 * @file Unit tests for merge range normalization and lookup helpers.
 */

import { colIdx, rowIdx } from "@oxen/xlsx/domain/types";
import type { CellAddress } from "@oxen/xlsx/domain/cell/address";
import { findMergeForCell, normalizeMergeRange } from "./merge-range";

function addr(col: number, row: number): CellAddress {
  return { col: colIdx(col), row: rowIdx(row), colAbsolute: false, rowAbsolute: false };
}

describe("xlsx-editor/sheet/merge-range", () => {
  it("normalizes merge ranges to origin=min(start,end)", () => {
    const normalized = normalizeMergeRange({ start: addr(3, 4), end: addr(1, 2) });
    expect(normalized.minCol).toBe(1);
    expect(normalized.minRow).toBe(2);
    expect(normalized.maxCol).toBe(3);
    expect(normalized.maxRow).toBe(4);
    expect(normalized.origin).toEqual(addr(1, 2));
    expect(normalized.range).toEqual({ start: addr(1, 2), end: addr(3, 4) });
  });

  it("finds merge for a cell within the region", () => {
    const m = normalizeMergeRange({ start: addr(1, 1), end: addr(2, 2) });
    expect(findMergeForCell([m], addr(2, 1))?.key).toBe(m.key);
    expect(findMergeForCell([m], addr(3, 3))).toBeUndefined();
  });
});
