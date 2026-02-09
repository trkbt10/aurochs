/**
 * @file Integration tests for xlsx-cli commands: build, info, show
 *
 * Tests runBuild, runInfo, and runShow against real XLSX files
 * created via the builder pipeline.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { runBuild, type BuildData } from "./build";
import { runInfo } from "./info";
import { runShow } from "./show";
import { exportXlsx } from "@aurochs-builder/xlsx/exporter";
import { convertSpecToWorkbook, type WorkbookSpec } from "./build-spec";

// =============================================================================
// Test Setup
// =============================================================================

let tmpDir: string;

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "xlsx-cli-test-"));
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// =============================================================================
// Helpers
// =============================================================================

/**
 * Build a real XLSX file from a WorkbookSpec and write it to tmpDir.
 */
async function buildTestXlsx(spec: WorkbookSpec): Promise<string> {
  const wb = convertSpecToWorkbook(spec);
  const data = await exportXlsx(wb);
  const outputPath = path.join(tmpDir, `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.xlsx`);
  await fs.writeFile(outputPath, data);
  return outputPath;
}

/**
 * Write a JSON spec file to tmpDir and return its path.
 */
async function writeSpecFile(specObj: object): Promise<string> {
  const specPath = path.join(tmpDir, `spec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`);
  await fs.writeFile(specPath, JSON.stringify(specObj, null, 2));
  return specPath;
}

/** Simple single-sheet spec with string and number cells. */
function simpleSpec(): WorkbookSpec {
  return {
    sheets: [
      {
        name: "Sheet1",
        rows: [
          {
            row: 1,
            cells: [
              { ref: "A1", value: "Hello" },
              { ref: "B1", value: 42 },
            ],
          },
          {
            row: 2,
            cells: [
              { ref: "A2", value: "World" },
              { ref: "B2", value: 100 },
            ],
          },
        ],
      },
    ],
  };
}

// =============================================================================
// runBuild Tests
// =============================================================================

describe("runBuild", () => {
  it("should build XLSX in create mode", async () => {
    const specPath = await writeSpecFile({
      mode: "create",
      output: "output.xlsx",
      workbook: simpleSpec(),
    });

    const result = await runBuild(specPath);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.mode).toBe("create");
    expect(result.data.outputPath).toBe("output.xlsx");
    expect(result.data.sheetCount).toBe(1);
    expect(result.data.totalCells).toBe(4);

    // Verify the output file was actually written
    const outputPath = path.join(tmpDir, "output.xlsx");
    const stat = await fs.stat(outputPath);
    expect(stat.size).toBeGreaterThan(0);
  });

  it("should return FILE_NOT_FOUND for missing spec", async () => {
    const result = await runBuild(path.join(tmpDir, "nonexistent.json"));

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.code).toBe("FILE_NOT_FOUND");
  });

  it("should return INVALID_JSON for bad JSON", async () => {
    const badJsonPath = path.join(tmpDir, `bad-${Date.now()}.json`);
    await fs.writeFile(badJsonPath, "{not valid json!!!");

    const result = await runBuild(badJsonPath);

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.code).toBe("INVALID_JSON");
  });

  it("should build with multiple sheets", async () => {
    const specPath = await writeSpecFile({
      mode: "create",
      output: `multi-sheet-${Date.now()}.xlsx`,
      workbook: {
        sheets: [
          {
            name: "Data",
            rows: [{ row: 1, cells: [{ ref: "A1", value: "Sheet1 Data" }] }],
          },
          {
            name: "Summary",
            rows: [{ row: 1, cells: [{ ref: "A1", value: "Sheet2 Summary" }] }],
          },
        ],
      },
    });

    const result = await runBuild(specPath);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.sheetCount).toBe(2);
    expect(result.data.totalCells).toBe(2);
  });

  it("should build with formulas", async () => {
    const specPath = await writeSpecFile({
      mode: "create",
      output: `formulas-${Date.now()}.xlsx`,
      workbook: {
        sheets: [
          {
            name: "Formulas",
            rows: [
              {
                row: 1,
                cells: [
                  { ref: "A1", value: 10 },
                  { ref: "B1", value: 20 },
                  { ref: "C1", formula: { expression: "A1+B1" } },
                ],
              },
            ],
          },
        ],
      },
    });

    const result = await runBuild(specPath);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.sheetCount).toBe(1);
    expect(result.data.totalCells).toBe(3);
  });
});

