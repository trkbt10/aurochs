/**
 * @file Scatter chart generator tests
 *
 * Tests for ECMA-376 compliant scatter chart rendering.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.158 (scatterChart)
 * @see ECMA-376 Part 1, Section 21.2.3.37 (ST_ScatterStyle)
 */

import { generateScatterChart, type ScatterChartConfig } from "./scatter";
import type { SeriesData } from "../types";
import type { Marker } from "../../../../domain/chart";
import { pt } from "../../../../domain/types";

/**
 * Helper to create mock series data
 */
function createSeriesData(
  values: { x: number; y: number }[],
  key: string = "Series 1",
  xlabels?: Record<string, string>,
): SeriesData {
  return {
    key,
    values: values.map((v) => ({ x: v.x, y: v.y })),
    xlabels,
  };
}

describe("generateScatterChart - ECMA-376 compliance", () => {
  const colors = ["#4F81BD", "#C0504D", "#9BBB59"];
  const chartWidth = 400;
  const chartHeight = 300;

  describe("Scatter Style Rendering (ST_ScatterStyle)", () => {
    const data = [
      createSeriesData([
        { x: 0, y: 10 },
        { x: 1, y: 20 },
        { x: 2, y: 15 },
      ]),
    ];

    it('renders no data points for style "none"', () => {
      const config: ScatterChartConfig = { scatterStyle: "none" };
      const result = generateScatterChart(data, chartWidth, chartHeight, colors, config);

      expect(result.content).not.toContain("<circle");
      expect(result.content).not.toContain("<polyline");
      expect(result.content).not.toContain("<path d=");
    });

    it('renders only markers for style "marker"', () => {
      const config: ScatterChartConfig = { scatterStyle: "marker" };
      const result = generateScatterChart(data, chartWidth, chartHeight, colors, config);

      expect(result.content).toContain("<circle");
      expect(result.content).not.toContain("<polyline");
    });

    it('renders only lines for style "line"', () => {
      const config: ScatterChartConfig = { scatterStyle: "line" };
      const result = generateScatterChart(data, chartWidth, chartHeight, colors, config);

      expect(result.content).toContain("<polyline");
      expect(result.content).not.toContain("<circle");
    });

    it('renders lines and markers for style "lineMarker"', () => {
      const config: ScatterChartConfig = { scatterStyle: "lineMarker" };
      const result = generateScatterChart(data, chartWidth, chartHeight, colors, config);

      expect(result.content).toContain("<polyline");
      expect(result.content).toContain("<circle");
    });

    it('renders smooth curves for style "smooth"', () => {
      const config: ScatterChartConfig = { scatterStyle: "smooth" };
      const result = generateScatterChart(data, chartWidth, chartHeight, colors, config);

      // Smooth curves use SVG path with Bezier curves (C command)
      expect(result.content).toContain("<path d=");
      expect(result.content).toContain("C");
      expect(result.content).not.toContain("<circle");
    });

    it('renders smooth curves with markers for style "smoothMarker"', () => {
      const config: ScatterChartConfig = { scatterStyle: "smoothMarker" };
      const result = generateScatterChart(data, chartWidth, chartHeight, colors, config);

      expect(result.content).toContain("<path d=");
      expect(result.content).toContain("<circle");
    });
  });

  describe("Marker Symbol Rendering (ST_MarkerStyle)", () => {
    const data = [createSeriesData([{ x: 0, y: 10 }])];

    const testCases: { symbol: Marker["symbol"]; contains: string; notContains?: string }[] = [
      { symbol: "circle", contains: "<circle" },
      { symbol: "square", contains: "<rect" },
      { symbol: "diamond", contains: "<polygon" },
      { symbol: "triangle", contains: "<polygon" },
      { symbol: "x", contains: '<path d="' },
      { symbol: "plus", contains: '<path d="' },
      { symbol: "star", contains: "<polygon" },
      { symbol: "dash", contains: "<line" },
      { symbol: "dot", contains: "<circle" },
      { symbol: "none", contains: "", notContains: "<circle" },
    ];

    for (const { symbol, contains, notContains } of testCases) {
      it(`renders "${symbol}" marker correctly`, () => {
        const config: ScatterChartConfig = {
          scatterStyle: "marker",
          markers: [{ symbol, size: pt(5) }],
        };
        const result = generateScatterChart(data, chartWidth, chartHeight, colors, config);

        if (contains) {
          expect(result.content).toContain(contains);
        }
        if (notContains) {
          expect(result.content).not.toContain(notContains);
        }
      });
    }
  });

  describe("Category Labels (strRef xVal)", () => {
    it("extracts category labels from xlabels", () => {
      const data = [
        createSeriesData(
          [
            { x: 0, y: 10 },
            { x: 1, y: 20 },
          ],
          "Series 1",
          { "0": "Q1", "1": "Q2" },
        ),
      ];

      const result = generateScatterChart(data, chartWidth, chartHeight, colors);

      expect(result.categoryLabels).toEqual(["Q1", "Q2"]);
    });

    it("returns undefined categoryLabels when no xlabels present", () => {
      const data = [createSeriesData([{ x: 0, y: 10 }])];
      const result = generateScatterChart(data, chartWidth, chartHeight, colors);

      expect(result.categoryLabels).toBeUndefined();
    });
  });

  describe("Value Ranges", () => {
    it("returns correct valueRange (Y-axis)", () => {
      const data = [
        createSeriesData([
          { x: 0, y: 5 },
          { x: 1, y: 15 },
        ]),
      ];

      const result = generateScatterChart(data, chartWidth, chartHeight, colors);

      // Range includes 5% padding
      expect(result.valueRange?.minVal).toBeLessThan(5);
      expect(result.valueRange?.maxVal).toBeGreaterThan(15);
    });

    it("returns correct xValueRange (X-axis)", () => {
      const data = [
        createSeriesData([
          { x: 0, y: 5 },
          { x: 10, y: 15 },
        ]),
      ];

      const result = generateScatterChart(data, chartWidth, chartHeight, colors);

      // Range includes 5% padding
      expect(result.xValueRange?.minVal).toBeLessThan(0);
      expect(result.xValueRange?.maxVal).toBeGreaterThan(10);
    });
  });

  describe("Chart Type", () => {
    it('returns chartType as "scatter"', () => {
      const data = [createSeriesData([{ x: 0, y: 10 }])];
      const result = generateScatterChart(data, chartWidth, chartHeight, colors);

      expect(result.chartType).toBe("scatter");
    });
  });
});
