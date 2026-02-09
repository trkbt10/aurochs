/**
 * @file Fill serializer tests
 */

import { getChild, getChildren } from "@aurochs/xml";
import { deg, pct, px } from "@aurochs-office/drawing-ml/domain/units";
import type { BlipEffects, Fill } from "@aurochs-office/pptx/domain";
import { parseFill } from "@aurochs-office/pptx/parser/graphics/fill-parser";
import { serializeFill, serializeBlipEffects } from "./fill";

describe("serializeFill", () => {
  it("serializes solidFill", () => {
    const fill: Fill = {
      type: "solidFill",
      color: { spec: { type: "srgb", value: "FF0000" } },
    };

    const el = serializeFill(fill);
    expect(el.name).toBe("a:solidFill");
    expect(getChild(el, "a:srgbClr")?.attrs.val).toBe("FF0000");
  });

  it("serializes noFill", () => {
    const fill: Fill = { type: "noFill" };
    const el = serializeFill(fill);
    expect(el.name).toBe("a:noFill");
  });

  it("serializes gradFill (linear)", () => {
    const fill: Fill = {
      type: "gradientFill",
      rotWithShape: true,
      stops: [
        { position: pct(0), color: { spec: { type: "srgb", value: "FF0000" } } },
        { position: pct(100), color: { spec: { type: "srgb", value: "0000FF" } } },
      ],
      linear: { angle: deg(90), scaled: true },
    };

    const el = serializeFill(fill);
    expect(el.name).toBe("a:gradFill");
    expect(getChild(el, "a:lin")?.attrs.ang).toBe("5400000");

    const gsLst = getChild(el, "a:gsLst");
    expect(gsLst).toBeDefined();
    const stops = getChildren(gsLst!, "a:gs");
    expect(stops).toHaveLength(2);
    expect(stops[0].attrs.pos).toBe("0");
    expect(stops[1].attrs.pos).toBe("100000");
  });

  it("serializes gradFill (path/circle)", () => {
    const fill: Fill = {
      type: "gradientFill",
      rotWithShape: false,
      stops: [
        { position: pct(0), color: { spec: { type: "srgb", value: "FF0000" } } },
        { position: pct(100), color: { spec: { type: "srgb", value: "0000FF" } } },
      ],
      path: { path: "circle" },
    };

    const el = serializeFill(fill);
    expect(el.name).toBe("a:gradFill");
    expect(el.attrs.rotWithShape).toBe("0");
    expect(getChild(el, "a:path")?.attrs.path).toBe("circle");
  });

  it("serializes pattFill", () => {
    const fill: Fill = {
      type: "patternFill",
      preset: "pct10",
      foregroundColor: { spec: { type: "srgb", value: "000000" } },
      backgroundColor: { spec: { type: "srgb", value: "FFFFFF" } },
    };

    const el = serializeFill(fill);
    expect(el.name).toBe("a:pattFill");
    expect(el.attrs.prst).toBe("pct10");
    expect(getChild(getChild(el, "a:fgClr")!, "a:srgbClr")?.attrs.val).toBe("000000");
    expect(getChild(getChild(el, "a:bgClr")!, "a:srgbClr")?.attrs.val).toBe("FFFFFF");
  });

  it("serializes blipFill", () => {
    const fill: Fill = {
      type: "blipFill",
      resourceId: "rId2",
      relationshipType: "embed",
      rotWithShape: true,
      stretch: {},
      sourceRect: { left: pct(0), top: pct(0), right: pct(0), bottom: pct(0) },
      tile: {
        tx: px(10),
        ty: px(20),
        sx: pct(100),
        sy: pct(100),
        flip: "none",
        alignment: "ctr",
      },
    };

    const el = serializeFill(fill);
    expect(el.name).toBe("a:blipFill");
    expect(getChild(el, "a:blip")?.attrs["r:embed"]).toBe("rId2");
    expect(getChild(el, "a:srcRect")).toBeDefined();
    expect(getChild(el, "a:stretch")).toBeDefined();
    expect(getChild(el, "a:tile")?.attrs.tx).toBe("95250");
    expect(getChild(el, "a:tile")?.attrs.ty).toBe("190500");
  });

  it("serializes blipFill with r:link", () => {
    const fill: Fill = {
      type: "blipFill",
      resourceId: "rId2",
      relationshipType: "link",
      rotWithShape: true,
    };

    const el = serializeFill(fill);
    expect(el.name).toBe("a:blipFill");
    expect(getChild(el, "a:blip")?.attrs["r:link"]).toBe("rId2");
    expect(getChild(el, "a:blip")?.attrs["r:embed"]).toBeUndefined();
  });

  it("throws for blipFill with data: resourceId (Phase 7 required)", () => {
    const fill: Fill = {
      type: "blipFill",
      resourceId: "data:image/png;base64,AA==",
      relationshipType: "embed",
      rotWithShape: true,
    };

    expect(() => serializeFill(fill)).toThrow("serializeBlipFill: data: resourceId requires Phase 7 media embedding");
  });

  it("serializes grpFill", () => {
    const fill: Fill = { type: "groupFill" };
    const el = serializeFill(fill);
    expect(el.name).toBe("a:grpFill");
  });

  it("round-trips through parser (blipFill with stretch)", () => {
    const fill: Fill = {
      type: "blipFill",
      resourceId: "rId2",
      relationshipType: "embed",
      rotWithShape: true,
      stretch: {},
    };

    const el = serializeFill(fill);
    const parsed = parseFill(el);
    expect(parsed).toEqual(fill);
  });

  it("serializes gradFill with tileRect", () => {
    const fill: Fill = {
      type: "gradientFill",
      rotWithShape: true,
      stops: [
        { position: pct(0), color: { spec: { type: "srgb", value: "FF0000" } } },
        { position: pct(100), color: { spec: { type: "srgb", value: "0000FF" } } },
      ],
      linear: { angle: deg(90), scaled: true },
      tileRect: { left: pct(10), top: pct(20), right: pct(30), bottom: pct(40) },
    };

    const el = serializeFill(fill);
    const tileRect = getChild(el, "a:tileRect");
    expect(tileRect).toBeDefined();
    expect(tileRect!.attrs.l).toBe("10000");
    expect(tileRect!.attrs.t).toBe("20000");
    expect(tileRect!.attrs.r).toBe("30000");
    expect(tileRect!.attrs.b).toBe("40000");
  });

  it("serializes gradFill path with fillToRect", () => {
    const fill: Fill = {
      type: "gradientFill",
      rotWithShape: true,
      stops: [
        { position: pct(0), color: { spec: { type: "srgb", value: "FF0000" } } },
        { position: pct(100), color: { spec: { type: "srgb", value: "0000FF" } } },
      ],
      path: {
        path: "rect",
        fillToRect: { left: pct(10), top: pct(20), right: pct(30), bottom: pct(40) },
      },
    };

    const el = serializeFill(fill);
    const pathEl = getChild(el, "a:path");
    expect(pathEl).toBeDefined();
    expect(pathEl!.attrs.path).toBe("rect");
    const fillToRect = getChild(pathEl!, "a:fillToRect");
    expect(fillToRect).toBeDefined();
    expect(fillToRect!.attrs.l).toBe("10000");
    expect(fillToRect!.attrs.t).toBe("20000");
    expect(fillToRect!.attrs.r).toBe("30000");
    expect(fillToRect!.attrs.b).toBe("40000");
  });

  it("serializes blipFill with compressionState", () => {
    const fill: Fill = {
      type: "blipFill",
      resourceId: "rId3",
      relationshipType: "embed",
      rotWithShape: true,
      compressionState: "print",
    };

    const el = serializeFill(fill);
    const blip = getChild(el, "a:blip");
    expect(blip).toBeDefined();
    expect(blip!.attrs.cstate).toBe("print");
  });

  it("serializes blipFill with dpi", () => {
    const fill: Fill = {
      type: "blipFill",
      resourceId: "rId3",
      relationshipType: "embed",
      rotWithShape: true,
      dpi: 300,
    };

    const el = serializeFill(fill);
    expect(el.attrs.dpi).toBe("300");
  });

  it("serializes blipFill stretch with fillRect", () => {
    const fill: Fill = {
      type: "blipFill",
      resourceId: "rId2",
      relationshipType: "embed",
      rotWithShape: true,
      stretch: {
        fillRect: { left: pct(10), top: pct(20), right: pct(30), bottom: pct(40) },
      },
    };

    const el = serializeFill(fill);
    const stretch = getChild(el, "a:stretch");
    expect(stretch).toBeDefined();
    const fillRect = getChild(stretch!, "a:fillRect");
    expect(fillRect).toBeDefined();
    expect(fillRect!.attrs.l).toBe("10000");
    expect(fillRect!.attrs.t).toBe("20000");
    expect(fillRect!.attrs.r).toBe("30000");
    expect(fillRect!.attrs.b).toBe("40000");
  });

  it("serializes blipFill stretch without fillRect as empty element", () => {
    const fill: Fill = {
      type: "blipFill",
      resourceId: "rId2",
      relationshipType: "embed",
      rotWithShape: true,
      stretch: {},
    };

    const el = serializeFill(fill);
    const stretch = getChild(el, "a:stretch");
    expect(stretch).toBeDefined();
    expect(stretch!.children).toHaveLength(0);
  });
});

