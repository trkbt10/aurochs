/**
 * @file PPTX Editor Visual Regression Tests
 *
 * Compares the pptx-editor rendering against baseline images.
 * Tests shape rendering, fills, and text formatting.
 *
 * Run from project root:
 *   npx vitest run packages/@aurochs-ui/pptx-editor/spec/pptx-visual.spec.ts
 *
 * Before running:
 *   1. Generate fixtures:
 *      bun packages/@aurochs-ui/pptx-editor/scripts/generate-visual-fixtures.ts
 *   2. Generate baselines:
 *      bun packages/@aurochs-ui/pptx-editor/scripts/generate-editor-baselines.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  startHarness,
  stopHarness,
  captureSlide,
  comparePngs,
  ensureDirs,
  getFixturePaths,
  printSummary,
  type PptxHarness,
  type CompareResult,
  type SlideData,
} from "./visual-harness/test-utils";

// =============================================================================
// Constants
// =============================================================================

const VIEWPORT_WIDTH = 960;
const VIEWPORT_HEIGHT = 540;
const DIFF_THRESHOLD_PERCENT = 0.1; // Target: <0.1% difference for self-comparison

// =============================================================================
// Test Fixtures
// =============================================================================

type TestCase = {
  name: string;
  jsonFile: string;
};

const TEST_CASES: TestCase[] = [
  // Phase 2: Basic shapes
  { name: "text-box", jsonFile: "text-box.json" },
  { name: "rectangle", jsonFile: "rectangle.json" },
  { name: "ellipse", jsonFile: "ellipse.json" },
  // Phase 3: Fill & Stroke
  { name: "solid-fill", jsonFile: "solid-fill.json" },
  { name: "stroke", jsonFile: "stroke.json" },
  // Mixed
  { name: "mixed-shapes", jsonFile: "mixed-shapes.json" },
];

// =============================================================================
// Test Suite
// =============================================================================

describe("PPTX Visual Regression", () => {
  const state: { harness: PptxHarness | null } = { harness: null };
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

      // Load slide JSON
      const jsonPath = path.join(jsonDir, testCase.jsonFile);
      if (!fs.existsSync(jsonPath)) {
        throw new Error(`Slide JSON not found: ${jsonPath}. Run generate-visual-fixtures.ts first.`);
      }
      const slideData = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as SlideData;

      // Capture screenshot
      const config = {
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
      };

      const actual = await captureSlide(state.harness.page, slideData, config);

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

describe("PPTX Visual Self-Comparison", () => {
  const state: { harness: PptxHarness | null } = { harness: null };
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

    const jsonPath = path.join(jsonDir, "rectangle.json");
    if (!fs.existsSync(jsonPath)) {
      console.warn("Skipping: rectangle.json not found");
      return;
    }

    const slideData = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as SlideData;

    const config = {
      width: VIEWPORT_WIDTH,
      height: VIEWPORT_HEIGHT,
    };

    // Capture twice
    const first = await captureSlide(state.harness.page, slideData, config);
    const second = await captureSlide(state.harness.page, slideData, config);

    // Compare - should be identical
    const result = comparePngs({ actual: first, baseline: second, name: "self-comparison" });

    expect(result.diffPercent).toBe(0);
  }, 15000);
});
