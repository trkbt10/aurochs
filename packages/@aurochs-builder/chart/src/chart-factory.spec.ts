/**
 * @file Chart factory tests
 *
 * Verifies that createDefaultChart produces valid Chart domain objects
 * for all supported chart types.
 *
 * @see ECMA-376 Part 1, Section 21.2 - DrawingML Charts
 */

import type { ChartType } from "@aurochs-office/chart/domain";
import { createDefaultChart } from "./chart-factory";

const CHART_TYPES: ChartType[] = [
  "areaChart",
  "area3DChart",
  "barChart",
  "bar3DChart",
  "bubbleChart",
  "doughnutChart",
  "lineChart",
  "line3DChart",
  "ofPieChart",
  "pieChart",
  "pie3DChart",
  "radarChart",
  "scatterChart",
  "stockChart",
  "surfaceChart",
  "surface3DChart",
];

describe("createDefaultChart", () => {
  it.each(CHART_TYPES)("creates a valid Chart for %s", (chartType) => {
    const chart = createDefaultChart(chartType);

    expect(chart).toBeDefined();
    expect(chart.plotArea).toBeDefined();
    expect(chart.plotArea.charts.length).toBeGreaterThan(0);
  });

  it("creates a bar chart with series data", () => {
    const chart = createDefaultChart("barChart");

    expect(chart.plotArea.charts.length).toBe(1);
    const chartSeries = chart.plotArea.charts[0];
    expect(chartSeries.type).toBe("barChart");
    if (chartSeries.type === "barChart") {
      expect(chartSeries.series.length).toBeGreaterThan(0);
    }
  });

  it("creates a pie chart with series data", () => {
    const chart = createDefaultChart("pieChart");

    const chartSeries = chart.plotArea.charts[0];
    expect(chartSeries.type).toBe("pieChart");
    if (chartSeries.type === "pieChart") {
      expect(chartSeries.series.length).toBeGreaterThan(0);
    }
  });

  it("creates a line chart with series data", () => {
    const chart = createDefaultChart("lineChart");

    const chartSeries = chart.plotArea.charts[0];
    expect(chartSeries.type).toBe("lineChart");
    if (chartSeries.type === "lineChart") {
      expect(chartSeries.series.length).toBeGreaterThan(0);
    }
  });
});
