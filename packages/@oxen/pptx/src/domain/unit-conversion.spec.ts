/**
 * @file Tests for unit-conversion.ts
 */

import { SLIDE_FACTOR, FONT_SIZE_FACTOR, angleToDegrees, degreesToRadians } from "./unit-conversion";

describe("SLIDE_FACTOR", () => {
  it("equals 96/914400 for EMU to pixel conversion at 96 DPI", () => {
    expect(SLIDE_FACTOR).toBe(96 / 914400);
  });

  it("converts 914400 EMU to 96 pixels", () => {
    expect(914400 * SLIDE_FACTOR).toBe(96);
  });

  it("converts 1 inch (914400 EMU) to 96 pixels", () => {
    expect(914400 * SLIDE_FACTOR).toBe(96);
  });
});

describe("FONT_SIZE_FACTOR", () => {
  it("equals 4/3.2", () => {
    expect(FONT_SIZE_FACTOR).toBe(4 / 3.2);
  });
});

describe("angleToDegrees", () => {
  it("converts 0 to 0 degrees", () => {
    expect(angleToDegrees(0)).toBe(0);
  });

  it("converts 60000 to 1 degree", () => {
    expect(angleToDegrees(60000)).toBe(1);
  });

  it("converts 5400000 to 90 degrees", () => {
    expect(angleToDegrees(5400000)).toBe(90);
  });

  it("converts 10800000 to 180 degrees", () => {
    expect(angleToDegrees(10800000)).toBe(180);
  });

  it("converts 21600000 to 360 degrees", () => {
    expect(angleToDegrees(21600000)).toBe(360);
  });

  it("converts string numbers", () => {
    expect(angleToDegrees("60000")).toBe(1);
  });

  it("returns 0 for undefined", () => {
    expect(angleToDegrees(undefined)).toBe(0);
  });

  it("returns 0 for non-numeric strings", () => {
    expect(angleToDegrees("abc")).toBe(0);
  });

  it("handles negative angles", () => {
    expect(angleToDegrees(-5400000)).toBe(-90);
  });
});

describe("degreesToRadians", () => {
  it("converts 0 degrees to 0 radians", () => {
    expect(degreesToRadians(0)).toBe(0);
  });

  it("converts 90 degrees to PI/2 radians", () => {
    expect(degreesToRadians(90)).toBe(Math.PI / 2);
  });

  it("converts 180 degrees to PI radians", () => {
    expect(degreesToRadians(180)).toBe(Math.PI);
  });

  it("converts 360 degrees to 2*PI radians", () => {
    expect(degreesToRadians(360)).toBe(2 * Math.PI);
  });

  it("converts 45 degrees to PI/4 radians", () => {
    expect(degreesToRadians(45)).toBe(Math.PI / 4);
  });

  it("handles negative degrees", () => {
    expect(degreesToRadians(-90)).toBe(-Math.PI / 2);
  });
});
