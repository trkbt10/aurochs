/**
 * @file Effect builder unit tests
 */

import {
  dropShadow,
  innerShadow,
  layerBlur,
  backgroundBlur,
  effects,
} from "./effect-builder";
import { EFFECT_TYPE_VALUES, BLEND_MODE_VALUES } from "../constants";

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

describe("LayerBlurBuilder", () => {
  it("creates layer blur with defaults", () => {
    const result = layerBlur().build();

    expect(result.type).toEqual({ value: EFFECT_TYPE_VALUES.LAYER_BLUR, name: "LAYER_BLUR" });
    expect(result.visible).toBe(true);
    expect(result.radius).toBe(4);
  });

  it("sets custom radius", () => {
    const result = layerBlur().radius(20).build();

    expect(result.radius).toBe(20);
  });

  it("clamps negative radius to zero", () => {
    const result = layerBlur().radius(-10).build();

    expect(result.radius).toBe(0);
  });

  it("sets visibility", () => {
    const result = layerBlur().visible(false).build();

    expect(result.visible).toBe(false);
  });
});

describe("BackgroundBlurBuilder", () => {
  it("creates background blur with defaults", () => {
    const result = backgroundBlur().build();

    expect(result.type).toEqual({ value: EFFECT_TYPE_VALUES.BACKGROUND_BLUR, name: "BACKGROUND_BLUR" });
    expect(result.visible).toBe(true);
    expect(result.radius).toBe(10);
  });

  it("sets custom radius", () => {
    const result = backgroundBlur().radius(30).build();

    expect(result.radius).toBe(30);
  });

  it("sets visibility", () => {
    const result = backgroundBlur().visible(false).build();

    expect(result.visible).toBe(false);
  });
});

describe("effects utility", () => {
  it("combines multiple effects into array", () => {
    const result = effects(
      dropShadow().offset(0, 4).blur(4),
      innerShadow().offset(0, 2).blur(2),
      layerBlur().radius(5)
    );

    expect(result).toHaveLength(3);
    expect(result[0].type.name).toBe("DROP_SHADOW");
    expect(result[1].type.name).toBe("INNER_SHADOW");
    expect(result[2].type.name).toBe("LAYER_BLUR");
  });

  it("creates empty array when no effects provided", () => {
    const result = effects();

    expect(result).toHaveLength(0);
  });

  it("allows single effect", () => {
    const result = effects(dropShadow());

    expect(result).toHaveLength(1);
  });
});
