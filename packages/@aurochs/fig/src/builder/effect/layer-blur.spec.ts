/**
 * @file Layer blur builder unit tests
 */

import { layerBlur } from "./layer-blur";
import { EFFECT_TYPE_VALUES } from "../../constants";

describe("LayerBlurBuilder", () => {
  it("creates layer blur with defaults", () => {
    const result = layerBlur().build();

    expect(result.type).toEqual({ value: EFFECT_TYPE_VALUES.FOREGROUND_BLUR, name: "FOREGROUND_BLUR" });
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
