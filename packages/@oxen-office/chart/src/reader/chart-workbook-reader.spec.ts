/**
 * @file Tests for Chart-Workbook Reader (Read Operations)
 */

import {
  extractChartDataFromWorkbook,
  resolveEmbeddedXlsxPath,
} from "./chart-workbook-reader";
import type { XlsxWorkbook, XlsxWorksheet, XlsxRow } from "@oxen-office/xlsx/domain/workbook";
import type { Cell } from "@oxen-office/xlsx/domain/cell/types";
import { createDefaultStyleSheet } from "@oxen-office/xlsx/domain/style/types";
import { colIdx, rowIdx } from "@oxen-office/xlsx/domain/types";

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
