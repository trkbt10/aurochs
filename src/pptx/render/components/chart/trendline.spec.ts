/**
 * @file Trendline renderer tests
 *
 * Tests for rendering trendlines according to ECMA-376 specification.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.209 (trendline)
 */

import { renderTrendline, renderTrendlines } from "./trendline";
import type { Trendline } from "../../../domain/chart";
import type { SeriesData } from "./types";
import type { BodyProperties, ParagraphProperties } from "../../../domain/text";
import { pt, px } from "../../../domain/types";

// Mock series data for testing
const mockSeriesData: SeriesData = {
  key: "Test Series",
  values: [
    { x: "0", y: 1 },
    { x: "1", y: 2 },
    { x: "2", y: 4 },
    { x: "3", y: 5 },
    { x: "4", y: 7 },
  ],
};

const mockValueRange = { minVal: 0, maxVal: 10 };
const mockChartWidth = 400;
const mockChartHeight = 300;

function createBodyProperties(): BodyProperties {
  return {
    verticalType: "horz",
    wrapping: "none",
    anchor: "top",
    anchorCenter: false,
    overflow: "overflow",
    verticalOverflow: "overflow",
    autoFit: { type: "none" },
    insets: { left: px(0), top: px(0), right: px(0), bottom: px(0) },
  };
}

