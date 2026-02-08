/**
 * @file Tests for Chart-Workbook Synchronization (Write Operations)
 */

import { syncChartToWorkbook } from "./chart-workbook-syncer";
import type { ChartDataSpec } from "../types";
import type { XlsxWorkbook, XlsxWorksheet, XlsxRow } from "@aurochs-office/xlsx/domain/workbook";
import type { Cell } from "@aurochs-office/xlsx/domain/cell/types";
import { createDefaultStyleSheet } from "@aurochs-office/xlsx/domain/style/types";
import { colIdx, rowIdx } from "@aurochs-office/xlsx/domain/types";

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestWorkbook(sheets: XlsxWorksheet[]): XlsxWorkbook {
  return {
    dateSystem: "1900",
    sheets,
    styles: createDefaultStyleSheet(),
    sharedStrings: [],
  };
}

function createTestWorksheet(name: string, rows: XlsxRow[] = []): XlsxWorksheet {
  return {
    dateSystem: "1900",
    name,
    sheetId: 1,
    state: "visible",
    rows,
    xmlPath: "xl/worksheets/sheet1.xml",
  };
}

function createStringCell(col: number, row: number, value: string): Cell {
  return {
    address: {
      col: colIdx(col),
      row: rowIdx(row),
      colAbsolute: false,
      rowAbsolute: false,
    },
    value: { type: "string", value },
  };
}

function createTestChartData(): ChartDataSpec {
  return {
    categories: ["Q1", "Q2", "Q3", "Q4"],
    series: [
      { name: "Sales", values: [100, 120, 140, 160] },
      { name: "Costs", values: [80, 85, 90, 95] },
    ],
  };
}

// =============================================================================
// syncChartToWorkbook Tests
// =============================================================================

describe("syncChartToWorkbook", () => {
  test("updates workbook with chart data", () => {
    const workbook = createTestWorkbook([createTestWorksheet("Sheet1")]);
    const chartData = createTestChartData();

    const result = syncChartToWorkbook(workbook, chartData);

    expect(result.sheets.length).toBe(1);
    const sheet = result.sheets[0];

    // Should have 5 rows (1 header + 4 data rows)
    expect(sheet.rows.length).toBe(5);

    // Check header row
    const headerRow = sheet.rows[0];
    expect(headerRow.rowNumber).toBe(1);
    expect(headerRow.cells.length).toBe(3); // A1, B1, C1

    // B1 should be "Sales"
    const b1 = headerRow.cells[1];
    expect(b1.value.type).toBe("string");
    if (b1.value.type === "string") {
      expect(b1.value.value).toBe("Sales");
    }

    // C1 should be "Costs"
    const c1 = headerRow.cells[2];
    expect(c1.value.type).toBe("string");
    if (c1.value.type === "string") {
      expect(c1.value.value).toBe("Costs");
    }

    // Check first data row (Q1)
    const row2 = sheet.rows[1];
    expect(row2.rowNumber).toBe(2);

    // A2 should be "Q1"
    const a2 = row2.cells[0];
    expect(a2.value.type).toBe("string");
    if (a2.value.type === "string") {
      expect(a2.value.value).toBe("Q1");
    }

    // B2 should be 100
    const b2 = row2.cells[1];
    expect(b2.value.type).toBe("number");
    if (b2.value.type === "number") {
      expect(b2.value.value).toBe(100);
    }

    // C2 should be 80
    const c2 = row2.cells[2];
    expect(c2.value.type).toBe("number");
    if (c2.value.type === "number") {
      expect(c2.value.value).toBe(80);
    }
  });

  test("preserves A1 cell from existing worksheet", () => {
    const rows: XlsxRow[] = [
      {
        rowNumber: rowIdx(1),
        cells: [createStringCell(1, 1, "Title")],
      },
    ];
    const workbook = createTestWorkbook([createTestWorksheet("Sheet1", rows)]);
    const chartData: ChartDataSpec = {
      categories: ["A", "B"],
      series: [{ name: "Data", values: [1, 2] }],
    };

    const result = syncChartToWorkbook(workbook, chartData);

    const a1 = result.sheets[0].rows[0].cells[0];
    expect(a1.value.type).toBe("string");
    if (a1.value.type === "string") {
      expect(a1.value.value).toBe("Title");
    }
  });

  test("throws error if workbook has no sheets", () => {
    const workbook = createTestWorkbook([]);
    const chartData = createTestChartData();

    expect(() => syncChartToWorkbook(workbook, chartData)).toThrow("syncChartToWorkbook: workbook has no sheets");
  });

  test("updates dimension correctly", () => {
    const workbook = createTestWorkbook([createTestWorksheet("Sheet1")]);
    const chartData: ChartDataSpec = {
      categories: ["A", "B", "C"],
      series: [
        { name: "X", values: [1, 2, 3] },
        { name: "Y", values: [4, 5, 6] },
      ],
    };

    const result = syncChartToWorkbook(workbook, chartData);
    const dimension = result.sheets[0].dimension;

    expect(dimension).toBeDefined();
    if (dimension) {
      expect(dimension.start.col).toBe(1);
      expect(dimension.start.row).toBe(1);
      expect(dimension.end.col).toBe(3); // A, B, C (3 columns)
      expect(dimension.end.row).toBe(4); // 1 header + 3 data rows
    }
  });

  test("handles single series", () => {
    const workbook = createTestWorkbook([createTestWorksheet("Sheet1")]);
    const chartData: ChartDataSpec = {
      categories: ["X", "Y"],
      series: [{ name: "Only", values: [10, 20] }],
    };

    const result = syncChartToWorkbook(workbook, chartData);

    expect(result.sheets[0].rows.length).toBe(3);
    expect(result.sheets[0].rows[0].cells.length).toBe(2); // A1, B1
  });

  test("handles empty categories", () => {
    const workbook = createTestWorkbook([createTestWorksheet("Sheet1")]);
    const chartData: ChartDataSpec = {
      categories: [],
      series: [{ name: "Empty", values: [] }],
    };

    const result = syncChartToWorkbook(workbook, chartData);

    // Should only have header row
    expect(result.sheets[0].rows.length).toBe(1);
  });
});
