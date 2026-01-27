/**
 * @file Tests for selection format "mixed" flags
 */
 
import type { CellAddress, CellRange } from "@oxen/xlsx/domain/cell/address";
import type { XlsxStyleSheet } from "@oxen/xlsx/domain/style/types";
import type { XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import { createDefaultStyleSheet } from "@oxen/xlsx/domain/style/types";
import { borderId, colIdx, fillId, fontId, numFmtId, rowIdx, styleId } from "@oxen/xlsx/domain/types";
import type { Cell } from "@oxen/xlsx/domain/cell/types";
import { resolveSelectionFormatFlags } from "./selection-format-flags";

function createAddress(col: number, row: number): CellAddress {
  return { col: colIdx(col), row: rowIdx(row), colAbsolute: false, rowAbsolute: false };
}

function createRange(startCol: number, startRow: number, endCol: number, endRow: number): CellRange {
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
    fonts: [
      ...base.fonts,
      { ...defaultFont, bold: true },
    ],
    cellXfs: [
      ...base.cellXfs,
      { numFmtId: numFmtId(0), fontId: fontId(boldFontIndex), fillId: fillId(0), borderId: borderId(0), applyFont: true },
      { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(0), borderId: borderId(0), alignment: { wrapText: true }, applyAlignment: true },
      { numFmtId: numFmtId(0), fontId: fontId(boldFontIndex), fillId: fillId(0), borderId: borderId(0), alignment: { wrapText: true }, applyFont: true, applyAlignment: true },
      { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(0), borderId: borderId(0), alignment: { horizontal: "right" }, applyAlignment: true },
    ],
  };
}

function createSheet(
  cells: readonly { readonly col: number; readonly row: number; readonly styleId?: number }[],
  opts?: {
    readonly columns?: XlsxWorksheet["columns"];
    readonly rowStyles?: ReadonlyMap<number, number>;
  }
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
  it("returns non-mixed flags when all cells share the same effective format", () => {
    const styles = createDemoStyles();
    const sheet = createSheet([
      { col: 1, row: 1, styleId: 0 },
      { col: 2, row: 1, styleId: 0 },
    ]);

    const flags = resolveSelectionFormatFlags({ sheet, styles, range: createRange(1, 1, 2, 1) });
    expect(flags.tooLarge).toBe(false);

    expect(flags.bold).toEqual({ mixed: false, value: false });
    expect(flags.italic).toEqual({ mixed: false, value: false });
    expect(flags.underline).toEqual({ mixed: false, value: false });
    expect(flags.strikethrough).toEqual({ mixed: false, value: false });
    expect(flags.wrapText).toEqual({ mixed: false, value: false });
    expect(flags.horizontal).toEqual({ mixed: false, value: "general" });
  });

  it("marks bold as mixed when selection contains both bold and non-bold cells", () => {
    const styles = createDemoStyles();
    const sheet = createSheet([
      { col: 1, row: 1, styleId: 0 },
      { col: 2, row: 1, styleId: 1 },
    ]);

    const flags = resolveSelectionFormatFlags({ sheet, styles, range: createRange(1, 1, 2, 1) });
    expect(flags.bold).toEqual({ mixed: true });
    expect(flags.italic).toEqual({ mixed: false, value: false });
    expect(flags.wrapText).toEqual({ mixed: false, value: false });
  });

  it("marks wrapText as mixed when selection contains both wrap and non-wrap cells", () => {
    const styles = createDemoStyles();
    const sheet = createSheet([
      { col: 1, row: 1, styleId: 0 },
      { col: 2, row: 1, styleId: 2 },
    ]);

    const flags = resolveSelectionFormatFlags({ sheet, styles, range: createRange(1, 1, 2, 1) });
    expect(flags.wrapText).toEqual({ mixed: true });
    expect(flags.bold).toEqual({ mixed: false, value: false });
  });

  it("short-circuits to tooLarge when the selection exceeds maxCellsToAnalyze", () => {
    const styles = createDemoStyles();
    const sheet = createSheet([
      { col: 1, row: 1, styleId: 0 },
      { col: 2, row: 1, styleId: 1 },
      { col: 3, row: 1, styleId: 2 },
    ]);

    const flags = resolveSelectionFormatFlags({ sheet, styles, range: createRange(1, 1, 3, 1), maxCellsToAnalyze: 2 });
    expect(flags.tooLarge).toBe(true);
    expect(flags.bold).toEqual({ mixed: true });
    expect(flags.italic).toEqual({ mixed: true });
    expect(flags.underline).toEqual({ mixed: true });
    expect(flags.strikethrough).toEqual({ mixed: true });
    expect(flags.wrapText).toEqual({ mixed: true });
    expect(flags.horizontal).toEqual({ mixed: true });
  });

  it("treats column styles as effective styles when rows have no row-level style", () => {
    const styles = createDemoStyles();
    const sheet = createSheet([], {
      columns: [
        { min: colIdx(2), max: colIdx(2), styleId: styleId(1) },
      ],
    });

    const flags = resolveSelectionFormatFlags({ sheet, styles, range: createRange(1, 1, 2, 1) });
    expect(flags.bold).toEqual({ mixed: true });
  });

  it("ignores column styles when all rows in selection have row-level style", () => {
    const styles = createDemoStyles();
    const sheet = createSheet([], {
      columns: [
        { min: colIdx(2), max: colIdx(2), styleId: styleId(0) },
      ],
      rowStyles: new Map([[1, 1]]),
    });

    const flags = resolveSelectionFormatFlags({ sheet, styles, range: createRange(1, 1, 2, 1) });
    expect(flags.bold).toEqual({ mixed: false, value: true });
  });

  it("returns horizontal alignment when all cells share the same effective alignment", () => {
    const styles = createDemoStyles();
    const sheet = createSheet([
      { col: 1, row: 1, styleId: 4 },
      { col: 2, row: 1, styleId: 4 },
    ]);

    const flags = resolveSelectionFormatFlags({ sheet, styles, range: createRange(1, 1, 2, 1) });
    expect(flags.horizontal).toEqual({ mixed: false, value: "right" });
  });

  it("marks horizontal alignment as mixed when the selection contains differing values", () => {
    const styles = createDemoStyles();
    const sheet = createSheet([
      { col: 1, row: 1, styleId: 0 }, // general
      { col: 2, row: 1, styleId: 4 }, // right
    ]);

    const flags = resolveSelectionFormatFlags({ sheet, styles, range: createRange(1, 1, 2, 1) });
    expect(flags.horizontal).toEqual({ mixed: true });
  });
});
