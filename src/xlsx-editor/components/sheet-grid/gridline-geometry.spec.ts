/**
 * @file Unit tests for gridline geometry calculations (visible segments).
 */

import type { XlsxWorksheet } from "../../../xlsx/domain/workbook";
import { createSheetLayout } from "../../selectors/sheet-layout";
import { getVisibleGridLineSegments } from "./gridline-geometry";
import { colIdx, rowIdx } from "../../../xlsx/domain/types";
import type { CellAddress } from "../../../xlsx/domain/cell/address";
import { normalizeMergeRange } from "../../sheet/merge-range";

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

describe("xlsx-editor/components/sheet-grid/gridline-geometry", () => {
  it("returns visible boundary lines in the viewport", () => {
    const layout = createSheetLayout(sheet(), { rowCount: 10, colCount: 10, defaultRowHeightPx: 20, defaultColWidthPx: 50 });
    const lines = getVisibleGridLineSegments({
      rowRange: { start: 0, end: 0 },
      colRange: { start: 0, end: 1 },
      layout,
      scrollTop: 0,
      scrollLeft: 0,
      viewportWidth: 200,
      viewportHeight: 100,
      normalizedMerges: [],
      rowCount: 10,
      colCount: 10,
    });

    expect(lines.vertical.map((l) => l.x1)).toEqual([0, 50, 100]);
    expect(lines.horizontal.map((l) => l.y1)).toEqual([0, 20]);
  });

  it("suppresses gridlines inside merged regions", () => {
    const layout = createSheetLayout(sheet(), { rowCount: 10, colCount: 10, defaultRowHeightPx: 20, defaultColWidthPx: 50 });

    const addr = (col: number, row: number): CellAddress => ({
      col: colIdx(col),
      row: rowIdx(row),
      colAbsolute: false,
      rowAbsolute: false,
    });
    const merge = normalizeMergeRange({ start: addr(1, 1), end: addr(2, 2) });

    const lines = getVisibleGridLineSegments({
      rowRange: { start: 0, end: 1 },
      colRange: { start: 0, end: 1 },
      layout,
      scrollTop: 0,
      scrollLeft: 0,
      viewportWidth: 200,
      viewportHeight: 100,
      normalizedMerges: [merge],
      rowCount: 10,
      colCount: 10,
    });

    // Internal boundaries at x=50 (between A and B) and y=20 (between row1 and row2) should not exist inside the merge.
    expect(lines.vertical.some((l) => l.x1 === 50 && l.y1 === 0 && l.y2 === 40)).toBe(false);
    expect(lines.horizontal.some((l) => l.y1 === 20 && l.x1 === 0 && l.x2 === 100)).toBe(false);
  });
});
