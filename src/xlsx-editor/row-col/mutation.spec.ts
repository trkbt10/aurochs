/**
 * @file Row/column mutation tests
 */

import { colIdx, rowIdx } from "../../xlsx/domain/types";
import type { Cell, CellValue } from "../../xlsx/domain/cell/types";
import type { CellAddress, CellRange } from "../../xlsx/domain/cell/address";
import type { XlsxWorksheet } from "../../xlsx/domain/workbook";
import {
  deleteColumns,
  deleteRows,
  hideColumns,
  hideRows,
  insertColumns,
  insertRows,
  setColumnWidth,
  setRowHeight,
  unhideColumns,
  unhideRows,
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

function cellAt(col: number, row: number, value: CellValue): Cell {
  return {
    address: addr(col, row),
    value,
  };
}

function createWorksheet(
  cellsByRow: ReadonlyMap<number, readonly Cell[]>,
  opts?: { readonly dimension?: CellRange },
): XlsxWorksheet {
  return {
    dateSystem: "1900",
    name: "Sheet1",
    sheetId: 1,
    state: "visible",
    xmlPath: "xl/worksheets/sheet1.xml",
    dimension: opts?.dimension,
    rows: [...cellsByRow.entries()].map(([rowNumber, cells]) => ({
      rowNumber: rowIdx(rowNumber),
      cells,
    })),
  };
}

describe("xlsx-editor/row-col/mutation", () => {
  it("insertRows shifts row numbers and cell addresses", () => {
    const worksheet = createWorksheet(
      new Map([
        [1, [cellAt(1, 1, { type: "string", value: "A1" })]],
        [3, [cellAt(2, 3, { type: "string", value: "B3" })]],
      ]),
    );

    const next = insertRows(worksheet, rowIdx(2), 2);

    expect(next.rows.map((r) => r.rowNumber)).toEqual([rowIdx(1), rowIdx(5)]);
    expect(next.rows[1]?.cells[0]?.address.row).toBe(rowIdx(5));
    expect(next.rows[1]?.cells[0]?.address.col).toBe(colIdx(2));

    expect(worksheet.rows.map((r) => r.rowNumber)).toEqual([rowIdx(1), rowIdx(3)]);
    expect(worksheet.rows[1]?.cells[0]?.address.row).toBe(rowIdx(3));
  });

  it("insertRows shifts worksheet dimension when present", () => {
    const worksheet = createWorksheet(
      new Map([[1, [cellAt(1, 1, { type: "string", value: "A1" })]]]),
      { dimension: range(1, 1, 3, 3) },
    );

    const next = insertRows(worksheet, rowIdx(2), 2);
    expect(next.dimension).toEqual(range(1, 1, 3, 5));
  });

  it("insertRows throws when startRow or count is invalid", () => {
    const worksheet = createWorksheet(new Map([[1, [cellAt(1, 1, { type: "string", value: "A1" })]]]));

    expect(() => insertRows(worksheet, rowIdx(0), 1)).toThrow("startRow");
    expect(() => insertRows(worksheet, rowIdx(1), 0)).toThrow("count");
  });

  it("deleteRows removes rows in range and shifts following rows", () => {
    const worksheet = createWorksheet(
      new Map([
        [1, [cellAt(1, 1, { type: "string", value: "A1" })]],
        [2, [cellAt(1, 2, { type: "string", value: "A2" })]],
        [4, [cellAt(1, 4, { type: "string", value: "A4" })]],
      ]),
    );

    const next = deleteRows(worksheet, rowIdx(2), 2);

    expect(next.rows.map((r) => r.rowNumber)).toEqual([rowIdx(1), rowIdx(2)]);
    expect(next.rows[1]?.cells[0]?.address.row).toBe(rowIdx(2));
    expect(next.rows[1]?.cells[0]?.value).toEqual({ type: "string", value: "A4" });
  });

  it("deleteRows shifts worksheet dimension when present", () => {
    const worksheet = createWorksheet(new Map(), { dimension: range(1, 1, 3, 5) });

    const next = deleteRows(worksheet, rowIdx(2), 2);
    expect(next.dimension).toEqual(range(1, 1, 3, 3));
  });

  it("insertColumns shifts cell addresses", () => {
    const worksheet = createWorksheet(
      new Map([
        [
          1,
          [
            cellAt(1, 1, { type: "string", value: "A1" }),
            cellAt(3, 1, { type: "string", value: "C1" }),
          ],
        ],
      ]),
    );

    const next = insertColumns(worksheet, colIdx(2), 2);

    expect(next.rows[0]?.cells.map((c) => c.address.col)).toEqual([colIdx(1), colIdx(5)]);
    expect(next.rows[0]?.cells[1]?.address.row).toBe(rowIdx(1));
  });

  it("insertColumns shifts worksheet dimension when present", () => {
    const worksheet = createWorksheet(new Map(), { dimension: range(1, 1, 5, 3) });

    const next = insertColumns(worksheet, colIdx(2), 2);
    expect(next.dimension).toEqual(range(1, 1, 7, 3));
  });

  it("setRowHeight sets height and customHeight on an existing row", () => {
    const worksheet = createWorksheet(
      new Map([[1, [cellAt(1, 1, { type: "string", value: "A1" })]]]),
    );

    const next = setRowHeight(worksheet, rowIdx(1), 24);

    expect(next.rows[0]?.height).toBe(24);
    expect(next.rows[0]?.customHeight).toBe(true);
  });

  it("setColumnWidth creates a column definition when missing", () => {
    const worksheet = createWorksheet(new Map([[1, [cellAt(1, 1, { type: "string", value: "A1" })]]]));

    const next = setColumnWidth(worksheet, colIdx(2), 20);

    expect(next.columns).toEqual([{ min: colIdx(2), max: colIdx(2), width: 20 }]);
  });

  it("deleteColumns removes cells in range and shifts following cells", () => {
    const worksheet = createWorksheet(
      new Map([
        [
          1,
          [
            cellAt(1, 1, { type: "string", value: "A1" }),
            cellAt(2, 1, { type: "string", value: "B1" }),
            cellAt(4, 1, { type: "string", value: "D1" }),
          ],
        ],
      ]),
    );

    const next = deleteColumns(worksheet, colIdx(2), 2);

    expect(next.rows[0]?.cells.map((c) => [c.address.col, c.value])).toEqual([
      [colIdx(1), { type: "string", value: "A1" }],
      [colIdx(2), { type: "string", value: "D1" }],
    ]);

    expect(worksheet.rows[0]?.cells.map((c) => [c.address.col, c.value])).toEqual([
      [colIdx(1), { type: "string", value: "A1" }],
      [colIdx(2), { type: "string", value: "B1" }],
      [colIdx(4), { type: "string", value: "D1" }],
    ]);
  });

  it("deleteColumns shifts worksheet dimension when present", () => {
    const worksheet = createWorksheet(new Map(), { dimension: range(1, 1, 7, 3) });

    const next = deleteColumns(worksheet, colIdx(2), 2);
    expect(next.dimension).toEqual(range(1, 1, 5, 3));
  });

  it("deleteColumns throws when startCol or count is invalid", () => {
    const worksheet = createWorksheet(new Map([[1, [cellAt(1, 1, { type: "string", value: "A1" })]]]));

    expect(() => deleteColumns(worksheet, colIdx(0), 1)).toThrow("startCol");
    expect(() => deleteColumns(worksheet, colIdx(1), 0)).toThrow("count");
  });

  it("hideRows sets hidden on existing rows", () => {
    const worksheet = createWorksheet(
      new Map([
        [1, [cellAt(1, 1, { type: "string", value: "A1" })]],
        [2, [cellAt(1, 2, { type: "string", value: "A2" })]],
        [3, [cellAt(1, 3, { type: "string", value: "A3" })]],
      ]),
    );

    const next = hideRows(worksheet, rowIdx(2), 2);

    expect(next.rows[0]?.hidden).toBeUndefined();
    expect(next.rows[1]?.hidden).toBe(true);
    expect(next.rows[2]?.hidden).toBe(true);
  });

  it("hideRows creates rows when they do not exist", () => {
    const worksheet = createWorksheet(
      new Map([[1, [cellAt(1, 1, { type: "string", value: "A1" })]]]),
    );

    const next = hideRows(worksheet, rowIdx(3), 1);

    expect(next.rows).toHaveLength(2);
    expect(next.rows[1]?.rowNumber).toBe(rowIdx(3));
    expect(next.rows[1]?.hidden).toBe(true);
    expect(next.rows[1]?.cells).toEqual([]);
  });

  it("hideRows throws when startRow or count is invalid", () => {
    const worksheet = createWorksheet(new Map([[1, [cellAt(1, 1, { type: "string", value: "A1" })]]]));

    expect(() => hideRows(worksheet, rowIdx(0), 1)).toThrow("startRow");
    expect(() => hideRows(worksheet, rowIdx(1), 0)).toThrow("count");
  });

  it("unhideRows clears hidden on rows", () => {
    const worksheet = createWorksheet(
      new Map([
        [1, [cellAt(1, 1, { type: "string", value: "A1" })]],
        [2, [cellAt(1, 2, { type: "string", value: "A2" })]],
      ]),
    );

    const hidden = hideRows(worksheet, rowIdx(1), 2);
    const next = unhideRows(hidden, rowIdx(1), 2);

    expect(next.rows[0]?.hidden).toBeUndefined();
    expect(next.rows[1]?.hidden).toBeUndefined();
  });

  it("unhideRows throws when startRow or count is invalid", () => {
    const worksheet = createWorksheet(new Map([[1, [cellAt(1, 1, { type: "string", value: "A1" })]]]));

    expect(() => unhideRows(worksheet, rowIdx(0), 1)).toThrow("startRow");
    expect(() => unhideRows(worksheet, rowIdx(1), 0)).toThrow("count");
  });

  it("hideColumns sets hidden on column definitions", () => {
    const worksheet = createWorksheet(new Map([[1, [cellAt(1, 1, { type: "string", value: "A1" })]]]));

    const next = hideColumns(worksheet, colIdx(2), 2);

    // Contiguous columns with same properties are merged
    expect(next.columns).toEqual([
      { min: colIdx(2), max: colIdx(3), hidden: true },
    ]);
  });

  it("hideColumns merges with existing column definitions", () => {
    const baseWorksheet = createWorksheet(new Map([[1, [cellAt(1, 1, { type: "string", value: "A1" })]]]));
    const worksheetWithCols: XlsxWorksheet = {
      ...baseWorksheet,
      columns: [{ min: colIdx(1), max: colIdx(3), width: 10 }],
    };

    const next = hideColumns(worksheetWithCols, colIdx(2), 1);

    expect(next.columns).toContainEqual({ min: colIdx(1), max: colIdx(1), width: 10 });
    expect(next.columns).toContainEqual({ min: colIdx(2), max: colIdx(2), width: 10, hidden: true });
    expect(next.columns).toContainEqual({ min: colIdx(3), max: colIdx(3), width: 10 });
  });

  it("hideColumns throws when startCol or count is invalid", () => {
    const worksheet = createWorksheet(new Map([[1, [cellAt(1, 1, { type: "string", value: "A1" })]]]));

    expect(() => hideColumns(worksheet, colIdx(0), 1)).toThrow("startCol");
    expect(() => hideColumns(worksheet, colIdx(1), 0)).toThrow("count");
  });

  it("unhideColumns clears hidden on column definitions", () => {
    const worksheet = createWorksheet(new Map([[1, [cellAt(1, 1, { type: "string", value: "A1" })]]]));

    const hidden = hideColumns(worksheet, colIdx(1), 2);
    const next = unhideColumns(hidden, colIdx(1), 2);

    expect(next.columns).toEqual([
      { min: colIdx(1), max: colIdx(2), hidden: undefined },
    ]);
  });

  it("unhideColumns throws when startCol or count is invalid", () => {
    const worksheet = createWorksheet(new Map([[1, [cellAt(1, 1, { type: "string", value: "A1" })]]]));

    expect(() => unhideColumns(worksheet, colIdx(0), 1)).toThrow("startCol");
    expect(() => unhideColumns(worksheet, colIdx(1), 0)).toThrow("count");
  });
});
