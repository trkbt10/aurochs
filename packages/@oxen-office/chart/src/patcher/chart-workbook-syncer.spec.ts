/**
 * @file Tests for Chart-Workbook Synchronization
 *
 * Tests the synchronization between PPTX chart data and embedded XLSX workbooks.
 */

import {
  syncChartToWorkbook,
  extractChartDataFromWorkbook,
  resolveEmbeddedXlsxPath,
  type ChartDataUpdate,
} from "./chart-workbook-syncer";
import type { XlsxWorkbook, XlsxWorksheet, XlsxRow } from "@oxen-office/xlsx/domain/workbook";
import type { Cell } from "@oxen-office/xlsx/domain/cell/types";
import { createDefaultStyleSheet } from "@oxen-office/xlsx/domain/style/types";
import { colIdx, rowIdx } from "@oxen-office/xlsx/domain/types";

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Create a minimal valid workbook for testing.
 */
function createTestWorkbook(sheets: XlsxWorksheet[]): XlsxWorkbook {
  return {
    dateSystem: "1900",
    sheets,
    styles: createDefaultStyleSheet(),
    sharedStrings: [],
  };
}

/**
 * Create a minimal valid worksheet for testing.
 */
function createTestWorksheet(
  name: string,
  rows: XlsxRow[] = [],
): XlsxWorksheet {
  return {
    dateSystem: "1900",
    name,
    sheetId: 1,
    state: "visible",
    rows,
    xmlPath: "xl/worksheets/sheet1.xml",
  };
}

/**
 * Create a cell with string value.
 */
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

/**
 * Create a cell with numeric value.
 */
function createNumberCell(col: number, row: number, value: number): Cell {
  return {
    address: {
      col: colIdx(col),
      row: rowIdx(row),
      colAbsolute: false,
      rowAbsolute: false,
    },
    value: { type: "number", value },
  };
}

/**
 * Create a test chart data object.
 */
function createTestChartData(): ChartDataUpdate {
  return {
    categories: ["Q1", "Q2", "Q3", "Q4"],
    series: [
      { name: "Sales", values: [100, 120, 140, 160] },
      { name: "Costs", values: [80, 85, 90, 95] },
    ],
  };
}

/**
 * Create a workbook with existing chart data.
 */
function createWorkbookWithChartData(): XlsxWorkbook {
  const rows: XlsxRow[] = [
    // Row 1: headers (A1 empty, B1 = "Sales", C1 = "Costs")
    {
      rowNumber: rowIdx(1),
      cells: [
        createStringCell(1, 1, ""),
        createStringCell(2, 1, "Sales"),
        createStringCell(3, 1, "Costs"),
      ],
    },
    // Row 2: Q1
    {
      rowNumber: rowIdx(2),
      cells: [
        createStringCell(1, 2, "Q1"),
        createNumberCell(2, 2, 100),
        createNumberCell(3, 2, 80),
      ],
    },
    // Row 3: Q2
    {
      rowNumber: rowIdx(3),
      cells: [
        createStringCell(1, 3, "Q2"),
        createNumberCell(2, 3, 120),
        createNumberCell(3, 3, 85),
      ],
    },
    // Row 4: Q3
    {
      rowNumber: rowIdx(4),
      cells: [
        createStringCell(1, 4, "Q3"),
        createNumberCell(2, 4, 140),
        createNumberCell(3, 4, 90),
      ],
    },
    // Row 5: Q4
    {
      rowNumber: rowIdx(5),
      cells: [
        createStringCell(1, 5, "Q4"),
        createNumberCell(2, 5, 160),
        createNumberCell(3, 5, 95),
      ],
    },
  ];

  return createTestWorkbook([createTestWorksheet("Sheet1", rows)]);
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
    const chartData: ChartDataUpdate = {
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

    expect(() => syncChartToWorkbook(workbook, chartData)).toThrow(
      "syncChartToWorkbook: workbook has no sheets",
    );
  });

  test("updates dimension correctly", () => {
    const workbook = createTestWorkbook([createTestWorksheet("Sheet1")]);
    const chartData: ChartDataUpdate = {
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
    const chartData: ChartDataUpdate = {
      categories: ["X", "Y"],
      series: [{ name: "Only", values: [10, 20] }],
    };

    const result = syncChartToWorkbook(workbook, chartData);

    expect(result.sheets[0].rows.length).toBe(3);
    expect(result.sheets[0].rows[0].cells.length).toBe(2); // A1, B1
  });

  test("handles empty categories", () => {
    const workbook = createTestWorkbook([createTestWorksheet("Sheet1")]);
    const chartData: ChartDataUpdate = {
      categories: [],
      series: [{ name: "Empty", values: [] }],
    };

    const result = syncChartToWorkbook(workbook, chartData);

    // Should only have header row
    expect(result.sheets[0].rows.length).toBe(1);
  });
});