describe("serializeBlipEffects", () => {
  it("returns empty array for empty effects", () => {
    const result = serializeBlipEffects({});
    expect(result).toEqual([]);
  });

  it("serializes alphaBiLevel with threshold", () => {
    const effects: BlipEffects = {
      alphaBiLevel: { threshold: pct(50) },
    };

    const result = serializeBlipEffects(effects);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("a:alphaBiLevel");
    expect(result[0].attrs.thresh).toBe("50000");
  });

  it("serializes alphaModFix with amount", () => {
    const effects: BlipEffects = {
      alphaModFix: { amount: pct(75) },
    };

    const result = serializeBlipEffects(effects);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("a:alphaModFix");
    expect(result[0].attrs.amt).toBe("75000");
  });

  it("serializes blur with radius and grow", () => {
    const effects: BlipEffects = {
      blur: { radius: px(5), grow: false },
    };

    const result = serializeBlipEffects(effects);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("a:blur");
    expect(result[0].attrs.rad).toBe("47625");
    expect(result[0].attrs.grow).toBe("0");
  });

  it("serializes colorChange with from/to colors", () => {
    const effects: BlipEffects = {
      colorChange: {
        from: { spec: { type: "srgb", value: "FF0000" } },
        to: { spec: { type: "srgb", value: "00FF00" } },
        useAlpha: true,
      },
    };

    const result = serializeBlipEffects(effects);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("a:clrChange");
    expect(result[0].attrs.useA).toBe("1");
    const clrFrom = getChild(result[0], "a:clrFrom");
    const clrTo = getChild(result[0], "a:clrTo");
    expect(clrFrom).toBeDefined();
    expect(clrTo).toBeDefined();
    expect(getChild(clrFrom!, "a:srgbClr")?.attrs.val).toBe("FF0000");
    expect(getChild(clrTo!, "a:srgbClr")?.attrs.val).toBe("00FF00");
  });

  it("serializes duotone with 2 colors", () => {
    const effects: BlipEffects = {
      duotone: {
        colors: [
          { spec: { type: "srgb", value: "000000" } },
          { spec: { type: "srgb", value: "FFFFFF" } },
        ],
      },
    };

    const result = serializeBlipEffects(effects);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("a:duotone");
    expect(result[0].children).toHaveLength(2);
    expect(getChild(result[0], "a:srgbClr")).toBeDefined();
  });

  it("serializes hsl with hue/sat/lum", () => {
    const effects: BlipEffects = {
      hsl: { hue: deg(120), saturation: pct(50), luminance: pct(60) },
    };

    const result = serializeBlipEffects(effects);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("a:hsl");
    expect(result[0].attrs.hue).toBe("7200000");
    expect(result[0].attrs.sat).toBe("50000");
    expect(result[0].attrs.lum).toBe("60000");
  });

  it("serializes luminance with brightness/contrast", () => {
    const effects: BlipEffects = {
      luminance: { brightness: pct(10), contrast: pct(20) },
    };

    const result = serializeBlipEffects(effects);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("a:lum");
    expect(result[0].attrs.bright).toBe("10000");
    expect(result[0].attrs.contrast).toBe("20000");
  });

  it("serializes tint with hue/amount", () => {
    const effects: BlipEffects = {
      tint: { hue: deg(120), amount: pct(50) },
    };

    const result = serializeBlipEffects(effects);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("a:tint");
    expect(result[0].attrs.hue).toBe("7200000");
    expect(result[0].attrs.amt).toBe("50000");
  });

  it("serializes grayscale", () => {
    const effects: BlipEffects = {
      grayscale: true,
    };

    const result = serializeBlipEffects(effects);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("a:grayscl");
  });

  it("serializes alphaCeiling", () => {
    const effects: BlipEffects = { alphaCeiling: true };

    const result = serializeBlipEffects(effects);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("a:alphaCeiling");
  });

  it("serializes alphaFloor", () => {
    const effects: BlipEffects = { alphaFloor: true };

    const result = serializeBlipEffects(effects);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("a:alphaFloor");
  });

  it("serializes alphaInv", () => {
    const effects: BlipEffects = { alphaInv: true };

    const result = serializeBlipEffects(effects);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("a:alphaInv");
  });

  it("serializes alphaMod", () => {
    const effects: BlipEffects = { alphaMod: true };

    const result = serializeBlipEffects(effects);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("a:alphaMod");
  });

  it("serializes alphaRepl with alpha", () => {
    const effects: BlipEffects = { alphaRepl: { alpha: pct(80) } };

    const result = serializeBlipEffects(effects);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("a:alphaRepl");
    expect(result[0].attrs.a).toBe("80000");
  });

  it("serializes biLevel with threshold", () => {
    const effects: BlipEffects = { biLevel: { threshold: pct(50) } };

    const result = serializeBlipEffects(effects);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("a:biLevel");
    expect(result[0].attrs.thresh).toBe("50000");
  });

  it("serializes colorReplace with color", () => {
    const effects: BlipEffects = {
      colorReplace: { color: { spec: { type: "srgb", value: "00FF00" } } },
    };

    const result = serializeBlipEffects(effects);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("a:clrRepl");
    expect(getChild(result[0], "a:srgbClr")?.attrs.val).toBe("00FF00");
  });

  it("serializes multiple effects at once", () => {
    const effects: BlipEffects = {
      alphaBiLevel: { threshold: pct(50) },
      grayscale: true,
      luminance: { brightness: pct(10), contrast: pct(20) },
    };

    const result = serializeBlipEffects(effects);
    expect(result).toHaveLength(3);
    const names = result.map((el) => el.name);
    expect(names).toContain("a:alphaBiLevel");
    expect(names).toContain("a:grayscl");
    expect(names).toContain("a:lum");
  });
});
