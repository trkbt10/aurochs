/**
 * @file Stroke interpretation SoT tests
 *
 * Verifies the shared stroke functions consumed by both renderers.
 */

import { resolveStrokeWeight, mapStrokeCap, mapStrokeJoin } from "./interpret";

describe("resolveStrokeWeight", () => {
  it("returns 0 for undefined", () => {
    expect(resolveStrokeWeight(undefined)).toBe(0);
  });

  it("returns number directly", () => {
    expect(resolveStrokeWeight(2)).toBe(2);
  });

  it("returns max of per-side weights", () => {
    expect(resolveStrokeWeight({ top: 1, right: 3, bottom: 2, left: 0 })).toBe(3);
  });
});

describe("mapStrokeCap", () => {
  it("maps NONE to butt", () => {
    expect(mapStrokeCap("NONE")).toBe("butt");
  });

  it("maps ROUND to round", () => {
    expect(mapStrokeCap("ROUND")).toBe("round");
  });

  it("maps SQUARE to square", () => {
    expect(mapStrokeCap("SQUARE")).toBe("square");
  });

  it("maps LINE_ARROW to butt (arrows need markers)", () => {
    expect(mapStrokeCap("LINE_ARROW")).toBe("butt");
  });

  it("handles KiwiEnumValue", () => {
    expect(mapStrokeCap({ value: 2, name: "ROUND" })).toBe("round");
  });

  it("defaults to butt for unknown", () => {
    expect(mapStrokeCap(undefined)).toBe("butt");
    expect(mapStrokeCap(null)).toBe("butt");
  });
});

describe("mapStrokeJoin", () => {
  it("maps MITER to miter", () => {
    expect(mapStrokeJoin("MITER")).toBe("miter");
  });

  it("maps ROUND to round", () => {
    expect(mapStrokeJoin("ROUND")).toBe("round");
  });

  it("maps BEVEL to bevel", () => {
    expect(mapStrokeJoin("BEVEL")).toBe("bevel");
  });

  it("handles KiwiEnumValue", () => {
    expect(mapStrokeJoin({ value: 1, name: "ROUND" })).toBe("round");
  });

  it("defaults to miter for unknown", () => {
    expect(mapStrokeJoin(undefined)).toBe("miter");
    expect(mapStrokeJoin(null)).toBe("miter");
  });
});