// =============================================================================
// extractChartDataFromWorkbook Tests
// =============================================================================

describe("extractChartDataFromWorkbook", () => {
  test("extracts chart data from workbook", () => {
    const workbook = createWorkbookWithChartData();

    const result = extractChartDataFromWorkbook(workbook);

    expect(result.categories).toEqual(["Q1", "Q2", "Q3", "Q4"]);
    expect(result.series.length).toBe(2);
    expect(result.series[0].name).toBe("Sales");
    expect(result.series[0].values).toEqual([100, 120, 140, 160]);
    expect(result.series[1].name).toBe("Costs");
    expect(result.series[1].values).toEqual([80, 85, 90, 95]);
  });

  test("extracts from specific sheet index", () => {
    const sheet1 = createTestWorksheet("Sheet1", [
      {
        rowNumber: rowIdx(1),
        cells: [createStringCell(1, 1, ""), createStringCell(2, 1, "A")],
      },
      {
        rowNumber: rowIdx(2),
        cells: [createStringCell(1, 2, "Cat1"), createNumberCell(2, 2, 1)],
      },
    ]);
    const sheet2 = createTestWorksheet("Sheet2", [
      {
        rowNumber: rowIdx(1),
        cells: [createStringCell(1, 1, ""), createStringCell(2, 1, "B")],
      },
      {
        rowNumber: rowIdx(2),
        cells: [createStringCell(1, 2, "Cat2"), createNumberCell(2, 2, 2)],
      },
    ]);
    const workbook = createTestWorkbook([sheet1, sheet2]);

    const result = extractChartDataFromWorkbook(workbook, 1);

    expect(result.categories).toEqual(["Cat2"]);
    expect(result.series[0].name).toBe("B");
    expect(result.series[0].values).toEqual([2]);
  });

  test("throws error for invalid sheet index", () => {
    const workbook = createWorkbookWithChartData();

    expect(() => extractChartDataFromWorkbook(workbook, 5)).toThrow(
      /sheet index 5 out of range/,
    );
  });

  test("throws error for negative sheet index", () => {
    const workbook = createWorkbookWithChartData();

    expect(() => extractChartDataFromWorkbook(workbook, -1)).toThrow(
      /sheet index -1 out of range/,
    );
  });

  test("handles empty worksheet", () => {
    const workbook = createTestWorkbook([createTestWorksheet("Empty")]);

    const result = extractChartDataFromWorkbook(workbook);

    expect(result.categories).toEqual([]);
    expect(result.series).toEqual([]);
  });

  test("handles missing cells gracefully", () => {
    // Sparse data with gaps
    const rows: XlsxRow[] = [
      {
        rowNumber: rowIdx(1),
        cells: [createStringCell(2, 1, "Series")], // Missing A1
      },
      {
        rowNumber: rowIdx(2),
        cells: [createStringCell(1, 2, "Cat")], // Missing B2
      },
    ];
    const workbook = createTestWorkbook([createTestWorksheet("Sparse", rows)]);

    const result = extractChartDataFromWorkbook(workbook);

    expect(result.categories).toEqual(["Cat"]);
    expect(result.series[0].name).toBe("Series");
    expect(result.series[0].values).toEqual([0]); // Missing value defaults to 0
  });
});

// =============================================================================
// resolveEmbeddedXlsxPath Tests
// =============================================================================

