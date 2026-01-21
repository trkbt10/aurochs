/**
 * @file Autofill (fill handle) mutation tests
 */

import { colIdx, rowIdx, styleId } from "../../xlsx/domain/types";
import { parseRange } from "../../xlsx/domain/cell/address";
import type { Cell } from "../../xlsx/domain/cell/types";
import type { XlsxWorksheet } from "../../xlsx/domain/workbook";
import { applyAutofillToWorksheet } from "./autofill";
import { getCell } from "./query";

function cellAt(col: number, row: number, cell: Omit<Cell, "address">): Cell {
  return {
    address: { col: colIdx(col), row: rowIdx(row), colAbsolute: false, rowAbsolute: false },
    ...cell,
  };
}

function createSheet(cells: readonly Cell[], opts?: Partial<XlsxWorksheet>): XlsxWorksheet {
  const dateSystem = opts?.dateSystem ?? "1900";
  const resolvedOpts = opts ? { ...opts, dateSystem } : undefined;
  return {
    dateSystem,
    name: "Sheet1",
    sheetId: 1,
    state: "visible",
    xmlPath: "xl/worksheets/sheet1.xml",
    rows: [
      {
        rowNumber: rowIdx(1),
        cells: cells.filter((c) => (c.address.row as number) === 1),
      },
      {
        rowNumber: rowIdx(2),
        cells: cells.filter((c) => (c.address.row as number) === 2),
      },
      {
        rowNumber: rowIdx(3),
        cells: cells.filter((c) => (c.address.row as number) === 3),
      },
      {
        rowNumber: rowIdx(4),
        cells: cells.filter((c) => (c.address.row as number) === 4),
      },
    ].filter((r) => r.cells.length > 0),
    ...resolvedOpts,
  };
}

describe("applyAutofillToWorksheet", () => {
  it("fills numeric series down for a single cell", () => {
    const sheet = createSheet([cellAt(1, 1, { value: { type: "number", value: 5 } })]);

    const updated = applyAutofillToWorksheet({
      worksheet: sheet,
      baseRange: parseRange("A1"),
      targetRange: parseRange("A1:A3"),
    });

    expect(getCell(updated, { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false })?.value).toEqual({ type: "number", value: 5 });
    expect(getCell(updated, { col: colIdx(1), row: rowIdx(2), colAbsolute: false, rowAbsolute: false })?.value).toEqual({ type: "number", value: 6 });
    expect(getCell(updated, { col: colIdx(1), row: rowIdx(3), colAbsolute: false, rowAbsolute: false })?.value).toEqual({ type: "number", value: 7 });
  });

  it("fills repeating values up in reverse order (like spreadsheet preview)", () => {
    const sheet = createSheet([
      cellAt(1, 3, { value: { type: "string", value: "A" } }),
      cellAt(1, 4, { value: { type: "string", value: "B" } }),
    ]);

    const updated = applyAutofillToWorksheet({
      worksheet: sheet,
      baseRange: parseRange("A3:A4"),
      targetRange: parseRange("A1:A4"),
    });

    expect(getCell(updated, { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false })?.value).toEqual({ type: "string", value: "A" });
    expect(getCell(updated, { col: colIdx(1), row: rowIdx(2), colAbsolute: false, rowAbsolute: false })?.value).toEqual({ type: "string", value: "B" });
  });

  it("shifts formula references when filling down", () => {
    const sheet = createSheet([
      cellAt(1, 1, { value: { type: "number", value: 10 } }),
      cellAt(2, 1, { value: { type: "empty" }, formula: { type: "normal", expression: "A1+1" } }),
    ]);

    const updated = applyAutofillToWorksheet({
      worksheet: sheet,
      baseRange: parseRange("B1"),
      targetRange: parseRange("B1:B3"),
    });

    expect(getCell(updated, { col: colIdx(2), row: rowIdx(2), colAbsolute: false, rowAbsolute: false })?.formula).toMatchObject({ expression: "A2+1" });
    expect(getCell(updated, { col: colIdx(2), row: rowIdx(3), colAbsolute: false, rowAbsolute: false })?.formula).toMatchObject({ expression: "A3+1" });
  });

  it("fills numeric series right and overwrites destination cells without touching baseRange", () => {
    const sheet = createSheet([
      cellAt(1, 1, { value: { type: "number", value: 1 } }),
      cellAt(2, 1, { value: { type: "number", value: 2 } }),
      cellAt(3, 1, { value: { type: "number", value: 99 } }),
      cellAt(4, 1, { value: { type: "number", value: 98 } }),
    ]);

    const updated = applyAutofillToWorksheet({
      worksheet: sheet,
      baseRange: parseRange("A1:B1"),
      targetRange: parseRange("A1:D1"),
    });

    expect(getCell(updated, { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false })?.value).toEqual({ type: "number", value: 1 });
    expect(getCell(updated, { col: colIdx(2), row: rowIdx(1), colAbsolute: false, rowAbsolute: false })?.value).toEqual({ type: "number", value: 2 });
    expect(getCell(updated, { col: colIdx(3), row: rowIdx(1), colAbsolute: false, rowAbsolute: false })?.value).toEqual({ type: "number", value: 3 });
    expect(getCell(updated, { col: colIdx(4), row: rowIdx(1), colAbsolute: false, rowAbsolute: false })?.value).toEqual({ type: "number", value: 4 });
  });

  it("copies effective styleId from base cells", () => {
    const sheet = createSheet([cellAt(1, 1, { value: { type: "string", value: "x" }, styleId: styleId(5) })]);

    const updated = applyAutofillToWorksheet({
      worksheet: sheet,
      baseRange: parseRange("A1"),
      targetRange: parseRange("A1:A2"),
    });

    expect(getCell(updated, { col: colIdx(1), row: rowIdx(2), colAbsolute: false, rowAbsolute: false })?.styleId).toEqual(styleId(5));
  });
});
