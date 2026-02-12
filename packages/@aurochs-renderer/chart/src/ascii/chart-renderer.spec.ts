/**
 * @file Chart ASCII renderer dispatch tests
 */

import { renderChartAscii } from "./chart-renderer";

describe("chart-renderer", () => {
  it("dispatches bar chart", () => {
    const result = renderChartAscii({
      series: [{ values: [10, 20, 30], categories: ["A", "B", "C"] }],
      chartType: "bar",
      width: 40,
    });
    expect(result).toContain("A");
    expect(result).toContain("30");
  });

  it("dispatches line chart", () => {
    const result = renderChartAscii({
      series: [{ values: [10, 20, 30], categories: ["A", "B", "C"] }],
      chartType: "line",
      width: 40,
    });
    expect(result).toContain("*");
  });

  it("dispatches pie chart", () => {
    const result = renderChartAscii({
      series: [{ values: [50, 30, 20], categories: ["X", "Y", "Z"] }],
      chartType: "pie",
      width: 40,
    });
    expect(result).toContain("%");
  });

  it("includes title when provided", () => {
    const result = renderChartAscii({
      series: [{ values: [10] }],
      chartType: "bar",
      title: "Revenue",
      width: 40,
    });
    expect(result).toContain("Revenue");
    expect(result).toContain("\u2500");
  });

  it("falls back to bar for unknown types", () => {
    const result = renderChartAscii({
      series: [{ values: [10, 20] }],
      chartType: "other",
      width: 40,
    });
    expect(result.length).toBeGreaterThan(0);
  });
});
