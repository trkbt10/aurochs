/**
 * @file Generate self-comparison baselines from editor output
 *
 * Captures the pptx-editor rendering and saves as baseline images.
 * These baselines are used for regression testing - any future changes
 * that cause visual differences will be detected.
 *
 * Usage:
 *   bun packages/@aurochs-ui/pptx-editor/scripts/generate-editor-baselines.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  startHarness,
  stopHarness,
  captureSlide,
  ensureDirs,
  safeName,
  type SlideData,
} from "../spec/visual-harness/test-utils";

const VIEWPORT_WIDTH = 960;
const VIEWPORT_HEIGHT = 540;

type TestCase = {
  name: string;
  jsonFile: string;
};

const TEST_CASES: TestCase[] = [
  { name: "text-box", jsonFile: "text-box.json" },
  { name: "rectangle", jsonFile: "rectangle.json" },
  { name: "ellipse", jsonFile: "ellipse.json" },
  { name: "solid-fill", jsonFile: "solid-fill.json" },
  { name: "stroke", jsonFile: "stroke.json" },
  { name: "mixed-shapes", jsonFile: "mixed-shapes.json" },
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

  // Process test cases sequentially (parallel causes race conditions on same page)
  const results: { success: boolean }[] = [];
  for (const testCase of TEST_CASES) {
    const jsonPath = path.join(jsonDir, testCase.jsonFile);
    if (!fs.existsSync(jsonPath)) {
      console.log(`  Skipping ${testCase.name}: ${testCase.jsonFile} not found`);
      results.push({ success: false });
      continue;
    }

    const slideData = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as SlideData;

    const config = {
      width: VIEWPORT_WIDTH,
      height: VIEWPORT_HEIGHT,
    };

    try {
      const screenshot = await captureSlide(harness.page, slideData, config);

      const baselinePath = path.join(baselineDir, `${safeName(testCase.name)}.png`);
      fs.writeFileSync(baselinePath, screenshot);
      console.log(`  Created: ${testCase.name}.png`);
      results.push({ success: true });
    } catch (err) {
      console.error(`  Failed: ${testCase.name} - ${(err as Error).message}`);
      results.push({ success: false });
    }
  }

  const generated = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

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
  npx vitest run packages/@aurochs-ui/pptx-editor/spec/pptx-visual.spec.ts
`);
}

main().catch(console.error);
