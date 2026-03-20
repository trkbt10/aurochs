/**
 * @file Tests for selection format flags
 */

import type { CellAddress, CellRange } from "@aurochs-office/xlsx/domain/cell/address";
import type { XlsxStyleSheet } from "@aurochs-office/xlsx/domain/style/types";
import type { XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import { createDefaultStyleSheet } from "@aurochs-office/xlsx/domain/style/types";
import { borderId, colIdx, fillId, fontId, numFmtId, rowIdx, styleId } from "@aurochs-office/xlsx/domain/types";
import type { Cell } from "@aurochs-office/xlsx/domain/cell/types";
import { resolveSelectionFormatFlags } from "./selection-format-flags";

function createAddress(col: number, row: number): CellAddress {
  return { col: colIdx(col), row: rowIdx(row), colAbsolute: false, rowAbsolute: false };
}

function createRange({
  startCol,
  startRow,
  endCol,
  endRow,
}: {
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
}): CellRange {
  return { start: createAddress(startCol, startRow), end: createAddress(endCol, endRow) };
}

function createDemoStyles(): XlsxStyleSheet {
  const base = createDefaultStyleSheet();
  const defaultFont = base.fonts[0];
  if (!defaultFont) {
    throw new Error("Expected default font");
  }

  const boldFontIndex = base.fonts.length;

  return {
    ...base,
    fonts: [...base.fonts, { ...defaultFont, bold: true }],
    cellXfs: [
      ...base.cellXfs,
      {
        numFmtId: numFmtId(0),
        fontId: fontId(boldFontIndex),
        fillId: fillId(0),
        borderId: borderId(0),
        applyFont: true,
      },
      {
        numFmtId: numFmtId(0),
        fontId: fontId(0),
        fillId: fillId(0),
        borderId: borderId(0),
        alignment: { wrapText: true },
        applyAlignment: true,
      },
      {
        numFmtId: numFmtId(0),
        fontId: fontId(boldFontIndex),
        fillId: fillId(0),
        borderId: borderId(0),
        alignment: { wrapText: true },
        applyFont: true,
        applyAlignment: true,
      },
      {
        numFmtId: numFmtId(0),
        fontId: fontId(0),
        fillId: fillId(0),
        borderId: borderId(0),
        alignment: { horizontal: "right" },
        applyAlignment: true,
      },
    ],
  };
}

function createSheet(
  cells: readonly { readonly col: number; readonly row: number; readonly styleId?: number }[],
  opts?: {
    readonly columns?: XlsxWorksheet["columns"];
    readonly rowStyles?: ReadonlyMap<number, number>;
  },
): XlsxWorksheet {
  const rowMap = new Map<number, { rowNumber: number; cells: Cell[] }>();
  for (const cell of cells) {
    const entry = rowMap.get(cell.row) ?? { rowNumber: cell.row, cells: [] };
    entry.cells.push({
      address: createAddress(cell.col, cell.row),
      value: { type: "empty" },
      styleId: typeof cell.styleId === "number" ? styleId(cell.styleId) : undefined,
    });
    rowMap.set(cell.row, entry);
  }

  if (opts?.rowStyles) {
    for (const rowNumber of opts.rowStyles.keys()) {
      if (!rowMap.has(rowNumber)) {
        rowMap.set(rowNumber, { rowNumber, cells: [] });
      }
    }
  }

  return {
    dateSystem: "1900",
    name: "Sheet1",
    sheetId: 1,
    state: "visible",
    columns: opts?.columns,
    rows: [...rowMap.values()].map((row) => {
      const rowStyleIdValue = opts?.rowStyles?.get(row.rowNumber);
      return {
        rowNumber: rowIdx(row.rowNumber),
        cells: row.cells,
        styleId: rowStyleIdValue !== undefined ? styleId(rowStyleIdValue) : undefined,
      };
    }),
    xmlPath: "xl/worksheets/sheet1.xml",
  };
}

describe("resolveSelectionFormatFlags", () => {
  it("returns uniform flags when all cells share the same effective format", () => {
    const styles = createDemoStyles();
    const sheet = createSheet([
      { col: 1, row: 1, styleId: 0 },
      { col: 2, row: 1, styleId: 0 },
    ]);

    const flags = resolveSelectionFormatFlags({
      sheet,
      styles,
      range: createRange({ startCol: 1, startRow: 1, endCol: 2, endRow: 1 }),
    });
    expect(flags.tooLarge).toBe(false);

    expect(flags.bold).toBe(false);
    expect(flags.italic).toBe(false);
    expect(flags.underline).toBe(false);
    expect(flags.strikethrough).toBe(false);
    expect(flags.wrapText).toBe(false);
    expect(flags.horizontal).toBe("general");
    expect(flags.vertical).toBe("bottom");
  });

  it("returns array for bold when selection contains both bold and non-bold cells", () => {
    const styles = createDemoStyles();
    const sheet = createSheet([
      { col: 1, row: 1, styleId: 0 },
      { col: 2, row: 1, styleId: 1 },
    ]);

    const flags = resolveSelectionFormatFlags({
      sheet,
      styles,
      range: createRange({ startCol: 1, startRow: 1, endCol: 2, endRow: 1 }),
    });
    expect(Array.isArray(flags.bold)).toBe(true);
    expect(flags.italic).toBe(false);
    expect(flags.wrapText).toBe(false);
  });

  it("returns array for wrapText when selection contains both wrap and non-wrap cells", () => {
    const styles = createDemoStyles();
    const sheet = createSheet([
      { col: 1, row: 1, styleId: 0 },
      { col: 2, row: 1, styleId: 2 },
    ]);

    const flags = resolveSelectionFormatFlags({
      sheet,
      styles,
      range: createRange({ startCol: 1, startRow: 1, endCol: 2, endRow: 1 }),
    });
    expect(Array.isArray(flags.wrapText)).toBe(true);
    expect(flags.bold).toBe(false);
  });

  it("short-circuits to tooLarge when the selection exceeds maxCellsToAnalyze", () => {
    const styles = createDemoStyles();
    const sheet = createSheet([
      { col: 1, row: 1, styleId: 0 },
      { col: 2, row: 1, styleId: 1 },
      { col: 3, row: 1, styleId: 2 },
    ]);

    const flags = resolveSelectionFormatFlags({
      sheet,
      styles,
      range: createRange({ startCol: 1, startRow: 1, endCol: 3, endRow: 1 }),
      maxCellsToAnalyze: 2,
    });
    expect(flags.tooLarge).toBe(true);
    expect(Array.isArray(flags.bold)).toBe(true);
    expect(Array.isArray(flags.italic)).toBe(true);
    expect(Array.isArray(flags.underline)).toBe(true);
    expect(Array.isArray(flags.strikethrough)).toBe(true);
    expect(Array.isArray(flags.wrapText)).toBe(true);
    expect(Array.isArray(flags.horizontal)).toBe(true);
    expect(Array.isArray(flags.vertical)).toBe(true);
  });

  it("treats column styles as effective styles when rows have no row-level style", () => {
    const styles = createDemoStyles();
    const sheet = createSheet([], {
      columns: [{ min: colIdx(2), max: colIdx(2), styleId: styleId(1) }],
    });

    const flags = resolveSelectionFormatFlags({
      sheet,
      styles,
      range: createRange({ startCol: 1, startRow: 1, endCol: 2, endRow: 1 }),
    });
    expect(Array.isArray(flags.bold)).toBe(true);
  });

  it("ignores column styles when all rows in selection have row-level style", () => {
    const styles = createDemoStyles();
    const sheet = createSheet([], {
      columns: [{ min: colIdx(2), max: colIdx(2), styleId: styleId(0) }],
      rowStyles: new Map([[1, 1]]),
    });

    const flags = resolveSelectionFormatFlags({
      sheet,
      styles,
      range: createRange({ startCol: 1, startRow: 1, endCol: 2, endRow: 1 }),
    });
    expect(flags.bold).toBe(true);
  });

  it("returns horizontal alignment when all cells share the same effective alignment", () => {
    const styles = createDemoStyles();
    const sheet = createSheet([
      { col: 1, row: 1, styleId: 4 },
      { col: 2, row: 1, styleId: 4 },
    ]);

    const flags = resolveSelectionFormatFlags({
      sheet,
      styles,
      range: createRange({ startCol: 1, startRow: 1, endCol: 2, endRow: 1 }),
    });
    expect(flags.horizontal).toBe("right");
  });

  it("returns array for horizontal alignment when the selection contains differing values", () => {
    const styles = createDemoStyles();
    const sheet = createSheet([
      { col: 1, row: 1, styleId: 0 }, // general
      { col: 2, row: 1, styleId: 4 }, // right
    ]);

    const flags = resolveSelectionFormatFlags({
      sheet,
      styles,
      range: createRange({ startCol: 1, startRow: 1, endCol: 2, endRow: 1 }),
    });
    expect(Array.isArray(flags.horizontal)).toBe(true);
    expect(flags.horizontal).toEqual(expect.arrayContaining(["general", "right"]));
  });
});
