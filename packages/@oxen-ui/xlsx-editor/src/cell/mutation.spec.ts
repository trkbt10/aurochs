/**
 * @file Cell mutation tests
 */

import { colIdx, rowIdx, styleId } from "@oxen/xlsx/domain/types";
import type { Cell, CellValue } from "@oxen/xlsx/domain/cell/types";
import type { CellAddress, CellRange } from "@oxen/xlsx/domain/cell/address";
import type { XlsxRow, XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import { getCell, getCellValue, hasCell } from "./query";
import {
  clearCellContents,
  clearCellFormats,
  deleteCellRange,
  updateCell,
} from "./mutation";

function addr(col: number, row: number): CellAddress {
  return {
    col: colIdx(col),
    row: rowIdx(row),
    colAbsolute: false,
    rowAbsolute: false,
  };
}

function range(startCol: number, startRow: number, endCol: number, endRow: number): CellRange {
  return {
    start: addr(startCol, startRow),
    end: addr(endCol, endRow),
  };
}

function createWorksheet(cells: readonly Cell[]): XlsxWorksheet {
  const rowsByNumber = new Map<number, Cell[]>();
  for (const cell of cells) {
    const rowNumber = cell.address.row as number;
    const existing = rowsByNumber.get(rowNumber);
    if (existing) {
      existing.push(cell);
    } else {
      rowsByNumber.set(rowNumber, [cell]);
    }
  }

  const rows: XlsxRow[] = [...rowsByNumber.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rowNumber, rowCells]) => ({
      rowNumber: rowIdx(rowNumber),
      cells: [...rowCells].sort((a, b) => (a.address.col as number) - (b.address.col as number)),
    }));

  return {
    dateSystem: "1900",
    name: "Sheet1",
    sheetId: 1,
    state: "visible",
    xmlPath: "xl/worksheets/sheet1.xml",
    rows,
  };
}

function cellAt(
  col: number,
  row: number,
  value: CellValue,
  opts?: { readonly styleId?: number; readonly formula?: string },
): Cell {
  return {
    address: addr(col, row),
    value,
    ...(opts?.formula ? { formula: { type: "normal", expression: opts.formula } } : {}),
    ...(opts?.styleId !== undefined ? { styleId: styleId(opts.styleId) } : {}),
  };
}

describe("xlsx-editor/cell/mutation", () => {
  it("updateCell updates a missing cell (creates row/cell)", () => {
    const worksheet = createWorksheet([]);
    const updated = updateCell(worksheet, addr(1, 1), { type: "string", value: "A1" });

    expect(getCellValue(updated, addr(1, 1))).toEqual({ type: "string", value: "A1" });
    expect(getCellValue(worksheet, addr(1, 1))).toBeUndefined();
  });

  it("updateCell updates an existing cell and preserves style", () => {
    const worksheet = createWorksheet([
      cellAt(1, 1, { type: "string", value: "old" }, { styleId: 10, formula: "SUM(1,2)" }),
      cellAt(1, 2, { type: "string", value: "keep" }),
    ]);

    const updated = updateCell(worksheet, addr(1, 1), { type: "string", value: "new" });
    expect(getCellValue(updated, addr(1, 1))).toEqual({ type: "string", value: "new" });
    expect(getCell(updated, addr(1, 1))?.styleId).toEqual(styleId(10));
    expect(getCell(updated, addr(1, 1))?.formula).toBeUndefined();

    expect(getCellValue(worksheet, addr(1, 1))).toEqual({ type: "string", value: "old" });
    expect(getCell(worksheet, addr(1, 1))?.styleId).toEqual(styleId(10));
    expect(getCell(worksheet, addr(1, 1))?.formula).toEqual({ type: "normal", expression: "SUM(1,2)" });

    expect(updated.rows[1]).toBe(worksheet.rows[1]);
    expect(updated.rows[0]).not.toBe(worksheet.rows[0]);
  });

  it("deleteCellRange deletes cells within a range", () => {
    const worksheet = createWorksheet([
      cellAt(1, 1, { type: "string", value: "A1" }),
      cellAt(2, 1, { type: "string", value: "B1" }),
      cellAt(3, 1, { type: "string", value: "C1" }),
      cellAt(1, 2, { type: "string", value: "A2" }),
      cellAt(2, 2, { type: "string", value: "B2" }),
      cellAt(3, 2, { type: "string", value: "C2" }),
    ]);

    const updated = deleteCellRange(worksheet, range(2, 1, 3, 2));

    expect(hasCell(updated, addr(1, 1))).toBe(true);
    expect(hasCell(updated, addr(1, 2))).toBe(true);
    expect(hasCell(updated, addr(2, 1))).toBe(false);
    expect(hasCell(updated, addr(3, 1))).toBe(false);
    expect(hasCell(updated, addr(2, 2))).toBe(false);
    expect(hasCell(updated, addr(3, 2))).toBe(false);
  });

  it("deleteCellRange returns the same worksheet when no cells are in the range", () => {
    const worksheet = createWorksheet([
      cellAt(1, 1, { type: "string", value: "A1" }),
      cellAt(1, 2, { type: "string", value: "A2" }),
    ]);

    const updated = deleteCellRange(worksheet, range(10, 10, 11, 11));
    expect(updated).toBe(worksheet);
    expect(updated.rows).toBe(worksheet.rows);
  });

  it("clearCellContents clears value and formula but keeps style", () => {
    const worksheet = createWorksheet([
      cellAt(1, 1, { type: "number", value: 1 }),
      cellAt(2, 2, { type: "string", value: "keep-style" }, { styleId: 5, formula: "A1" }),
    ]);

    const updated = clearCellContents(worksheet, range(2, 2, 2, 2));
    expect(getCell(updated, addr(2, 2))).toEqual({
      address: addr(2, 2),
      value: { type: "empty" },
      styleId: styleId(5),
    });
  });

  it("clearCellContents returns the same worksheet when nothing changes", () => {
    const worksheet = createWorksheet([
      cellAt(1, 1, { type: "string", value: "A1" }),
      cellAt(2, 1, { type: "string", value: "B1" }),
    ]);

    const updated = clearCellContents(worksheet, range(5, 5, 6, 6));
    expect(updated).toBe(worksheet);
    expect(updated.rows).toBe(worksheet.rows);
  });

  it("clearCellFormats clears style but keeps value", () => {
    const worksheet = createWorksheet([
      cellAt(3, 3, { type: "string", value: "keep-value" }, { styleId: 7 }),
    ]);

    const updated = clearCellFormats(worksheet, range(3, 3, 3, 3));
    expect(getCell(updated, addr(3, 3))).toEqual({
      address: addr(3, 3),
      value: { type: "string", value: "keep-value" },
    });
  });

  it("clearCellFormats returns the same worksheet when no cells have styles", () => {
    const worksheet = createWorksheet([
      cellAt(1, 1, { type: "string", value: "A1" }),
      cellAt(2, 2, { type: "string", value: "B2" }),
    ]);

    const updated = clearCellFormats(worksheet, range(1, 1, 2, 2));
    expect(updated).toBe(worksheet);
    expect(updated.rows).toBe(worksheet.rows);
  });
});
