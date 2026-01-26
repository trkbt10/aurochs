/**
 * @file Tests for SpreadsheetML cell render style resolver
 */

import type { XlsxStyleSheet } from "../../xlsx/domain/style/types";
import type { XlsxWorksheet } from "../../xlsx/domain/workbook";
import { createDefaultStyleSheet } from "../../xlsx/domain/style/types";
import { borderId, colIdx, fillId, fontId, numFmtId, rowIdx, styleId } from "../../xlsx/domain/types";
import type { CellAddress } from "../../xlsx/domain/cell/address";
import { resolveCellBorderDecoration, resolveCellRenderStyle } from "./cell-render-style";

function createAddress(col: number, row: number): CellAddress {
  return { col: colIdx(col), row: rowIdx(row), colAbsolute: false, rowAbsolute: false };
}

function createDemoStyles(): XlsxStyleSheet {
  const styles = createDefaultStyleSheet();

  const fontIndex = styles.fonts.length;
  const fillIndex = styles.fills.length;
  const borderIndex = styles.borders.length;

  return {
    ...styles,
    fonts: [
      ...styles.fonts,
      { name: "Calibri", size: 11, scheme: "minor", bold: true, color: { type: "rgb", value: "FFFF0000" } },
    ],
    fills: [
      ...styles.fills,
      { type: "pattern", pattern: { patternType: "solid", fgColor: { type: "rgb", value: "FFFFFF00" } } },
    ],
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
      { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(fillIndex), borderId: borderId(0), applyFill: true },
      { numFmtId: numFmtId(0), fontId: fontId(fontIndex), fillId: fillId(0), borderId: borderId(0), applyFont: true },
      { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(0), borderId: borderId(borderIndex), applyBorder: true },
      {
        numFmtId: numFmtId(0),
        fontId: fontId(0),
        fillId: fillId(0),
        borderId: borderId(0),
        alignment: { wrapText: true, horizontal: "left", vertical: "top" },
        applyAlignment: true,
      },
      {
        numFmtId: numFmtId(0),
        fontId: fontId(0),
        fillId: fillId(0),
        borderId: borderId(0),
        alignment: { horizontal: "general" },
        applyAlignment: true,
      },
      {
        numFmtId: numFmtId(0),
        fontId: fontId(0),
        fillId: fillId(0),
        borderId: borderId(0),
        alignment: { shrinkToFit: true, textRotation: 0 },
        applyAlignment: true,
      },
      {
        numFmtId: numFmtId(0),
        fontId: fontId(0),
        fillId: fillId(0),
        borderId: borderId(0),
        alignment: { textRotation: 90 },
        applyAlignment: true,
      },
      {
        numFmtId: numFmtId(0),
        fontId: fontId(0),
        fillId: fillId(0),
        borderId: borderId(0),
        alignment: { textRotation: 31 },
        applyAlignment: true,
      },
      {
        numFmtId: numFmtId(0),
        fontId: fontId(0),
        fillId: fillId(0),
        borderId: borderId(0),
        alignment: { textRotation: 255 },
        applyAlignment: true,
      },
      {
        numFmtId: numFmtId(0),
        fontId: fontId(0),
        fillId: fillId(0),
        borderId: borderId(0),
        alignment: { horizontal: "left", indent: 2 },
        applyAlignment: true,
      },
      {
        numFmtId: numFmtId(0),
        fontId: fontId(0),
        fillId: fillId(0),
        borderId: borderId(0),
        alignment: { readingOrder: 2 },
        applyAlignment: true,
      },
    ],
  };
}

function createSheet(): XlsxWorksheet {
  return {
    dateSystem: "1900",
    name: "Sheet1",
    sheetId: 1,
    state: "visible",
    rows: [],
    xmlPath: "xl/worksheets/sheet1.xml",
  };
}

