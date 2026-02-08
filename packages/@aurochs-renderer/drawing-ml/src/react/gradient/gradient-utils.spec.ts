/**
 * @file Tests for gradient utilities
 */

// describe, it, expect are provided by the test runner globals
import {
  ooxmlAngleToSvgLinearGradient,
  fillToRectToRadialCenter,
  getRadialGradientCoords,
} from "./gradient-utils";

describe("ooxmlAngleToSvgLinearGradient", () => {
  it("converts 0° (bottom to top)", () => {
    const coords = ooxmlAngleToSvgLinearGradient(0);

    // 0° in OOXML means gradient flows bottom to top
    expect(coords.x1).toBeCloseTo(50, 1);
    expect(coords.y1).toBeCloseTo(100, 1);
    expect(coords.x2).toBeCloseTo(50, 1);
    expect(coords.y2).toBeCloseTo(0, 1);
  });

  it("converts 90° (left to right)", () => {
    const coords = ooxmlAngleToSvgLinearGradient(90);

    // 90° in OOXML means gradient flows left to right
    expect(coords.x1).toBeCloseTo(0, 1);
    expect(coords.y1).toBeCloseTo(50, 1);
    expect(coords.x2).toBeCloseTo(100, 1);
    expect(coords.y2).toBeCloseTo(50, 1);
  });

  it("converts 180° (top to bottom)", () => {
    const coords = ooxmlAngleToSvgLinearGradient(180);

    // 180° in OOXML means gradient flows top to bottom
    expect(coords.x1).toBeCloseTo(50, 1);
    expect(coords.y1).toBeCloseTo(0, 1);
    expect(coords.x2).toBeCloseTo(50, 1);
    expect(coords.y2).toBeCloseTo(100, 1);
  });

  it("converts 270° (right to left)", () => {
    const coords = ooxmlAngleToSvgLinearGradient(270);

    // 270° in OOXML means gradient flows right to left
    expect(coords.x1).toBeCloseTo(100, 1);
    expect(coords.y1).toBeCloseTo(50, 1);
    expect(coords.x2).toBeCloseTo(0, 1);
    expect(coords.y2).toBeCloseTo(50, 1);
  });

  it("converts 45° (diagonal bottom-left to top-right)", () => {
    const coords = ooxmlAngleToSvgLinearGradient(45);

    // 45° should be diagonal from bottom-left to top-right
    expect(coords.x1).toBeLessThan(50);
    expect(coords.y1).toBeGreaterThan(50);
    expect(coords.x2).toBeGreaterThan(50);
    expect(coords.y2).toBeLessThan(50);
  });

  it("returns coordinates within 0-100 range", () => {
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];

    for (const angle of angles) {
      const coords = ooxmlAngleToSvgLinearGradient(angle);
      expect(coords.x1).toBeGreaterThanOrEqual(0);
      expect(coords.x1).toBeLessThanOrEqual(100);
      expect(coords.y1).toBeGreaterThanOrEqual(0);
      expect(coords.y1).toBeLessThanOrEqual(100);
      expect(coords.x2).toBeGreaterThanOrEqual(0);
      expect(coords.x2).toBeLessThanOrEqual(100);
      expect(coords.y2).toBeGreaterThanOrEqual(0);
      expect(coords.y2).toBeLessThanOrEqual(100);
    }
  });
});

describe("fillToRectToRadialCenter", () => {
  it("calculates center from equal margins", () => {
    const center = fillToRectToRadialCenter({
      left: 25,
      top: 25,
      right: 25,
      bottom: 25,
    });

    expect(center.cx).toBe(50);
    expect(center.cy).toBe(50);
  });

  it("calculates center from zero margins (centered)", () => {
    const center = fillToRectToRadialCenter({
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
    });

    expect(center.cx).toBe(50);
    expect(center.cy).toBe(50);
  });

  it("calculates off-center from asymmetric margins", () => {
    const center = fillToRectToRadialCenter({
      left: 0,
      top: 0,
      right: 100,
      bottom: 100,
    });

    // With left=0, right=100, center should be at left edge
    expect(center.cx).toBe(0);
    expect(center.cy).toBe(0);
  });

  it("calculates center in bottom-right quadrant", () => {
    const center = fillToRectToRadialCenter({
      left: 50,
      top: 50,
      right: 0,
      bottom: 0,
    });

    expect(center.cx).toBe(75);
    expect(center.cy).toBe(75);
  });
});

describe("getRadialGradientCoords", () => {
  it("returns default center (50, 50) when no center provided", () => {
    const coords = getRadialGradientCoords();

    expect(coords.cx).toBe(50);
    expect(coords.cy).toBe(50);
    expect(coords.fx).toBe(50);
    expect(coords.fy).toBe(50);
  });

  it("returns standard radius (50) for shape fills", () => {
    const coords = getRadialGradientCoords(undefined, false);

    expect(coords.r).toBe(50);
  });

  it("returns extended radius (~70.7) for backgrounds", () => {
    const coords = getRadialGradientCoords(undefined, true);

    expect(coords.r).toBeCloseTo(70.7, 1);
  });

  it("uses provided center coordinates", () => {
    const coords = getRadialGradientCoords({ cx: 25, cy: 75 });

    expect(coords.cx).toBe(25);
    expect(coords.cy).toBe(75);
    expect(coords.fx).toBe(25);
    expect(coords.fy).toBe(75);
  });
});
