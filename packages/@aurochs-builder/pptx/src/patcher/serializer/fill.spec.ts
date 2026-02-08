/**
 * @file Fill serializer tests
 */

import { getChild, getChildren } from "@aurochs/xml";
import { deg, pct, px } from "@aurochs-office/drawing-ml/domain/units";
import type { Fill } from "@aurochs-office/pptx/domain";
import { parseFill } from "@aurochs-office/pptx/parser/graphics/fill-parser";
import { serializeFill } from "./fill";

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
});
