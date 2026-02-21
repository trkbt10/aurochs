/**
 * @file XLSX extract API tests
 */

import type { Workbook, WorkbookSheet, WorkbookRow, WorkbookCell } from "../workbook-parser";
import { extractSheetSegments } from "./index";

// =============================================================================
// Test Helpers
// =============================================================================

function createCell(value: string | number | boolean, ref = "A1"): WorkbookCell {
  const type = typeof value === "string" ? "s" : typeof value === "number" ? "n" : "b";
  return {
    ref,
    type: type as WorkbookCell["type"],
    rawValue: String(value),
    value,
  };
}

function createRow(rowNumber: number, cells: Record<string, WorkbookCell["value"]>): WorkbookRow {
  const cellMap = new Map<string, WorkbookCell>();
  for (const [col, value] of Object.entries(cells)) {
    cellMap.set(col, createCell(value, `${col}${rowNumber}`));
  }
  return { rowNumber, cells: cellMap };
}

function createSheet(name: string, rows: WorkbookRow[]): WorkbookSheet {
  const rowMap = new Map<number, WorkbookRow>();
  for (const row of rows) {
    rowMap.set(row.rowNumber, row);
  }
  return { name, id: "rId1", rows: rowMap, xmlPath: `xl/worksheets/sheet1.xml` };
}

function createWorkbook(sheets: WorkbookSheet[]): Workbook {
  const sheetMap = new Map<string, WorkbookSheet>();
  for (const sheet of sheets) {
    sheetMap.set(sheet.name, sheet);
  }
  return {
    sheets: sheetMap,
    sharedStrings: [],
    package: {} as Workbook["package"],
  };
}

// =============================================================================
// extractSheetSegments Tests
// =============================================================================

describe("extractSheetSegments", () => {
  it("returns empty segments for empty workbook", () => {
    const workbook = createWorkbook([]);
    const result = extractSheetSegments(workbook);

    expect(result.segments).toHaveLength(0);
    expect(result.totalText).toBe("");
    expect(result.sourceLength).toBe(0);
  });

  it("extracts single sheet segment", () => {
    const sheet = createSheet("Sheet1", [createRow(1, { A: "Hello", B: "World" })]);
    const workbook = createWorkbook([sheet]);

    const result = extractSheetSegments(workbook);

    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].type).toBe("sheet");
    expect(result.segments[0].metadata.sheetName).toBe("Sheet1");
    expect(result.segments[0].text).toContain("Hello");
    expect(result.segments[0].text).toContain("World");
  });

  it("extracts multiple sheet segments", () => {
    const sheet1 = createSheet("Sales", [createRow(1, { A: "100" })]);
    const sheet2 = createSheet("Expenses", [createRow(1, { A: "50" })]);
    const workbook = createWorkbook([sheet1, sheet2]);

    const result = extractSheetSegments(workbook);

    expect(result.segments).toHaveLength(2);
    expect(result.segments[0].metadata.sheetName).toBe("Sales");
    expect(result.segments[1].metadata.sheetName).toBe("Expenses");
  });

  it("includes correct metadata", () => {
    const sheet = createSheet("Data", [
      createRow(1, { A: "A1", B: "B1" }),
      createRow(2, { A: "A2", B: "B2", C: "C2" }),
    ]);
    const workbook = createWorkbook([sheet]);

    const result = extractSheetSegments(workbook);
    const segment = result.segments[0];

    expect(segment.metadata.sheetName).toBe("Data");
    expect(segment.metadata.rowCount).toBe(2);
    expect(segment.metadata.cellCount).toBe(5);
  });

  it("assigns sequential IDs to segments", () => {
    const sheet1 = createSheet("Sheet1", [createRow(1, { A: "A" })]);
    const sheet2 = createSheet("Sheet2", [createRow(1, { A: "B" })]);
    const sheet3 = createSheet("Sheet3", [createRow(1, { A: "C" })]);
    const workbook = createWorkbook([sheet1, sheet2, sheet3]);

    const result = extractSheetSegments(workbook);

    expect(result.segments[0].id).toBe("sheet-0");
    expect(result.segments[1].id).toBe("sheet-1");
    expect(result.segments[2].id).toBe("sheet-2");
  });

  it("calculates correct source ranges", () => {
    const sheet1 = createSheet("Sheet1", [createRow(1, { A: "ABC" })]); // 3 chars
    const sheet2 = createSheet("Sheet2", [createRow(1, { A: "DEFGH" })]); // 5 chars
    const workbook = createWorkbook([sheet1, sheet2]);

    const result = extractSheetSegments(workbook);

    expect(result.segments[0].sourceRange.start).toBe(0);
    expect(result.segments[0].sourceRange.end).toBe(3);
    expect(result.segments[1].sourceRange.start).toBe(4); // 3 + 1 (separator)
    expect(result.segments[1].sourceRange.end).toBe(9); // 4 + 5
  });

  it("joins all text in totalText", () => {
    const sheet1 = createSheet("Sheet1", [createRow(1, { A: "Hello" })]);
    const sheet2 = createSheet("Sheet2", [createRow(1, { A: "World" })]);
    const workbook = createWorkbook([sheet1, sheet2]);

    const result = extractSheetSegments(workbook);

    expect(result.totalText).toContain("Hello");
    expect(result.totalText).toContain("World");
    expect(result.totalText).toContain("\n");
  });

  it("handles empty sheets", () => {
    const emptySheet = createSheet("Empty", []);
    const workbook = createWorkbook([emptySheet]);

    const result = extractSheetSegments(workbook);

    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].text).toBe("");
    expect(result.segments[0].metadata.rowCount).toBe(0);
    expect(result.segments[0].metadata.cellCount).toBe(0);
  });
});
