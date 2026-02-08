/**
 * @file Bar Chart Visual Regression Tests
 *
 * Tests for ECMA-376 Part 1, Section 21.2.2.16 (barChart) and related elements.
 *
 * @ecma376 21.2.2.16 barChart (Bar Charts)
 * @ecma376 21.2.2.17 barDir (Bar Direction)
 * @ecma376 21.2.2.77 grouping (Grouping)
 * @ecma376 21.2.2.76 gapWidth (Gap Width)
 */

import { runChartTest, CHART_THRESHOLDS, type ChartTestCase } from "../../index";

const BAR_CHART_TESTS: ChartTestCase[] = [
  {
    name: "bar-chart",
    pptxPath: "fixtures/poi-test-data/test-data/slideshow/bar-chart.pptx",
    slideNumber: 1,
    ecmaSections: ["21.2.2.16", "21.2.2.17"],
    threshold: CHART_THRESHOLDS.stabilizing,
    description: "Basic bar chart rendering",
  },
];

describe("ECMA-376 21.2.2.16: Bar Charts", () => {
  for (const testCase of BAR_CHART_TESTS) {
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
