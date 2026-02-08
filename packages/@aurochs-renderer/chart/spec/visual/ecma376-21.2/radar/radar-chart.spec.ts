/**
 * @file Radar Chart Visual Regression Tests
 *
 * Tests for ECMA-376 Part 1, Section 21.2.2.153 (radarChart) and related elements.
 *
 * @ecma376 21.2.2.153 radarChart (Radar Charts)
 * @ecma376 21.2.2.154 radarStyle (Radar Style)
 */

import { runChartTest, CHART_THRESHOLDS, type ChartTestCase } from "../../index";

const RADAR_CHART_TESTS: ChartTestCase[] = [
  {
    name: "radar-chart",
    pptxPath: "fixtures/poi-test-data/test-data/slideshow/radar-chart.pptx",
    slideNumber: 1,
    ecmaSections: ["21.2.2.153", "21.2.2.154"],
    threshold: CHART_THRESHOLDS.experimental,
    description: "Basic radar chart rendering",
  },
];

describe("ECMA-376 21.2.2.153: Radar Charts", () => {
  for (const testCase of RADAR_CHART_TESTS) {
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
