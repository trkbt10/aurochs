import { describe, it, expect } from "bun:test";
import { renderPieAscii } from "./pie-renderer";

describe("pie-renderer", () => {
  it("renders a percentage breakdown", () => {
    const result = renderPieAscii({
      series: [{
        values: [45, 30, 25],
        categories: ["Product A", "Product B", "Product C"],
      }],
      width: 50,
    });
    expect(result).toContain("Product A");
    expect(result).toContain("Product B");
    expect(result).toContain("Product C");
    expect(result).toContain("%");
  });

  it("returns empty string for empty series", () => {
    expect(renderPieAscii({ series: [], width: 40 })).toBe("");
  });

  it("returns (no data) for all-zero values", () => {
    expect(renderPieAscii({ series: [{ values: [0, 0] }], width: 40 })).toBe("(no data)");
  });

  it("generates default category names when none provided", () => {
    const result = renderPieAscii({
      series: [{ values: [60, 40] }],
      width: 40,
    });
    expect(result).toContain("Item 1");
    expect(result).toContain("Item 2");
  });
});