// =============================================================================
// runInfo Tests
// =============================================================================

describe("runInfo", () => {
  it("should return workbook info", async () => {
    const xlsxPath = await buildTestXlsx(simpleSpec());
    const result = await runInfo(xlsxPath);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.sheetCount).toBe(1);
    expect(result.data.sheetNames).toEqual(["Sheet1"]);
    expect(result.data.totalRows).toBe(2);
    expect(result.data.totalCells).toBe(4);
  });

  it("should report correct cell counts", async () => {
    const spec: WorkbookSpec = {
      sheets: [
        {
          name: "Sheet1",
          rows: [
            { row: 1, cells: [{ ref: "A1", value: 1 }, { ref: "B1", value: 2 }, { ref: "C1", value: 3 }] },
            { row: 2, cells: [{ ref: "A2", value: 4 }] },
          ],
        },
        {
          name: "Sheet2",
          rows: [
            { row: 1, cells: [{ ref: "A1", value: "x" }, { ref: "B1", value: "y" }] },
          ],
        },
      ],
    };
    const xlsxPath = await buildTestXlsx(spec);
    const result = await runInfo(xlsxPath);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.sheetCount).toBe(2);
    expect(result.data.sheetNames).toEqual(["Sheet1", "Sheet2"]);
    expect(result.data.totalRows).toBe(3);
    expect(result.data.totalCells).toBe(6);
    expect(result.data.sharedStringCount).toBe(2); // "x" and "y"
  });

  it("should report style counts", async () => {
    const spec: WorkbookSpec = {
      sheets: [
        {
          name: "Styled",
          rows: [
            { row: 1, cells: [{ ref: "A1", value: "Bold", styleId: 1 }] },
          ],
        },
      ],
      styles: {
        fonts: [{ name: "Arial", size: 14, bold: true }],
        fills: [{ type: "solid", color: "#FF0000" }],
        borders: [{ left: { style: "thin", color: "#000000" } }],
        numberFormats: [{ id: 164, formatCode: "#,##0.00" }],
        cellXfs: [{ fontId: 1, fillId: 2, borderId: 1 }],
      },
    };
    const xlsxPath = await buildTestXlsx(spec);
    const result = await runInfo(xlsxPath);

    expect(result.success).toBe(true);
    if (!result.success) return;

    // Default styles provide 1 font, 2 fills, 1 border, 1 cellXf; custom adds more
    expect(result.data.fontCount).toBeGreaterThanOrEqual(2);
    expect(result.data.fillCount).toBeGreaterThanOrEqual(3);
    expect(result.data.borderCount).toBeGreaterThanOrEqual(2);
    expect(result.data.numberFormatCount).toBeGreaterThanOrEqual(1);
    expect(result.data.hasStyles).toBe(true);
  });

  it("should return FILE_NOT_FOUND for missing file", async () => {
    const result = await runInfo(path.join(tmpDir, "nonexistent.xlsx"));

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.code).toBe("FILE_NOT_FOUND");
  });

  it("should report merged cell count", async () => {
    const spec: WorkbookSpec = {
      sheets: [
        {
          name: "Merged",
          rows: [
            {
              row: 1,
              cells: [
                { ref: "A1", value: "Merged Area" },
                { ref: "C1", value: "Single" },
              ],
            },
            {
              row: 2,
              cells: [{ ref: "A2", value: "Another Merge" }],
            },
          ],
          mergeCells: ["A1:B1", "A2:B3"],
        },
      ],
    };
    const xlsxPath = await buildTestXlsx(spec);
    const result = await runInfo(xlsxPath);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.mergedCellCount).toBe(2);
  });
});

// =============================================================================
// runShow Tests
// =============================================================================