describe("resolveCellRenderStyle", () => {
  it("applies fill/font/alignment from cell styleId", () => {
    const styles = createDemoStyles();
    const sheet = createSheet();
    const address = createAddress(1, 1);

    const fillStyle = resolveCellRenderStyle({
      styles,
      sheet,
      address,
      cell: { address, value: { type: "empty" }, styleId: styleId(1) },
    });
    expect(fillStyle.backgroundColor).toBe("#FFFF00");

    const fontStyle = resolveCellRenderStyle({
      styles,
      sheet,
      address,
      cell: { address, value: { type: "empty" }, styleId: styleId(2) },
    });
    expect(fontStyle.fontWeight).toBe(700);
    expect(fontStyle.color).toBe("#FF0000");

    const alignmentStyle = resolveCellRenderStyle({
      styles,
      sheet,
      address,
      cell: { address, value: { type: "empty" }, styleId: styleId(4) },
    });
    expect(alignmentStyle.whiteSpace).toBe("normal");
    expect(alignmentStyle.alignItems).toBe("flex-start");
    expect(alignmentStyle.justifyContent).toBeUndefined();
  });

  it("aligns numeric cells to the right when horizontal is general", () => {
    const styles = createDemoStyles();
    const sheet = createSheet();
    const address = createAddress(1, 1);

    const numberCell = resolveCellRenderStyle({
      styles,
      sheet,
      address,
      cell: { address, value: { type: "number", value: 123 }, styleId: styleId(5) },
    });
    expect(numberCell.justifyContent).toBe("flex-end");

    const stringCell = resolveCellRenderStyle({
      styles,
      sheet,
      address,
      cell: { address, value: { type: "string", value: "abc" }, styleId: styleId(5) },
    });
    expect(stringCell.justifyContent).toBeUndefined();
  });

  it("uses row styleId when the cell has no styleId", () => {
    const styles = createDemoStyles();
    const address = createAddress(1, 1);
    const sheet: XlsxWorksheet = {
      dateSystem: "1900",
      name: "Sheet1",
      sheetId: 1,
      state: "visible",
      rows: [{ rowNumber: rowIdx(1), styleId: styleId(1), cells: [] }],
      xmlPath: "xl/worksheets/sheet1.xml",
    };

    const style = resolveCellRenderStyle({ styles, sheet, address, cell: { address, value: { type: "empty" } } });
    expect(style.backgroundColor).toBe("#FFFF00");
  });

  it("uses column styleId when the cell/row has no styleId", () => {
    const styles = createDemoStyles();
    const address = createAddress(2, 3);
    const sheet: XlsxWorksheet = {
      dateSystem: "1900",
      name: "Sheet1",
      sheetId: 1,
      state: "visible",
      columns: [{ min: colIdx(2), max: colIdx(2), styleId: styleId(1) }],
      rows: [],
      xmlPath: "xl/worksheets/sheet1.xml",
    };

    const style = resolveCellRenderStyle({ styles, sheet, address, cell: { address, value: { type: "empty" } } });
    expect(style.backgroundColor).toBe("#FFFF00");
  });

  it("applies shrinkToFit and textRotation into CSS", () => {
    const styles = createDemoStyles();
    const sheet = createSheet();
    const address = createAddress(1, 1);

    const shrinkStyle = resolveCellRenderStyle({
      styles,
      sheet,
      address,
      cell: { address, value: { type: "empty" }, styleId: styleId(6) },
    });
    expect(shrinkStyle.whiteSpace).toBeUndefined();
    expect(shrinkStyle.overflow).toBeUndefined();

    const rotateStyle = resolveCellRenderStyle({
      styles,
      sheet,
      address,
      cell: { address, value: { type: "empty" }, styleId: styleId(7) },
    });
    expect(rotateStyle.transform).toBe("rotate(-90deg)");
    expect(rotateStyle.transformOrigin).toBe("center");
  });

  it("supports additional textRotation variants (31 and 255)", () => {
    const styles = createDemoStyles();
    const sheet = createSheet();
    const address = createAddress(1, 1);

    const rotate31 = resolveCellRenderStyle({
      styles,
      sheet,
      address,
      cell: { address, value: { type: "empty" }, styleId: styleId(8) },
    });
    expect(rotate31.transform).toBe("rotate(-31deg)");
    expect(rotate31.transformOrigin).toBe("center");

    const verticalText = resolveCellRenderStyle({
      styles,
      sheet,
      address,
      cell: { address, value: { type: "empty" }, styleId: styleId(9) },
    });
    expect(verticalText.writingMode).toBe("vertical-rl");
    expect(verticalText.textOrientation).toBe("upright");
  });

  it("exposes indent and readingOrder as CSS", () => {
    const styles = createDemoStyles();
    const sheet = createSheet();
    const address = createAddress(1, 1);

    const indented = resolveCellRenderStyle({
      styles,
      sheet,
      address,
      cell: { address, value: { type: "empty" }, styleId: styleId(10) },
    });
    expect(indented["--xlsx-cell-indent-start"]).toBe("4ch");

    const rtl = resolveCellRenderStyle({
      styles,
      sheet,
      address,
      cell: { address, value: { type: "empty" }, styleId: styleId(11) },
    });
    expect(rtl.direction).toBe("rtl");
  });
});

describe("resolveCellBorderDecoration", () => {
  it("resolves border edges from cell styleId", () => {
    const styles = createDemoStyles();
    const sheet = createSheet();
    const address = createAddress(1, 1);

    const border = resolveCellBorderDecoration({
      styles,
      sheet,
      address,
      cell: { address, value: { type: "empty" }, styleId: styleId(3) },
      defaultBorderColor: "black",
    });
    expect(border?.left?.width).toBe(1);
    expect(border?.left?.style).toBe("solid");
    expect(border?.left?.color).toBe("#000000");
  });
});
