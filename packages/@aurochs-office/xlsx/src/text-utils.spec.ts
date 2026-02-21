/**
 * @file Text extraction utilities tests for XLSX
 */

import type { WorkbookCell, WorkbookRow, WorkbookSheet, Workbook } from "./workbook-parser";
import {
  extractTextFromCell,
  extractTextFromRow,
  extractTextFromSheet,
  extractTextFromWorkbook,
} from "./text-utils";

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

// =============================================================================
// extractTextFromCell Tests
// =============================================================================

describe("extractTextFromCell", () => {
  it("extracts text from string cell", () => {
    const cell = createCell("Hello World");
    expect(extractTextFromCell(cell)).toBe("Hello World");
  });

  it("extracts text from number cell", () => {
    const cell = createCell(42);
    expect(extractTextFromCell(cell)).toBe("42");
  });

  it("extracts text from decimal number cell", () => {
    const cell = createCell(3.14159);
    expect(extractTextFromCell(cell)).toBe("3.14159");
  });

  it("extracts TRUE from boolean true cell", () => {
    const cell = createCell(true);
    expect(extractTextFromCell(cell)).toBe("TRUE");
  });

  it("extracts FALSE from boolean false cell", () => {
    const cell = createCell(false);
    expect(extractTextFromCell(cell)).toBe("FALSE");
  });

  it("extracts empty string from empty cell", () => {
    const cell = createCell("");
    expect(extractTextFromCell(cell)).toBe("");
  });
});

// =============================================================================
// extractTextFromRow Tests
// =============================================================================

describe("extractTextFromRow", () => {
  it("extracts text from row with single cell", () => {
    const row = createRow(1, { A: "Hello" });
    expect(extractTextFromRow(row)).toBe("Hello");
  });

  it("joins multiple cells with tabs", () => {
    const row = createRow(1, { A: "Hello", B: "World" });
    const text = extractTextFromRow(row);
    expect(text).toContain("Hello");
    expect(text).toContain("World");
    expect(text).toContain("\t");
  });

  it("handles mixed value types", () => {
    const row = createRow(1, { A: "Text", B: 123, C: true });
    const text = extractTextFromRow(row);
    expect(text).toContain("Text");
    expect(text).toContain("123");
    expect(text).toContain("TRUE");
  });

  it("returns empty string for empty row", () => {
    const row = createRow(1, {});
    expect(extractTextFromRow(row)).toBe("");
  });
});

// =============================================================================
// extractTextFromSheet Tests
// =============================================================================

describe("extractTextFromSheet", () => {
  it("extracts text from sheet with single row", () => {
    const sheet = createSheet("Sheet1", [createRow(1, { A: "Hello", B: "World" })]);
    const text = extractTextFromSheet(sheet);
    expect(text).toContain("Hello");
    expect(text).toContain("World");
  });

  it("joins multiple rows with newlines", () => {
    const sheet = createSheet("Sheet1", [
      createRow(1, { A: "Row 1" }),
      createRow(2, { A: "Row 2" }),
    ]);
    const text = extractTextFromSheet(sheet);
    expect(text).toContain("Row 1");
    expect(text).toContain("Row 2");
    expect(text).toContain("\n");
  });

  it("sorts rows by row number", () => {
    const sheet = createSheet("Sheet1", [
      createRow(3, { A: "Third" }),
      createRow(1, { A: "First" }),
      createRow(2, { A: "Second" }),
    ]);
    const text = extractTextFromSheet(sheet);
    const lines = text.split("\n");
    expect(lines[0]).toContain("First");
    expect(lines[1]).toContain("Second");
    expect(lines[2]).toContain("Third");
  });

  it("returns empty string for empty sheet", () => {
    const sheet = createSheet("Sheet1", []);
    expect(extractTextFromSheet(sheet)).toBe("");
  });
});

// =============================================================================
// extractTextFromWorkbook Tests
// =============================================================================

describe("extractTextFromWorkbook", () => {
  it("extracts text from workbook with single sheet", () => {
    const sheet = createSheet("Sheet1", [createRow(1, { A: "Hello" })]);
    const workbook: Workbook = {
      sheets: new Map([["Sheet1", sheet]]),
      sharedStrings: [],
      package: {} as Workbook["package"],
    };

    const text = extractTextFromWorkbook(workbook);
    expect(text).toContain("[Sheet1]");
    expect(text).toContain("Hello");
  });

  it("includes sheet names as headers", () => {
    const sheet1 = createSheet("Sales", [createRow(1, { A: "100" })]);
    const sheet2 = createSheet("Expenses", [createRow(1, { A: "50" })]);
    const workbook: Workbook = {
      sheets: new Map([
        ["Sales", sheet1],
        ["Expenses", sheet2],
      ]),
      sharedStrings: [],
      package: {} as Workbook["package"],
    };

    const text = extractTextFromWorkbook(workbook);
    expect(text).toContain("[Sales]");
    expect(text).toContain("[Expenses]");
    expect(text).toContain("100");
    expect(text).toContain("50");
  });

  it("separates sheets with double newlines", () => {
    const sheet1 = createSheet("Sheet1", [createRow(1, { A: "A" })]);
    const sheet2 = createSheet("Sheet2", [createRow(1, { A: "B" })]);
    const workbook: Workbook = {
      sheets: new Map([
        ["Sheet1", sheet1],
        ["Sheet2", sheet2],
      ]),
      sharedStrings: [],
      package: {} as Workbook["package"],
    };

    const text = extractTextFromWorkbook(workbook);
    expect(text).toContain("\n\n");
  });

  it("returns empty result for empty workbook", () => {
    const workbook: Workbook = {
      sheets: new Map(),
      sharedStrings: [],
      package: {} as Workbook["package"],
    };

    const text = extractTextFromWorkbook(workbook);
    expect(text).toBe("");
  });
});