describe("runShow", () => {
  it("should show all cells in a sheet", async () => {
    const xlsxPath = await buildTestXlsx(simpleSpec());
    const result = await runShow(xlsxPath, "Sheet1");

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.sheetName).toBe("Sheet1");
    expect(result.data.rows.length).toBe(2);

    // Row 1: A1="Hello", B1=42
    const row1 = result.data.rows.find((r) => r.rowNumber === 1);
    expect(row1).toBeDefined();
    expect(row1!.cells.length).toBe(2);

    const a1 = row1!.cells.find((c) => c.ref === "A1");
    expect(a1).toBeDefined();
    expect(a1!.type).toBe("string");
    expect(a1!.value).toBe("Hello");

    const b1 = row1!.cells.find((c) => c.ref === "B1");
    expect(b1).toBeDefined();
    expect(b1!.type).toBe("number");
    expect(b1!.value).toBe(42);

    // Row 2: A2="World", B2=100
    const row2 = result.data.rows.find((r) => r.rowNumber === 2);
    expect(row2).toBeDefined();
    expect(row2!.cells.length).toBe(2);
  });

  it("should return SHEET_NOT_FOUND for missing sheet", async () => {
    const xlsxPath = await buildTestXlsx(simpleSpec());
    const result = await runShow(xlsxPath, "NonexistentSheet");

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.code).toBe("SHEET_NOT_FOUND");
    expect(result.error.message).toContain("NonexistentSheet");
  });

  it("should filter by range", async () => {
    const spec: WorkbookSpec = {
      sheets: [
        {
          name: "Data",
          rows: [
            { row: 1, cells: [{ ref: "A1", value: 1 }, { ref: "B1", value: 2 }, { ref: "C1", value: 3 }] },
            { row: 2, cells: [{ ref: "A2", value: 4 }, { ref: "B2", value: 5 }, { ref: "C2", value: 6 }] },
            { row: 3, cells: [{ ref: "A3", value: 7 }, { ref: "B3", value: 8 }, { ref: "C3", value: 9 }] },
          ],
        },
      ],
    };
    const xlsxPath = await buildTestXlsx(spec);
    const result = await runShow(xlsxPath, "Data", { range: "A1:B2" });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.range).toBe("A1:B2");

    // Should only include rows 1-2 and columns A-B
    expect(result.data.rows.length).toBe(2);

    const row1 = result.data.rows.find((r) => r.rowNumber === 1);
    expect(row1).toBeDefined();
    expect(row1!.cells.length).toBe(2);
    expect(row1!.cells.map((c) => c.ref)).toEqual(["A1", "B1"]);

    const row2 = result.data.rows.find((r) => r.rowNumber === 2);
    expect(row2).toBeDefined();
    expect(row2!.cells.length).toBe(2);
    expect(row2!.cells.map((c) => c.ref)).toEqual(["A2", "B2"]);

    // Row 3 should not be present
    const row3 = result.data.rows.find((r) => r.rowNumber === 3);
    expect(row3).toBeUndefined();
  });

  it("should show formula cells", async () => {
    const spec: WorkbookSpec = {
      sheets: [
        {
          name: "Formulas",
          rows: [
            {
              row: 1,
              cells: [
                { ref: "A1", value: 10 },
                { ref: "B1", value: 20 },
                { ref: "C1", formula: { expression: "A1+B1" } },
              ],
            },
          ],
        },
      ],
    };
    const xlsxPath = await buildTestXlsx(spec);
    const result = await runShow(xlsxPath, "Formulas");

    expect(result.success).toBe(true);
    if (!result.success) return;

    const row1 = result.data.rows.find((r) => r.rowNumber === 1);
    expect(row1).toBeDefined();

    const c1 = row1!.cells.find((c) => c.ref === "C1");
    expect(c1).toBeDefined();
    expect(c1!.formula).toBe("A1+B1");
  });

  it("should show merged cells", async () => {
    const spec: WorkbookSpec = {
      sheets: [
        {
          name: "Merged",
          rows: [
            {
              row: 1,
              cells: [
                { ref: "A1", value: "Merged" },
                { ref: "C1", value: "Not merged" },
              ],
            },
          ],
          mergeCells: ["A1:B2"],
        },
      ],
    };
    const xlsxPath = await buildTestXlsx(spec);
    const result = await runShow(xlsxPath, "Merged");

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.mergedCells).toBeDefined();
    expect(result.data.mergedCells!.length).toBe(1);
    expect(result.data.mergedCells![0]).toBe("A1:B2");
  });

  it("should return empty rows for empty sheet", async () => {
    const spec: WorkbookSpec = {
      sheets: [
        {
          name: "Empty",
          rows: [],
        },
      ],
    };
    const xlsxPath = await buildTestXlsx(spec);
    const result = await runShow(xlsxPath, "Empty");

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.sheetName).toBe("Empty");
    expect(result.data.rows).toEqual([]);
  });
});
