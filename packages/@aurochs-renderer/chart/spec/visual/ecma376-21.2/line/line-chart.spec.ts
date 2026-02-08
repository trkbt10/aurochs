/**
 * @file Line Chart Visual Regression Tests
 *
 * Tests for ECMA-376 Part 1, Section 21.2.2.97 (lineChart) and related elements.
 *
 * @ecma376 21.2.2.97 lineChart (Line Charts)
 * @ecma376 21.2.2.105 marker (Marker)
 * @ecma376 21.2.2.194 smooth (Smooth Line Chart)
 */

import { runChartTest, CHART_THRESHOLDS, type ChartTestCase } from "../../index";

const LINE_CHART_TESTS: ChartTestCase[] = [
  {
    name: "line-chart",
    pptxPath: "fixtures/poi-test-data/test-data/slideshow/line-chart.pptx",
    slideNumber: 1,
    ecmaSections: ["21.2.2.97"],
    threshold: CHART_THRESHOLDS.stabilizing,
    description: "Basic line chart rendering",
  },
];

describe("ECMA-376 21.2.2.97: Line Charts", () => {
  for (const testCase of LINE_CHART_TESTS) {
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
