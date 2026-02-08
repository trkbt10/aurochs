/**
 * @file Scatter Chart Visual Regression Tests
 *
 * Tests for ECMA-376 Part 1, Section 21.2.2.161 (scatterChart) and related elements.
 *
 * @ecma376 21.2.2.161 scatterChart (Scatter Charts)
 * @ecma376 21.2.2.162 scatterStyle (Scatter Style)
 * @ecma376 21.2.2.230 xVal (X Values)
 * @ecma376 21.2.2.232 yVal (Y Values)
 */

import { runChartTest, CHART_THRESHOLDS, type ChartTestCase } from "../../index";

const SCATTER_CHART_TESTS: ChartTestCase[] = [
  {
    name: "scatter-chart",
    pptxPath: "fixtures/poi-test-data/test-data/slideshow/scatter-chart.pptx",
    slideNumber: 1,
    ecmaSections: ["21.2.2.161", "21.2.2.162"],
    threshold: CHART_THRESHOLDS.stabilizing,
    description: "Basic scatter chart rendering",
  },
];

describe("ECMA-376 21.2.2.161: Scatter Charts", () => {
  for (const testCase of SCATTER_CHART_TESTS) {
    it(`renders ${testCase.name} correctly`, async () => {
      const result = await runChartTest(testCase);

      if (!result.match) {
        console.log(`[FAIL] ${testCase.name}`);
        console.log(`  Diff: ${result.diffPercent.toFixed(2)}% (threshold: ${testCase.threshold}%)`);
        console.log(`  ECMA sections: ${testCase.ecmaSections.join(", ")}`);
      }

      expect(result.match).toBe(true);
    });
  }
});
