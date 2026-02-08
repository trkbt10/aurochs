/**
 * @file Background blur builder unit tests
 */

import { backgroundBlur } from "./background-blur";
import { EFFECT_TYPE_VALUES } from "../../constants";

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
