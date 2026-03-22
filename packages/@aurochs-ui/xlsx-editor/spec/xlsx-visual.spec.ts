/**
 * @file XLSX Editor Visual Regression Tests
 *
 * Compares the xlsx-editor rendering against LibreOffice Calc baseline images.
 * Tests frozen panes, row/column layouts, and scroll behavior.
 *
 * Run from project root:
 *   npx vitest run packages/@aurochs-ui/xlsx-editor/spec/xlsx-visual.spec.ts
 *
 * Before running:
 *   1. Generate fixtures:
 *      bun packages/@aurochs-ui/xlsx-editor/scripts/generate-visual-fixtures.ts
 *   2. Create LibreOffice baselines (see script output for instructions)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { Page } from "puppeteer";
import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import {
  startHarness,
  stopHarness,
  captureWorkbook,
  captureWorkbookScrolled,
  comparePngs,
  ensureDirs,
  getFixturePaths,
  printSummary,
  type XlsxHarness,
  type CompareResult,
} from "./visual-harness/test-utils";

// =============================================================================
// Constants
// =============================================================================

const VIEWPORT_WIDTH = 800;
const VIEWPORT_HEIGHT = 600;
const DIFF_THRESHOLD_PERCENT = 0.1; // Target: <0.1% difference for self-comparison

// =============================================================================
// Test Fixtures
// =============================================================================

type TestCase = {
  name: string;
  jsonFile: string;
  sheetIndex: number;
  scrolled?: { scrollTop: number; scrollLeft: number };
};

const TEST_CASES: TestCase[] = [
  // Basic frozen panes (corner frozen)
  { name: "frozen-panes", jsonFile: "frozen-panes.json", sheetIndex: 0 },
  { name: "frozen-panes_scrolled", jsonFile: "frozen-panes.json", sheetIndex: 0, scrolled: { scrollTop: 300, scrollLeft: 150 } },

  // Frozen rows only
  { name: "frozen-rows", jsonFile: "frozen-rows.json", sheetIndex: 0 },
  { name: "frozen-rows_scrolled", jsonFile: "frozen-rows.json", sheetIndex: 0, scrolled: { scrollTop: 200, scrollLeft: 0 } },

  // Frozen columns only
  { name: "frozen-cols", jsonFile: "frozen-cols.json", sheetIndex: 0 },
  { name: "frozen-cols_scrolled", jsonFile: "frozen-cols.json", sheetIndex: 0, scrolled: { scrollTop: 0, scrollLeft: 300 } },

  // Row/Column sizes
  { name: "row-col-sizes", jsonFile: "row-col-sizes.json", sheetIndex: 0 },

  // Hidden rows/columns
  { name: "hidden-rowcol", jsonFile: "hidden-rowcol.json", sheetIndex: 0 },

  // Cell formatting (fonts, colors, borders)
  { name: "cell-formatting", jsonFile: "cell-formatting.json", sheetIndex: 0 },

  // Merge cells
  { name: "merge-cells", jsonFile: "merge-cells.json", sheetIndex: 0 },

  // Number formats
  { name: "number-formats", jsonFile: "number-formats.json", sheetIndex: 0 },

  // Text alignment
  { name: "text-alignment", jsonFile: "text-alignment.json", sheetIndex: 0 },
];

// =============================================================================
// Helpers
// =============================================================================

async function captureTestCase(params: {
  page: Page;
  workbook: XlsxWorkbook;
  config: { width: number; height: number; sheetIndex: number };
  testCase: TestCase;
}): Promise<Buffer> {
  const { page, workbook, config, testCase } = params;
  if (testCase.scrolled) {
    return captureWorkbookScrolled(page, workbook, {
      ...config,
      scrollTop: testCase.scrolled.scrollTop,
      scrollLeft: testCase.scrolled.scrollLeft,
    });
  }
  return captureWorkbook(page, workbook, config);
}

function formatTestName(testCase: TestCase): string {
  if (testCase.scrolled) {
    return `${testCase.name} (scrolled to ${testCase.scrolled.scrollTop},${testCase.scrolled.scrollLeft})`;
  }
  return testCase.name;
}

// =============================================================================
// Test Suite
// =============================================================================

describe("XLSX Visual Regression", () => {
  const harnessRef = { value: null as XlsxHarness | null };
  const results: CompareResult[] = [];
  // __dirname is spec/, so go up one level to package root
  const fixturesDir = path.resolve(__dirname, "../fixtures/visual");
  const jsonDir = path.join(fixturesDir, "json");

  beforeAll(async () => {
    // Ensure output directories exist
    const paths = getFixturePaths("");
    ensureDirs([paths.baselineDir, paths.outputDir, paths.diffDir]);

    // Start the test harness
    harnessRef.value = await startHarness();
  }, 30000); // 30s timeout for startup

  afterAll(async () => {
    if (harnessRef.value) {
      await stopHarness(harnessRef.value);
    }

    // Print summary
    printSummary(results);
  });

  // Run tests for each case
  for (const testCase of TEST_CASES) {
    const testName = formatTestName(testCase);

    it(`should render ${testName} correctly`, async () => {
      if (!harnessRef.value) {
        throw new Error("Harness not initialized");
      }
      const harness = harnessRef.value;

      const paths = getFixturePaths(testCase.name);

      // Check if baseline exists
      const baselinePath = paths.baselinePath(testCase.name);
      if (!fs.existsSync(baselinePath)) {
        console.warn(`  Skipping ${testCase.name}: baseline not found at ${baselinePath}`);
        return;
      }

      // Load workbook JSON
      const jsonPath = path.join(jsonDir, testCase.jsonFile);
      if (!fs.existsSync(jsonPath)) {
        throw new Error(`Workbook JSON not found: ${jsonPath}. Run generate-visual-fixtures.ts first.`);
      }
      const workbook = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as XlsxWorkbook;

      // Capture screenshot
      const config = {
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
        sheetIndex: testCase.sheetIndex,
      };

      const actual = await captureTestCase({ page: harness.page, workbook, config, testCase });

      // Save actual output
      const outputPath = paths.outputPath(testCase.name);
      fs.writeFileSync(outputPath, actual);

      // Load baseline
      const baseline = fs.readFileSync(baselinePath);

      // Compare full image (self-comparison baseline)
      const diffPath = paths.diffPath(testCase.name);
      const result = comparePngs({ actual, baseline, name: testCase.name, diffPath });
      results.push(result);

      // Assert
      expect(result.diffPercent).toBeLessThan(DIFF_THRESHOLD_PERCENT);
    }, 30000); // 30s timeout per test
  }
});

// =============================================================================
// Self-comparison test (for CI without baselines)
// =============================================================================

describe("XLSX Visual Self-Comparison", () => {
  const harnessRef2 = { value: null as XlsxHarness | null };
  // __dirname is spec/, so go up one level to package root
  const fixturesDir = path.resolve(__dirname, "../fixtures/visual");
  const jsonDir = path.join(fixturesDir, "json");

  beforeAll(async () => {
    // Check if any JSON fixtures exist
    if (!fs.existsSync(jsonDir)) {
      console.warn("No JSON fixtures found. Run generate-visual-fixtures.ts first.");
      return;
    }

    harnessRef2.value = await startHarness();
  }, 30000);

  afterAll(async () => {
    if (harnessRef2.value) {
      await stopHarness(harnessRef2.value);
    }
  });

  it("should produce consistent output across renders", async () => {
    if (!harnessRef2.value) {
      console.warn("Skipping: harness not initialized");
      return;
    }

    const jsonPath = path.join(jsonDir, "frozen-panes.json");
    if (!fs.existsSync(jsonPath)) {
      console.warn("Skipping: frozen-panes.json not found");
      return;
    }

    const workbook = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as XlsxWorkbook;

    const config = {
      width: VIEWPORT_WIDTH,
      height: VIEWPORT_HEIGHT,
      sheetIndex: 0,
    };

    // Capture twice
    const harness = harnessRef2.value;
    const first = await captureWorkbook(harness.page, workbook, config);
    const second = await captureWorkbook(harness.page, workbook, config);

    // Compare - should be identical
    const result = comparePngs({ actual: first, baseline: second, name: "self-comparison" });

    expect(result.diffPercent).toBe(0);
  }, 15000);
});
