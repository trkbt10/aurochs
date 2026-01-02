/**
 * @file Error bars renderer tests
 *
 * Tests for rendering error bars according to ECMA-376 specification.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.58 (errBars)
 */

import { renderErrorBars, renderAllErrorBars } from "./error-bars";
import type { ErrorBars } from "../../../domain/chart";
import type { SeriesData } from "./types";

// Mock series data for testing
const mockSeriesData: SeriesData = {
  key: "Test Series",
  values: [
    { x: "0", y: 10 },
    { x: "1", y: 20 },
    { x: "2", y: 15 },
    { x: "3", y: 25 },
    { x: "4", y: 18 },
  ],
};

const mockValueRange = { minVal: 0, maxVal: 30 };
const mockChartWidth = 400;
const mockChartHeight = 300;

describe("Error Bars Rendering (ECMA-376 21.2.2.58)", () => {
  describe("Fixed value error bars", () => {
    test("renders fixed value error bars", () => {
      const errorBars: ErrorBars = {
        errBarType: "both",
        errValType: "fixedVal",
        val: 5,
      };

      const svg = renderErrorBars(errorBars, mockSeriesData, mockChartWidth, mockChartHeight, mockValueRange);

      // Should have vertical lines and end caps for each point
      expect(svg).toContain("<line");
      expect(svg).toContain('stroke="#333333"');
    });

    test("renders error bars without end caps when noEndCap is true", () => {
      const errorBars: ErrorBars = {
        errBarType: "both",
        errValType: "fixedVal",
        val: 5,
        noEndCap: true,
      };

      const svg = renderErrorBars(errorBars, mockSeriesData, mockChartWidth, mockChartHeight, mockValueRange);

      // Count lines - should have fewer lines without end caps
      const match = svg.match(/<line/g);
      const lineCount = match ? match.length : 0;
      // 5 points = 5 vertical lines only (no horizontal caps)
      expect(lineCount).toBe(5);
    });
  });

  describe("Percentage error bars", () => {
    test("renders percentage error bars", () => {
      const errorBars: ErrorBars = {
        errBarType: "both",
        errValType: "percentage",
        val: 10, // 10%
      };

      const svg = renderErrorBars(errorBars, mockSeriesData, mockChartWidth, mockChartHeight, mockValueRange);

      expect(svg).toContain("<line");
    });
  });

  describe("Standard deviation error bars", () => {
    test("renders standard deviation error bars", () => {
      const errorBars: ErrorBars = {
        errBarType: "both",
        errValType: "stdDev",
        val: 1, // 1 standard deviation
      };

      const svg = renderErrorBars(errorBars, mockSeriesData, mockChartWidth, mockChartHeight, mockValueRange);

      expect(svg).toContain("<line");
    });
  });

  describe("Standard error bars", () => {
    test("renders standard error bars", () => {
      const errorBars: ErrorBars = {
        errBarType: "both",
        errValType: "stdErr",
      };

      const svg = renderErrorBars(errorBars, mockSeriesData, mockChartWidth, mockChartHeight, mockValueRange);

      expect(svg).toContain("<line");
    });
  });

  describe("Custom error bars (ECMA-376 21.2.2.140/21.2.2.101)", () => {
    test("renders custom error bars from numRef cache", () => {
      const errorBars: ErrorBars = {
        errBarType: "both",
        errValType: "cust",
        plus: {
          numRef: {
            formula: "Sheet1!$D$2:$D$6",
            cache: {
              count: 5,
              points: [
                { idx: 0, value: 2 },
                { idx: 1, value: 3 },
                { idx: 2, value: 2.5 },
                { idx: 3, value: 4 },
                { idx: 4, value: 3.5 },
              ],
            },
          },
        },
        minus: {
          numRef: {
            formula: "Sheet1!$E$2:$E$6",
            cache: {
              count: 5,
              points: [
                { idx: 0, value: 1 },
                { idx: 1, value: 1.5 },
                { idx: 2, value: 1 },
                { idx: 3, value: 2 },
                { idx: 4, value: 1.5 },
              ],
            },
          },
        },
      };

      const svg = renderErrorBars(errorBars, mockSeriesData, mockChartWidth, mockChartHeight, mockValueRange);

      expect(svg).toContain("<line");
      // Should render error bars with varying heights
      const match = svg.match(/<line/g);
      const lineCount = match ? match.length : 0;
      expect(lineCount).toBeGreaterThan(5);
    });

    test("renders custom error bars from numLit", () => {
      const errorBars: ErrorBars = {
        errBarType: "both",
        errValType: "cust",
        plus: {
          numLit: {
            count: 5,
            points: [
              { idx: 0, value: 3 },
              { idx: 1, value: 3 },
              { idx: 2, value: 3 },
              { idx: 3, value: 3 },
              { idx: 4, value: 3 },
            ],
          },
        },
        minus: {
          numLit: {
            count: 5,
            points: [
              { idx: 0, value: 2 },
              { idx: 1, value: 2 },
              { idx: 2, value: 2 },
              { idx: 3, value: 2 },
              { idx: 4, value: 2 },
            ],
          },
        },
      };

      const svg = renderErrorBars(errorBars, mockSeriesData, mockChartWidth, mockChartHeight, mockValueRange);

      expect(svg).toContain("<line");
    });

    test("handles missing plus/minus references gracefully", () => {
      const errorBars: ErrorBars = {
        errBarType: "both",
        errValType: "cust",
        // No plus or minus data references
      };

      const svg = renderErrorBars(errorBars, mockSeriesData, mockChartWidth, mockChartHeight, mockValueRange);

      // Should still render (with 0 error values)
      expect(svg).toContain("<line");
    });
  });

  describe("Error bar types (ST_ErrBarType)", () => {
    test("renders only plus direction when errBarType is 'plus'", () => {
      const errorBars: ErrorBars = {
        errBarType: "plus",
        errValType: "fixedVal",
        val: 5,
      };

      const svg = renderErrorBars(errorBars, mockSeriesData, mockChartWidth, mockChartHeight, mockValueRange);

      expect(svg).toContain("<line");
    });

    test("renders only minus direction when errBarType is 'minus'", () => {
      const errorBars: ErrorBars = {
        errBarType: "minus",
        errValType: "fixedVal",
        val: 5,
      };

      const svg = renderErrorBars(errorBars, mockSeriesData, mockChartWidth, mockChartHeight, mockValueRange);

      expect(svg).toContain("<line");
    });

    test("renders both directions when errBarType is 'both'", () => {
      const errorBars: ErrorBars = {
        errBarType: "both",
        errValType: "fixedVal",
        val: 5,
      };

      const svg = renderErrorBars(errorBars, mockSeriesData, mockChartWidth, mockChartHeight, mockValueRange);

      expect(svg).toContain("<line");
    });
  });

  describe("Error bar direction (ST_ErrDir)", () => {
    test("renders Y-axis error bars by default", () => {
      const errorBars: ErrorBars = {
        errBarType: "both",
        errValType: "fixedVal",
        val: 5,
      };

      const svg = renderErrorBars(errorBars, mockSeriesData, mockChartWidth, mockChartHeight, mockValueRange);

      // Y error bars have vertical lines
      expect(svg).toContain("<line");
    });

    test("renders X-axis error bars when errDir is 'x'", () => {
      const errorBars: ErrorBars = {
        errDir: "x",
        errBarType: "both",
        errValType: "fixedVal",
        val: 1,
      };

      const svg = renderErrorBars(errorBars, mockSeriesData, mockChartWidth, mockChartHeight, mockValueRange);

      // X error bars have horizontal lines
      expect(svg).toContain("<line");
    });
  });

  describe("renderAllErrorBars helper", () => {
    test("returns empty string for undefined error bars", () => {
      const svg = renderAllErrorBars(undefined, mockSeriesData, mockChartWidth, mockChartHeight, mockValueRange);

      expect(svg).toBe("");
    });

    test("returns empty string for empty error bars array", () => {
      const svg = renderAllErrorBars([], mockSeriesData, mockChartWidth, mockChartHeight, mockValueRange);

      expect(svg).toBe("");
    });

    test("renders multiple error bar sets", () => {
      const errorBarsArray: ErrorBars[] = [
        { errDir: "y", errBarType: "both", errValType: "fixedVal", val: 3 },
        { errDir: "x", errBarType: "both", errValType: "fixedVal", val: 1 },
      ];

      const svg = renderAllErrorBars(errorBarsArray, mockSeriesData, mockChartWidth, mockChartHeight, mockValueRange);

      // Should have multiple sets of error bars
      const match = svg.match(/<line/g);
      const lineCount = match ? match.length : 0;
      expect(lineCount).toBeGreaterThan(10);
    });
  });
});
