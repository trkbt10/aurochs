/**
 * @file Tests for gradient parsing utilities
 */

import {
  parseLinearGradient,
  angleToGradientCoords,
  toSvgLinearGradient,
  cssGradientToSvg,
  extractFirstColor,
} from "./gradient";

describe("parseLinearGradient", () => {
  it("should parse simple linear gradient", () => {
    const result = parseLinearGradient("linear-gradient(90deg, #ffffff, #000000)");
    expect(result).toEqual({
      angle: 90,
      colors: ["#ffffff", "#000000"],
    });
  });

  it("should parse gradient with multiple colors", () => {
    const result = parseLinearGradient("linear-gradient(45deg, #ff0000, #00ff00, #0000ff)");
    expect(result).toEqual({
      angle: 45,
      colors: ["#ff0000", "#00ff00", "#0000ff"],
    });
  });

  it("should parse gradient with short hex colors", () => {
    const result = parseLinearGradient("linear-gradient(0deg, #fff, #000)");
    expect(result).toEqual({
      angle: 0,
      colors: ["#fff", "#000"],
    });
  });

  it("should parse gradient with rgba colors", () => {
    const result = parseLinearGradient("linear-gradient(180deg, rgba(255,255,255,0.5), rgba(0,0,0,1))");
    expect(result).toEqual({
      angle: 180,
      colors: ["rgba(255,255,255,0.5)", "rgba(0,0,0,1)"],
    });
  });

  it("should return undefined for invalid gradient", () => {
    expect(parseLinearGradient("not-a-gradient")).toBeUndefined();
    expect(parseLinearGradient("radial-gradient(circle, #fff, #000)")).toBeUndefined();
  });

  it("should return undefined for gradient with less than 2 colors", () => {
    expect(parseLinearGradient("linear-gradient(90deg, #fff)")).toBeUndefined();
  });
});

describe("angleToGradientCoords", () => {
  it("should convert 0deg to top-to-bottom", () => {
    const coords = angleToGradientCoords(0);
    expect(coords.x1).toBeCloseTo(50);
    expect(coords.y1).toBeCloseTo(0);
    expect(coords.x2).toBeCloseTo(50);
    expect(coords.y2).toBeCloseTo(100);
  });

  it("should convert 90deg to left-to-right", () => {
    const coords = angleToGradientCoords(90);
    expect(coords.x1).toBeCloseTo(0);
    expect(coords.y1).toBeCloseTo(50);
    expect(coords.x2).toBeCloseTo(100);
    expect(coords.y2).toBeCloseTo(50);
  });

  it("should convert 180deg to bottom-to-top", () => {
    const coords = angleToGradientCoords(180);
    expect(coords.x1).toBeCloseTo(50);
    expect(coords.y1).toBeCloseTo(100);
    expect(coords.x2).toBeCloseTo(50);
    expect(coords.y2).toBeCloseTo(0);
  });
});

describe("toSvgLinearGradient", () => {
  it("should generate SVG gradient definition", () => {
    const result = toSvgLinearGradient({ angle: 90, colors: ["#fff", "#000"] }, "test-grad");
    expect(result.fillUrl).toBe("url(#test-grad)");
    expect(result.defs).toContain('<linearGradient id="test-grad"');
    expect(result.defs).toContain('<stop offset="0%" stop-color="#fff"');
    expect(result.defs).toContain('<stop offset="100%" stop-color="#000"');
  });
});

describe("cssGradientToSvg", () => {
  it("should convert CSS gradient to SVG", () => {
    const result = cssGradientToSvg("linear-gradient(90deg, #fff, #000)", "my-grad");
    expect(result).toBeDefined();
    expect(result!.fillUrl).toBe("url(#my-grad)");
  });

  it("should return undefined for invalid gradient", () => {
    expect(cssGradientToSvg("not-valid", "my-grad")).toBeUndefined();
  });
});

describe("extractFirstColor", () => {
  it("should extract first hex color", () => {
    expect(extractFirstColor("linear-gradient(90deg, #ff5500, #000)")).toBe("#ff5500");
  });

  it("should return undefined if no color found", () => {
    expect(extractFirstColor("no colors here")).toBeUndefined();
  });
});
