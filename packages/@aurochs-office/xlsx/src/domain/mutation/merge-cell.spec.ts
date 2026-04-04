import { describe, it, expect } from "vitest";
import { addMergeCells, removeMergeCells, setMergeCells } from "./merge-cell";
import type { XlsxWorksheet } from "../workbook";
import type { CellRange } from "../cell/address";
import { colIdx, rowIdx, sheetId } from "../types";

function makeRange(startCol: number, startRow: number, endCol: number, endRow: number): CellRange {
  return {
    start: { col: colIdx(startCol), row: rowIdx(startRow), colAbsolute: false, rowAbsolute: false },
    end: { col: colIdx(endCol), row: rowIdx(endRow), colAbsolute: false, rowAbsolute: false },
  };
}

function emptyWorksheet(mergeCells?: readonly CellRange[]): XlsxWorksheet {
  return {
    name: "Sheet1",
    sheetId: sheetId(1),
    state: "visible",
    rows: [],
    xmlPath: "xl/worksheets/sheet1.xml",
    dateSystem: "1900",
    ...(mergeCells ? { mergeCells } : {}),
  };
}

// =============================================================================
// addMergeCells
// =============================================================================

describe("addMergeCells", () => {
  it("should add merge ranges to a worksheet without existing merges", () => {
    const ws = emptyWorksheet();
    const range = makeRange(1, 1, 2, 2); // A1:B2
    const result = addMergeCells(ws, [range]);

    expect(result.mergeCells).toEqual([range]);
  });

  it("should append to existing merge ranges", () => {
    const existing = makeRange(1, 1, 2, 2); // A1:B2
    const ws = emptyWorksheet([existing]);
    const newRange = makeRange(4, 4, 5, 5); // D4:E5
    const result = addMergeCells(ws, [newRange]);

    expect(result.mergeCells).toHaveLength(2);
    expect(result.mergeCells![0]).toEqual(existing);
    expect(result.mergeCells![1]).toEqual(newRange);
  });

  it("should skip identical existing ranges silently", () => {
    const existing = makeRange(1, 1, 2, 2);
    const ws = emptyWorksheet([existing]);
    const result = addMergeCells(ws, [existing]);

    expect(result.mergeCells).toEqual([existing]);
  });

  it("should throw on overlapping ranges with existing", () => {
    const existing = makeRange(1, 1, 3, 3); // A1:C3
    const ws = emptyWorksheet([existing]);
    const overlapping = makeRange(2, 2, 4, 4); // B2:D4

    expect(() => addMergeCells(ws, [overlapping])).toThrow(/overlaps/);
  });

  it("should throw on overlapping ranges within the same add call", () => {
    const ws = emptyWorksheet();
    const range1 = makeRange(1, 1, 3, 3);
    const range2 = makeRange(2, 2, 4, 4);

    expect(() => addMergeCells(ws, [range1, range2])).toThrow(/overlaps/);
  });

  it("should handle multiple non-overlapping adds", () => {
    const ws = emptyWorksheet();
    const ranges = [
      makeRange(1, 1, 2, 2),   // A1:B2
      makeRange(4, 1, 5, 2),   // D1:E2
      makeRange(1, 4, 2, 5),   // A4:B5
    ];
    const result = addMergeCells(ws, ranges);

    expect(result.mergeCells).toHaveLength(3);
  });

  it("should return same worksheet when adding empty array", () => {
    const ws = emptyWorksheet();
    const result = addMergeCells(ws, []);

    expect(result).toBe(ws);
  });

  it("should reject single-cell merge range", () => {
    const ws = emptyWorksheet();
    const singleCell = makeRange(1, 1, 1, 1); // A1:A1

    expect(() => addMergeCells(ws, [singleCell])).toThrow(/single cell/);
  });

  it("should allow adjacent (non-overlapping) merge ranges", () => {
    const ws = emptyWorksheet();
    const range1 = makeRange(1, 1, 2, 2); // A1:B2
    const range2 = makeRange(3, 1, 4, 2); // C1:D2 (adjacent horizontally)
    const result = addMergeCells(ws, [range1, range2]);

    expect(result.mergeCells).toHaveLength(2);
  });

  it("should allow vertically adjacent merge ranges", () => {
    const ws = emptyWorksheet();
    const range1 = makeRange(1, 1, 2, 2); // A1:B2
    const range2 = makeRange(1, 3, 2, 4); // A3:B4 (adjacent vertically)
    const result = addMergeCells(ws, [range1, range2]);

    expect(result.mergeCells).toHaveLength(2);
  });
});

// =============================================================================
// removeMergeCells
// =============================================================================

describe("removeMergeCells", () => {
  it("should remove an existing merge range", () => {
    const range1 = makeRange(1, 1, 2, 2);
    const range2 = makeRange(4, 4, 5, 5);
    const ws = emptyWorksheet([range1, range2]);
    const result = removeMergeCells(ws, [range1]);

    expect(result.mergeCells).toEqual([range2]);
  });

  it("should set mergeCells to undefined when all removed", () => {
    const range = makeRange(1, 1, 2, 2);
    const ws = emptyWorksheet([range]);
    const result = removeMergeCells(ws, [range]);

    expect(result.mergeCells).toBeUndefined();
  });

  it("should silently ignore non-matching ranges", () => {
    const existing = makeRange(1, 1, 2, 2);
    const ws = emptyWorksheet([existing]);
    const nonExisting = makeRange(10, 10, 11, 11);
    const result = removeMergeCells(ws, [nonExisting]);

    expect(result.mergeCells).toEqual([existing]);
  });

  it("should return same worksheet when no mergeCells exist", () => {
    const ws = emptyWorksheet();
    const result = removeMergeCells(ws, [makeRange(1, 1, 2, 2)]);

    expect(result).toBe(ws);
  });
});

// =============================================================================
// setMergeCells
// =============================================================================

describe("setMergeCells", () => {
  it("should replace all merge ranges", () => {
    const existing = makeRange(1, 1, 2, 2);
    const ws = emptyWorksheet([existing]);
    const newRange = makeRange(5, 5, 6, 6);
    const result = setMergeCells(ws, [newRange]);

    expect(result.mergeCells).toEqual([newRange]);
  });

  it("should clear merge cells when given empty array", () => {
    const existing = makeRange(1, 1, 2, 2);
    const ws = emptyWorksheet([existing]);
    const result = setMergeCells(ws, []);

    expect(result.mergeCells).toBeUndefined();
  });

  it("should reject single-cell merge range", () => {
    const ws = emptyWorksheet();
    const singleCell = makeRange(3, 3, 3, 3);

    expect(() => setMergeCells(ws, [singleCell])).toThrow(/single cell/);
  });

  it("should reject overlapping ranges", () => {
    const ws = emptyWorksheet();
    const range1 = makeRange(1, 1, 3, 3);
    const range2 = makeRange(2, 2, 4, 4);

    expect(() => setMergeCells(ws, [range1, range2])).toThrow(/overlaps/);
  });
});
