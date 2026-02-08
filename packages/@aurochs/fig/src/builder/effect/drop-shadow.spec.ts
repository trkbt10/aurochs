/**
 * @file Drop shadow builder unit tests
 */

import { dropShadow } from "./drop-shadow";
import { EFFECT_TYPE_VALUES, BLEND_MODE_VALUES } from "../../constants";

describe("DropShadowBuilder", () => {
  it("creates drop shadow with defaults", () => {
    const result = dropShadow().build();

    expect(result.type).toEqual({ value: EFFECT_TYPE_VALUES.DROP_SHADOW, name: "DROP_SHADOW" });
    expect(result.visible).toBe(true);
    expect(result.color).toEqual({ r: 0, g: 0, b: 0, a: 0.25 });
    expect(result.offset).toEqual({ x: 0, y: 4 });
    expect(result.radius).toBe(4);
    expect(result.spread).toBeUndefined();
    expect(result.blendMode).toEqual({ value: BLEND_MODE_VALUES.NORMAL, name: "NORMAL" });
  });

  it("sets custom color", () => {
    const result = dropShadow().color({ r: 1, g: 0, b: 0, a: 0.5 }).build();

    expect(result.color).toEqual({ r: 1, g: 0, b: 0, a: 0.5 });
  });

  it("sets custom offset", () => {
    const result = dropShadow().offset(10, 15).build();

    expect(result.offset).toEqual({ x: 10, y: 15 });
  });

  it("sets blur radius", () => {
    const result = dropShadow().blur(8).build();

    expect(result.radius).toBe(8);
  });

  it("clamps negative blur to zero", () => {
    const result = dropShadow().blur(-5).build();

    expect(result.radius).toBe(0);
  });

  it("sets spread radius", () => {
    const result = dropShadow().spread(2).build();

    expect(result.spread).toBe(2);
  });

  it("sets visibility", () => {
    const result = dropShadow().visible(false).build();

    expect(result.visible).toBe(false);
  });

  it("sets blend mode", () => {
    const result = dropShadow().blendMode("MULTIPLY").build();

    expect(result.blendMode).toEqual({ value: BLEND_MODE_VALUES.MULTIPLY, name: "MULTIPLY" });
  });

  it("sets show behind node", () => {
    const result = dropShadow().showBehindNode(true).build();

    expect(result.showShadowBehindNode).toBe(true);
  });

  it("chains all methods", () => {
    const result = dropShadow()
      .color({ r: 0, g: 0, b: 1, a: 0.3 })
      .offset(5, 10)
      .blur(6)
      .spread(1)
      .blendMode("OVERLAY")
      .build();

    expect(result.color).toEqual({ r: 0, g: 0, b: 1, a: 0.3 });
    expect(result.offset).toEqual({ x: 5, y: 10 });
    expect(result.radius).toBe(6);
    expect(result.spread).toBe(1);
    expect(result.blendMode?.name).toBe("OVERLAY");
  });
});
