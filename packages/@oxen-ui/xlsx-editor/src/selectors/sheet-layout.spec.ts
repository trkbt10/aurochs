/**
 * @file Unit tests for sheet layout calculations (row/column metrics).
 */

import { colIdx, rowIdx } from "@oxen/xlsx/domain/types";
import type { XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import {
  columnWidthCharToPixels,
  createSheetLayout,
  pixelsToColumnWidthChar,
  pixelsToPoints,
  pointsToPixels,
} from "./sheet-layout";

describe("xlsx-editor/selectors/sheet-layout", () => {
  it("converts points <-> pixels (96 DPI)", () => {
    expect(pointsToPixels(72)).toBe(96);
    expect(pixelsToPoints(96)).toBe(72);
  });

  it("converts column width chars <-> pixels approximately", () => {
    const chars = 8.43;
    const px = columnWidthCharToPixels(chars);
    const back = pixelsToColumnWidthChar(px);
    expect(back).toBeGreaterThan(7.5);
    expect(back).toBeLessThan(9.5);
  });

  it("creates layout arrays with row/col overrides", () => {
    const sheet: XlsxWorksheet = {
      dateSystem: "1900",
      name: "Sheet1",
      sheetId: 1,
      state: "visible",
      xmlPath: "xl/worksheets/sheet1.xml",
      columns: [
        { min: colIdx(2), max: colIdx(2), width: 10 },
        { min: colIdx(3), max: colIdx(3), hidden: true },
      ],
      rows: [
        { rowNumber: rowIdx(1), cells: [], height: 15, customHeight: true },
        { rowNumber: rowIdx(2), cells: [], hidden: true },
      ],
    };

    const layout = createSheetLayout(sheet, {
      rowCount: 3,
      colCount: 4,
      defaultRowHeightPx: 20,
      defaultColWidthPx: 100,
    });

    expect(layout.rows.getSizePx(0)).toBe(pointsToPixels(15));
    expect(layout.rows.getSizePx(1)).toBe(0);
    expect(layout.rows.getSizePx(2)).toBe(20);

    expect(layout.cols.getSizePx(0)).toBe(100);
    expect(layout.cols.getSizePx(1)).toBe(columnWidthCharToPixels(10));
    expect(layout.cols.getSizePx(2)).toBe(0);
    expect(layout.cols.getSizePx(3)).toBe(100);

    expect(layout.rows.getBoundaryOffsetPx(0)).toBe(0);
    expect(layout.rows.getBoundaryOffsetPx(3)).toBe(layout.totalRowsHeightPx);
    expect(layout.cols.getBoundaryOffsetPx(0)).toBe(0);
    expect(layout.cols.getBoundaryOffsetPx(4)).toBe(layout.totalColsWidthPx);
  });
});
