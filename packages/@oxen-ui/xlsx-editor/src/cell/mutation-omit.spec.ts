/**
 * @file Cell mutation omit behavior tests
 */

import { colIdx, rowIdx, styleId } from "@oxen/xlsx/domain/types";
import type { Cell } from "@oxen/xlsx/domain/cell/types";
import type { CellAddress } from "@oxen/xlsx/domain/cell/address";
import type { XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import { getCell } from "./query";
import { clearCellFormats, updateCell } from "./mutation";

function addr(col: number, row: number): CellAddress {
  return {
    col: colIdx(col),
    row: rowIdx(row),
    colAbsolute: false,
    rowAbsolute: false,
  };
}

function createWorksheet(cells: readonly Cell[]): XlsxWorksheet {
  return {
    dateSystem: "1900",
    name: "Sheet1",
    sheetId: 1,
    state: "visible",
    xmlPath: "xl/worksheets/sheet1.xml",
    rows: [
      {
        rowNumber: rowIdx(1),
        cells: [...cells],
      },
    ],
  };
}

function hasOwnProp(object: object, prop: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(object, prop);
}

describe("xlsx-editor/cell/mutation (omit keys)", () => {
  it("updateCell omits formula key from existing cell", () => {
    const worksheet = createWorksheet([
      {
        address: addr(1, 1),
        value: { type: "string", value: "old" },
        formula: { type: "normal", expression: "SUM(1,2)" },
        styleId: styleId(10),
      },
    ]);

    const updated = updateCell(worksheet, addr(1, 1), { type: "string", value: "new" });
    const cell = getCell(updated, addr(1, 1));
    if (!cell) {
      throw new Error("Expected cell to exist");
    }
    expect(cell.formula).toBeUndefined();
    expect(hasOwnProp(cell, "formula")).toBe(false);
    expect(hasOwnProp(cell, "styleId")).toBe(true);
  });

  it("clearCellFormats omits styleId key", () => {
    const worksheet = createWorksheet([
      {
        address: addr(1, 1),
        value: { type: "string", value: "keep-value" },
        styleId: styleId(10),
      },
    ]);

    const updated = clearCellFormats(worksheet, { start: addr(1, 1), end: addr(1, 1) });
    const cell = getCell(updated, addr(1, 1));
    if (!cell) {
      throw new Error("Expected cell to exist");
    }
    expect(cell.styleId).toBeUndefined();
    expect(hasOwnProp(cell, "styleId")).toBe(false);
  });
});
