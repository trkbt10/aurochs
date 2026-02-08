/**
 * @file Solid paint builder unit tests
 */

import { solidPaint, solidPaintHex } from "./solid";
import { PAINT_TYPE_VALUES, BLEND_MODE_VALUES } from "../../constants";

describe("SolidPaintBuilder", () => {
  it("creates solid paint with Color object", () => {
    const result = solidPaint({ r: 1, g: 0, b: 0, a: 1 }).build();

    expect(result.type).toEqual({ value: PAINT_TYPE_VALUES.SOLID, name: "SOLID" });
    expect(result.color).toEqual({ r: 1, g: 0, b: 0, a: 1 });
    expect(result.opacity).toBe(1);
    expect(result.visible).toBe(true);
    expect(result.blendMode).toEqual({ value: BLEND_MODE_VALUES.NORMAL, name: "NORMAL" });
  });

  it("creates solid paint with alpha", () => {
    const result = solidPaint({ r: 0, g: 1, b: 0, a: 0.5 }).build();

    expect(result.color).toEqual({ r: 0, g: 1, b: 0, a: 0.5 });
  });

  it("sets opacity", () => {
    const result = solidPaint({ r: 0, g: 0, b: 1, a: 1 }).opacity(0.7).build();

    expect(result.opacity).toBe(0.7);
  });

  it("sets visibility", () => {
    const result = solidPaint({ r: 0, g: 0, b: 0, a: 1 }).visible(false).build();

    expect(result.visible).toBe(false);
  });

  it("sets blend mode", () => {
    const result = solidPaint({ r: 1, g: 1, b: 1, a: 1 }).blendMode("MULTIPLY").build();

    expect(result.blendMode).toEqual({ value: BLEND_MODE_VALUES.MULTIPLY, name: "MULTIPLY" });
  });

  it("clamps opacity to 0-1 range", () => {
    expect(solidPaint({ r: 0, g: 0, b: 0, a: 1 }).opacity(-0.5).build().opacity).toBe(0);
    expect(solidPaint({ r: 0, g: 0, b: 0, a: 1 }).opacity(1.5).build().opacity).toBe(1);
  });
});

describe("solidPaintHex", () => {
  it("parses hex color with hash", () => {
    const result = solidPaintHex("#ff0000").build();

    expect(result.color).toEqual({ r: 1, g: 0, b: 0, a: 1 });
  });

  it("parses hex color without hash", () => {
    const result = solidPaintHex("00ff00").build();

    expect(result.color).toEqual({ r: 0, g: 1, b: 0, a: 1 });
  });

  it("handles invalid hex gracefully", () => {
    const result = solidPaintHex("invalid").build();

    expect(result.color).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });
});
