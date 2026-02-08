/**
 * @file Inner shadow builder unit tests
 */

import { innerShadow } from "./inner-shadow";
import { EFFECT_TYPE_VALUES, BLEND_MODE_VALUES } from "../../constants";

describe("InnerShadowBuilder", () => {
  it("creates inner shadow with defaults", () => {
    const result = innerShadow().build();

    expect(result.type).toEqual({ value: EFFECT_TYPE_VALUES.INNER_SHADOW, name: "INNER_SHADOW" });
    expect(result.visible).toBe(true);
    expect(result.color).toEqual({ r: 0, g: 0, b: 0, a: 0.25 });
    expect(result.offset).toEqual({ x: 0, y: 2 });
    expect(result.radius).toBe(4);
  });

  it("sets custom color", () => {
    const result = innerShadow().color({ r: 0.5, g: 0.5, b: 0.5, a: 0.4 }).build();

    expect(result.color).toEqual({ r: 0.5, g: 0.5, b: 0.5, a: 0.4 });
  });

  it("sets custom offset", () => {
    const result = innerShadow().offset(-2, 3).build();

    expect(result.offset).toEqual({ x: -2, y: 3 });
  });

  it("sets blur and spread", () => {
    const result = innerShadow().blur(10).spread(-1).build();

    expect(result.radius).toBe(10);
    expect(result.spread).toBe(-1);
  });

  it("sets blend mode", () => {
    const result = innerShadow().blendMode("COLOR_BURN").build();

    expect(result.blendMode).toEqual({ value: BLEND_MODE_VALUES.COLOR_BURN, name: "COLOR_BURN" });
  });
});
