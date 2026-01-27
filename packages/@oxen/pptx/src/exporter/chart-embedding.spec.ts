/**
 * @file Chart Embedding Tests
 *
 * Tests for the chart embedding exporter module including:
 * - Path resolution (relative path handling)
 * - Chart rels path generation
 * - listEmbeddedXlsx function
 * - updateEmbeddedXlsx function
 * - syncAllChartEmbeddings function
 */

import { describe, it, expect, vi } from "vitest";
import {
  resolveRelativePath,
  getChartRelsPath,
  listEmbeddedXlsx,
  updateEmbeddedXlsx,
  syncAllChartEmbeddings,
} from "./chart-embedding";
import type { ChartDataUpdate } from "../patcher/chart/chart-workbook-syncer";
import { exportXlsx } from "@oxen/xlsx/exporter";
import { loadZipPackage } from "@oxen/zip";
import type { XlsxWorkbook, XlsxWorksheet, XlsxRow } from "@oxen/xlsx/domain/workbook";
import { createDefaultStyleSheet } from "@oxen/xlsx/domain/style/types";
import { colIdx, rowIdx } from "@oxen/xlsx/domain/types";
import type { Cell } from "@oxen/xlsx/domain/cell/types";

// =============================================================================
// Test Helper Functions
// =============================================================================

/**
 * Create a simple test cell with a number value.
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
 * Create a simple test cell with a string value.
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
 * Create a simple test row.
 */
function createRow(rowNumber: number, cells: readonly Cell[]): XlsxRow {
  return {
    rowNumber: rowIdx(rowNumber),
    cells,
  };
}

/**
 * Create a simple test worksheet.
 */
function createWorksheet(
  name: string,
  sheetId: number,
  rows: readonly XlsxRow[],
): XlsxWorksheet {
  return {
    dateSystem: "1900",
    name,
    sheetId,
    state: "visible",
    rows,
    xmlPath: `xl/worksheets/sheet${sheetId}.xml`,
  };
}

/**
 * Create a simple test workbook with chart data.
 */
function createChartWorkbook(
  categories: readonly string[],
  seriesData: readonly { name: string; values: readonly number[] }[],
): XlsxWorkbook {
  // Row 1: header row (empty A1, series names in B1, C1, ...)
  const headerCells: Cell[] = [createStringCell(1, 1, "")];
  seriesData.forEach((s, i) => {
    headerCells.push(createStringCell(i + 2, 1, s.name));
  });

  const rows: XlsxRow[] = [createRow(1, headerCells)];

  // Data rows: category in A, values in B, C, ...
  categories.forEach((cat, rowIdx_) => {
    const cells: Cell[] = [createStringCell(1, rowIdx_ + 2, cat)];
    seriesData.forEach((s, colIdx_) => {
      cells.push(createNumberCell(colIdx_ + 2, rowIdx_ + 2, s.values[rowIdx_] ?? 0));
    });
    rows.push(createRow(rowIdx_ + 2, cells));
  });

  return {
    dateSystem: "1900",
    sheets: [createWorksheet("Sheet1", 1, rows)],
    styles: createDefaultStyleSheet(),
    sharedStrings: [],
  };
}

/**
 * Create a mock chart.xml.rels content.
 */
