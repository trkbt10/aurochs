/**
 * @file Generate self-comparison baselines from editor output
 *
 * Captures the docx-editor rendering and saves as baseline images.
 * These baselines are used for regression testing - any future changes
 * that cause visual differences will be detected.
 *
 * Usage:
 *   bun packages/@aurochs-ui/docx-editor/scripts/generate-editor-baselines.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  startHarness,
  stopHarness,
  captureDocument,
  ensureDirs,
  safeName,
  type DocumentData,
} from "../spec/visual-harness/test-utils";

const VIEWPORT_WIDTH = 800;
const VIEWPORT_HEIGHT = 1000; // Taller for document pages

type TestCase = {
  name: string;
  jsonFile: string;
  pageIndex?: number;
};

const TEST_CASES: TestCase[] = [
  // Text formatting tests
  { name: "bold-italic", jsonFile: "bold-italic.json" },
  { name: "font-sizes", jsonFile: "font-sizes.json" },
  { name: "font-colors", jsonFile: "font-colors.json" },
  { name: "underline-styles", jsonFile: "underline-styles.json" },
  { name: "strikethrough", jsonFile: "strikethrough.json" },
  { name: "superscript-subscript", jsonFile: "superscript-subscript.json" },
  { name: "highlighting", jsonFile: "highlighting.json" },
  // Paragraph formatting tests
  { name: "alignment", jsonFile: "alignment.json" },
  { name: "spacing", jsonFile: "spacing.json" },
  { name: "indentation", jsonFile: "indentation.json" },
  // List tests
  { name: "bullet-list", jsonFile: "bullet-list.json" },
  { name: "numbered-list", jsonFile: "numbered-list.json" },
  { name: "multi-level-list", jsonFile: "multi-level-list.json" },
  // Borders and Shading
  { name: "paragraph-borders", jsonFile: "paragraph-borders.json" },
  { name: "paragraph-shading", jsonFile: "paragraph-shading.json" },
  // Additional Text Formatting
  { name: "font-families", jsonFile: "font-families.json" },
  { name: "caps", jsonFile: "caps.json" },
  { name: "letter-spacing", jsonFile: "letter-spacing.json" },
  { name: "mixed-formatting", jsonFile: "mixed-formatting.json" },
  // ECMA-376 Coverage: Run Properties
  { name: "run-shading", jsonFile: "run-shading.json" },
  { name: "tab-stops", jsonFile: "tab-stops.json" },
  // ECMA-376 Coverage: Numbering Formats
  { name: "roman-numerals", jsonFile: "roman-numerals.json" },
  { name: "letter-lists", jsonFile: "letter-lists.json" },
  { name: "custom-bullets", jsonFile: "custom-bullets.json" },
  // ECMA-376 Coverage: Section Properties
  { name: "page-size", jsonFile: "page-size.json" },
  { name: "page-margins", jsonFile: "page-margins.json" },
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

  // Process all test cases and collect results
  const results = await Promise.all(
    TEST_CASES.map(async (testCase) => {
      const jsonPath = path.join(jsonDir, testCase.jsonFile);
      if (!fs.existsSync(jsonPath)) {
        console.log(`  Skipping ${testCase.name}: ${testCase.jsonFile} not found`);
        return { success: false };
      }

      const documentData = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as DocumentData;

      const config = {
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
        pageIndex: testCase.pageIndex ?? 0,
      };

      try {
        const screenshot = await captureDocument(harness.page, documentData, config);

        const baselinePath = path.join(baselineDir, `${safeName(testCase.name)}.png`);
        fs.writeFileSync(baselinePath, screenshot);
        console.log(`  Created: ${testCase.name}.png`);
        return { success: true };
      } catch (err) {
        console.error(`  Failed: ${testCase.name} - ${(err as Error).message}`);
        return { success: false };
      }
    })
  );

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
  npx vitest run packages/@aurochs-ui/docx-editor/spec/docx-visual.spec.ts
`);
}

main().catch(console.error);
