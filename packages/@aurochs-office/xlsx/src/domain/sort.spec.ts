import { describe, it, expect } from "vitest";
import { sortWorksheetRows } from "./sort";
import type { CellValue } from "./cell/types";
import type { CellRange, CellAddress } from "./cell/address";
import type { XlsxWorksheet, XlsxRow } from "./workbook";
import type { XlsxSortState } from "./auto-filter";
import { colIdx, rowIdx, sheetId } from "./types";

// =============================================================================
// Helpers
// =============================================================================

function addr(col: number, row: number): CellAddress {
  return { col: colIdx(col), row: rowIdx(row), colAbsolute: false, rowAbsolute: false };
}

function makeRange(startCol: number, startRow: number, endCol: number, endRow: number): CellRange {
  return { start: addr(startCol, startRow), end: addr(endCol, endRow) };
}

function makeRow(rowNumber: number, cells: readonly { col: number; value: CellValue }[], extra?: { hidden?: boolean }): XlsxRow {
  return {
    rowNumber: rowIdx(rowNumber),
    cells: cells.map((c) => ({
      address: addr(c.col, rowNumber),
      value: c.value,
    })),
    ...extra,
  };
}

function makeWorksheet(rows: readonly XlsxRow[]): XlsxWorksheet {
  return {
    name: "Sheet1",
    sheetId: sheetId(1),
    state: "visible",
    rows,
    xmlPath: "xl/worksheets/sheet1.xml",
    dateSystem: "1900",
  };
}

function str(v: string): CellValue {
  return { type: "string", value: v };
}
function num(v: number): CellValue {
  return { type: "number", value: v };
}
function empty(): CellValue {
  return { type: "empty" };
}
function err(v: "#N/A"): CellValue {
  return { type: "error", value: v };
}

/**
 * Extract the values of a specific column from sorted rows for easy assertion.
 */
function colValues(ws: XlsxWorksheet, col: number): readonly (string | number | undefined)[] {
  return ws.rows.map((row) => {
    const cell = row.cells.find((c) => (c.address.col as number) === col);
    if (!cell || cell.value.type === "empty") return undefined;
    if (cell.value.type === "string") return cell.value.value;
    if (cell.value.type === "number") return cell.value.value;
    return undefined;
  });
}

// =============================================================================
// sortWorksheetRows
// =============================================================================

