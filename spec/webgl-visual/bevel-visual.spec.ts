/**
 * @file Bevel Visual Regression Tests
 *
 * Tests that verify WebGL bevel rendering produces correct visual output.
 * Compares rendered screenshots against approved baselines.
 *
 * To generate/update baselines:
 *   bun run spec/webgl-visual/scripts/generate-baselines.ts --all
 */

import {
  captureWebGLScreenshot,
  compareToBaseline,
  closeBrowser,
  type CompareOptions,
} from "./webgl-compare";
import {
  NO_BEVEL_CONFIGS,
  TOP_BEVEL_CONFIGS,
  BOTTOM_BEVEL_CONFIGS,
  DUAL_BEVEL_CONFIGS,
  CAMERA_ANGLE_CONFIGS,
  type BevelTestConfig,
} from "./fixtures/bevel-test-configs";

const SNAPSHOT_NAME = "bevel";

// Default comparison options
const DEFAULT_OPTIONS: CompareOptions = {
  threshold: 0.1,
  maxDiffPercent: 5, // Allow 5% difference for anti-aliasing
  includeAA: false,
};

type CompareResult = Awaited<ReturnType<typeof compareToBaseline>>;

function buildFailureMessage(result: CompareResult): string {
  if (result.diffPixels === -1) {
    return `Baseline not found: ${result.snapshotPath}`;
  }

  const diffImageLine = result.diffImagePath ? `  Diff: ${result.diffImagePath}` : "";
  return (
    `Visual difference: ${result.diffPercent.toFixed(2)}% (${result.diffPixels} pixels)\n` +
    `  Expected: ${result.snapshotPath}\n` +
    `  Actual: ${result.actualPath}\n` +
    diffImageLine
  );
}

// Helper to run visual test
async function runVisualTest(
  config: BevelTestConfig,
  options: CompareOptions = DEFAULT_OPTIONS,
): Promise<void> {
  const buffer = await captureWebGLScreenshot(config.renderConfig);
  const result = await compareToBaseline({
    actualBuffer: buffer,
    snapshotName: SNAPSHOT_NAME,
    testName: config.name,
    options,
  });

  if (!result.match) {
    expect.fail(buildFailureMessage(result));
  }
}

// Cleanup browser after all tests
afterAll(async () => {
  await closeBrowser();
});

// =============================================================================
// Test Suites
// =============================================================================

describe("Bevel Visual Regression", () => {
  describe("No Bevel (Baseline)", () => {
    for (const config of NO_BEVEL_CONFIGS) {
      it(config.description, async () => {
        await runVisualTest(config);
      });
    }
  });

  describe("Top Bevel Only", () => {
    for (const config of TOP_BEVEL_CONFIGS) {
      it(config.description, async () => {
        await runVisualTest(config);
      });
    }
  });

  describe("Bottom Bevel Only", () => {
    for (const config of BOTTOM_BEVEL_CONFIGS) {
      it(config.description, async () => {
        await runVisualTest(config);
      });
    }
  });

  describe("Dual Bevel (Top + Bottom)", () => {
    for (const config of DUAL_BEVEL_CONFIGS) {
      it(config.description, async () => {
        await runVisualTest(config);
      });
    }
  });

  describe("Camera Angles", () => {
    for (const config of CAMERA_ANGLE_CONFIGS) {
      it(config.description, async () => {
        await runVisualTest(config);
      });
    }
  });
});
