/**
 * @file Line chart ASCII renderer tests
 */

import { renderLineAscii } from "./line-renderer";

describe("line-renderer", () => {
  it("renders a line chart with data points", () => {
    const result = renderLineAscii({
      series: [{
        values: [40, 80, 60, 120],
        categories: ["Q1", "Q2", "Q3", "Q4"],
      }],
      width: 40,
    });
    expect(result).toContain("*");
    expect(result).toContain("Q1");
  });

  it("returns empty string for empty series", () => {
    expect(renderLineAscii({ series: [], width: 40 })).toBe("");
  });

  it("returns empty string for series with no values", () => {
    expect(renderLineAscii({ series: [{ values: [] }], width: 40 })).toBe("");
  });

  it("handles single data point", () => {
    const result = renderLineAscii({
      series: [{ values: [50], categories: ["A"] }],
      width: 40,
    });
    expect(result).toContain("*");
    expect(result).toContain("A");
  });
});
