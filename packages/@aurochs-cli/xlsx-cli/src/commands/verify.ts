/**
 * @file verify command - verify XLSX build results against expected values
 *
 * Supports comprehensive assertions: cell values, formulas, styles,
 * merged cells, columns, defined names, and sheet properties.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { runBuild } from "./build";
import { runInfo, type InfoData } from "./info";
import { runShow, type ShowData } from "./show";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { loadXlsxWorkbook } from "../utils/xlsx-loader";
import type { XlsxBuildSpec } from "./build-spec";

// =============================================================================
// Type Definitions
// =============================================================================

export type ExpectedCell = {
  readonly ref: string;
  readonly type?: "string" | "number" | "boolean" | "date" | "error" | "empty";
  readonly value?: string | number | boolean | null;
  readonly formula?: string;
  readonly styleId?: number;
};

export type ExpectedColumn = {
  readonly min: number;
  readonly max: number;
  readonly width?: number;
  readonly hidden?: boolean;
};

export type ExpectedSheet = {
  readonly name: string;
  readonly rowCount?: number;
  readonly cellCount?: number;
  readonly mergedCells?: readonly string[];
  readonly columns?: readonly ExpectedColumn[];
  readonly cells?: readonly ExpectedCell[];
};

export type ExpectedDefinedName = {
  readonly name: string;
  readonly formula?: string;
  readonly localSheetId?: number;
  readonly hidden?: boolean;
};

export type ExpectedStyles = {
  readonly fontCount?: number;
  readonly fillCount?: number;
  readonly borderCount?: number;
  readonly numberFormatCount?: number;
  readonly cellXfCount?: number;
};

export type ExpectedWorkbook = {
  readonly sheetCount?: number;
  readonly sheetNames?: readonly string[];
  readonly totalRows?: number;
  readonly totalCells?: number;
  readonly definedNames?: readonly ExpectedDefinedName[];
  readonly styles?: ExpectedStyles;
  readonly sheets?: readonly ExpectedSheet[];
};

export type TestCaseSpec = {
  readonly name: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly setup?: XlsxBuildSpec;
  readonly input: XlsxBuildSpec;
  readonly expected: ExpectedWorkbook;
};

export type Assertion = {
  readonly path: string;
  readonly expected: unknown;
  readonly actual: unknown;
  readonly passed: boolean;
};

export type TestCaseResult = {
  readonly name: string;
  readonly passed: boolean;
  readonly assertions: readonly Assertion[];
};

export type VerifyData = {
  readonly passed: number;
  readonly failed: number;
  readonly results: readonly TestCaseResult[];
};

export type VerifyOptions = {
  readonly tag?: string;
};

// =============================================================================
// Assertion Helpers
// =============================================================================

function createAssertion(path: string, expected: unknown, actual: unknown): Assertion {
  return {
    path,
    expected,
    actual,
    passed: JSON.stringify(expected) === JSON.stringify(actual),
  };
}

function assertOptional(params: { assertions: Assertion[]; path: string; expected: unknown; actual: unknown }): void {
  if (params.expected !== undefined) {
    params.assertions.push(createAssertion(params.path, params.expected, params.actual));
  }
}

// =============================================================================
// Matcher Functions
// =============================================================================

function findCellInShowData(showData: ShowData, ref: string): { type: string; value: string | number | boolean | null; formula?: string } | undefined {
  for (const row of showData.rows) {
    for (const cell of row.cells) {
      if (cell.ref === ref) {
        return cell;
      }
    }
  }
  return undefined;
}

function matchCell(expected: ExpectedCell, showData: ShowData, basePath: string): Assertion[] {
  const assertions: Assertion[] = [];
  const actualCell = findCellInShowData(showData, expected.ref);

  if (expected.type !== undefined) {
    assertions.push(createAssertion(
      `${basePath}.type`,
      expected.type,
      actualCell?.type ?? "empty",
    ));
  }

  if (expected.value !== undefined) {
    assertions.push(createAssertion(
      `${basePath}.value`,
      expected.value,
      actualCell?.value ?? null,
    ));
  }

  if (expected.formula !== undefined) {
    assertions.push(createAssertion(
      `${basePath}.formula`,
      expected.formula,
      actualCell?.formula ?? null,
    ));
  }

  return assertions;
}

function matchSheet(params: { expected: ExpectedSheet; showData: ShowData | undefined; workbookData: WorkbookSheetData | undefined; basePath: string }): Assertion[] {
  const { expected, showData, workbookData, basePath } = params;
  const assertions: Assertion[] = [];

  if (expected.rowCount !== undefined && workbookData) {
    assertions.push(createAssertion(`${basePath}.rowCount`, expected.rowCount, workbookData.rowCount));
  }

  if (expected.cellCount !== undefined && workbookData) {
    assertions.push(createAssertion(`${basePath}.cellCount`, expected.cellCount, workbookData.cellCount));
  }

  if (expected.mergedCells !== undefined && showData) {
    const actualMerged = showData.mergedCells ?? [];
    assertions.push(createAssertion(`${basePath}.mergedCells`, expected.mergedCells, actualMerged));
  }

  if (expected.columns !== undefined && workbookData) {
    for (let i = 0; i < expected.columns.length; i++) {
      const expCol = expected.columns[i];
      const actCol = workbookData.columns?.[i];
      const colPath = `${basePath}.columns[${i}]`;

      if (actCol) {
        assertOptional({ assertions, path: `${colPath}.min`, expected: expCol.min, actual: actCol.min });
        assertOptional({ assertions, path: `${colPath}.max`, expected: expCol.max, actual: actCol.max });
        assertOptional({ assertions, path: `${colPath}.width`, expected: expCol.width, actual: actCol.width });
        assertOptional({ assertions, path: `${colPath}.hidden`, expected: expCol.hidden, actual: actCol.hidden });
      } else {
        assertions.push(createAssertion(`${colPath}`, "exists", "missing"));
      }
    }
  }

  if (expected.cells !== undefined && showData) {
    for (const expCell of expected.cells) {
      const cellPath = `${basePath}.cells[${expCell.ref}]`;
      assertions.push(...matchCell(expCell, showData, cellPath));
    }
  }

  return assertions;
}

function matchStyles(expected: ExpectedStyles, info: InfoData, basePath: string): Assertion[] {
  const assertions: Assertion[] = [];
  assertOptional({ assertions, path: `${basePath}.fontCount`, expected: expected.fontCount, actual: info.fontCount });
  assertOptional({ assertions, path: `${basePath}.fillCount`, expected: expected.fillCount, actual: info.fillCount });
  assertOptional({ assertions, path: `${basePath}.borderCount`, expected: expected.borderCount, actual: info.borderCount });
  assertOptional({ assertions, path: `${basePath}.numberFormatCount`, expected: expected.numberFormatCount, actual: info.numberFormatCount });
  return assertions;
}

function matchDefinedNames(expected: readonly ExpectedDefinedName[], actual: readonly DefinedNameData[], basePath: string): Assertion[] {
  const assertions: Assertion[] = [];

  for (let i = 0; i < expected.length; i++) {
    const exp = expected[i];
    const act = actual.find((dn) => dn.name === exp.name);
    const dnPath = `${basePath}[${exp.name}]`;

    if (!act) {
      assertions.push(createAssertion(dnPath, "exists", "missing"));
      continue;
    }

    assertOptional({ assertions, path: `${dnPath}.formula`, expected: exp.formula, actual: act.formula });
    assertOptional({ assertions, path: `${dnPath}.localSheetId`, expected: exp.localSheetId, actual: act.localSheetId });
    assertOptional({ assertions, path: `${dnPath}.hidden`, expected: exp.hidden, actual: act.hidden });
  }

  return assertions;
}

// =============================================================================
// Internal Types
// =============================================================================

type WorkbookSheetData = {
  readonly name: string;
  readonly rowCount: number;
  readonly cellCount: number;
  readonly columns?: readonly { min: number; max: number; width?: number; hidden?: boolean }[];
};

type DefinedNameData = {
  readonly name: string;
  readonly formula: string;
  readonly localSheetId?: number;
  readonly hidden?: boolean;
};

async function getShowDataIfNeeded(outputPath: string, expSheet: ExpectedSheet): Promise<ShowData | undefined> {
  if (!expSheet.cells && !expSheet.mergedCells) {
    return undefined;
  }
  const showResult = await runShow(outputPath, expSheet.name);
  return showResult.success ? showResult.data : undefined;
}

// =============================================================================
// Test Case Execution
// =============================================================================

async function runTestCase(spec: TestCaseSpec, specDir: string): Promise<TestCaseResult> {
  const assertions: Assertion[] = [];

  // Resolve output path from spec
  const resolvedInput = resolveSpecPaths(spec.input, specDir);

  // Ensure output directory exists
  const outputPath = getOutputPath(resolvedInput, specDir);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  // Write temporary spec file for build command
  const tempSpecPath = path.join(path.dirname(outputPath), `${spec.name}.build.json`);
  await fs.writeFile(tempSpecPath, JSON.stringify(resolvedInput, null, 2));

  try {
    // Run setup step if present (e.g., build template for modify mode)
    if (spec.setup) {
      const resolvedSetup = resolveSpecPaths(spec.setup, specDir);
      const setupSpecPath = path.join(path.dirname(outputPath), `${spec.name}.setup.json`);
      await fs.writeFile(setupSpecPath, JSON.stringify(resolvedSetup, null, 2));
      const setupResult = await runBuild(setupSpecPath);
      await fs.unlink(setupSpecPath).catch(() => {});
      if (!setupResult.success) {
        return {
          name: spec.name,
          passed: false,
          assertions: [createAssertion("setup", "success", setupResult.error.message)],
        };
      }
    }

    // Run build
    const buildResult = await runBuild(tempSpecPath);
    if (!buildResult.success) {
      return {
        name: spec.name,
        passed: false,
        assertions: [createAssertion("build", "success", buildResult.error.message)],
      };
    }

    // Get workbook info
    const infoResult = await runInfo(outputPath);
    if (!infoResult.success) {
      return {
        name: spec.name,
        passed: false,
        assertions: [createAssertion("info", "readable", infoResult.error.message)],
      };
    }

    const info = infoResult.data;

    // Top-level assertions
    assertOptional({ assertions, path: "sheetCount", expected: spec.expected.sheetCount, actual: info.sheetCount });
    if (spec.expected.sheetNames !== undefined) {
      assertions.push(createAssertion("sheetNames", spec.expected.sheetNames, info.sheetNames));
    }
    assertOptional({ assertions, path: "totalRows", expected: spec.expected.totalRows, actual: info.totalRows });
    assertOptional({ assertions, path: "totalCells", expected: spec.expected.totalCells, actual: info.totalCells });

    // Style assertions
    if (spec.expected.styles) {
      assertions.push(...matchStyles(spec.expected.styles, info, "styles"));
    }

    // Per-sheet assertions
    if (spec.expected.sheets) {
      // Load workbook for direct domain access
      const workbook = await loadXlsxWorkbook(outputPath);

      for (const expSheet of spec.expected.sheets) {
        const sheetPath = `sheets[${expSheet.name}]`;
        const domainSheet = workbook.sheets.find((s) => s.name === expSheet.name);

        if (!domainSheet) {
          assertions.push(createAssertion(sheetPath, "exists", "missing"));
          continue;
        }

        // Get sheet data via show command for cell assertions
        const showData = await getShowDataIfNeeded(outputPath, expSheet);

        // Build workbook sheet data
        const wbSheetData: WorkbookSheetData = {
          name: domainSheet.name,
          rowCount: domainSheet.rows.length,
          cellCount: domainSheet.rows.reduce((sum, row) => sum + row.cells.length, 0),
          columns: domainSheet.columns?.map((col) => ({
            min: col.min as number,
            max: col.max as number,
            ...(col.width !== undefined ? { width: col.width } : {}),
            ...(col.hidden !== undefined ? { hidden: col.hidden } : {}),
          })),
        };

        assertions.push(...matchSheet({ expected: expSheet, showData, workbookData: wbSheetData, basePath: sheetPath }));
      }
    }

    // Defined name assertions
    if (spec.expected.definedNames) {
      const workbook = await loadXlsxWorkbook(outputPath);
      const actualNames: DefinedNameData[] = (workbook.definedNames ?? []).map((dn) => ({
        name: dn.name,
        formula: dn.formula,
        ...(dn.localSheetId !== undefined ? { localSheetId: dn.localSheetId } : {}),
        ...(dn.hidden !== undefined ? { hidden: dn.hidden } : {}),
      }));
      assertions.push(...matchDefinedNames(spec.expected.definedNames, actualNames, "definedNames"));
    }

    const passed = assertions.every((a) => a.passed);
    return { name: spec.name, passed, assertions };
  } finally {
    await fs.unlink(tempSpecPath).catch(() => {});
  }
}

// =============================================================================
// Path Resolution Helpers
// =============================================================================

function resolveSpecPaths(input: XlsxBuildSpec, specDir: string): XlsxBuildSpec {
  if (input.mode === "create") {
    return {
      ...input,
      output: path.resolve(specDir, input.output),
    };
  }
  return {
    ...input,
    template: path.resolve(specDir, input.template),
    output: path.resolve(specDir, input.output),
  };
}

function getOutputPath(input: XlsxBuildSpec, _specDir: string): string {
  return input.output;
}

// =============================================================================
// Directory Scanning
// =============================================================================

async function findTestCaseFiles(targetPath: string): Promise<string[]> {
  const stat = await fs.stat(targetPath);

  if (stat.isFile()) {
    return [targetPath];
  }

  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".json") && !entry.name.includes(".build.")) {
      files.push(path.join(targetPath, entry.name));
    } else if (entry.isDirectory() && !entry.name.startsWith("__") && !entry.name.startsWith(".")) {
      const subFiles = await findTestCaseFiles(path.join(targetPath, entry.name));
      files.push(...subFiles);
    }
  }

  return files.sort();
}

async function loadTestCase(filePath: string): Promise<TestCaseSpec> {
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content) as TestCaseSpec;
}

// =============================================================================
// Main Verify Function
// =============================================================================

/**
 * Run verification tests from a spec file or directory.
 */
export async function runVerify(specPath: string, options: VerifyOptions = {}): Promise<Result<VerifyData>> {
  try {
    const absolutePath = path.resolve(specPath);
    const files = await findTestCaseFiles(absolutePath);

    if (files.length === 0) {
      return error("NO_TEST_CASES", `No test case files found in: ${specPath}`);
    }

    const results: TestCaseResult[] = [];

    for (const file of files) {
      const spec = await loadTestCase(file);

      // Filter by tag if specified
      if (options.tag && !spec.tags?.includes(options.tag)) {
        continue;
      }

      const specDir = path.dirname(file);
      const result = await runTestCase(spec, specDir);
      results.push(result);
    }

    if (results.length === 0) {
      return error("NO_MATCHING_TESTS", `No test cases matched tag: ${options.tag}`);
    }

    const passed = results.filter((r) => r.passed).length;
    const failed = results.length - passed;

    return success({ passed, failed, results });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `Path not found: ${specPath}`);
    }
    if (err instanceof SyntaxError) {
      return error("INVALID_JSON", `Invalid JSON: ${err.message}`);
    }
    return error("VERIFY_ERROR", `Verification failed: ${(err as Error).message}`);
  }
}
