/**
 * @file Tests for domain-to-input conversion utilities
 */
import type { Color } from "./color";
import type { SolidFill, GradientFill, PatternFill, BlipFill, NoFill, GroupFill } from "./fill";
import type { Percent, Degrees } from "./units";
import { colorToInput, fillToInput } from "./domain-to-input";

describe("colorToInput", () => {
  it("converts sRGB color to hex string", () => {
    const color: Color = { spec: { type: "srgb", value: "FF6B4A" } };
    expect(colorToInput(color)).toBe("FF6B4A");
  });

  it("converts scheme color to ThemeColorInput", () => {
    const color: Color = { spec: { type: "scheme", value: "accent1" } };
    expect(colorToInput(color)).toEqual({ theme: "accent1" });
  });

  it("converts scheme color with transform to ThemeColorInput with modifiers", () => {
    const color: Color = {
      spec: { type: "scheme", value: "dk1" },
      transform: { lumMod: 75000 as Percent, lumOff: 25000 as Percent },
    };
    expect(colorToInput(color)).toEqual({ theme: "dk1", lumMod: 75, lumOff: 25 });
  });

  it("converts system color using lastColor", () => {
    const color: Color = { spec: { type: "system", value: "windowText", lastColor: "000000" } };
    expect(colorToInput(color)).toBe("000000");
  });
});

describe("fillToInput", () => {
  it("converts solid fill", () => {
    const fill: SolidFill = {
      type: "solidFill",
      color: { spec: { type: "srgb", value: "FF0000" } },
    };
    expect(fillToInput(fill)).toEqual({ type: "solid", color: "FF0000" });
  });

  it("converts gradient fill", () => {
    const fill: GradientFill = {
      type: "gradientFill",
      stops: [
        { position: 0 as Percent, color: { spec: { type: "srgb", value: "000000" } } },
        { position: 100000 as Percent, color: { spec: { type: "srgb", value: "FFFFFF" } } },
      ],
      linear: { angle: 90 as Degrees, scaled: false },
      rotWithShape: false,
    };
    const result = fillToInput(fill);
    expect(result).toEqual({
      type: "gradient",
      gradientType: "linear",
      stops: [
        { position: 0, color: "000000" },
        { position: 100, color: "FFFFFF" },
      ],
      angle: 90,
    });
  });

  it("converts pattern fill", () => {
    const fill: PatternFill = {
      type: "patternFill",
      preset: "horz",
      foregroundColor: { spec: { type: "srgb", value: "000000" } },
      backgroundColor: { spec: { type: "srgb", value: "FFFFFF" } },
    };
    expect(fillToInput(fill)).toEqual({
      type: "pattern",
      preset: "horz",
      fgColor: "000000",
      bgColor: "FFFFFF",
    });
  });

  it("converts blip fill", () => {
    const fill: BlipFill = {
      type: "blipFill",
      resourceId: "rId1",
    };
    expect(fillToInput(fill)).toEqual({ resourceId: "rId1" });
  });

  it("returns undefined for noFill", () => {
    const fill: NoFill = { type: "noFill" };
    expect(fillToInput(fill)).toBeUndefined();
  });

  it("returns undefined for groupFill", () => {
    const fill: GroupFill = { type: "groupFill" };
    expect(fillToInput(fill)).toBeUndefined();
  });
});