function createChartRelsXml(xlsxTarget: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/package" Target="${xlsxTarget}"/>
</Relationships>`;
}

// =============================================================================
// Path Resolution Tests
// =============================================================================

describe("resolveRelativePath", () => {
  it("resolves simple parent directory reference", () => {
    const result = resolveRelativePath(
      "ppt/charts/chart1.xml",
      "../embeddings/Microsoft_Excel_Worksheet1.xlsx",
    );
    expect(result).toBe("ppt/embeddings/Microsoft_Excel_Worksheet1.xlsx");
  });

  it("resolves multiple parent directory references", () => {
    const result = resolveRelativePath(
      "ppt/charts/sub/chart1.xml",
      "../../embeddings/file.xlsx",
    );
    expect(result).toBe("ppt/embeddings/file.xlsx");
  });

  it("resolves path without parent references", () => {
    const result = resolveRelativePath(
      "ppt/charts/chart1.xml",
      "embeddings/file.xlsx",
    );
    expect(result).toBe("ppt/charts/embeddings/file.xlsx");
  });

  it("handles current directory reference", () => {
    const result = resolveRelativePath(
      "ppt/charts/chart1.xml",
      "./file.xlsx",
    );
    expect(result).toBe("ppt/charts/file.xlsx");
  });

  it("handles deeply nested paths", () => {
    const result = resolveRelativePath(
      "ppt/charts/nested/deep/chart1.xml",
      "../../../embeddings/file.xlsx",
    );
    expect(result).toBe("ppt/embeddings/file.xlsx");
  });
});

// =============================================================================
// Chart Rels Path Tests
// =============================================================================

describe("getChartRelsPath", () => {
  it("generates correct rels path for chart", () => {
    const result = getChartRelsPath("ppt/charts/chart1.xml");
    expect(result).toBe("ppt/charts/_rels/chart1.xml.rels");
  });

  it("handles nested chart paths", () => {
    const result = getChartRelsPath("ppt/charts/sub/chart2.xml");
    expect(result).toBe("ppt/charts/sub/_rels/chart2.xml.rels");
  });

  it("handles different chart filenames", () => {
    const result = getChartRelsPath("ppt/charts/myChart.xml");
    expect(result).toBe("ppt/charts/_rels/myChart.xml.rels");
  });
});

// =============================================================================
// listEmbeddedXlsx Tests
// =============================================================================

describe("listEmbeddedXlsx", () => {
  it("returns xlsx files from embeddings folder", () => {
    const fileList = [
      "ppt/embeddings/Microsoft_Excel_Worksheet1.xlsx",
      "ppt/slides/slide1.xml",
      "ppt/charts/chart1.xml",
      "ppt/embeddings/Microsoft_Excel_Worksheet2.xlsx",
    ];

    const result = listEmbeddedXlsx(fileList);

    expect(result).toEqual([
      "ppt/embeddings/Microsoft_Excel_Worksheet1.xlsx",
      "ppt/embeddings/Microsoft_Excel_Worksheet2.xlsx",
    ]);
  });

  it("returns empty array when no xlsx files", () => {
    const fileList = [
      "ppt/slides/slide1.xml",
      "ppt/charts/chart1.xml",
    ];

    const result = listEmbeddedXlsx(fileList);

    expect(result).toEqual([]);
  });

  it("handles case-insensitive xlsx extension", () => {
    const fileList = [
      "ppt/embeddings/file1.xlsx",
      "ppt/embeddings/file2.XLSX",
      "ppt/embeddings/file3.Xlsx",
    ];

    const result = listEmbeddedXlsx(fileList);

    expect(result).toHaveLength(3);
  });

  it("ignores xlsx files outside embeddings folder", () => {
    const fileList = [
      "ppt/embeddings/embedded.xlsx",
      "ppt/other/notembedded.xlsx",
      "other.xlsx",
    ];

    const result = listEmbeddedXlsx(fileList);

    expect(result).toEqual(["ppt/embeddings/embedded.xlsx"]);
  });
});

// =============================================================================
// updateEmbeddedXlsx Tests
// =============================================================================

describe("updateEmbeddedXlsx", () => {
  it("updates embedded xlsx with new chart data", async () => {
    // Create initial workbook
    const initialWorkbook = createChartWorkbook(
      ["Q1", "Q2"],
      [{ name: "Sales", values: [100, 200] }],
    );
    const initialXlsxBuffer = await exportXlsx(initialWorkbook);

    // Create rels XML
    const relsXml = createChartRelsXml("../embeddings/Microsoft_Excel_Worksheet1.xlsx");

    // Set up mock file storage
    const files: Record<string, string | Uint8Array> = {
      "ppt/charts/_rels/chart1.xml.rels": relsXml,
      "ppt/embeddings/Microsoft_Excel_Worksheet1.xlsx": initialXlsxBuffer,
    };

    const getFileContent = async (path: string) => files[path];
    const setFileContent = (path: string, content: Uint8Array) => {
      files[path] = content;
    };

    // New chart data
    const newChartData: ChartDataUpdate = {
      categories: ["Q1", "Q2", "Q3"],
      series: [{ name: "Sales", values: [150, 250, 350] }],
    };

    // Update
    await updateEmbeddedXlsx(
      getFileContent,
      setFileContent,
      "ppt/charts/chart1.xml",
      newChartData,
    );

    // Verify the xlsx was updated
    const updatedXlsx = files["ppt/embeddings/Microsoft_Excel_Worksheet1.xlsx"];
    expect(updatedXlsx).toBeInstanceOf(Uint8Array);

    // Parse the updated xlsx and verify content
    const xlsxPkg = await loadZipPackage(updatedXlsx as Uint8Array);
    const sharedStringsXml = xlsxPkg.readText("xl/sharedStrings.xml");
    expect(sharedStringsXml).not.toBeNull();

    expect(sharedStringsXml).toContain("Q1");
    expect(sharedStringsXml).toContain("Q2");
    expect(sharedStringsXml).toContain("Q3");
    expect(sharedStringsXml).toContain("Sales");
  });

  it("logs warning and skips when rels file is missing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const getFileContent = async () => undefined;
    const setFileContent = vi.fn();

    await updateEmbeddedXlsx(
      getFileContent,
      setFileContent,
      "ppt/charts/chart1.xml",
      { categories: [], series: [] },
    );

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("No rels file found"),
    );
    expect(setFileContent).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("logs warning and skips when embedded xlsx path not in rels", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Rels XML without package relationship
    const relsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

    const getFileContent = async (path: string) => {
      if (path.endsWith(".rels")) return relsXml;
      return undefined;
    };
    const setFileContent = vi.fn();

    await updateEmbeddedXlsx(
      getFileContent,
      setFileContent,
      "ppt/charts/chart1.xml",
      { categories: [], series: [] },
    );

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("No embedded xlsx found"),
    );
    expect(setFileContent).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("logs warning and skips when embedded xlsx file is missing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const relsXml = createChartRelsXml("../embeddings/missing.xlsx");

    const getFileContent = async (path: string) => {
      if (path.endsWith(".rels")) return relsXml;
      return undefined;
    };
    const setFileContent = vi.fn();

    await updateEmbeddedXlsx(
      getFileContent,
      setFileContent,
      "ppt/charts/chart1.xml",
      { categories: [], series: [] },
    );

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Embedded xlsx not found"),
    );
    expect(setFileContent).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("maintains original file on parse error", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const relsXml = createChartRelsXml("../embeddings/invalid.xlsx");
    const invalidXlsx = new Uint8Array([0, 1, 2, 3]); // Not a valid ZIP

    const files: Record<string, string | Uint8Array> = {
      "ppt/charts/_rels/chart1.xml.rels": relsXml,
      "ppt/embeddings/invalid.xlsx": invalidXlsx,
    };

    const getFileContent = async (path: string) => files[path];
    const setFileContent = vi.fn();

    await updateEmbeddedXlsx(
      getFileContent,
      setFileContent,
      "ppt/charts/chart1.xml",
      { categories: ["Q1"], series: [{ name: "Sales", values: [100] }] },
    );

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to update embedded xlsx"),
      expect.anything(),
    );
    expect(setFileContent).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});

// =============================================================================
// syncAllChartEmbeddings Tests
// =============================================================================

describe("syncAllChartEmbeddings", () => {
  it("processes multiple chart updates", async () => {
    // Create initial workbooks
    const workbook1 = createChartWorkbook(
      ["A", "B"],
      [{ name: "Series1", values: [1, 2] }],
    );
    const workbook2 = createChartWorkbook(
      ["X", "Y"],
      [{ name: "Series2", values: [10, 20] }],
    );

    const xlsx1 = await exportXlsx(workbook1);
    const xlsx2 = await exportXlsx(workbook2);

    // Create rels
    const rels1 = createChartRelsXml("../embeddings/workbook1.xlsx");
    const rels2 = createChartRelsXml("../embeddings/workbook2.xlsx");

    const files: Record<string, string | Uint8Array> = {
      "ppt/charts/_rels/chart1.xml.rels": rels1,
      "ppt/charts/_rels/chart2.xml.rels": rels2,
      "ppt/embeddings/workbook1.xlsx": xlsx1,
      "ppt/embeddings/workbook2.xlsx": xlsx2,
    };

    const getFileContent = async (path: string) => files[path];
    const setFileContent = (path: string, content: Uint8Array) => {
      files[path] = content;
    };

    const chartUpdates = new Map<string, ChartDataUpdate>([
      ["ppt/charts/chart1.xml", {
        categories: ["A", "B", "C"],
        series: [{ name: "Series1", values: [10, 20, 30] }],
      }],
      ["ppt/charts/chart2.xml", {
        categories: ["X", "Y", "Z"],
        series: [{ name: "Series2", values: [100, 200, 300] }],
      }],
    ]);

    await syncAllChartEmbeddings(getFileContent, setFileContent, chartUpdates);

    // Both files should have been updated
    expect(files["ppt/embeddings/workbook1.xlsx"]).toBeInstanceOf(Uint8Array);
    expect(files["ppt/embeddings/workbook2.xlsx"]).toBeInstanceOf(Uint8Array);

    // Verify first workbook was updated
    const zip1 = await loadZipPackage(files["ppt/embeddings/workbook1.xlsx"] as Uint8Array);
    const ss1 = zip1.readText("xl/sharedStrings.xml");
    expect(ss1).not.toBeNull();
    expect(ss1).toContain("C"); // New category

    // Verify second workbook was updated
    const zip2 = await loadZipPackage(files["ppt/embeddings/workbook2.xlsx"] as Uint8Array);
    const ss2 = zip2.readText("xl/sharedStrings.xml");
    expect(ss2).not.toBeNull();
    expect(ss2).toContain("Z"); // New category
  });

  it("handles empty chart updates map", async () => {
    const getFileContent = vi.fn();
    const setFileContent = vi.fn();

    await syncAllChartEmbeddings(
      getFileContent,
      setFileContent,
      new Map(),
    );

    expect(getFileContent).not.toHaveBeenCalled();
    expect(setFileContent).not.toHaveBeenCalled();
  });

  it("continues processing other charts when one fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Valid workbook for chart2
    const workbook2 = createChartWorkbook(
      ["X", "Y"],
      [{ name: "Series2", values: [10, 20] }],
    );
    const xlsx2 = await exportXlsx(workbook2);

    const rels1 = createChartRelsXml("../embeddings/missing.xlsx"); // Will fail
    const rels2 = createChartRelsXml("../embeddings/workbook2.xlsx");

    const files: Record<string, string | Uint8Array> = {
      "ppt/charts/_rels/chart1.xml.rels": rels1,
      "ppt/charts/_rels/chart2.xml.rels": rels2,
      // workbook1.xlsx is missing - will cause chart1 to fail
      "ppt/embeddings/workbook2.xlsx": xlsx2,
    };

    const getFileContent = async (path: string) => files[path];
    const setFileContent = (path: string, content: Uint8Array) => {
      files[path] = content;
    };

    const chartUpdates = new Map<string, ChartDataUpdate>([
      ["ppt/charts/chart1.xml", {
        categories: ["A"],
        series: [{ name: "S1", values: [1] }],
      }],
      ["ppt/charts/chart2.xml", {
        categories: ["X", "Y", "Z"],
        series: [{ name: "Series2", values: [100, 200, 300] }],
      }],
    ]);

    await syncAllChartEmbeddings(getFileContent, setFileContent, chartUpdates);

    // Chart1 should have logged a warning
    expect(warnSpy).toHaveBeenCalled();

    // Chart2 should still have been updated
    const zip2 = await loadZipPackage(files["ppt/embeddings/workbook2.xlsx"] as Uint8Array);
    const ss2 = zip2.readText("xl/sharedStrings.xml");
    expect(ss2).not.toBeNull();
    expect(ss2).toContain("Z"); // New category from chart2 update

    warnSpy.mockRestore();
  });
});
