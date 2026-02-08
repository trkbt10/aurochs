/**
 * @file Stroke builder unit tests
 */

import { stroke } from "./stroke";
import { PAINT_TYPE_VALUES, BLEND_MODE_VALUES } from "../../constants";

describe("StrokeBuilder", () => {
  it("creates stroke with defaults", () => {
    const result = stroke().build();

    expect(result.weight).toBe(1);
    expect(result.paints).toHaveLength(1);
    expect(result.paints[0].type).toEqual({ value: PAINT_TYPE_VALUES.SOLID, name: "SOLID" });
  });

  it("creates stroke with color", () => {
    const result = stroke({ r: 1, g: 0, b: 0, a: 1 }).build();

    expect(result.paints[0].color).toEqual({ r: 1, g: 0, b: 0, a: 1 });
  });

  it("sets weight", () => {
    const result = stroke().weight(3).build();

    expect(result.weight).toBe(3);
  });

  it("sets cap style", () => {
    const result = stroke().cap("ROUND").build();

    expect(result.cap).toEqual({ value: 1, name: "ROUND" });
  });

  it("sets join style", () => {
    const result = stroke().join("BEVEL").build();

    expect(result.join).toEqual({ value: 1, name: "BEVEL" });
  });

  it("sets alignment", () => {
    const result = stroke().align("OUTSIDE").build();

    expect(result.align).toEqual({ value: 2, name: "OUTSIDE" });
  });

  it("sets dash pattern", () => {
    const result = stroke().dash([5, 3, 2, 3]).build();

    expect(result.dashPattern).toEqual([5, 3, 2, 3]);
  });

  it("sets miter limit", () => {
    const result = stroke().miterLimit(10).build();

    expect(result.miterLimit).toBe(10);
  });

  it("omits default miter limit", () => {
    const result = stroke().build();

    expect(result.miterLimit).toBeUndefined();
  });

  it("sets stroke opacity", () => {
    const result = stroke().opacity(0.5).build();

    expect(result.paints[0].opacity).toBe(0.5);
  });

  it("sets stroke blend mode", () => {
    const result = stroke().blendMode("SCREEN").build();

    expect(result.paints[0].blendMode).toEqual({ value: BLEND_MODE_VALUES.SCREEN, name: "SCREEN" });
  });

  it("chains multiple methods", () => {
    const result = stroke({ r: 0, g: 0, b: 0, a: 1 })
      .weight(2)
      .cap("SQUARE")
      .join("ROUND")
      .align("INSIDE")
      .dash([4, 2])
      .build();

    expect(result.weight).toBe(2);
    expect(result.cap?.name).toBe("SQUARE");
    expect(result.join?.name).toBe("ROUND");
    expect(result.align?.name).toBe("INSIDE");
    expect(result.dashPattern).toEqual([4, 2]);
  });
});