describe("sortWorksheetRows", () => {
  it("should sort by a single column ascending (numbers)", () => {
    const ws = makeWorksheet([
      makeRow(1, [{ col: 1, value: str("Header") }]),  // header
      makeRow(2, [{ col: 1, value: num(30) }]),
      makeRow(3, [{ col: 1, value: num(10) }]),
      makeRow(4, [{ col: 1, value: num(20) }]),
    ]);
    const sortState: XlsxSortState = {
      ref: "A2:A4",
      sortConditions: [{ ref: "A2:A4" }], // ascending by default
    };
    const result = sortWorksheetRows(ws, sortState, makeRange(1, 1, 1, 4));

    // Header stays, data rows reordered
    expect(colValues(result, 1)).toEqual(["Header", 10, 20, 30]);
  });

  it("should sort by a single column descending", () => {
    const ws = makeWorksheet([
      makeRow(1, [{ col: 1, value: str("Header") }]),
      makeRow(2, [{ col: 1, value: num(10) }]),
      makeRow(3, [{ col: 1, value: num(30) }]),
      makeRow(4, [{ col: 1, value: num(20) }]),
    ]);
    const sortState: XlsxSortState = {
      ref: "A2:A4",
      sortConditions: [{ ref: "A2:A4", descending: true }],
    };
    const result = sortWorksheetRows(ws, sortState, makeRange(1, 1, 1, 4));

    expect(colValues(result, 1)).toEqual(["Header", 30, 20, 10]);
  });

  it("should sort by multiple columns (primary + secondary key)", () => {
    const ws = makeWorksheet([
      makeRow(1, [{ col: 1, value: str("Name") }, { col: 2, value: str("Score") }]),
      makeRow(2, [{ col: 1, value: str("Alice") }, { col: 2, value: num(80) }]),
      makeRow(3, [{ col: 1, value: str("Bob") }, { col: 2, value: num(90) }]),
      makeRow(4, [{ col: 1, value: str("Alice") }, { col: 2, value: num(70) }]),
      makeRow(5, [{ col: 1, value: str("Bob") }, { col: 2, value: num(60) }]),
    ]);
    const sortState: XlsxSortState = {
      ref: "A2:B5",
      sortConditions: [
        { ref: "A2:A5" },         // primary: name ascending
        { ref: "B2:B5", descending: true }, // secondary: score descending
      ],
    };
    const result = sortWorksheetRows(ws, sortState, makeRange(1, 1, 2, 5));

    expect(colValues(result, 1)).toEqual(["Name", "Alice", "Alice", "Bob", "Bob"]);
    expect(colValues(result, 2)).toEqual(["Score", 80, 70, 90, 60]);
  });

  it("should place empty cells at the end regardless of sort direction", () => {
    const ws = makeWorksheet([
      makeRow(1, [{ col: 1, value: str("H") }]),
      makeRow(2, [{ col: 1, value: num(20) }]),
      makeRow(3, [{ col: 1, value: empty() }]),
      makeRow(4, [{ col: 1, value: num(10) }]),
    ]);
    const sortState: XlsxSortState = {
      ref: "A2:A4",
      sortConditions: [{ ref: "A2:A4" }],
    };
    const result = sortWorksheetRows(ws, sortState, makeRange(1, 1, 1, 4));

    expect(colValues(result, 1)).toEqual(["H", 10, 20, undefined]);
  });

  it("should place empty cells at the end for descending sort too", () => {
    const ws = makeWorksheet([
      makeRow(1, [{ col: 1, value: str("H") }]),
      makeRow(2, [{ col: 1, value: empty() }]),
      makeRow(3, [{ col: 1, value: num(10) }]),
      makeRow(4, [{ col: 1, value: num(20) }]),
    ]);
    const sortState: XlsxSortState = {
      ref: "A2:A4",
      sortConditions: [{ ref: "A2:A4", descending: true }],
    };
    const result = sortWorksheetRows(ws, sortState, makeRange(1, 1, 1, 4));

    expect(colValues(result, 1)).toEqual(["H", 20, 10, undefined]);
  });

  it("should sort numbers before text, and text before errors (Excel order)", () => {
    // Excel sort order: numbers < text < errors
    const ws = makeWorksheet([
      makeRow(1, [{ col: 1, value: str("H") }]),
      makeRow(2, [{ col: 1, value: str("Banana") }]),
      makeRow(3, [{ col: 1, value: num(5) }]),
      makeRow(4, [{ col: 1, value: err("#N/A") }]),
      makeRow(5, [{ col: 1, value: str("Apple") }]),
      makeRow(6, [{ col: 1, value: num(1) }]),
    ]);
    const sortState: XlsxSortState = {
      ref: "A2:A6",
      sortConditions: [{ ref: "A2:A6" }],
    };
    const result = sortWorksheetRows(ws, sortState, makeRange(1, 1, 1, 6));

    // numbers ascending, then text ascending, then errors
    expect(colValues(result, 1)).toEqual(["H", 1, 5, "Apple", "Banana", undefined]);
    // Check errors are at the end (before empty but after text)
    const errorRow = result.rows.find((r) =>
      r.cells.some((c) => c.value.type === "error"),
    );
    expect(errorRow).toBeDefined();
    // error should be in row 6 position (last data row)
    expect((errorRow!.rowNumber as number)).toBe(6);
  });

  it("should not modify rows outside the autoFilter range", () => {
    const ws = makeWorksheet([
      makeRow(1, [{ col: 1, value: str("Header") }]),
      makeRow(2, [{ col: 1, value: num(30) }]),
      makeRow(3, [{ col: 1, value: num(10) }]),
      makeRow(4, [{ col: 1, value: num(20) }]),
      makeRow(5, [{ col: 1, value: str("Footer") }]), // outside range
    ]);
    const sortState: XlsxSortState = {
      ref: "A2:A4",
      sortConditions: [{ ref: "A2:A4" }],
    };
    // autoFilter ref is A1:A4, so row 5 is outside
    const result = sortWorksheetRows(ws, sortState, makeRange(1, 1, 1, 4));

    expect(colValues(result, 1)).toEqual(["Header", 10, 20, 30, "Footer"]);
    // Row 5 should keep its original row number
    expect((result.rows[4].rowNumber as number)).toBe(5);
  });

  it("should preserve hidden state on sorted rows", () => {
    const ws = makeWorksheet([
      makeRow(1, [{ col: 1, value: str("H") }]),
      makeRow(2, [{ col: 1, value: num(30) }], { hidden: true }),
      makeRow(3, [{ col: 1, value: num(10) }]),
      makeRow(4, [{ col: 1, value: num(20) }]),
    ]);
    const sortState: XlsxSortState = {
      ref: "A2:A4",
      sortConditions: [{ ref: "A2:A4" }],
    };
    const result = sortWorksheetRows(ws, sortState, makeRange(1, 1, 1, 4));

    // After sort, rows are 10, 20, 30
    // The hidden row (originally 30) retains its hidden state
    // but now occupies a new row position
    const row30 = result.rows.find((r) =>
      r.cells.some((c) => c.value.type === "number" && c.value.value === 30),
    );
    expect(row30?.hidden).toBe(true);
  });

  it("should update row numbers and cell addresses after sort", () => {
    const ws = makeWorksheet([
      makeRow(1, [{ col: 1, value: str("H") }]),
      makeRow(2, [{ col: 1, value: num(30) }]),
      makeRow(3, [{ col: 1, value: num(10) }]),
    ]);
    const sortState: XlsxSortState = {
      ref: "A2:A3",
      sortConditions: [{ ref: "A2:A3" }],
    };
    const result = sortWorksheetRows(ws, sortState, makeRange(1, 1, 1, 3));

    // After sort: row 2 has value 10, row 3 has value 30
    expect((result.rows[1].rowNumber as number)).toBe(2);
    expect((result.rows[1].cells[0].address.row as number)).toBe(2);
    expect((result.rows[2].rowNumber as number)).toBe(3);
    expect((result.rows[2].cells[0].address.row as number)).toBe(3);
  });

  it("should handle missing rows in data range", () => {
    // Row 3 doesn't exist in the worksheet data
    const ws = makeWorksheet([
      makeRow(1, [{ col: 1, value: str("H") }]),
      makeRow(2, [{ col: 1, value: num(20) }]),
      // row 3 missing
      makeRow(4, [{ col: 1, value: num(10) }]),
    ]);
    const sortState: XlsxSortState = {
      ref: "A2:A4",
      sortConditions: [{ ref: "A2:A4" }],
    };
    const result = sortWorksheetRows(ws, sortState, makeRange(1, 1, 1, 4));

    // 10, 20 — the missing row has no cells and is not materialized in output
    expect(colValues(result, 1)).toEqual(["H", 10, 20]);
  });

  it("should sort entire row data (all columns move together)", () => {
    const ws = makeWorksheet([
      makeRow(1, [{ col: 1, value: str("Name") }, { col: 2, value: str("Age") }]),
      makeRow(2, [{ col: 1, value: str("Bob") }, { col: 2, value: num(30) }]),
      makeRow(3, [{ col: 1, value: str("Alice") }, { col: 2, value: num(25) }]),
    ]);
    const sortState: XlsxSortState = {
      ref: "A2:B3",
      sortConditions: [{ ref: "A2:A3" }], // sort by name ascending
    };
    const result = sortWorksheetRows(ws, sortState, makeRange(1, 1, 2, 3));

    expect(colValues(result, 1)).toEqual(["Name", "Alice", "Bob"]);
    expect(colValues(result, 2)).toEqual(["Age", 25, 30]); // ages follow their names
  });
});
