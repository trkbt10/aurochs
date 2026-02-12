/**
 * @file Bar chart ASCII renderer tests
 */

import { renderBarAscii } from "./bar-renderer";

describe("bar-renderer", () => {
  it("renders a simple bar chart", () => {
    const result = renderBarAscii({
      series: [{
        values: [100, 70, 120, 90],
        categories: ["Q1", "Q2", "Q3", "Q4"],
      }],
      width: 40,
    });
    expect(result).toContain("Q1");
    expect(result).toContain("Q4");
    expect(result).toContain("100");
    expect(result).toContain("120");
  });

  it("returns empty string for empty series", () => {
    expect(renderBarAscii({ series: [], width: 40 })).toBe("");
  });

  it("returns empty string for series with no values", () => {
    expect(renderBarAscii({ series: [{ values: [] }], width: 40 })).toBe("");
  });

  it("handles zero values", () => {
    const result = renderBarAscii({
      series: [{ values: [0, 0, 0], categories: ["A", "B", "C"] }],
      width: 40,
    });
    expect(result).toContain("A");
    expect(result).toContain("0");
  });

  it("generates numbered categories when none provided", () => {
    const result = renderBarAscii({
      series: [{ values: [10, 20] }],
      width: 40,
    });
    expect(result).toContain("1");
    expect(result).toContain("2");
  });
});
