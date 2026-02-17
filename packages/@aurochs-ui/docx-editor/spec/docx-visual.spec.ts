/**
 * @file DOCX Editor Visual Regression Tests
 *
 * Compares the docx-editor rendering against baseline images.
 * Tests text formatting, paragraph formatting, and lists.
 *
 * Run from project root:
 *   npx vitest run packages/@aurochs-ui/docx-editor/spec/docx-visual.spec.ts
 *
 * Before running:
 *   1. Generate fixtures:
 *      bun packages/@aurochs-ui/docx-editor/scripts/generate-visual-fixtures.ts
 *   2. Generate baselines:
 *      bun packages/@aurochs-ui/docx-editor/scripts/generate-editor-baselines.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  startHarness,
  stopHarness,
  captureDocument,
  comparePngs,
  ensureDirs,
  getFixturePaths,
  printSummary,
  type DocxHarness,
  type CompareResult,
  type DocumentData,
} from "./visual-harness/test-utils";

// =============================================================================
// Constants
// =============================================================================

const VIEWPORT_WIDTH = 800;
const VIEWPORT_HEIGHT = 1000;
const DIFF_THRESHOLD_PERCENT = 0.1; // Target: <0.1% difference for self-comparison

// =============================================================================
// Test Fixtures
// =============================================================================

type TestCase = {
  name: string;
  jsonFile: string;
  pageIndex?: number;
};

const TEST_CASES: TestCase[] = [
  // Text formatting
  { name: "bold-italic", jsonFile: "bold-italic.json" },
  { name: "font-sizes", jsonFile: "font-sizes.json" },
  { name: "font-colors", jsonFile: "font-colors.json" },
  { name: "underline-styles", jsonFile: "underline-styles.json" },
  { name: "strikethrough", jsonFile: "strikethrough.json" },
  { name: "superscript-subscript", jsonFile: "superscript-subscript.json" },
  { name: "highlighting", jsonFile: "highlighting.json" },
  // Paragraph formatting
  { name: "alignment", jsonFile: "alignment.json" },
  { name: "spacing", jsonFile: "spacing.json" },
  { name: "indentation", jsonFile: "indentation.json" },
  // Lists
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

// =============================================================================
// Test Suite
// =============================================================================

describe("DOCX Visual Regression", () => {
  const state: { harness: DocxHarness | null } = { harness: null };
  const results: CompareResult[] = [];
  // __dirname is spec/, so go up one level to package root
  const fixturesDir = path.resolve(__dirname, "../fixtures/visual");
  const jsonDir = path.join(fixturesDir, "json");

  beforeAll(async () => {
    // Ensure output directories exist
    const paths = getFixturePaths();
    ensureDirs([paths.baselineDir, paths.outputDir, paths.diffDir]);

    // Start the test harness
    state.harness = await startHarness();
  }, 30000); // 30s timeout for startup

  afterAll(async () => {
    if (state.harness) {
      await stopHarness(state.harness);
    }

    // Print summary
    printSummary(results);
  });

  // Run tests for each case
  for (const testCase of TEST_CASES) {
    it(`should render ${testCase.name} correctly`, async () => {
      if (!state.harness) {
        throw new Error("Harness not initialized");
      }

      const paths = getFixturePaths();

      // Check if baseline exists
      const baselinePath = paths.baselinePath(testCase.name);
      if (!fs.existsSync(baselinePath)) {
        console.warn(`  Skipping ${testCase.name}: baseline not found at ${baselinePath}`);
        return;
      }

      // Load document JSON
      const jsonPath = path.join(jsonDir, testCase.jsonFile);
      if (!fs.existsSync(jsonPath)) {
        throw new Error(`Document JSON not found: ${jsonPath}. Run generate-visual-fixtures.ts first.`);
      }
      const documentData = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as DocumentData;

      // Capture screenshot
      const config = {
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
        pageIndex: testCase.pageIndex ?? 0,
      };

      const actual = await captureDocument(state.harness.page, documentData, config);

      // Save actual output
      const outputPath = paths.outputPath(testCase.name);
      fs.writeFileSync(outputPath, actual);

      // Load baseline
      const baseline = fs.readFileSync(baselinePath);

      // Compare
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

describe("DOCX Visual Self-Comparison", () => {
  const state: { harness: DocxHarness | null } = { harness: null };
  // __dirname is spec/, so go up one level to package root
  const fixturesDir = path.resolve(__dirname, "../fixtures/visual");
  const jsonDir = path.join(fixturesDir, "json");

  beforeAll(async () => {
    // Check if any JSON fixtures exist
    if (!fs.existsSync(jsonDir)) {
      console.warn("No JSON fixtures found. Run generate-visual-fixtures.ts first.");
      return;
    }

    state.harness = await startHarness();
  }, 30000);

  afterAll(async () => {
    if (state.harness) {
      await stopHarness(state.harness);
    }
  });

  it("should produce consistent output across renders", async () => {
    if (!state.harness) {
      console.warn("Skipping: harness not initialized");
      return;
    }

    const jsonPath = path.join(jsonDir, "bold-italic.json");
    if (!fs.existsSync(jsonPath)) {
      console.warn("Skipping: bold-italic.json not found");
      return;
    }

    const documentData = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as DocumentData;

    const config = {
      width: VIEWPORT_WIDTH,
      height: VIEWPORT_HEIGHT,
      pageIndex: 0,
    };

    // Capture twice
    const first = await captureDocument(state.harness.page, documentData, config);
    const second = await captureDocument(state.harness.page, documentData, config);

    // Compare - should be identical
    const result = comparePngs({ actual: first, baseline: second, name: "self-comparison" });

    expect(result.diffPercent).toBe(0);
  }, 15000);
});
