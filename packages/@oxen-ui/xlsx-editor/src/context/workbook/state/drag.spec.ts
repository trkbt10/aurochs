/**
 * @file Drag state tests
 */

import { colIdx, rowIdx } from "@oxen/xlsx/domain/types";
import type { CellAddress, CellRange } from "@oxen/xlsx/domain/cell/address";
import {
  calculateColumnResizeWidth,
  calculateRowResizeHeight,
  endDrag,
  getRangeSelectRange,
  isDragColumnResize,
  isDragFill,
  isDragIdle,
  isDragRangeSelect,
  isDragRowResize,
  isDragging,
  startColumnResizeDrag,
  startFillDrag,
  startRangeSelectDrag,
  startRowResizeDrag,
  updateFillDrag,
  updateRangeSelectDrag,
} from "./drag";

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

describe("startRangeSelectDrag", () => {
  it("creates range select drag state", () => {
    const start = addr(1, 1);
    const drag = startRangeSelectDrag(start);
    expect(drag).toEqual({ type: "rangeSelect", startCell: start, currentCell: start });
    expect(isDragRangeSelect(drag)).toBe(true);
    expect(isDragging(drag)).toBe(true);
  });
});

describe("updateRangeSelectDrag", () => {
  it("updates current cell", () => {
    const start = startRangeSelectDrag(addr(1, 1));
    const updated = updateRangeSelectDrag(start, addr(3, 4));

    expect(updated).not.toBe(start);
    expect(isDragRangeSelect(updated)).toBe(true);
    expect(updated).toEqual({
      type: "rangeSelect",
      startCell: addr(1, 1),
      currentCell: addr(3, 4),
    });

    expect(start).toEqual({
      type: "rangeSelect",
      startCell: addr(1, 1),
      currentCell: addr(1, 1),
    });
  });

  it("does not change non-rangeSelect drag", () => {
    const idle = endDrag();
    const updated = updateRangeSelectDrag(idle, addr(2, 2));
    expect(updated).toBe(idle);
    expect(isDragIdle(updated)).toBe(true);
  });
});

describe("getRangeSelectRange", () => {
  it("returns undefined for non-rangeSelect drag", () => {
    expect(getRangeSelectRange(endDrag())).toBeUndefined();
  });

  it("returns range from startCell to currentCell", () => {
    const drag = updateRangeSelectDrag(startRangeSelectDrag(addr(2, 2)), addr(4, 5));
    expect(getRangeSelectRange(drag)).toEqual({
      start: addr(2, 2),
      end: addr(4, 5),
    });
  });
});

describe("startFillDrag / updateFillDrag", () => {
  it("creates fill drag with sourceRange as initial targetRange", () => {
    const source = range(1, 1, 2, 2);
    const drag = startFillDrag(source);
    expect(drag).toEqual({ type: "fill", sourceRange: source, targetRange: source });
    expect(isDragFill(drag)).toBe(true);
  });

  it("updates targetRange and preserves immutability", () => {
    const source = range(1, 1, 2, 2);
    const original = startFillDrag(source);
    const target = range(3, 3, 4, 4);

    const updated = updateFillDrag(original, target);
    expect(updated).not.toBe(original);
    expect(updated).toEqual({ type: "fill", sourceRange: source, targetRange: target });
    expect(original).toEqual({ type: "fill", sourceRange: source, targetRange: source });
  });

  it("does not change non-fill drag", () => {
    const idle = endDrag();
    const updated = updateFillDrag(idle, range(1, 1, 1, 1));
    expect(updated).toBe(idle);
  });
});

describe("startRowResizeDrag / calculateRowResizeHeight", () => {
  it("creates row resize drag state", () => {
    const drag = startRowResizeDrag(rowIdx(3), 100, 20);
    expect(drag).toEqual({ type: "rowResize", rowIndex: rowIdx(3), startY: 100, originalHeight: 20 });
    expect(isDragRowResize(drag)).toBe(true);
  });

  it("calculates height from delta and respects minHeight", () => {
    const drag = startRowResizeDrag(rowIdx(3), 100, 20);
    expect(calculateRowResizeHeight(drag, 130)).toBe(50);
    expect(calculateRowResizeHeight(drag, 50, 10)).toBe(10);
  });

  it("returns 0 for non-rowResize drag", () => {
    expect(calculateRowResizeHeight(endDrag(), 123)).toBe(0);
  });
});

describe("startColumnResizeDrag / calculateColumnResizeWidth", () => {
  it("creates column resize drag state", () => {
    const drag = startColumnResizeDrag(colIdx(2), 10, 40);
    expect(drag).toEqual({ type: "columnResize", colIndex: colIdx(2), startX: 10, originalWidth: 40 });
    expect(isDragColumnResize(drag)).toBe(true);
  });

  it("calculates width from delta and respects minWidth", () => {
    const drag = startColumnResizeDrag(colIdx(2), 10, 40);
    expect(calculateColumnResizeWidth(drag, 25)).toBe(55);
    expect(calculateColumnResizeWidth(drag, -100, 5)).toBe(5);
  });

  it("returns 0 for non-columnResize drag", () => {
    expect(calculateColumnResizeWidth(endDrag(), 123)).toBe(0);
  });
});

describe("endDrag / isDragging", () => {
  it("returns false for idle", () => {
    const idle = endDrag();
    expect(idle).toEqual({ type: "idle" });
    expect(isDragIdle(idle)).toBe(true);
    expect(isDragging(idle)).toBe(false);
  });

  it("returns true for active drag", () => {
    expect(isDragging(startRangeSelectDrag(addr(1, 1)))).toBe(true);
  });
});

