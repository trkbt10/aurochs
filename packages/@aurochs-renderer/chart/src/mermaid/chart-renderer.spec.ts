import { describe, it, expect } from "vitest";
import { renderChartMermaid } from "./chart-renderer";

describe("renderChartMermaid", () => {
  it("returns empty string for empty series", () => {
    expect(renderChartMermaid({ series: [], chartType: "bar" })).toBe("");
  });

  it("renders bar chart in mermaid fence", () => {
    const result = renderChartMermaid({
      series: [{ values: [10, 20], categories: ["A", "B"] }],
      chartType: "bar",
      title: "Test",
    });
    expect(result).toMatch(/^```mermaid\n/);
    expect(result).toMatch(/\n```$/);
    expect(result).toContain("xychart-beta");
    expect(result).toContain("bar [10, 20]");
  });

  it("renders pie chart in mermaid fence", () => {
    const result = renderChartMermaid({
      series: [{ values: [30, 70], categories: ["Yes", "No"] }],
      chartType: "pie",
    });
    expect(result).toContain("pie");
    expect(result).toContain('"Yes" : 30');
  });

  it("renders line chart", () => {
    const result = renderChartMermaid({
      series: [{ values: [1, 2, 3] }],
      chartType: "line",
    });
    expect(result).toContain("line [1, 2, 3]");
  });
});