function createParagraphProperties(): ParagraphProperties {
  return {
    level: 0,
    alignment: "left",
  };
}
describe("Trendline Rendering (ECMA-376 21.2.2.209)", () => {
  describe("Linear trendline", () => {
    test("renders linear trendline path", () => {
      const trendline: Trendline = {
        trendlineType: "linear",
      };

      const svg = renderTrendline(
        trendline,
        mockSeriesData,
        mockChartWidth,
        mockChartHeight,
        mockValueRange,
      );

      expect(svg).toContain("<path");
      expect(svg).toContain('fill="none"');
      expect(svg).toContain("stroke=");
      expect(svg).toContain("stroke-dasharray=");
    });

    test("renders equation when dispEq is true", () => {
      const trendline: Trendline = {
        trendlineType: "linear",
        dispEq: true,
      };

      const svg = renderTrendline(
        trendline,
        mockSeriesData,
        mockChartWidth,
        mockChartHeight,
        mockValueRange,
      );

      expect(svg).toContain("<text");
      expect(svg).toContain("y =");
    });

    test("renders R-squared when dispRSqr is true", () => {
      const trendline: Trendline = {
        trendlineType: "linear",
        dispRSqr: true,
      };

      const svg = renderTrendline(
        trendline,
        mockSeriesData,
        mockChartWidth,
        mockChartHeight,
        mockValueRange,
      );

      expect(svg).toContain("<text");
      expect(svg).toContain("R² =");
    });
  });

  describe("Polynomial trendline", () => {
    test("renders polynomial trendline with default order 2", () => {
      const trendline: Trendline = {
        trendlineType: "poly",
      };

      const svg = renderTrendline(
        trendline,
        mockSeriesData,
        mockChartWidth,
        mockChartHeight,
        mockValueRange,
      );

      expect(svg).toContain("<path");
      expect(svg).toContain('d="M');
    });

    test("renders polynomial with specified order", () => {
      const trendline: Trendline = {
        trendlineType: "poly",
        order: 3,
      };

      const svg = renderTrendline(
        trendline,
        mockSeriesData,
        mockChartWidth,
        mockChartHeight,
        mockValueRange,
      );

      expect(svg).toContain("<path");
    });
  });

  describe("Exponential trendline", () => {
    test("renders exponential trendline", () => {
      const trendline: Trendline = {
        trendlineType: "exp",
      };

      const svg = renderTrendline(
        trendline,
        mockSeriesData,
        mockChartWidth,
        mockChartHeight,
        mockValueRange,
      );

      expect(svg).toContain("<path");
    });
  });

  describe("Logarithmic trendline", () => {
    test("renders logarithmic trendline", () => {
      // Adjust data for log (x must be > 0)
      const logData: SeriesData = {
        key: "Log Series",
        values: [
          { x: "0", y: 1 },
          { x: "1", y: 3 },
          { x: "2", y: 4 },
          { x: "3", y: 5 },
          { x: "4", y: 5.5 },
        ],
      };

      const trendline: Trendline = {
        trendlineType: "log",
      };

      const svg = renderTrendline(trendline, logData, mockChartWidth, mockChartHeight, mockValueRange);

      expect(svg).toContain("<path");
    });
  });

  describe("Power trendline", () => {
    test("renders power trendline", () => {
      const trendline: Trendline = {
        trendlineType: "power",
      };

      const svg = renderTrendline(
        trendline,
        mockSeriesData,
        mockChartWidth,
        mockChartHeight,
        mockValueRange,
      );

      expect(svg).toContain("<path");
    });
  });

  describe("Moving average trendline", () => {
    test("renders moving average with default period 2", () => {
      const trendline: Trendline = {
        trendlineType: "movingAvg",
      };

      const svg = renderTrendline(
        trendline,
        mockSeriesData,
        mockChartWidth,
        mockChartHeight,
        mockValueRange,
      );

      expect(svg).toContain("<path");
    });

    test("renders moving average with specified period", () => {
      const trendline: Trendline = {
        trendlineType: "movingAvg",
        period: 3,
      };

      const svg = renderTrendline(
        trendline,
        mockSeriesData,
        mockChartWidth,
        mockChartHeight,
        mockValueRange,
      );

      expect(svg).toContain("<path");
    });
  });

  describe("Forecast extension", () => {
    test("extends trendline forward", () => {
      const trendline: Trendline = {
        trendlineType: "linear",
        forward: 2,
      };

      const svg = renderTrendline(
        trendline,
        mockSeriesData,
        mockChartWidth,
        mockChartHeight,
        mockValueRange,
      );

      expect(svg).toContain("<path");
      // The path should extend beyond the data points
    });

    test("extends trendline backward", () => {
      const trendline: Trendline = {
        trendlineType: "linear",
        backward: 1,
      };

      const svg = renderTrendline(
        trendline,
        mockSeriesData,
        mockChartWidth,
        mockChartHeight,
        mockValueRange,
      );

      expect(svg).toContain("<path");
    });
  });

  describe("Trendline label - c:trendlineLbl (ECMA-376 21.2.2.210)", () => {
    test("applies manual layout positioning from c:layout", () => {
      const trendline: Trendline = {
        trendlineType: "linear",
        dispEq: true,
        trendlineLabel: {
          layout: {
            manualLayout: {
              x: 0.5,
              y: 0.3,
            },
          },
        },
      };

      const svg = renderTrendline(
        trendline,
        mockSeriesData,
        mockChartWidth,
        mockChartHeight,
        mockValueRange,
      );

      // Position should be 0.5 * 400 = 200, 0.3 * 300 = 90
      expect(svg).toContain('x="200"');
      expect(svg).toContain('y="90"');
    });

    test("applies text styling from c:txPr", () => {
      const trendline: Trendline = {
        trendlineType: "linear",
        dispEq: true,
        trendlineLabel: {
          textProperties: {
            bodyProperties: createBodyProperties(),
            paragraphs: [
              {
                properties: {
                  ...createParagraphProperties(),
                  defaultRunProperties: {
                    fontSize: pt(14),
                    bold: true,
                  },
                },
                runs: [],
              },
            ],
          },
        },
      };

      const svg = renderTrendline(
        trendline,
        mockSeriesData,
        mockChartWidth,
        mockChartHeight,
        mockValueRange,
      );

      expect(svg).toContain('font-size="14"');
      expect(svg).toContain('font-weight="bold"');
    });

    test("renders background fill from c:spPr", () => {
      const trendline: Trendline = {
        trendlineType: "linear",
        dispEq: true,
        trendlineLabel: {
          shapeProperties: {
            fill: {
              type: "solidFill",
              color: { spec: { type: "srgb", value: "FFFFFF" } },
            },
          },
        },
      };

      const svg = renderTrendline(
        trendline,
        mockSeriesData,
        mockChartWidth,
        mockChartHeight,
        mockValueRange,
      );

      expect(svg).toContain("<rect");
      expect(svg).toContain('fill="#FFFFFF"');
    });

    test("combines layout, text styling, and background", () => {
      const trendline: Trendline = {
        trendlineType: "linear",
        dispEq: true,
        dispRSqr: true,
        trendlineLabel: {
          layout: {
            manualLayout: { x: 0.75, y: 0.25 },
          },
          textProperties: {
            bodyProperties: createBodyProperties(),
            paragraphs: [
              {
                properties: {
                  ...createParagraphProperties(),
                  defaultRunProperties: {
                    fontSize: pt(12),
                    italic: true,
                  },
                },
                runs: [],
              },
            ],
          },
          shapeProperties: {
            fill: {
              type: "solidFill",
              color: { spec: { type: "srgb", value: "EEEEEE" } },
            },
          },
        },
      };

      const svg = renderTrendline(
        trendline,
        mockSeriesData,
        mockChartWidth,
        mockChartHeight,
        mockValueRange,
      );

      // Check layout position
      expect(svg).toContain('x="300"'); // 0.75 * 400
      expect(svg).toContain('y="75"'); // 0.25 * 300
      // Check text styling
      expect(svg).toContain('font-size="12"');
      expect(svg).toContain('font-style="italic"');
      // Check background
      expect(svg).toContain('fill="#EEEEEE"');
      // Check both equation and R² are present
      expect(svg).toContain("y =");
      expect(svg).toContain("R² =");
    });

    test("uses default styling when trendlineLabel is undefined", () => {
      const trendline: Trendline = {
        trendlineType: "linear",
        dispEq: true,
      };

      const svg = renderTrendline(
        trendline,
        mockSeriesData,
        mockChartWidth,
        mockChartHeight,
        mockValueRange,
      );

      // Should use default font-size="10"
      expect(svg).toContain('font-size="10"');
      // Should not have background rect (no spPr)
      expect(svg).not.toContain("<rect");
    });
  });

  describe("renderTrendlines helper", () => {
    test("returns empty string for undefined trendlines", () => {
      const svg = renderTrendlines(
        undefined,
        mockSeriesData,
        mockChartWidth,
        mockChartHeight,
        mockValueRange,
      );

      expect(svg).toBe("");
    });

    test("returns empty string for empty trendlines array", () => {
      const svg = renderTrendlines(
        [],
        mockSeriesData,
        mockChartWidth,
        mockChartHeight,
        mockValueRange,
      );

      expect(svg).toBe("");
    });

    test("renders multiple trendlines", () => {
      const trendlines: Trendline[] = [{ trendlineType: "linear" }, { trendlineType: "poly", order: 2 }];

      const svg = renderTrendlines(
        trendlines,
        mockSeriesData,
        mockChartWidth,
        mockChartHeight,
        mockValueRange,
      );

      // Should have two path elements
      const pathCount = (svg.match(/<path/g) ?? []).length;
      expect(pathCount).toBe(2);
    });
  });
});
