/**
 * @file Layout Detection Tests
 *
 * Tests for chart data layout detection from worksheet structure.
 */

import type { XlsxWorksheet, XlsxRow } from "@oxen/xlsx/domain/workbook";
import type { Cell, CellValue } from "@oxen/xlsx/domain/cell/types";
import { colIdx, rowIdx } from "@oxen/xlsx/domain/types";
import {
  detectChartDataLayout,
  countCategories,
  countSeries,
} from "./layout-detection";

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a cell at the given position with the given value.
 */
function createCell(col: number, row: number, value: CellValue): Cell {
  return {
    address: {
      col: colIdx(col),
      row: rowIdx(row),
      colAbsolute: false,
      rowAbsolute: false,
    },
    value,
  };
}

/**
 * Create a string cell value.
 */
function stringValue(value: string): CellValue {
  return { type: "string", value };
}

/**
 * Create a number cell value.
 */
function numberValue(value: number): CellValue {
  return { type: "number", value };
}

/**
 * Create an empty cell value.
 */
function emptyValue(): CellValue {
  return { type: "empty" };
}

/**
 * Create a row with the given cells.
 */
function createRow(rowNumber: number, cells: Cell[]): XlsxRow {
  return {
    rowNumber: rowIdx(rowNumber),
    cells,
  };
}

/**
 * Create a minimal test worksheet.
 */
function createWorksheet(rows: XlsxRow[]): XlsxWorksheet {
  return {
    dateSystem: "1900",
    name: "Sheet1",
    sheetId: 1,
    state: "visible",
    rows,
    xmlPath: "xl/worksheets/sheet1.xml",
  };
}

// =============================================================================
// detectChartDataLayout Tests
// =============================================================================

describe("detectChartDataLayout", () => {
  it("returns default layout for empty worksheet", () => {
    const worksheet = createWorksheet([]);

    const layout = detectChartDataLayout(worksheet);

    expect(layout.headerRow).toBe(1);
    expect(layout.dataStartRow).toBe(2);
    expect(layout.categoryCol).toBe(1);
    expect(layout.seriesStartCol).toBe(2);
    expect(layout.categoryCount).toBe(0);
    expect(layout.seriesCount).toBe(0);
  });

  it("handles single row data", () => {
    // Single data row with one category and one value
    // Row 1: Header (empty category header, "Series1")
    // Row 2: ("Cat1", 10)
    const worksheet = createWorksheet([
      createRow(1, [
        createCell(1, 1, emptyValue()),
        createCell(2, 1, stringValue("Series1")),
      ]),
      createRow(2, [
        createCell(1, 2, stringValue("Cat1")),
        createCell(2, 2, numberValue(10)),
      ]),
    ]);

    const layout = detectChartDataLayout(worksheet);

    expect(layout.categoryCount).toBe(1);
    expect(layout.seriesCount).toBe(1);
  });

  it("handles single column data", () => {
    // Single column with multiple categories but no series data
    // Row 1: Header row (empty)
    // Row 2-4: Categories only (no data in column B+)
    const worksheet = createWorksheet([
      createRow(1, [createCell(1, 1, emptyValue())]),
      createRow(2, [createCell(1, 2, stringValue("Cat1"))]),
      createRow(3, [createCell(1, 3, stringValue("Cat2"))]),
      createRow(4, [createCell(1, 4, stringValue("Cat3"))]),
    ]);

    const layout = detectChartDataLayout(worksheet);

    expect(layout.categoryCount).toBe(3);
    expect(layout.seriesCount).toBe(0);
  });

  it("counts categories correctly with gaps in data", () => {
    // Worksheet with gaps in category column
    // Row 1: Header
    // Row 2: Cat1 (present)
    // Row 3: (empty - gap)
    // Row 4: Cat3 (present)
    // Row 5: Cat4 (present)
    const worksheet = createWorksheet([
      createRow(1, [
        createCell(1, 1, emptyValue()),
        createCell(2, 1, stringValue("Series1")),
      ]),
      createRow(2, [
        createCell(1, 2, stringValue("Cat1")),
        createCell(2, 2, numberValue(10)),
      ]),
      createRow(3, [
        createCell(1, 3, emptyValue()),
        createCell(2, 3, numberValue(20)),
      ]),
      createRow(4, [
        createCell(1, 4, stringValue("Cat3")),
        createCell(2, 4, numberValue(30)),
      ]),
      createRow(5, [
        createCell(1, 5, stringValue("Cat4")),
        createCell(2, 5, numberValue(40)),
      ]),
    ]);

    const layout = detectChartDataLayout(worksheet);

    // categoryCount should be 4 because last category is at row 5 (row 5 - dataStartRow 2 + 1 = 4)
    expect(layout.categoryCount).toBe(4);
    expect(layout.seriesCount).toBe(1);
  });

  it("counts series correctly", () => {
    // Worksheet with multiple series
    // Row 1: Headers (empty, Series1, Series2, Series3)
    // Row 2: (Cat1, 10, 20, 30)
    // Row 3: (Cat2, 40, 50, 60)
    const worksheet = createWorksheet([
      createRow(1, [
        createCell(1, 1, emptyValue()),
        createCell(2, 1, stringValue("Series1")),
        createCell(3, 1, stringValue("Series2")),
        createCell(4, 1, stringValue("Series3")),
      ]),
      createRow(2, [
        createCell(1, 2, stringValue("Cat1")),
        createCell(2, 2, numberValue(10)),
        createCell(3, 2, numberValue(20)),
        createCell(4, 2, numberValue(30)),
      ]),
      createRow(3, [
        createCell(1, 3, stringValue("Cat2")),
        createCell(2, 3, numberValue(40)),
        createCell(3, 3, numberValue(50)),
        createCell(4, 3, numberValue(60)),
      ]),
    ]);

    const layout = detectChartDataLayout(worksheet);

    expect(layout.categoryCount).toBe(2);
    expect(layout.seriesCount).toBe(3);
  });
});

// =============================================================================
// countCategories Tests
// =============================================================================

describe("countCategories", () => {
  it("returns 0 for empty worksheet", () => {
    const worksheet = createWorksheet([]);

    const count = countCategories(worksheet);

    expect(count).toBe(0);
  });

  it("counts non-empty cells in category column", () => {
    // Worksheet with 3 categories
    const worksheet = createWorksheet([
      createRow(1, [createCell(1, 1, emptyValue())]),
      createRow(2, [createCell(1, 2, stringValue("Cat1"))]),
      createRow(3, [createCell(1, 3, stringValue("Cat2"))]),
      createRow(4, [createCell(1, 4, stringValue("Cat3"))]),
    ]);

    const count = countCategories(worksheet);

    expect(count).toBe(3);
  });
});

// =============================================================================
// countSeries Tests
// =============================================================================

describe("countSeries", () => {
  it("returns 0 for empty worksheet", () => {
    const worksheet = createWorksheet([]);

    const count = countSeries(worksheet);

    expect(count).toBe(0);
  });

  it("counts non-empty cells in header row", () => {
    // Worksheet with 4 series headers (columns B, C, D, E)
    const worksheet = createWorksheet([
      createRow(1, [
        createCell(1, 1, emptyValue()), // Column A (category header)
        createCell(2, 1, stringValue("Series1")), // Column B
        createCell(3, 1, stringValue("Series2")), // Column C
        createCell(4, 1, stringValue("Series3")), // Column D
        createCell(5, 1, stringValue("Series4")), // Column E
      ]),
    ]);

    const count = countSeries(worksheet);

    expect(count).toBe(4);
  });
});
