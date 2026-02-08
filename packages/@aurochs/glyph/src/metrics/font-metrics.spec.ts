/**
 * @file Font metrics tests
 */

import { getCharWidth, getKerningAdjustment, getKerningForText } from "./font-metrics";
import { getFontCategory, getFontMetrics, isMonospace } from "./fonts";

describe("getFontCategory", () => {
  it("should return sans-serif for Arial", () => {
    expect(getFontCategory("Arial")).toBe("sans-serif");
  });

  it("should return sans-serif for Calibri", () => {
    expect(getFontCategory("Calibri")).toBe("sans-serif");
  });

  it("should return serif for Times New Roman", () => {
    expect(getFontCategory("Times New Roman")).toBe("serif");
  });

  it("should return monospace for Consolas", () => {
    expect(getFontCategory("Consolas")).toBe("monospace");
  });

  it("should return cjk for MS Gothic", () => {
    expect(getFontCategory("MS Gothic")).toBe("cjk");
  });

  it("should return sans-serif for undefined", () => {
    expect(getFontCategory(undefined)).toBe("sans-serif");
  });

  it("should return sans-serif for empty string", () => {
    expect(getFontCategory("")).toBe("sans-serif");
  });

  it("should handle case-insensitive matching", () => {
    expect(getFontCategory("ARIAL")).toBe("sans-serif");
    expect(getFontCategory("arial")).toBe("sans-serif");
    expect(getFontCategory("Arial")).toBe("sans-serif");
  });

  it("should handle quoted font names", () => {
    expect(getFontCategory('"Arial"')).toBe("sans-serif");
    expect(getFontCategory("'Times New Roman'")).toBe("serif");
  });
});

describe("getFontMetrics", () => {
  it("should return metrics for sans-serif fonts", () => {
    const metrics = getFontMetrics("Arial");
    expect(metrics.latinAverage).toBe(0.52);
    expect(metrics.cjkAverage).toBe(1.0);
  });

  it("should return metrics for serif fonts", () => {
    const metrics = getFontMetrics("Times New Roman");
    expect(metrics.latinAverage).toBe(0.5);
  });

  it("should return metrics for monospace fonts", () => {
    const metrics = getFontMetrics("Consolas");
    expect(metrics.latinAverage).toBe(0.6);
    expect(Object.keys(metrics.kerning)).toHaveLength(0);
  });
});

describe("getCharWidth", () => {
  it("should return narrow width for i", () => {
    const width = getCharWidth({ char: "i", fontFamily: "Arial", isCjk: false });
    expect(width).toBeLessThan(0.3);
  });

  it("should return wide width for W", () => {
    const width = getCharWidth({ char: "W", fontFamily: "Arial", isCjk: false });
    expect(width).toBeGreaterThan(0.8);
  });

  it("should return full width for CJK", () => {
    const width = getCharWidth({ char: "\u4e2d", fontFamily: "Arial", isCjk: true });
    expect(width).toBe(1.0);
  });

  it("should return space width", () => {
    const width = getCharWidth({ char: " ", fontFamily: "Arial", isCjk: false });
    expect(width).toBeCloseTo(0.25, 2); // Default space width for sans-serif
  });
});

describe("getKerningAdjustment", () => {
  it("should return negative adjustment for AV", () => {
    const adjustment = getKerningAdjustment("AV", "Arial");
    expect(adjustment).toBeLessThan(0);
  });

  it("should return negative adjustment for TA", () => {
    const adjustment = getKerningAdjustment("TA", "Arial");
    expect(adjustment).toBeLessThan(0);
  });

  it("should return 0 for non-kerning pairs", () => {
    const adjustment = getKerningAdjustment("AB", "Arial");
    expect(adjustment).toBe(0);
  });

  it("should return 0 for single character", () => {
    const adjustment = getKerningAdjustment("A", "Arial");
    expect(adjustment).toBe(0);
  });

  it("should return 0 for monospace fonts", () => {
    // Monospace fonts have no kerning
    const metrics = getFontMetrics("Consolas");
    expect(Object.keys(metrics.kerning)).toHaveLength(0);
  });
});

describe("getKerningForText", () => {
  it("should return array of adjustments for each character", () => {
    const adjustments = getKerningForText("AVoid", "Arial");
    expect(adjustments).toHaveLength(5);
    expect(adjustments[0]).toBe(0); // First character has no kerning
    expect(adjustments[1]).toBeLessThan(0); // AV pair
  });

  it("should handle empty string", () => {
    const adjustments = getKerningForText("", "Arial");
    expect(adjustments).toHaveLength(0);
  });

  it("should handle single character", () => {
    const adjustments = getKerningForText("A", "Arial");
    expect(adjustments).toHaveLength(1);
    expect(adjustments[0]).toBe(0);
  });
});

describe("isMonospace", () => {
  it("should return true for Consolas", () => {
    expect(isMonospace("Consolas")).toBe(true);
  });

  it("should return true for Courier New", () => {
    expect(isMonospace("Courier New")).toBe(true);
  });

  it("should return false for Arial", () => {
    expect(isMonospace("Arial")).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(isMonospace(undefined)).toBe(false);
  });
});
