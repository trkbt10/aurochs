/**
 * @file Verify command tests
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { runVerify } from "./verify";

const ctx = { tmpDir: "", outputDir: "" };

beforeAll(async () => {
  ctx.tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "xlsx-verify-test-"));
  ctx.outputDir = path.join(ctx.tmpDir, "__output__");
  await fs.mkdir(ctx.outputDir, { recursive: true });
});

afterAll(async () => {
  await fs.rm(ctx.tmpDir, { recursive: true, force: true });
});

// Helper to write a test case JSON file
async function writeTestCase(name: string, spec: object): Promise<string> {
  const filePath = path.join(ctx.tmpDir, `${name}.json`);
  await fs.writeFile(filePath, JSON.stringify(spec, null, 2));
  return filePath;
}

// =============================================================================
// runVerify basic tests
// =============================================================================

describe("runVerify basic tests", () => {
  it("should pass for valid string cells", async () => {
    const filePath = await writeTestCase("string-cells", {
      name: "string-cells",
      description: "Test string cell values",
      tags: ["basic"],
      input: {
        mode: "create",
        output: "../__output__/string-cells.xlsx",
        workbook: {
          sheets: [
            {
              name: "Sheet1",
              rows: [
                {
                  row: 1,
                  cells: [
                    { ref: "A1", value: "hello" },
                    { ref: "B1", value: "world" },
                  ],
                },
              ],
            },
          ],
        },
      },
      expected: {
        sheetCount: 1,
        sheetNames: ["Sheet1"],
        totalCells: 2,
        sheets: [
          {
            name: "Sheet1",
            cells: [
              { ref: "A1", type: "string", value: "hello" },
              { ref: "B1", type: "string", value: "world" },
            ],
          },
        ],
      },
    });

    const result = await runVerify(filePath);
    expect(result.success).toBe(true);
    if (!result.success) {return;}
    expect(result.data.passed).toBe(1);
    expect(result.data.failed).toBe(0);
    expect(result.data.results[0].passed).toBe(true);
    expect(result.data.results[0].assertions.every((a) => a.passed)).toBe(true);
  });

  it("should pass for valid number cells", async () => {
    const filePath = await writeTestCase("number-cells", {
      name: "number-cells",
      description: "Test number cell values",
      tags: ["basic"],
      input: {
        mode: "create",
        output: "../__output__/number-cells.xlsx",
        workbook: {
          sheets: [
            {
              name: "Sheet1",
              rows: [
                {
                  row: 1,
                  cells: [
                    { ref: "A1", value: { type: "number", value: 42 } },
                    { ref: "B1", value: { type: "number", value: 3.14 } },
                  ],
                },
              ],
            },
          ],
        },
      },
      expected: {
        sheetCount: 1,
        sheetNames: ["Sheet1"],
        totalCells: 2,
        sheets: [
          {
            name: "Sheet1",
            cells: [
              { ref: "A1", type: "number", value: 42 },
              { ref: "B1", type: "number", value: 3.14 },
            ],
          },
        ],
      },
    });

    const result = await runVerify(filePath);
    expect(result.success).toBe(true);
    if (!result.success) {return;}
    expect(result.data.passed).toBe(1);
    expect(result.data.failed).toBe(0);
    expect(result.data.results[0].passed).toBe(true);
  });

  it("should detect incorrect cell value", async () => {
    const filePath = await writeTestCase("wrong-value", {
      name: "wrong-value",
      description: "Expected value does not match actual",
      tags: ["basic"],
      input: {
        mode: "create",
        output: "../__output__/wrong-value.xlsx",
        workbook: {
          sheets: [
            {
              name: "Sheet1",
              rows: [
                {
                  row: 1,
                  cells: [{ ref: "A1", value: "actual-value" }],
                },
              ],
            },
          ],
        },
      },
      expected: {
        sheetCount: 1,
        sheets: [
          {
            name: "Sheet1",
            cells: [{ ref: "A1", type: "string", value: "wrong-value" }],
          },
        ],
      },
    });

    const result = await runVerify(filePath);
    expect(result.success).toBe(true);
    if (!result.success) {return;}
    expect(result.data.failed).toBe(1);
    expect(result.data.passed).toBe(0);
    expect(result.data.results[0].passed).toBe(false);
    const failedAssertion = result.data.results[0].assertions.find((a) => !a.passed);
    expect(failedAssertion).toBeDefined();
    expect(failedAssertion!.expected).toBe("wrong-value");
    expect(failedAssertion!.actual).toBe("actual-value");
  });

  it("should detect incorrect sheet count", async () => {
    const filePath = await writeTestCase("wrong-sheet-count", {
      name: "wrong-sheet-count",
      description: "Expected sheet count does not match",
      tags: ["basic"],
      input: {
        mode: "create",
        output: "../__output__/wrong-sheet-count.xlsx",
        workbook: {
          sheets: [
            {
              name: "Sheet1",
              rows: [{ row: 1, cells: [{ ref: "A1", value: "x" }] }],
            },
          ],
        },
      },
      expected: {
        sheetCount: 3,
      },
    });

    const result = await runVerify(filePath);
    expect(result.success).toBe(true);
    if (!result.success) {return;}
    expect(result.data.failed).toBe(1);
    const sheetCountAssertion = result.data.results[0].assertions.find(
      (a) => a.path === "sheetCount",
    );
    expect(sheetCountAssertion).toBeDefined();
    expect(sheetCountAssertion!.passed).toBe(false);
    expect(sheetCountAssertion!.expected).toBe(3);
    expect(sheetCountAssertion!.actual).toBe(1);
  });

  it("should return FILE_NOT_FOUND for missing path", async () => {
    const result = await runVerify("/nonexistent/path/to/specs");
    expect(result.success).toBe(false);
    if (result.success) {return;}
    expect(result.error.code).toBe("FILE_NOT_FOUND");
  });

  it("should return NO_TEST_CASES for empty directory", async () => {
    const emptyDir = path.join(ctx.tmpDir, "empty-dir");
    await fs.mkdir(emptyDir, { recursive: true });

    const result = await runVerify(emptyDir);
    expect(result.success).toBe(false);
    if (result.success) {return;}
    expect(result.error.code).toBe("NO_TEST_CASES");
  });
});

// =============================================================================
// runVerify with options
// =============================================================================

describe("runVerify with options", () => {
  it("should filter by tag", async () => {
    const tagDir = path.join(ctx.tmpDir, "tag-filter");
    const tagOutputDir = path.join(tagDir, "__output__");
    await fs.mkdir(tagOutputDir, { recursive: true });

    await fs.writeFile(
      path.join(tagDir, "case-alpha.json"),
      JSON.stringify({
        name: "case-alpha",
        tags: ["alpha"],
        input: {
          mode: "create",
          output: "../__output__/case-alpha.xlsx",
          workbook: {
            sheets: [
              {
                name: "Sheet1",
                rows: [{ row: 1, cells: [{ ref: "A1", value: "alpha" }] }],
              },
            ],
          },
        },
        expected: { sheetCount: 1 },
      }),
    );

    await fs.writeFile(
      path.join(tagDir, "case-beta.json"),
      JSON.stringify({
        name: "case-beta",
        tags: ["beta"],
        input: {
          mode: "create",
          output: "../__output__/case-beta.xlsx",
          workbook: {
            sheets: [
              {
                name: "Sheet1",
                rows: [{ row: 1, cells: [{ ref: "A1", value: "beta" }] }],
              },
            ],
          },
        },
        expected: { sheetCount: 1 },
      }),
    );

    const result = await runVerify(tagDir, { tag: "alpha" });
    expect(result.success).toBe(true);
    if (!result.success) {return;}
    expect(result.data.results).toHaveLength(1);
    expect(result.data.results[0].name).toBe("case-alpha");
    expect(result.data.passed).toBe(1);
  });

  it("should return NO_MATCHING_TESTS when tag doesn't match", async () => {
    const noMatchDir = path.join(ctx.tmpDir, "no-match-tag");
    const noMatchOutputDir = path.join(noMatchDir, "__output__");
    await fs.mkdir(noMatchOutputDir, { recursive: true });

    await fs.writeFile(
      path.join(noMatchDir, "case.json"),
      JSON.stringify({
        name: "case",
        tags: ["existing-tag"],
        input: {
          mode: "create",
          output: "../__output__/case.xlsx",
          workbook: {
            sheets: [
              {
                name: "Sheet1",
                rows: [{ row: 1, cells: [{ ref: "A1", value: "x" }] }],
              },
            ],
          },
        },
        expected: { sheetCount: 1 },
      }),
    );

    const result = await runVerify(noMatchDir, { tag: "nonexistent-tag" });
    expect(result.success).toBe(false);
    if (result.success) {return;}
    expect(result.error.code).toBe("NO_MATCHING_TESTS");
  });
});

// =============================================================================
// runVerify assertion types
// =============================================================================

describe("runVerify assertion types", () => {
  it("should verify merged cells", async () => {
    const filePath = await writeTestCase("merged-cells", {
      name: "merged-cells",
      description: "Test merged cell assertions",
      tags: ["assertions"],
      input: {
        mode: "create",
        output: "../__output__/merged-cells.xlsx",
        workbook: {
          sheets: [
            {
              name: "Sheet1",
              rows: [
                {
                  row: 1,
                  cells: [{ ref: "A1", value: "merged" }],
                },
              ],
              mergeCells: ["A1:B2"],
            },
          ],
        },
      },
      expected: {
        sheetCount: 1,
        sheets: [
          {
            name: "Sheet1",
            mergedCells: ["A1:B2"],
          },
        ],
      },
    });

    const result = await runVerify(filePath);
    expect(result.success).toBe(true);
    if (!result.success) {return;}
    expect(result.data.passed).toBe(1);
    expect(result.data.results[0].passed).toBe(true);
    const mergeAssertion = result.data.results[0].assertions.find(
      (a) => a.path.includes("mergedCells"),
    );
    expect(mergeAssertion).toBeDefined();
    expect(mergeAssertion!.passed).toBe(true);
  });

  it("should verify columns", async () => {
    const filePath = await writeTestCase("columns", {
      name: "columns",
      description: "Test column width/hidden assertions",
      tags: ["assertions"],
      input: {
        mode: "create",
        output: "../__output__/columns.xlsx",
        workbook: {
          sheets: [
            {
              name: "Sheet1",
              columns: [
                { min: 1, max: 3, width: 15 },
                { min: 4, max: 4, hidden: true },
              ],
              rows: [
                {
                  row: 1,
                  cells: [{ ref: "A1", value: "x" }],
                },
              ],
            },
          ],
        },
      },
      expected: {
        sheetCount: 1,
        sheets: [
          {
            name: "Sheet1",
            columns: [
              { min: 1, max: 3, width: 15 },
              { min: 4, max: 4, hidden: true },
            ],
          },
        ],
      },
    });

    const result = await runVerify(filePath);
    expect(result.success).toBe(true);
    if (!result.success) {return;}
    expect(result.data.passed).toBe(1);
    expect(result.data.results[0].passed).toBe(true);
    const colAssertions = result.data.results[0].assertions.filter(
      (a) => a.path.includes("columns"),
    );
    expect(colAssertions.length).toBeGreaterThan(0);
    expect(colAssertions.every((a) => a.passed)).toBe(true);
  });

  it("should verify styles", async () => {
    const filePath = await writeTestCase("styles", {
      name: "styles",
      description: "Test style count assertions",
      tags: ["assertions"],
      input: {
        mode: "create",
        output: "../__output__/styles.xlsx",
        workbook: {
          sheets: [
            {
              name: "Sheet1",
              rows: [
                {
                  row: 1,
                  cells: [{ ref: "A1", value: "styled", styleId: 1 }],
                },
              ],
            },
          ],
          styles: {
            fonts: [{ name: "Arial", size: 14, bold: true }],
            fills: [{ type: "solid", color: "#FF0000" }],
            cellXfs: [{ fontId: 1, fillId: 2 }],
          },
        },
      },
      expected: {
        sheetCount: 1,
        styles: {
          fontCount: 2,
          fillCount: 3,
          borderCount: 1,
        },
      },
    });

    const result = await runVerify(filePath);
    expect(result.success).toBe(true);
    if (!result.success) {return;}
    expect(result.data.passed).toBe(1);
    expect(result.data.results[0].passed).toBe(true);
    const styleAssertions = result.data.results[0].assertions.filter(
      (a) => a.path.startsWith("styles."),
    );
    expect(styleAssertions.length).toBeGreaterThan(0);
    expect(styleAssertions.every((a) => a.passed)).toBe(true);
  });

  it("should verify defined names", async () => {
    const filePath = await writeTestCase("defined-names", {
      name: "defined-names",
      description: "Test defined name assertions",
      tags: ["assertions"],
      input: {
        mode: "create",
        output: "../__output__/defined-names.xlsx",
        workbook: {
          sheets: [
            {
              name: "Sheet1",
              rows: [
                {
                  row: 1,
                  cells: [{ ref: "A1", value: 100 }],
                },
              ],
            },
          ],
          definedNames: [
            { name: "MyRange", formula: "Sheet1!$A$1:$A$10" },
            { name: "HiddenName", formula: "42", hidden: true },
          ],
        },
      },
      expected: {
        sheetCount: 1,
        definedNames: [
          { name: "MyRange", formula: "Sheet1!$A$1:$A$10" },
          { name: "HiddenName", formula: "42", hidden: true },
        ],
      },
    });

    const result = await runVerify(filePath);
    expect(result.success).toBe(true);
    if (!result.success) {return;}
    expect(result.data.passed).toBe(1);
    expect(result.data.results[0].passed).toBe(true);
    const dnAssertions = result.data.results[0].assertions.filter(
      (a) => a.path.startsWith("definedNames"),
    );
    expect(dnAssertions.length).toBeGreaterThan(0);
    expect(dnAssertions.every((a) => a.passed)).toBe(true);
  });

  it("should verify formulas", async () => {
    const filePath = await writeTestCase("formulas", {
      name: "formulas",
      description: "Test formula assertions",
      tags: ["assertions"],
      input: {
        mode: "create",
        output: "../__output__/formulas.xlsx",
        workbook: {
          sheets: [
            {
              name: "Sheet1",
              rows: [
                {
                  row: 1,
                  cells: [
                    { ref: "A1", value: { type: "number", value: 10 } },
                    { ref: "B1", value: { type: "number", value: 20 } },
                    { ref: "C1", formula: { expression: "SUM(A1:B1)" } },
                  ],
                },
              ],
            },
          ],
        },
      },
      expected: {
        sheetCount: 1,
        sheets: [
          {
            name: "Sheet1",
            cells: [
              { ref: "C1", formula: "SUM(A1:B1)" },
            ],
          },
        ],
      },
    });

    const result = await runVerify(filePath);
    expect(result.success).toBe(true);
    if (!result.success) {return;}
    expect(result.data.passed).toBe(1);
    expect(result.data.results[0].passed).toBe(true);
    const formulaAssertion = result.data.results[0].assertions.find(
      (a) => a.path.includes("formula"),
    );
    expect(formulaAssertion).toBeDefined();
    expect(formulaAssertion!.passed).toBe(true);
  });

  it("should handle multiple sheets", async () => {
    const filePath = await writeTestCase("multi-sheet", {
      name: "multi-sheet",
      description: "Test multiple sheets",
      tags: ["assertions"],
      input: {
        mode: "create",
        output: "../__output__/multi-sheet.xlsx",
        workbook: {
          sheets: [
            {
              name: "Data",
              rows: [
                {
                  row: 1,
                  cells: [{ ref: "A1", value: "data-value" }],
                },
              ],
            },
            {
              name: "Summary",
              rows: [
                {
                  row: 1,
                  cells: [{ ref: "A1", value: "summary-value" }],
                },
              ],
            },
          ],
        },
      },
      expected: {
        sheetCount: 2,
        sheetNames: ["Data", "Summary"],
        sheets: [
          {
            name: "Data",
            cells: [{ ref: "A1", type: "string", value: "data-value" }],
          },
          {
            name: "Summary",
            cells: [{ ref: "A1", type: "string", value: "summary-value" }],
          },
        ],
      },
    });

    const result = await runVerify(filePath);
    expect(result.success).toBe(true);
    if (!result.success) {return;}
    expect(result.data.passed).toBe(1);
    expect(result.data.failed).toBe(0);
    expect(result.data.results[0].passed).toBe(true);
    expect(result.data.results[0].assertions.every((a) => a.passed)).toBe(true);
  });
});

// =============================================================================
// runVerify with directory
// =============================================================================

describe("runVerify with directory", () => {
  it("should process all JSON files in directory", async () => {
    const dirCases = path.join(ctx.tmpDir, "dir-cases");
    const dirOutputDir = path.join(dirCases, "__output__");
    await fs.mkdir(dirOutputDir, { recursive: true });

    for (let i = 1; i <= 3; i++) {
      await fs.writeFile(
        path.join(dirCases, `case-${i}.json`),
        JSON.stringify({
          name: `case-${i}`,
          description: `Test case ${i}`,
          tags: ["dir-test"],
          input: {
            mode: "create",
            output: `../__output__/dir-case-${i}.xlsx`,
            workbook: {
              sheets: [
                {
                  name: "Sheet1",
                  rows: [
                    {
                      row: 1,
                      cells: [{ ref: "A1", value: `value-${i}` }],
                    },
                  ],
                },
              ],
            },
          },
          expected: {
            sheetCount: 1,
            sheetNames: ["Sheet1"],
            sheets: [
              {
                name: "Sheet1",
                cells: [{ ref: "A1", type: "string", value: `value-${i}` }],
              },
            ],
          },
        }),
      );
    }

    const result = await runVerify(dirCases);
    expect(result.success).toBe(true);
    if (!result.success) {return;}
    expect(result.data.results).toHaveLength(3);
    expect(result.data.passed).toBe(3);
    expect(result.data.failed).toBe(0);
    expect(result.data.results.every((r) => r.passed)).toBe(true);
  });
});
