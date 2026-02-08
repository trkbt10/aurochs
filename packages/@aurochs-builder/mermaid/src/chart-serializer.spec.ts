import { describe, it, expect } from "vitest";
import { serializeChartToMermaid } from "./chart-serializer";

describe("serializeChartToMermaid", () => {
  it("returns empty string for no series", () => {
    expect(serializeChartToMermaid({ series: [], chartType: "bar" })).toBe("");
  });

  it("serializes bar chart as xychart-beta", () => {
    const result = serializeChartToMermaid({
      series: [{ values: [10, 20, 30], categories: ["A", "B", "C"] }],
      chartType: "bar",
      title: "Sales",
    });
    expect(result).toContain("xychart-beta");
    expect(result).toContain('title "Sales"');
    expect(result).toContain('x-axis ["A", "B", "C"]');
    expect(result).toContain("bar [10, 20, 30]");
  });

  it("serializes line chart with line keyword", () => {
    const result = serializeChartToMermaid({
      series: [{ values: [1, 2, 3] }],
      chartType: "line",
    });
    expect(result).toContain("xychart-beta");
    expect(result).toContain("line [1, 2, 3]");
    expect(result).not.toContain("bar");
  });

  it("serializes area chart as line", () => {
    const result = serializeChartToMermaid({
      series: [{ values: [5, 10] }],
      chartType: "area",
    });
    expect(result).toContain("line [5, 10]");
  });

  it("serializes pie chart", () => {
    const result = serializeChartToMermaid({
      series: [{ values: [40, 60], categories: ["Dogs", "Cats"] }],
      chartType: "pie",
      title: "Pets",
    });
    expect(result).toContain('pie title "Pets"');
    expect(result).toContain('"Dogs" : 40');
    expect(result).toContain('"Cats" : 60');
  });

  it("uses Item N for pie without categories", () => {
    const result = serializeChartToMermaid({
      series: [{ values: [10, 20] }],
      chartType: "pie",
    });
    expect(result).toContain('"Item 1" : 10');
    expect(result).toContain('"Item 2" : 20');
  });

  it("handles multiple series in xychart", () => {
    const result = serializeChartToMermaid({
      series: [
        { values: [1, 2], categories: ["X", "Y"] },
        { values: [3, 4] },
      ],
      chartType: "bar",
    });
    const lines = result.split("\n");
    const barLines = lines.filter((l) => l.trim().startsWith("bar"));
    expect(barLines).toHaveLength(2);
  });

  it("escapes quotes in title", () => {
    const result = serializeChartToMermaid({
      series: [{ values: [1] }],
      chartType: "pie",
      title: 'Say "Hello"',
    });
    expect(result).toContain("#quot;");
  });
});
