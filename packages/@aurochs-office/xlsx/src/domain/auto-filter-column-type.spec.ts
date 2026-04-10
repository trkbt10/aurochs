/**
 * Tests for column data type inference used by autoFilter menus.
 *
 * Excel dynamically changes sort labels and filter submenus based on
 * the predominant data type in a column:
 *
 * | Column type | Sort asc label | Sort desc label | Filter submenu    |
 * |-------------|---------------|----------------|-------------------|
 * | text        | A → Z         | Z → A          | テキストフィルター |
 * | number      | 小さい順       | 大きい順        | 数値フィルター     |
 * | date        | 古い順         | 新しい順        | 日付フィルター     |
 * | mixed       | A → Z         | Z → A          | (none)            |
 */

import { describe, it, expect } from "vitest";
import { inferColumnDataType, type ColumnDataType } from "./auto-filter-column-type";
import type { CellValue } from "./cell/types";
import type { CellAddress, CellRange } from "./cell/address";
import type { XlsxWorksheet, XlsxRow } from "./workbook";
import type { XlsxAutoFilter } from "./auto-filter";
import { colIdx, rowIdx, sheetId } from "./types";

// =============================================================================
// Helpers
// =============================================================================

function addr(col: number, row: number): CellAddress {
  return { col: colIdx(col), row: rowIdx(row), colAbsolute: false, rowAbsolute: false };
}

function makeRange(sc: number, sr: number, ec: number, er: number): CellRange {
  return { start: addr(sc, sr), end: addr(ec, er) };
}

function makeRow(rowNumber: number, cells: readonly { col: number; value: CellValue }[]): XlsxRow {
  return {
    rowNumber: rowIdx(rowNumber),
    cells: cells.map((c) => ({ address: addr(c.col, rowNumber), value: c.value })),
  };
}

function makeWorksheet(rows: readonly XlsxRow[], autoFilter?: XlsxAutoFilter): XlsxWorksheet {
  return {
    name: "Sheet1",
    sheetId: sheetId(1),
    state: "visible",
    rows,
    xmlPath: "xl/worksheets/sheet1.xml",
    dateSystem: "1900",
    autoFilter,
  };
}

function str(v: string): CellValue { return { type: "string", value: v }; }
function num(v: number): CellValue { return { type: "number", value: v }; }
function date(y: number, m: number, d: number): CellValue { return { type: "date", value: new Date(y, m - 1, d) }; }
function bool(v: boolean): CellValue { return { type: "boolean", value: v }; }
function empty(): CellValue { return { type: "empty" }; }
function err(): CellValue { return { type: "error", value: "#N/A" }; }

// =============================================================================
// Tests
// =============================================================================

