/**
 * @file Generate self-comparison baselines from editor output
 *
 * Captures the xlsx-editor rendering and saves as baseline images.
 * These baselines are used for regression testing - any future changes
 * that cause visual differences will be detected.
 *
 * Usage:
 *   bun packages/@aurochs-ui/xlsx-editor/scripts/generate-editor-baselines.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import {
  startHarness,
  stopHarness,
  captureWorkbook,
  captureWorkbookScrolled,
  ensureDirs,
  getFixturePaths,
  safeName,
} from "../spec/visual-harness/test-utils";

const VIEWPORT_WIDTH = 800;
const VIEWPORT_HEIGHT = 600;

type TestCase = {
  name: string;
  jsonFile: string;
  sheetIndex: number;
  scrolled?: { scrollTop: number; scrollLeft: number };
};

const TEST_CASES: TestCase[] = [
  // Static tests
  { name: "frozen-panes", jsonFile: "frozen-panes.json", sheetIndex: 0 },
  { name: "frozen-rows", jsonFile: "frozen-rows.json", sheetIndex: 0 },
  { name: "frozen-cols", jsonFile: "frozen-cols.json", sheetIndex: 0 },
  { name: "row-col-sizes", jsonFile: "row-col-sizes.json", sheetIndex: 0 },
  { name: "hidden-rowcol", jsonFile: "hidden-rowcol.json", sheetIndex: 0 },
  { name: "cell-formatting", jsonFile: "cell-formatting.json", sheetIndex: 0 },
  { name: "merge-cells", jsonFile: "merge-cells.json", sheetIndex: 0 },
  { name: "number-formats", jsonFile: "number-formats.json", sheetIndex: 0 },
  { name: "text-alignment", jsonFile: "text-alignment.json", sheetIndex: 0 },
  // Scrolled tests
  { name: "frozen-panes_scrolled", jsonFile: "frozen-panes.json", sheetIndex: 0, scrolled: { scrollTop: 300, scrollLeft: 150 } },
  { name: "frozen-rows_scrolled", jsonFile: "frozen-rows.json", sheetIndex: 0, scrolled: { scrollTop: 200, scrollLeft: 0 } },
  { name: "frozen-cols_scrolled", jsonFile: "frozen-cols.json", sheetIndex: 0, scrolled: { scrollTop: 0, scrollLeft: 300 } },
];

async function main() {
  const fixturesDir = path.resolve(__dirname, "../fixtures/visual");
  const jsonDir = path.join(fixturesDir, "json");
  const baselineDir = path.join(fixturesDir, "baseline");

  // Ensure directories exist
  ensureDirs([baselineDir]);

  console.log("Generating editor baselines for visual regression testing...\n");

  // Check if JSON fixtures exist
  if (!fs.existsSync(jsonDir)) {
    console.error("Error: JSON fixtures not found. Run generate-visual-fixtures.ts first.");
    process.exit(1);
  }

  // Start harness
  console.log("Starting test harness...");
  const harness = await startHarness();
  console.log("Harness ready.\n");

  let generated = 0;
  let failed = 0;

  for (const testCase of TEST_CASES) {
    const jsonPath = path.join(jsonDir, testCase.jsonFile);
    if (!fs.existsSync(jsonPath)) {
      console.log(`  Skipping ${testCase.name}: ${testCase.jsonFile} not found`);
      failed++;
      continue;
    }

    const workbook = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as XlsxWorkbook;

    const config = {
      width: VIEWPORT_WIDTH,
      height: VIEWPORT_HEIGHT,
      sheetIndex: testCase.sheetIndex,
    };

    try {
      let screenshot: Buffer;

      if (testCase.scrolled) {
        screenshot = await captureWorkbookScrolled(harness.page, workbook, {
          ...config,
          scrollTop: testCase.scrolled.scrollTop,
          scrollLeft: testCase.scrolled.scrollLeft,
        });
      } else {
        screenshot = await captureWorkbook(harness.page, workbook, config);
      }

      const baselinePath = path.join(baselineDir, `${safeName(testCase.name)}.png`);
      fs.writeFileSync(baselinePath, screenshot);
      console.log(`  Created: ${testCase.name}.png`);
      generated++;
    } catch (err) {
      console.error(`  Failed: ${testCase.name} - ${(err as Error).message}`);
      failed++;
    }
  }

  // Stop harness
  await stopHarness(harness);

  console.log(`
========================================
BASELINE GENERATION COMPLETE
========================================

Generated: ${generated} baselines
Failed: ${failed}

Baselines saved to: ${baselineDir}

These baselines represent the current editor rendering.
Future visual regression tests will compare against these.

To run visual tests:
  npx vitest run packages/@aurochs-ui/xlsx-editor/spec/xlsx-visual.spec.ts
`);
}

main().catch(console.error);
