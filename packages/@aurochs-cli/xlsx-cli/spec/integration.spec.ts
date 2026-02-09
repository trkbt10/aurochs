/**
 * @file Integration tests for xlsx-cli builder with LibreOffice re-export verification.
 *
 * Tests that generated XLSX files are valid by re-exporting through LibreOffice
 * and verifying the round-tripped data matches the original.
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { convertSpecToWorkbook, type WorkbookSpec } from "../src/commands/build-spec";
import { exportXlsx } from "@aurochs-builder/xlsx/exporter";
import { loadXlsxWorkbook } from "../src/utils/xlsx-loader";

// =============================================================================
// LibreOffice Configuration
// =============================================================================

const LIBREOFFICE_PATH = "/opt/homebrew/bin/soffice";
const OUTPUT_DIR = path.resolve(import.meta.dirname, "__integration_output__");

function isLibreOfficeAvailable(): boolean {
  try {
    execSync(`${LIBREOFFICE_PATH} --version`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

async function convertXlsxViaLibreOffice(xlsxPath: string, outputDir: string): Promise<string> {
  await fs.mkdir(outputDir, { recursive: true });
  execSync(`${LIBREOFFICE_PATH} --headless --convert-to xlsx --outdir "${outputDir}" "${xlsxPath}"`, {
    stdio: "pipe",
    timeout: 30000,
  });
  const basename = path.basename(xlsxPath, ".xlsx");
  return path.join(outputDir, `${basename}.xlsx`);
}

// =============================================================================
// Helper: Build and Export
// =============================================================================

async function buildXlsx(spec: WorkbookSpec, filename: string): Promise<string> {
  const workbook = convertSpecToWorkbook(spec);
  const data = await exportXlsx(workbook);
  const outputPath = path.join(OUTPUT_DIR, filename);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, data);
  return outputPath;
}

// =============================================================================
// Tests
// =============================================================================

const loAvailable = isLibreOfficeAvailable();

beforeAll(async () => {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  if (!loAvailable) {
    console.log("LibreOffice not available - skipping re-export tests");
  }
});

describe("XLSX Builder - Direct Verification", () => {
  it("should build and re-parse string data", async () => {
    const spec: WorkbookSpec = {
      sheets: [{
        name: "Data",
        rows: [
          { row: 1, cells: [{ ref: "A1", value: "Hello" }, { ref: "B1", value: "World" }] },
          { row: 2, cells: [{ ref: "A2", value: "Foo" }, { ref: "B2", value: "Bar" }] },
        ],
      }],
    };
    const xlsxPath = await buildXlsx(spec, "strings.xlsx");
    const wb = await loadXlsxWorkbook(xlsxPath);

    expect(wb.sheets).toHaveLength(1);
    expect(wb.sheets[0].name).toBe("Data");
    expect(wb.sheets[0].rows).toHaveLength(2);
    expect(wb.sheets[0].rows[0].cells[0].value).toEqual({ type: "string", value: "Hello" });
    expect(wb.sheets[0].rows[0].cells[1].value).toEqual({ type: "string", value: "World" });
  });

  it("should build and re-parse numbers and formulas", async () => {
    const spec: WorkbookSpec = {
      sheets: [{
        name: "Calc",
        rows: [
          { row: 1, cells: [{ ref: "A1", value: 10 }, { ref: "B1", value: 20 }] },
          { row: 2, cells: [{ ref: "A2", formula: { expression: "SUM(A1:B1)" } }] },
        ],
      }],
    };
    const xlsxPath = await buildXlsx(spec, "formulas.xlsx");
    const wb = await loadXlsxWorkbook(xlsxPath);

    expect(wb.sheets[0].rows[0].cells[0].value).toEqual({ type: "number", value: 10 });
    expect(wb.sheets[0].rows[1].cells[0].formula?.expression).toBe("SUM(A1:B1)");
  });

  it("should build and re-parse styles", async () => {
    const spec: WorkbookSpec = {
      sheets: [{
        name: "Styled",
        rows: [
          { row: 1, cells: [{ ref: "A1", value: "Bold", styleId: 1 }] },
        ],
      }],
      styles: {
        fonts: [{ name: "Arial", size: 14, bold: true }],
        cellXfs: [{ fontId: 1 }],
      },
    };
    const xlsxPath = await buildXlsx(spec, "styles.xlsx");
    const wb = await loadXlsxWorkbook(xlsxPath);

    expect(wb.styles.fonts).toHaveLength(2);
    expect(wb.styles.fonts[1].name).toBe("Arial");
    expect(wb.styles.fonts[1].bold).toBe(true);
  });

  it("should build and re-parse merged cells", async () => {
    const spec: WorkbookSpec = {
      sheets: [{
        name: "Merged",
        rows: [
          { row: 1, cells: [{ ref: "A1", value: "Title" }] },
        ],
        mergeCells: ["A1:C1"],
      }],
    };
    const xlsxPath = await buildXlsx(spec, "merged.xlsx");
    const wb = await loadXlsxWorkbook(xlsxPath);

    expect(wb.sheets[0].mergeCells).toHaveLength(1);
  });

  it("should build and re-parse multiple sheets", async () => {
    const spec: WorkbookSpec = {
      sheets: [
        { name: "Sheet1", rows: [{ row: 1, cells: [{ ref: "A1", value: "One" }] }] },
        { name: "Sheet2", rows: [{ row: 1, cells: [{ ref: "A1", value: "Two" }] }] },
        { name: "Sheet3", rows: [{ row: 1, cells: [{ ref: "A1", value: "Three" }] }] },
      ],
    };
    const xlsxPath = await buildXlsx(spec, "multi-sheet.xlsx");
    const wb = await loadXlsxWorkbook(xlsxPath);

    expect(wb.sheets).toHaveLength(3);
    expect(wb.sheets.map((s) => s.name)).toEqual(["Sheet1", "Sheet2", "Sheet3"]);
  });

  it("should build complete workbook with all features", async () => {
    const spec: WorkbookSpec = {
      sheets: [
        {
          name: "Data",
          columns: [{ min: 1, max: 1, width: 20 }, { min: 2, max: 2, width: 15 }],
          rows: [
            { row: 1, cells: [{ ref: "A1", value: "Name", styleId: 1 }, { ref: "B1", value: "Score", styleId: 1 }] },
            { row: 2, cells: [{ ref: "A2", value: "Alice" }, { ref: "B2", value: 95 }] },
            { row: 3, cells: [{ ref: "A3", value: "Bob" }, { ref: "B3", value: 87 }] },
            { row: 4, cells: [{ ref: "A4", value: "Total" }, { ref: "B4", formula: { expression: "SUM(B2:B3)" } }] },
          ],
          mergeCells: ["A1:A1"],
        },
        {
          name: "Summary",
          rows: [{ row: 1, cells: [{ ref: "A1", value: "Report" }] }],
        },
      ],
      styles: {
        fonts: [{ name: "Arial", size: 12, bold: true }],
        fills: [{ type: "solid", color: "#4472C4" }],
        borders: [{ left: { style: "thin" }, right: { style: "thin" }, top: { style: "thin" }, bottom: { style: "thin" } }],
        numberFormats: [{ id: 164, formatCode: "#,##0" }],
        cellXfs: [{ fontId: 1, fillId: 2, borderId: 1 }],
      },
      definedNames: [{ name: "Scores", formula: "Data!$B$2:$B$3" }],
    };

    const xlsxPath = await buildXlsx(spec, "complete.xlsx");
    const wb = await loadXlsxWorkbook(xlsxPath);

    expect(wb.sheets).toHaveLength(2);
    expect(wb.sheets[0].name).toBe("Data");
    expect(wb.sheets[0].rows).toHaveLength(4);
    expect(wb.styles.fonts).toHaveLength(2);
    expect(wb.styles.fills).toHaveLength(3);
    expect(wb.styles.borders).toHaveLength(2);
    expect(wb.definedNames).toHaveLength(1);
    expect(wb.definedNames![0].name).toBe("Scores");
  });
});

describe.skipIf(!loAvailable)("XLSX Builder - LibreOffice Re-export", () => {
  it("should survive LibreOffice re-export with string data", async () => {
    const spec: WorkbookSpec = {
      sheets: [{
        name: "Data",
        rows: [
          { row: 1, cells: [{ ref: "A1", value: "Hello" }, { ref: "B1", value: "World" }] },
          { row: 2, cells: [{ ref: "A2", value: "Foo" }] },
        ],
      }],
    };
    const xlsxPath = await buildXlsx(spec, "lo-strings.xlsx");
    const reExported = await convertXlsxViaLibreOffice(xlsxPath, path.join(OUTPUT_DIR, "lo-reexport"));
    const wb = await loadXlsxWorkbook(reExported);

    expect(wb.sheets).toHaveLength(1);
    expect(wb.sheets[0].name).toBe("Data");
    expect(wb.sheets[0].rows[0].cells[0].value).toEqual({ type: "string", value: "Hello" });
  });

  it("should survive LibreOffice re-export with numbers and formulas", async () => {
    const spec: WorkbookSpec = {
      sheets: [{
        name: "Calc",
        rows: [
          { row: 1, cells: [{ ref: "A1", value: 10 }, { ref: "B1", value: 20 }] },
          { row: 2, cells: [{ ref: "A2", formula: { expression: "SUM(A1:B1)" } }] },
        ],
      }],
    };
    const xlsxPath = await buildXlsx(spec, "lo-formulas.xlsx");
    const reExported = await convertXlsxViaLibreOffice(xlsxPath, path.join(OUTPUT_DIR, "lo-reexport"));
    const wb = await loadXlsxWorkbook(reExported);

    expect(wb.sheets[0].rows[0].cells[0].value).toEqual({ type: "number", value: 10 });
    expect(wb.sheets[0].rows[0].cells[1].value).toEqual({ type: "number", value: 20 });
  });

  it("should survive LibreOffice re-export with styles", async () => {
    const spec: WorkbookSpec = {
      sheets: [{
        name: "Styled",
        rows: [{ row: 1, cells: [{ ref: "A1", value: "Bold", styleId: 1 }] }],
      }],
      styles: {
        fonts: [{ name: "Arial", size: 14, bold: true }],
        cellXfs: [{ fontId: 1 }],
      },
    };
    const xlsxPath = await buildXlsx(spec, "lo-styles.xlsx");
    const reExported = await convertXlsxViaLibreOffice(xlsxPath, path.join(OUTPUT_DIR, "lo-reexport"));
    const wb = await loadXlsxWorkbook(reExported);

    expect(wb.sheets).toHaveLength(1);
    // LibreOffice may add its own fonts, but should have at least 2
    expect(wb.styles.fonts.length).toBeGreaterThanOrEqual(2);
  });

  it("should survive LibreOffice re-export with merged cells", async () => {
    const spec: WorkbookSpec = {
      sheets: [{
        name: "Merged",
        rows: [{ row: 1, cells: [{ ref: "A1", value: "Wide Title" }] }],
        mergeCells: ["A1:D1"],
      }],
    };
    const xlsxPath = await buildXlsx(spec, "lo-merged.xlsx");
    const reExported = await convertXlsxViaLibreOffice(xlsxPath, path.join(OUTPUT_DIR, "lo-reexport"));
    const wb = await loadXlsxWorkbook(reExported);

    expect(wb.sheets[0].mergeCells).toHaveLength(1);
  });

  it("should survive LibreOffice re-export with multiple sheets", async () => {
    const spec: WorkbookSpec = {
      sheets: [
        { name: "Alpha", rows: [{ row: 1, cells: [{ ref: "A1", value: "First" }] }] },
        { name: "Beta", rows: [{ row: 1, cells: [{ ref: "A1", value: "Second" }] }] },
      ],
    };
    const xlsxPath = await buildXlsx(spec, "lo-multi.xlsx");
    const reExported = await convertXlsxViaLibreOffice(xlsxPath, path.join(OUTPUT_DIR, "lo-reexport"));
    const wb = await loadXlsxWorkbook(reExported);

    expect(wb.sheets).toHaveLength(2);
    expect(wb.sheets.map((s) => s.name)).toEqual(["Alpha", "Beta"]);
  });

  it("should survive LibreOffice re-export with complete workbook", async () => {
    const spec: WorkbookSpec = {
      sheets: [
        {
          name: "Report",
          columns: [{ min: 1, max: 2, width: 20 }],
          rows: [
            { row: 1, cells: [{ ref: "A1", value: "Item", styleId: 1 }, { ref: "B1", value: "Value", styleId: 1 }] },
            { row: 2, cells: [{ ref: "A2", value: "Sales" }, { ref: "B2", value: 1000 }] },
            { row: 3, cells: [{ ref: "A3", value: "Cost" }, { ref: "B3", value: 600 }] },
            { row: 4, cells: [{ ref: "A4", value: "Profit" }, { ref: "B4", formula: { expression: "B2-B3" } }] },
          ],
        },
      ],
      styles: {
        fonts: [{ name: "Arial", size: 11, bold: true, color: "#FFFFFF" }],
        fills: [{ type: "solid", color: "#4472C4" }],
        borders: [{ top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }],
        cellXfs: [{ fontId: 1, fillId: 2, borderId: 1 }],
      },
    };
    const xlsxPath = await buildXlsx(spec, "lo-complete.xlsx");
    const reExported = await convertXlsxViaLibreOffice(xlsxPath, path.join(OUTPUT_DIR, "lo-reexport"));
    const wb = await loadXlsxWorkbook(reExported);

    expect(wb.sheets).toHaveLength(1);
    expect(wb.sheets[0].name).toBe("Report");
    expect(wb.sheets[0].rows.length).toBeGreaterThanOrEqual(4);
    // Values should survive
    const row2 = wb.sheets[0].rows.find((r) => (r.rowNumber as number) === 2);
    expect(row2).toBeDefined();
  });
});
