/**
 * @file Color serializer tests
 */

import { getChild } from "@aurochs/xml";
import { deg, pct } from "@aurochs-office/drawing-ml/domain/units";
import type { Color } from "@aurochs-office/drawing-ml/domain/color";
import { parseColor } from "@aurochs-office/pptx/parser/graphics/color-parser";
import { serializeColor } from "./color";

describe("serializeColor", () => {
  it("serializes scheme color", () => {
    const color: Color = { spec: { type: "scheme", value: "accent1" } };
    const el = serializeColor(color);
    expect(el.name).toBe("a:schemeClr");
    expect(el.attrs.val).toBe("accent1");
  });

  it("serializes srgb color", () => {
    const color: Color = { spec: { type: "srgb", value: "ff00aa" } };
    const el = serializeColor(color);
    expect(el.name).toBe("a:srgbClr");
    expect(el.attrs.val).toBe("FF00AA");
  });

  it("serializes hsl color", () => {
    const color: Color = {
      spec: { type: "hsl", hue: deg(120), saturation: pct(50), luminance: pct(25) },
    };
    const el = serializeColor(color);
    expect(el.name).toBe("a:hslClr");
    expect(el.attrs.hue).toBe("7200000");
    expect(el.attrs.sat).toBe("50000");
    expect(el.attrs.lum).toBe("25000");
  });

  it("serializes scrgb color", () => {
    const color: Color = {
      spec: { type: "scrgb", red: pct(100), green: pct(50), blue: pct(0) },
    };
    const el = serializeColor(color);
    expect(el.name).toBe("a:scrgbClr");
    expect(el.attrs.r).toBe("100000");
    expect(el.attrs.g).toBe("50000");
    expect(el.attrs.b).toBe("0");
  });

  it("round-trips scrgb color through parser", () => {
    const color: Color = {
      spec: { type: "scrgb", red: pct(75), green: pct(25), blue: pct(100) },
    };
    const serialized = serializeColor(color);
    const parsed = parseColor(serialized);

    expect(parsed).toBeDefined();
    expect(parsed?.spec.type).toBe("scrgb");
    if (parsed?.spec.type === "scrgb") {
      expect(parsed.spec.red).toBe(75);
      expect(parsed.spec.green).toBe(25);
      expect(parsed.spec.blue).toBe(100);
    }
  });

  it("serializes color transforms as child elements", () => {
    const color: Color = {
      spec: { type: "srgb", value: "112233" },
      transform: {
        alpha: pct(50),
        shade: pct(20),
        tint: pct(30),
        lumMod: pct(70),
        lumOff: pct(10),
      },
    };

    const el = serializeColor(color);
    expect(getChild(el, "a:alpha")?.attrs.val).toBe("50000");
    expect(getChild(el, "a:shade")?.attrs.val).toBe("20000");
    expect(getChild(el, "a:tint")?.attrs.val).toBe("30000");
    expect(getChild(el, "a:lumMod")?.attrs.val).toBe("70000");
    expect(getChild(el, "a:lumOff")?.attrs.val).toBe("10000");
  });

  it("round-trips through parser", () => {
    const color: Color = {
      spec: { type: "srgb", value: "112233" },
      transform: {
        alpha: pct(50),
        shade: pct(20),
        hue: deg(30),
        inv: true,
      },
    };

    const el = serializeColor(color);
    const parsed = parseColor(el);
    expect(parsed).toEqual(color);
  });

  // =========================================================================
  // Missing color type coverage
  // =========================================================================

  it("serializes system color without lastColor", () => {
    const color: Color = { spec: { type: "system", value: "windowText" } };
    const el = serializeColor(color);
    expect(el.name).toBe("a:sysClr");
    expect(el.attrs.val).toBe("windowText");
    expect(el.attrs.lastClr).toBeUndefined();
  });

  it("serializes system color with lastColor (uppercased)", () => {
    const color: Color = {
      spec: { type: "system", value: "window", lastColor: "abcdef" },
    };
    const el = serializeColor(color);
    expect(el.name).toBe("a:sysClr");
    expect(el.attrs.val).toBe("window");
    expect(el.attrs.lastClr).toBe("ABCDEF");
  });

  it("serializes preset color", () => {
    const color: Color = { spec: { type: "preset", value: "red" } };
    const el = serializeColor(color);
    expect(el.name).toBe("a:prstClr");
    expect(el.attrs.val).toBe("red");
  });

  // =========================================================================
  // Missing transform coverage
  // =========================================================================

  it("serializes alphaMod and alphaOff transforms", () => {
    const color: Color = {
      spec: { type: "srgb", value: "000000" },
      transform: { alphaMod: pct(80), alphaOff: pct(-20) },
    };
    const el = serializeColor(color);
    expect(getChild(el, "a:alphaMod")?.attrs.val).toBe("80000");
    expect(getChild(el, "a:alphaOff")?.attrs.val).toBe("-20000");
  });

  it("serializes hue, hueMod, hueOff transforms", () => {
    const color: Color = {
      spec: { type: "srgb", value: "000000" },
      transform: { hue: deg(180), hueMod: pct(50), hueOff: deg(45) },
    };
    const el = serializeColor(color);
    expect(getChild(el, "a:hue")?.attrs.val).toBe("10800000");
    expect(getChild(el, "a:hueMod")?.attrs.val).toBe("50000");
    expect(getChild(el, "a:hueOff")?.attrs.val).toBe("2700000");
  });

  it("serializes sat, satMod, satOff transforms", () => {
    const color: Color = {
      spec: { type: "srgb", value: "000000" },
      transform: { sat: pct(100), satMod: pct(120), satOff: pct(-10) },
    };
    const el = serializeColor(color);
    expect(getChild(el, "a:sat")?.attrs.val).toBe("100000");
    expect(getChild(el, "a:satMod")?.attrs.val).toBe("120000");
    expect(getChild(el, "a:satOff")?.attrs.val).toBe("-10000");
  });

  it("serializes gamma and invGamma boolean elements", () => {
    const color: Color = {
      spec: { type: "srgb", value: "000000" },
      transform: { gamma: true, invGamma: true },
    };
    const el = serializeColor(color);
    expect(getChild(el, "a:gamma")).toBeDefined();
    expect(getChild(el, "a:invGamma")).toBeDefined();
  });

  it("serializes green, greenMod, greenOff transforms", () => {
    const color: Color = {
      spec: { type: "srgb", value: "000000" },
      transform: { green: pct(60), greenMod: pct(110), greenOff: pct(5) },
    };
    const el = serializeColor(color);
    expect(getChild(el, "a:green")?.attrs.val).toBe("60000");
    expect(getChild(el, "a:greenMod")?.attrs.val).toBe("110000");
    expect(getChild(el, "a:greenOff")?.attrs.val).toBe("5000");
  });

  it("serializes redMod and redOff transforms", () => {
    const color: Color = {
      spec: { type: "srgb", value: "000000" },
      transform: { redMod: pct(90), redOff: pct(-15) },
    };
    const el = serializeColor(color);
    expect(getChild(el, "a:redMod")?.attrs.val).toBe("90000");
    expect(getChild(el, "a:redOff")?.attrs.val).toBe("-15000");
  });

  it("serializes blueMod and blueOff transforms", () => {
    const color: Color = {
      spec: { type: "srgb", value: "000000" },
      transform: { blueMod: pct(75), blueOff: pct(25) },
    };
    const el = serializeColor(color);
    expect(getChild(el, "a:blueMod")?.attrs.val).toBe("75000");
    expect(getChild(el, "a:blueOff")?.attrs.val).toBe("25000");
  });

  it("serializes comp, inv, gray boolean elements", () => {
    const color: Color = {
      spec: { type: "srgb", value: "000000" },
      transform: { comp: true, inv: true, gray: true },
    };
    const el = serializeColor(color);
    expect(getChild(el, "a:comp")).toBeDefined();
    expect(getChild(el, "a:inv")).toBeDefined();
    expect(getChild(el, "a:gray")).toBeDefined();
  });

  it("produces no child elements when transform is undefined", () => {
    const color: Color = { spec: { type: "srgb", value: "FF0000" } };
    const el = serializeColor(color);
    expect(el.children).toHaveLength(0);
  });

  it("serializes combined transform with many properties", () => {
    const color: Color = {
      spec: { type: "scheme", value: "accent2" },
      transform: {
        alpha: pct(90),
        alphaMod: pct(50),
        hue: deg(270),
        satMod: pct(150),
        lumOff: pct(10),
        shade: pct(80),
        tint: pct(60),
        gamma: true,
        greenMod: pct(100),
        redOff: pct(-5),
        blueOff: pct(15),
        comp: true,
        gray: true,
      },
    };
    const el = serializeColor(color);
    expect(el.name).toBe("a:schemeClr");
    expect(getChild(el, "a:alpha")?.attrs.val).toBe("90000");
    expect(getChild(el, "a:alphaMod")?.attrs.val).toBe("50000");
    expect(getChild(el, "a:hue")?.attrs.val).toBe("16200000");
    expect(getChild(el, "a:satMod")?.attrs.val).toBe("150000");
    expect(getChild(el, "a:lumOff")?.attrs.val).toBe("10000");
    expect(getChild(el, "a:shade")?.attrs.val).toBe("80000");
    expect(getChild(el, "a:tint")?.attrs.val).toBe("60000");
    expect(getChild(el, "a:gamma")).toBeDefined();
    expect(getChild(el, "a:greenMod")?.attrs.val).toBe("100000");
    expect(getChild(el, "a:redOff")?.attrs.val).toBe("-5000");
    expect(getChild(el, "a:blueOff")?.attrs.val).toBe("15000");
    expect(getChild(el, "a:comp")).toBeDefined();
    expect(getChild(el, "a:gray")).toBeDefined();
  });
});
