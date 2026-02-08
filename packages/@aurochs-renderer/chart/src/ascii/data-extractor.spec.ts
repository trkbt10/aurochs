import { describe, it, expect } from "bun:test";
import { extractChartData } from "./data-extractor";

describe("data-extractor", () => {
  it("extracts series data from chart info", () => {
    const result = extractChartData({
      title: "Sales",
      chartType: "barChart",
      series: [
        { name: "Revenue", values: [100, 200, 300], categories: ["Q1", "Q2", "Q3"] },
      ],
    });
    expect(result.title).toBe("Sales");
    expect(result.chartType).toBe("bar");
    expect(result.series.length).toBe(1);
    expect(result.series[0]!.values).toEqual([100, 200, 300]);
  });

  it("normalizes chart types", () => {
    expect(extractChartData({ chartType: "lineChart" }).chartType).toBe("line");
    expect(extractChartData({ chartType: "pieChart" }).chartType).toBe("pie");
    expect(extractChartData({ chartType: "doughnutChart" }).chartType).toBe("pie");
    expect(extractChartData({ chartType: "scatterChart" }).chartType).toBe("scatter");
    expect(extractChartData({ chartType: "areaChart" }).chartType).toBe("area");
    expect(extractChartData({ chartType: "radarChart" }).chartType).toBe("radar");
    expect(extractChartData({ chartType: "unknown" }).chartType).toBe("other");
    expect(extractChartData({}).chartType).toBe("other");
  });

  it("handles null values in series", () => {
    const result = extractChartData({
      series: [{ values: [10, null, 30, undefined] }],
    });
    expect(result.series[0]!.values).toEqual([10, 0, 30, 0]);
  });

  it("returns empty series for chart with no series", () => {
    const result = extractChartData({});
    expect(result.series).toEqual([]);
  });
});
