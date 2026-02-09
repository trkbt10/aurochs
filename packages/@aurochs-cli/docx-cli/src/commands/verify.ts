/**
 * @file verify command - verify DOCX build results against expected values
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { runBuild, type BuildSpec } from "./build";
import { runInfo } from "./info";
import { success, error, type Result } from "@aurochs-cli/cli-core";

// =============================================================================
// Type Definitions
// =============================================================================

export type ExpectedDocument = {
  readonly paragraphCount?: number;
  readonly tableCount?: number;
  readonly sectionCount?: number;
  readonly hasStyles?: boolean;
  readonly hasNumbering?: boolean;
};

export type TestCaseSpec = {
  readonly name: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly input: BuildSpec;
  readonly expected: ExpectedDocument;
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
// Comparison Logic
// =============================================================================

function createAssertion(path: string, expected: unknown, actual: unknown): Assertion {
  return {
    path,
    expected,
    actual,
    passed: JSON.stringify(expected) === JSON.stringify(actual),
  };
}

// =============================================================================
// Test Case Execution
// =============================================================================

async function runTestCase(spec: TestCaseSpec, specDir: string): Promise<TestCaseResult> {
  const assertions: Assertion[] = [];

  // Resolve paths relative to spec file directory
  const input = {
    ...spec.input,
    output: path.resolve(specDir, spec.input.output),
  };

  // Ensure output directory exists
  await fs.mkdir(path.dirname(input.output), { recursive: true });

  // Write temporary spec file for build command
  const tempSpecPath = path.join(path.dirname(input.output), `${spec.name}.build.json`);
  await fs.writeFile(tempSpecPath, JSON.stringify(input, null, 2));

  try {
    // Run build
    const buildResult = await runBuild(tempSpecPath);
    if (!buildResult.success) {
      return {
        name: spec.name,
        passed: false,
        assertions: [createAssertion("build", "success", buildResult.error.message)],
      };
    }

    // Get document info
    const infoResult = await runInfo(input.output);
    if (!infoResult.success) {
      return {
        name: spec.name,
        passed: false,
        assertions: [createAssertion("info", "readable", infoResult.error.message)],
      };
    }

    const info = infoResult.data;

    // Verify expectations
    if (spec.expected.paragraphCount !== undefined) {
      assertions.push(createAssertion("paragraphCount", spec.expected.paragraphCount, info.paragraphCount));
    }
    if (spec.expected.tableCount !== undefined) {
      assertions.push(createAssertion("tableCount", spec.expected.tableCount, info.tableCount));
    }
    if (spec.expected.sectionCount !== undefined) {
      assertions.push(createAssertion("sectionCount", spec.expected.sectionCount, info.sectionCount));
    }
    if (spec.expected.hasStyles !== undefined) {
      assertions.push(createAssertion("hasStyles", spec.expected.hasStyles, info.hasStyles));
    }
    if (spec.expected.hasNumbering !== undefined) {
      assertions.push(createAssertion("hasNumbering", spec.expected.hasNumbering, info.hasNumbering));
    }

    const passed = assertions.every((a) => a.passed);
    return { name: spec.name, passed, assertions };
  } finally {
    // Clean up temp file
    await fs.unlink(tempSpecPath).catch(() => {});
  }
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
