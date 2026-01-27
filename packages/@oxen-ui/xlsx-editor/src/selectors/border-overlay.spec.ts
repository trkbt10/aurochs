/**
 * @file Tests for border overlay builder
 */

import type { XlsxStyleSheet } from "@oxen/xlsx/domain/style/types";
import type { XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import { createDefaultStyleSheet } from "@oxen/xlsx/domain/style/types";
import { borderId, colIdx, fillId, fontId, numFmtId, rowIdx, styleId } from "@oxen/xlsx/domain/types";
import type { CellAddress } from "@oxen/xlsx/domain/cell/address";
import { createSheetLayout } from "./sheet-layout";
import { buildBorderOverlayLines } from "./border-overlay";

function createAddress(col: number, row: number): CellAddress {
  return { col: colIdx(col), row: rowIdx(row), colAbsolute: false, rowAbsolute: false };
}

function createDemoStyles(): XlsxStyleSheet {
  const styles = createDefaultStyleSheet();
  const borderIndex = styles.borders.length;

  return {
    ...styles,
    borders: [
      ...styles.borders,
      {
        left: { style: "thin", color: { type: "rgb", value: "FF000000" } },
        right: { style: "thin", color: { type: "rgb", value: "FF000000" } },
        top: { style: "thin", color: { type: "rgb", value: "FF000000" } },
        bottom: { style: "thin", color: { type: "rgb", value: "FF000000" } },
      },
    ],
    cellXfs: [
      ...styles.cellXfs,
      { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(0), borderId: borderId(borderIndex), applyBorder: true },
    ],
  };
}

function createSheet(styles: XlsxStyleSheet): XlsxWorksheet {
  void styles;
  return {
    dateSystem: "1900",
    name: "Sheet1",
    sheetId: 1,
    state: "visible",
    rows: [
      {
        rowNumber: rowIdx(1),
        cells: [
          { address: createAddress(1, 1), value: { type: "empty" }, styleId: styleId(1) },
          { address: createAddress(2, 1), value: { type: "empty" }, styleId: styleId(1) },
        ],
      },
    ],
    xmlPath: "xl/worksheets/sheet1.xml",
  };
}

describe("buildBorderOverlayLines", () => {
  it("merges contiguous borders into fewer segments", () => {
    const styles = createDemoStyles();
    const sheet = createSheet(styles);
    const layout = createSheetLayout(sheet, {
      rowCount: 10,
      colCount: 10,
      defaultRowHeightPx: 20,
      defaultColWidthPx: 50,
    });

    const lines = buildBorderOverlayLines({
      sheet,
      styles,
      layout,
      rowRange: { start: 0, end: 0 },
      colRange: { start: 0, end: 1 },
      rowCount: 10,
      colCount: 10,
      scrollTop: 0,
      scrollLeft: 0,
      defaultBorderColor: "black",
    });

    // Two adjacent cells with the same "all edges" border:
    // - 3 vertical boundaries (left edge, inner edge, right edge)
    // - 2 horizontal boundaries (top edge merged across both cells, bottom edge merged across both cells)
    expect(lines).toHaveLength(5);

    expect(lines.some((line) => line.y1 === 0 && line.y2 === 0 && line.x1 === 0 && line.x2 === 100)).toBe(true);
    expect(lines.some((line) => line.y1 === 20 && line.y2 === 20 && line.x1 === 0 && line.x2 === 100)).toBe(true);
  });

  it("suppresses internal borders inside merged cells and uses the merge origin style for the whole region", () => {
    const styles = createDemoStyles();
    const sheet: XlsxWorksheet = {
      dateSystem: "1900",
      name: "Sheet1",
      sheetId: 1,
      state: "visible",
      rows: [
        {
          rowNumber: rowIdx(1),
          cells: [{ address: createAddress(1, 1), value: { type: "empty" }, styleId: styleId(1) }],
        },
      ],
      mergeCells: [{ start: createAddress(1, 1), end: createAddress(2, 2) }],
      xmlPath: "xl/worksheets/sheet1.xml",
    };

    const layout = createSheetLayout(sheet, {
      rowCount: 10,
      colCount: 10,
      defaultRowHeightPx: 20,
      defaultColWidthPx: 50,
    });

    const lines = buildBorderOverlayLines({
      sheet,
      styles,
      layout,
      rowRange: { start: 0, end: 1 },
      colRange: { start: 0, end: 1 },
      rowCount: 10,
      colCount: 10,
      scrollTop: 0,
      scrollLeft: 0,
      defaultBorderColor: "black",
    });

    // A1:B2 merged with the origin cell (A1) having "all edges" borders:
    // - no internal boundaries at x=50 or y=20
    // - 4 outer edges around the merged region
    expect(lines).toHaveLength(4);

    expect(lines.some((line) => line.x1 === 0 && line.x2 === 0 && line.y1 === 0 && line.y2 === 40)).toBe(true);
    expect(lines.some((line) => line.x1 === 100 && line.x2 === 100 && line.y1 === 0 && line.y2 === 40)).toBe(true);
    expect(lines.some((line) => line.y1 === 0 && line.y2 === 0 && line.x1 === 0 && line.x2 === 100)).toBe(true);
    expect(lines.some((line) => line.y1 === 40 && line.y2 === 40 && line.x1 === 0 && line.x2 === 100)).toBe(true);
  });
});
