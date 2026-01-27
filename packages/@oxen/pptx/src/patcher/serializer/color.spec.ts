/**
 * @file Color serializer tests
 */

import { getChild } from "@oxen/xml";
import { deg, pct } from "@oxen/ooxml/domain/units";
import type { Color } from "@oxen/ooxml/domain/color";
import { parseColor } from "../../parser/graphics/color-parser";
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
});
