/**
 * @file Cell query tests
 */

import { colIdx, rowIdx } from "@oxen/xlsx/domain/types";
import type { Cell, CellValue } from "@oxen/xlsx/domain/cell/types";
import type { CellAddress, CellRange } from "@oxen/xlsx/domain/cell/address";
import type { XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import {
  findCells,
  getCell,
  getCellValue,
  getCellsInRange,
  getCellValuesInRange,
  getUsedRange,
  hasCell,
} from "./query";

function addr(col: number, row: number): CellAddress {
  return {
    col: colIdx(col),
    row: rowIdx(row),
    colAbsolute: false,
    rowAbsolute: false,
  };
}

function cellAt(col: number, row: number, value: CellValue): Cell {
  return {
    address: addr(col, row),
    value,
  };
}

function range(startCol: number, startRow: number, endCol: number, endRow: number): CellRange {
  return {
    start: addr(startCol, startRow),
    end: addr(endCol, endRow),
  };
}

function createWorksheet(cells: readonly Cell[]): XlsxWorksheet {
  const rows = new Map<number, Cell[]>();
  for (const cell of cells) {
    const rowNumber = cell.address.row as number;
    const existing = rows.get(rowNumber);
    if (existing) {
      existing.push(cell);
    } else {
      rows.set(rowNumber, [cell]);
    }
  }

  return {
    dateSystem: "1900",
    name: "Sheet1",
    sheetId: 1,
    state: "visible",
    xmlPath: "xl/worksheets/sheet1.xml",
    rows: [...rows.entries()].map(([rowNumber, rowCells]) => ({
      rowNumber: rowIdx(rowNumber),
      cells: rowCells,
    })),
  };
}

describe("cell/query", () => {
  it("getCell / getCellValue / hasCell", () => {
    const worksheet = createWorksheet([
      cellAt(1, 1, { type: "string", value: "A1" }),
      cellAt(3, 2, { type: "number", value: 123 }),
    ]);

    expect(getCell(worksheet, addr(1, 1))?.value).toEqual({ type: "string", value: "A1" });
    expect(getCellValue(worksheet, addr(3, 2))).toEqual({ type: "number", value: 123 });
    expect(getCell(worksheet, addr(2, 1))).toBeUndefined();
    expect(getCellValue(worksheet, addr(2, 1))).toBeUndefined();
    expect(hasCell(worksheet, addr(1, 1))).toBe(true);
    expect(hasCell(worksheet, addr(2, 1))).toBe(false);
  });

  it("getCellsInRange returns only existing cells (normalized range)", () => {
    const worksheet = createWorksheet([
      cellAt(1, 1, { type: "string", value: "A1" }),
      cellAt(2, 1, { type: "string", value: "B1" }),
      cellAt(1, 2, { type: "string", value: "A2" }),
      cellAt(3, 3, { type: "string", value: "C3" }),
    ]);

    const cells = getCellsInRange(worksheet, range(2, 2, 1, 1));
    expect(cells.map((c) => [c.address.col, c.address.row])).toEqual([
      [colIdx(1), rowIdx(1)],
      [colIdx(2), rowIdx(1)],
      [colIdx(1), rowIdx(2)],
    ]);
  });

  it("getCellsInRange returns [] when there are no cells in the range (and does not mutate)", () => {
    const worksheet = createWorksheet([
      cellAt(1, 1, { type: "string", value: "A1" }),
      cellAt(2, 1, { type: "string", value: "B1" }),
    ]);
    const originalRows = worksheet.rows;
    const originalCells = worksheet.rows[0]?.cells;

    const cells = getCellsInRange(worksheet, range(10, 10, 12, 12));
    expect(cells).toEqual([]);
    expect(worksheet.rows).toBe(originalRows);
    expect(worksheet.rows[0]?.cells).toBe(originalCells);
  });

  it("getCellValuesInRange returns a 2D array (row-major) and fills missing with empty", () => {
    const worksheet = createWorksheet([
      cellAt(1, 1, { type: "string", value: "A1" }),
      cellAt(3, 2, { type: "number", value: 10 }),
    ]);

    const values = getCellValuesInRange(worksheet, range(1, 1, 3, 2));
    expect(values).toEqual([
      [
        { type: "string", value: "A1" },
        { type: "empty" },
        { type: "empty" },
      ],
      [
        { type: "empty" },
        { type: "empty" },
        { type: "number", value: 10 },
      ],
    ]);
  });

  it("getUsedRange returns bounding box of all cells", () => {
    const worksheet = createWorksheet([
      cellAt(2, 3, { type: "string", value: "B3" }),
      cellAt(5, 1, { type: "string", value: "E1" }),
      cellAt(3, 4, { type: "string", value: "C4" }),
    ]);

    expect(getUsedRange(worksheet)).toEqual({
      start: addr(2, 1),
      end: addr(5, 4),
    });
  });

  it("getUsedRange returns undefined when there are no cells", () => {
    const worksheet = createWorksheet([]);
    expect(getUsedRange(worksheet)).toBeUndefined();
  });

  it("findCells filters by predicate", () => {
    const worksheet = createWorksheet([
      cellAt(1, 1, { type: "string", value: "hello" }),
      cellAt(2, 1, { type: "number", value: 42 }),
      cellAt(3, 1, { type: "string", value: "world" }),
    ]);

    const cells = findCells(worksheet, (c) => c.value.type === "string");
    expect(cells.map((c) => (c.value.type === "string" ? c.value.value : ""))).toEqual([
      "hello",
      "world",
    ]);
  });
});
