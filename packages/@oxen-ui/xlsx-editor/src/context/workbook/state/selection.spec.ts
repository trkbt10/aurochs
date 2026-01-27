/**
 * @file Selection state tests
 */

import { colIdx, rowIdx } from "@oxen/xlsx/domain/types";
import type { CellAddress, CellRange } from "@oxen/xlsx/domain/cell/address";
import type { CellSelectionState } from "../editor/types";
import {
  addRangeToSelection,
  clearSelection,
  createRangeSelection,
  createSingleCellSelection,
  extendSelection,
  getAllSelectedRanges,
  isCellSelected,
  isSelectionEmpty,
  isSingleCellSelection,
} from "./selection";

function addr(col: number, row: number): CellAddress {
  return {
    col: colIdx(col),
    row: rowIdx(row),
    colAbsolute: false,
    rowAbsolute: false,
  };
}

function range(startCol: number, startRow: number, endCol: number, endRow: number): CellRange {
  return { start: addr(startCol, startRow), end: addr(endCol, endRow) };
}

describe("createSingleCellSelection", () => {
  it("creates selection for single cell", () => {
    const a1 = addr(1, 1);
    const selection = createSingleCellSelection(a1);

    expect(selection).toEqual({
      selectedRange: { start: a1, end: a1 },
      activeCell: a1,
      multiRanges: undefined,
    });
  });
});

describe("createRangeSelection", () => {
  it("creates selection for range with default active cell", () => {
    const r = range(1, 1, 2, 3);
    const selection = createRangeSelection(r);
    expect(selection).toEqual({
      selectedRange: r,
      activeCell: r.start,
      multiRanges: undefined,
    });
  });

  it("uses provided active cell", () => {
    const r = range(1, 1, 2, 3);
    const active = addr(2, 2);
    const selection = createRangeSelection(r, active);
    expect(selection).toEqual({
      selectedRange: r,
      activeCell: active,
      multiRanges: undefined,
    });
  });
});

describe("extendSelection", () => {
  it("extends selection from active cell", () => {
    const original = createSingleCellSelection(addr(1, 1));
    const extended = extendSelection(original, addr(3, 4));

    expect(extended).not.toBe(original);
    expect(extended.selectedRange).toEqual({
      start: original.activeCell,
      end: addr(3, 4),
    });
    expect(extended.activeCell).toEqual(addr(1, 1));
    expect(extended.multiRanges).toBeUndefined();

    expect(original).toEqual(createSingleCellSelection(addr(1, 1)));
  });

  it("preserves multiRanges without mutation", () => {
    const extra = range(5, 5, 6, 6);
    const original: CellSelectionState = {
      selectedRange: range(1, 1, 1, 1),
      activeCell: addr(2, 2),
      multiRanges: [extra] as const,
    };
    const extended = extendSelection(original, addr(3, 3));

    expect(extended).not.toBe(original);
    expect(extended.multiRanges).toBe(original.multiRanges);
    expect(original.selectedRange).toEqual(range(1, 1, 1, 1));
  });

  it("creates new selection if no active cell", () => {
    const original: CellSelectionState = {
      selectedRange: range(1, 1, 3, 3),
      activeCell: undefined,
      multiRanges: undefined,
    };
    const extended = extendSelection(original, addr(9, 9));

    expect(extended).toEqual(createSingleCellSelection(addr(9, 9)));
    expect(original).toEqual({
      selectedRange: range(1, 1, 3, 3),
      activeCell: undefined,
      multiRanges: undefined,
    });
  });
});

describe("addRangeToSelection", () => {
  it("creates new selection and stores previous range in multiRanges", () => {
    const original = createRangeSelection(range(1, 1, 2, 2));
    const added = addRangeToSelection(original, range(3, 3, 4, 4));

    expect(added).not.toBe(original);
    expect(added.selectedRange).toEqual(range(3, 3, 4, 4));
    expect(added.activeCell).toEqual(addr(3, 3));
    expect(added.multiRanges).toEqual([range(1, 1, 2, 2)]);
    expect(original.multiRanges).toBeUndefined();
  });

  it("does not create multiRanges when starting from empty selection", () => {
    const original = clearSelection();
    const added = addRangeToSelection(original, range(1, 1, 1, 1));

    expect(added.selectedRange).toEqual(range(1, 1, 1, 1));
    expect(added.activeCell).toEqual(addr(1, 1));
    expect(added.multiRanges).toBeUndefined();
    expect(original).toEqual(clearSelection());
  });
});

describe("getAllSelectedRanges", () => {
  it("returns empty list if no selected range", () => {
    expect(getAllSelectedRanges(clearSelection())).toEqual([]);
  });

  it("returns selectedRange when multiRanges is missing", () => {
    const selection = createRangeSelection(range(1, 1, 2, 2));
    expect(getAllSelectedRanges(selection)).toEqual([range(1, 1, 2, 2)]);
  });

  it("returns multiRanges and selectedRange (in order)", () => {
    const r1 = range(1, 1, 1, 1);
    const r2 = range(2, 2, 2, 2);
    const selection: CellSelectionState = {
      selectedRange: r2,
      activeCell: r2.start,
      multiRanges: [r1] as const,
    };
    const all = getAllSelectedRanges(selection);
    expect(all).toEqual([r1, r2]);
    expect(all).not.toBe(selection.multiRanges);
  });
});

describe("isCellSelected", () => {
  it("returns true for cell in range", () => {
    const selection = createRangeSelection(range(2, 2, 4, 4));
    expect(isCellSelected(selection, addr(3, 3))).toBe(true);
  });

  it("returns true even when range is reversed (normalizes bounds)", () => {
    const selection = createRangeSelection(range(4, 4, 2, 2));
    expect(isCellSelected(selection, addr(3, 3))).toBe(true);
  });

  it("returns false for cell outside range", () => {
    const selection = createRangeSelection(range(2, 2, 4, 4));
    expect(isCellSelected(selection, addr(1, 1))).toBe(false);
  });

  it("returns false when selection is empty", () => {
    expect(isCellSelected(clearSelection(), addr(1, 1))).toBe(false);
  });
});

describe("isSelectionEmpty", () => {
  it("returns true only when selectedRange and activeCell are undefined", () => {
    expect(isSelectionEmpty(clearSelection())).toBe(true);
    expect(isSelectionEmpty(createSingleCellSelection(addr(1, 1)))).toBe(false);
    expect(isSelectionEmpty({ selectedRange: undefined, activeCell: addr(1, 1), multiRanges: undefined })).toBe(
      false,
    );
  });
});

describe("isSingleCellSelection", () => {
  it("returns true for single cell selection", () => {
    expect(isSingleCellSelection(createSingleCellSelection(addr(1, 1)))).toBe(true);
  });

  it("returns false for range selection", () => {
    expect(isSingleCellSelection(createRangeSelection(range(1, 1, 2, 2)))).toBe(false);
  });

  it("returns false when multiRanges exist", () => {
    const selection = addRangeToSelection(createSingleCellSelection(addr(1, 1)), range(2, 2, 2, 2));
    expect(isSingleCellSelection(selection)).toBe(false);
  });
});

describe("clearSelection", () => {
  it("returns an empty selection", () => {
    expect(clearSelection()).toEqual({
      selectedRange: undefined,
      activeCell: undefined,
      multiRanges: undefined,
    });
  });
});

