/**
 * @file Pie Chart Visual Regression Tests
 *
 * Tests for ECMA-376 Part 1, Section 21.2.2.141 (pieChart) and related elements.
 *
 * @ecma376 21.2.2.141 pieChart (Pie Charts)
 * @ecma376 21.2.2.50 doughnutChart (Doughnut Charts)
 * @ecma376 21.2.2.61 explosion (Explosion)
 * @ecma376 21.2.2.127 ofPieChart (Pie of Pie Charts)
 */

import { runChartTest, CHART_THRESHOLDS, type ChartTestCase } from "../../index";

const PIE_CHART_TESTS: ChartTestCase[] = [
  {
    name: "pie-chart",
    pptxPath: "fixtures/poi-test-data/test-data/slideshow/pie-chart.pptx",
    slideNumber: 1,
    ecmaSections: ["21.2.2.141"],
    threshold: CHART_THRESHOLDS.stabilizing,
    description: "Basic pie chart rendering",
  },
];

describe("ECMA-376 21.2.2.141: Pie Charts", () => {
  for (const testCase of PIE_CHART_TESTS) {
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