describe("inferColumnDataType", () => {
  it("should return 'text' when all data cells are strings", () => {
    const af: XlsxAutoFilter = { ref: makeRange(1, 1, 1, 4) };
    const ws = makeWorksheet([
      makeRow(1, [{ col: 1, value: str("Header") }]),
      makeRow(2, [{ col: 1, value: str("Alice") }]),
      makeRow(3, [{ col: 1, value: str("Bob") }]),
      makeRow(4, [{ col: 1, value: str("Charlie") }]),
    ], af);
    expect(inferColumnDataType(ws, af, 1)).toBe("text");
  });

  it("should return 'number' when all data cells are numbers", () => {
    const af: XlsxAutoFilter = { ref: makeRange(1, 1, 1, 4) };
    const ws = makeWorksheet([
      makeRow(1, [{ col: 1, value: str("Score") }]),
      makeRow(2, [{ col: 1, value: num(100) }]),
      makeRow(3, [{ col: 1, value: num(200) }]),
      makeRow(4, [{ col: 1, value: num(300) }]),
    ], af);
    expect(inferColumnDataType(ws, af, 1)).toBe("number");
  });

  it("should return 'date' when all data cells are dates", () => {
    const af: XlsxAutoFilter = { ref: makeRange(1, 1, 1, 4) };
    const ws = makeWorksheet([
      makeRow(1, [{ col: 1, value: str("Date") }]),
      makeRow(2, [{ col: 1, value: date(2024, 1, 15) }]),
      makeRow(3, [{ col: 1, value: date(2024, 6, 1) }]),
      makeRow(4, [{ col: 1, value: date(2024, 12, 31) }]),
    ], af);
    expect(inferColumnDataType(ws, af, 1)).toBe("date");
  });

  it("should return 'mixed' when column has both text and numbers", () => {
    const af: XlsxAutoFilter = { ref: makeRange(1, 1, 1, 4) };
    const ws = makeWorksheet([
      makeRow(1, [{ col: 1, value: str("Data") }]),
      makeRow(2, [{ col: 1, value: str("Alice") }]),
      makeRow(3, [{ col: 1, value: num(100) }]),
      makeRow(4, [{ col: 1, value: str("Bob") }]),
    ], af);
    expect(inferColumnDataType(ws, af, 1)).toBe("mixed");
  });

  it("should ignore empty cells when determining type", () => {
    const af: XlsxAutoFilter = { ref: makeRange(1, 1, 1, 5) };
    const ws = makeWorksheet([
      makeRow(1, [{ col: 1, value: str("Score") }]),
      makeRow(2, [{ col: 1, value: num(10) }]),
      makeRow(3, [{ col: 1, value: empty() }]),
      makeRow(4, [{ col: 1, value: num(30) }]),
      // row 5 missing entirely
    ], af);
    expect(inferColumnDataType(ws, af, 1)).toBe("number");
  });

  it("should ignore error cells when determining type", () => {
    const af: XlsxAutoFilter = { ref: makeRange(1, 1, 1, 4) };
    const ws = makeWorksheet([
      makeRow(1, [{ col: 1, value: str("Data") }]),
      makeRow(2, [{ col: 1, value: num(10) }]),
      makeRow(3, [{ col: 1, value: err() }]),
      makeRow(4, [{ col: 1, value: num(30) }]),
    ], af);
    expect(inferColumnDataType(ws, af, 1)).toBe("number");
  });

  it("should ignore boolean cells when determining type (treat as secondary)", () => {
    const af: XlsxAutoFilter = { ref: makeRange(1, 1, 1, 4) };
    const ws = makeWorksheet([
      makeRow(1, [{ col: 1, value: str("Flag") }]),
      makeRow(2, [{ col: 1, value: num(1) }]),
      makeRow(3, [{ col: 1, value: bool(true) }]),
      makeRow(4, [{ col: 1, value: num(0) }]),
    ], af);
    // booleans don't change the dominant type
    expect(inferColumnDataType(ws, af, 1)).toBe("number");
  });

  it("should return 'text' when column is all empty (fallback)", () => {
    const af: XlsxAutoFilter = { ref: makeRange(1, 1, 1, 3) };
    const ws = makeWorksheet([
      makeRow(1, [{ col: 1, value: str("Header") }]),
      makeRow(2, [{ col: 1, value: empty() }]),
      makeRow(3, [{ col: 1, value: empty() }]),
    ], af);
    expect(inferColumnDataType(ws, af, 1)).toBe("text");
  });

  it("should skip header row when inferring type", () => {
    // Header is text "Name", but data is all numbers
    const af: XlsxAutoFilter = { ref: makeRange(1, 1, 1, 3) };
    const ws = makeWorksheet([
      makeRow(1, [{ col: 1, value: str("Name") }]),
      makeRow(2, [{ col: 1, value: num(100) }]),
      makeRow(3, [{ col: 1, value: num(200) }]),
    ], af);
    expect(inferColumnDataType(ws, af, 1)).toBe("number");
  });

  it("should handle non-A1 autoFilter range correctly", () => {
    const af: XlsxAutoFilter = { ref: makeRange(3, 5, 4, 8) };
    const ws = makeWorksheet([
      makeRow(5, [{ col: 3, value: str("Header") }]),
      makeRow(6, [{ col: 3, value: date(2024, 1, 1) }]),
      makeRow(7, [{ col: 3, value: date(2024, 6, 15) }]),
      makeRow(8, [{ col: 3, value: date(2024, 12, 31) }]),
    ], af);
    expect(inferColumnDataType(ws, af, 3)).toBe("date");
  });

  it("should treat numbers+dates as 'number' (dates are numeric in Excel)", () => {
    const af: XlsxAutoFilter = { ref: makeRange(1, 1, 1, 4) };
    const ws = makeWorksheet([
      makeRow(1, [{ col: 1, value: str("Mixed") }]),
      makeRow(2, [{ col: 1, value: num(42000) }]),
      makeRow(3, [{ col: 1, value: date(2024, 1, 1) }]),
      makeRow(4, [{ col: 1, value: num(43000) }]),
    ], af);
    // In Excel, dates are stored as serial numbers. number+date = number category.
    expect(inferColumnDataType(ws, af, 1)).toBe("number");
  });
});