describe("resolveEmbeddedXlsxPath", () => {
  test("resolves xlsx path from chart relationships", () => {
    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chartUserShapes" Target="../drawings/drawing1.xml"/>
        <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/package" Target="../embeddings/Microsoft_Excel_Worksheet1.xlsx"/>
      </Relationships>`;

    const result = resolveEmbeddedXlsxPath(relsXml);

    expect(result).toBe("../embeddings/Microsoft_Excel_Worksheet1.xlsx");
  });

  test("returns undefined when no package relationship exists", () => {
    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chartUserShapes" Target="../drawings/drawing1.xml"/>
      </Relationships>`;

    const result = resolveEmbeddedXlsxPath(relsXml);

    expect(result).toBeUndefined();
  });

  test("returns undefined for empty string", () => {
    const result = resolveEmbeddedXlsxPath("");

    expect(result).toBeUndefined();
  });

  test("returns undefined for invalid XML", () => {
    const result = resolveEmbeddedXlsxPath("not valid xml");

    expect(result).toBeUndefined();
  });

  test("ignores non-xlsx package relationships", () => {
    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/package" Target="../embeddings/document.docx"/>
      </Relationships>`;

    const result = resolveEmbeddedXlsxPath(relsXml);

    expect(result).toBeUndefined();
  });

  test("handles multiple xlsx relationships (returns first)", () => {
    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/package" Target="../embeddings/first.xlsx"/>
        <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/package" Target="../embeddings/second.xlsx"/>
      </Relationships>`;

    const result = resolveEmbeddedXlsxPath(relsXml);

    expect(result).toBe("../embeddings/first.xlsx");
  });
});

// =============================================================================
// Round-trip Tests
// =============================================================================

describe("round-trip", () => {
  test("data survives sync -> extract cycle", () => {
    const workbook = createTestWorkbook([createTestWorksheet("Sheet1")]);
    const originalData = createTestChartData();

    // Sync chart data to workbook
    const updatedWorkbook = syncChartToWorkbook(workbook, originalData);

    // Extract chart data from workbook
    const extractedData = extractChartDataFromWorkbook(updatedWorkbook);

    // Verify data is preserved
    expect(extractedData.categories).toEqual(originalData.categories);
    expect(extractedData.series.length).toBe(originalData.series.length);

    for (let i = 0; i < originalData.series.length; i++) {
      expect(extractedData.series[i].name).toBe(originalData.series[i].name);
      expect(extractedData.series[i].values).toEqual(originalData.series[i].values);
    }
  });

  test("handles complex data in round-trip", () => {
    const workbook = createTestWorkbook([createTestWorksheet("Sheet1")]);
    const originalData: ChartDataUpdate = {
      categories: [
        "January 2024",
        "February 2024",
        "March 2024",
        "April 2024",
        "May 2024",
        "June 2024",
      ],
      series: [
        { name: "Revenue", values: [12500.50, 13200.75, 14100.25, 15000.00, 16500.50, 17800.25] },
        { name: "Expenses", values: [8000, 8500, 9000, 9200, 9500, 9800] },
        { name: "Profit", values: [4500.50, 4700.75, 5100.25, 5800.00, 7000.50, 8000.25] },
      ],
    };

    const updatedWorkbook = syncChartToWorkbook(workbook, originalData);
    const extractedData = extractChartDataFromWorkbook(updatedWorkbook);

    expect(extractedData.categories).toEqual(originalData.categories);
    expect(extractedData.series.length).toBe(3);

    // Verify each series
    expect(extractedData.series[0].name).toBe("Revenue");
    expect(extractedData.series[0].values).toEqual(originalData.series[0].values);

    expect(extractedData.series[1].name).toBe("Expenses");
    expect(extractedData.series[1].values).toEqual(originalData.series[1].values);

    expect(extractedData.series[2].name).toBe("Profit");
    expect(extractedData.series[2].values).toEqual(originalData.series[2].values);
  });

  test("multiple updates preserve latest data", () => {
    const workbook = createTestWorkbook([createTestWorksheet("Sheet1")]);

    // First update
    const data1: ChartDataUpdate = {
      categories: ["A", "B"],
      series: [{ name: "First", values: [1, 2] }],
    };
    const updated1 = syncChartToWorkbook(workbook, data1);

    // Second update
    const data2: ChartDataUpdate = {
      categories: ["X", "Y", "Z"],
      series: [
        { name: "Second", values: [10, 20, 30] },
        { name: "Third", values: [100, 200, 300] },
      ],
    };
    const updated2 = syncChartToWorkbook(updated1, data2);

    // Extract should return latest data
    const extracted = extractChartDataFromWorkbook(updated2);

    expect(extracted.categories).toEqual(["X", "Y", "Z"]);
    expect(extracted.series.length).toBe(2);
    expect(extracted.series[0].name).toBe("Second");
    expect(extracted.series[1].name).toBe("Third");
  });
});
