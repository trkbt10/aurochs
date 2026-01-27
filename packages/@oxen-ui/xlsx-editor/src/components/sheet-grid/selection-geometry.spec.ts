/**
 * @file Unit tests for selection rectangle geometry helpers.
 */

import { colIdx, rowIdx } from "@oxen/xlsx/domain/types";
import type { XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import { createSheetLayout } from "../../selectors/sheet-layout";
import { clipRectToViewport, getActiveCellRect, getRangeBounds, getSelectedRangeRect } from "./selection-geometry";

function sheet(): XlsxWorksheet {
  return {
    dateSystem: "1900",
    name: "Sheet1",
    sheetId: 1,
    state: "visible",
    rows: [],
    xmlPath: "xl/worksheets/sheet1.xml",
  };
}

function addr(col: number, row: number) {
  return { col: colIdx(col), row: rowIdx(row), colAbsolute: false, rowAbsolute: false } as const;
}

describe("xlsx-editor/components/sheet-grid/selection-geometry", () => {
  it("computes range bounds", () => {
    expect(getRangeBounds({ start: addr(3, 4), end: addr(1, 2) })).toEqual({
      minRow: 2,
      maxRow: 4,
      minCol: 1,
      maxCol: 3,
    });
  });

  it("computes active cell rect", () => {
    const layout = createSheetLayout(sheet(), { rowCount: 10, colCount: 10, defaultRowHeightPx: 20, defaultColWidthPx: 50 });
    expect(getActiveCellRect(addr(1, 1), layout, 0, 0)).toEqual({ left: 0, top: 0, width: 50, height: 20 });
  });

  it("computes selected range rect", () => {
    const layout = createSheetLayout(sheet(), { rowCount: 10, colCount: 10, defaultRowHeightPx: 20, defaultColWidthPx: 50 });
    expect(getSelectedRangeRect({ start: addr(1, 1), end: addr(2, 2) }, layout, 0, 0)).toEqual({
      left: 0,
      top: 0,
      width: 100,
      height: 40,
    });
  });

  it("clips rectangles to viewport", () => {
    expect(clipRectToViewport({ left: -10, top: 5, width: 30, height: 20 }, 100, 10)).toEqual({
      left: 0,
      top: 5,
      width: 20,
      height: 5,
    });
  });
});
