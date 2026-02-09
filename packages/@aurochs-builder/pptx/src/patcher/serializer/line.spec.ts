/**
 * @file Line serializer tests
 */

import { getChild, getChildren } from "@aurochs/xml";
import { deg, pct, px } from "@aurochs-office/drawing-ml/domain/units";
import type { Line } from "@aurochs-office/pptx/domain";
import { parseLine } from "@aurochs-office/pptx/parser/graphics/line-parser";
import { serializeLine } from "./line";

describe("serializeLine", () => {
  it("serializes width and fill", () => {
    const line: Line = {
      width: px(2),
      cap: "flat",
      compound: "sng",
      alignment: "ctr",
      fill: { type: "solidFill", color: { spec: { type: "srgb", value: "000000" } } },
      dash: "solid",
      join: "round",
    };

    const el = serializeLine(line);
    expect(el.name).toBe("a:ln");
    expect(el.attrs.w).toBe("19050");
    expect(getChild(getChild(el, "a:solidFill")!, "a:srgbClr")?.attrs.val).toBe("000000");
  });

  it("serializes dash style (preset)", () => {
    const line: Line = {
      width: px(1),
      cap: "flat",
      compound: "sng",
      alignment: "ctr",
      fill: { type: "noFill" },
      dash: "dashDot",
      join: "round",
    };

    const el = serializeLine(line);
    expect(getChild(el, "a:prstDash")?.attrs.val).toBe("dashDot");
  });

  it("serializes cap style", () => {
    const line: Line = {
      width: px(1),
      cap: "square",
      compound: "sng",
      alignment: "ctr",
      fill: { type: "noFill" },
      dash: "solid",
      join: "round",
    };

    const el = serializeLine(line);
    expect(el.attrs.cap).toBe("sq");
  });

  it("serializes compound type", () => {
    const line: Line = {
      width: px(1),
      cap: "flat",
      compound: "dbl",
      alignment: "ctr",
      fill: { type: "noFill" },
      dash: "solid",
      join: "round",
    };

    const el = serializeLine(line);
    expect(el.attrs.cmpd).toBe("dbl");
  });

  it("serializes join style and miter limit", () => {
    const line: Line = {
      width: px(1),
      cap: "flat",
      compound: "sng",
      alignment: "ctr",
      fill: { type: "noFill" },
      dash: "solid",
      join: "miter",
      miterLimit: pct(40),
    };

    const el = serializeLine(line);
    expect(getChild(el, "a:miter")?.attrs.lim).toBe("40000");
  });

  it("round-trips through parser", () => {
    const line: Line = {
      width: px(2),
      cap: "round",
      compound: "dbl",
      alignment: "ctr",
      fill: { type: "solidFill", color: { spec: { type: "srgb", value: "112233" } } },
      dash: "dashDot",
      join: "round",
    };

    const el = serializeLine(line);
    const parsed = parseLine(el);
    expect(parsed).toEqual(line);
  });

  it("serializes cap round as rnd", () => {
    const line: Line = {
      width: px(1),
      cap: "round",
      compound: "sng",
      alignment: "ctr",
      fill: { type: "noFill" },
      dash: "solid",
      join: "round",
    };

    const el = serializeLine(line);
    expect(el.attrs.cap).toBe("rnd");
  });

  it("serializes custom dash pattern", () => {
    const line: Line = {
      width: px(1),
      cap: "flat",
      compound: "sng",
      alignment: "ctr",
      fill: { type: "noFill" },
      dash: {
        dashes: [
          { dashLength: pct(200), spaceLength: pct(100) },
          { dashLength: pct(50), spaceLength: pct(75) },
        ],
      },
      join: "round",
    };

    const el = serializeLine(line);
    const custDash = getChild(el, "a:custDash");
    expect(custDash).toBeDefined();
    const dsElements = getChildren(custDash!, "a:ds");
    expect(dsElements).toHaveLength(2);
    expect(dsElements[0].attrs.d).toBe("200000");
    expect(dsElements[0].attrs.sp).toBe("100000");
    expect(dsElements[1].attrs.d).toBe("50000");
    expect(dsElements[1].attrs.sp).toBe("75000");
  });

  it("serializes headEnd", () => {
    const line: Line = {
      width: px(1),
      cap: "flat",
      compound: "sng",
      alignment: "ctr",
      fill: { type: "noFill" },
      dash: "solid",
      join: "round",
      headEnd: { type: "triangle", width: "med", length: "lg" },
    };

    const el = serializeLine(line);
    const headEnd = getChild(el, "a:headEnd");
    expect(headEnd).toBeDefined();
    expect(headEnd!.attrs.type).toBe("triangle");
    expect(headEnd!.attrs.w).toBe("med");
    expect(headEnd!.attrs.len).toBe("lg");
  });

  it("serializes tailEnd", () => {
    const line: Line = {
      width: px(1),
      cap: "flat",
      compound: "sng",
      alignment: "ctr",
      fill: { type: "noFill" },
      dash: "solid",
      join: "round",
      tailEnd: { type: "arrow", width: "lg", length: "sm" },
    };

    const el = serializeLine(line);
    const tailEnd = getChild(el, "a:tailEnd");
    expect(tailEnd).toBeDefined();
    expect(tailEnd!.attrs.type).toBe("arrow");
    expect(tailEnd!.attrs.w).toBe("lg");
    expect(tailEnd!.attrs.len).toBe("sm");
  });

  it("serializes both headEnd and tailEnd", () => {
    const line: Line = {
      width: px(1),
      cap: "flat",
      compound: "sng",
      alignment: "ctr",
      fill: { type: "noFill" },
      dash: "solid",
      join: "round",
      headEnd: { type: "diamond", width: "sm", length: "sm" },
      tailEnd: { type: "stealth", width: "lg", length: "med" },
    };

    const el = serializeLine(line);
    const headEnd = getChild(el, "a:headEnd");
    const tailEnd = getChild(el, "a:tailEnd");
    expect(headEnd).toBeDefined();
    expect(tailEnd).toBeDefined();
    expect(headEnd!.attrs.type).toBe("diamond");
    expect(tailEnd!.attrs.type).toBe("stealth");
  });

  it("serializes join bevel", () => {
    const line: Line = {
      width: px(1),
      cap: "flat",
      compound: "sng",
      alignment: "ctr",
      fill: { type: "noFill" },
      dash: "solid",
      join: "bevel",
    };

    const el = serializeLine(line);
    expect(getChild(el, "a:bevel")).toBeDefined();
    expect(getChild(el, "a:round")).toBeUndefined();
    expect(getChild(el, "a:miter")).toBeUndefined();
  });

  it("serializes join miter without miterLimit", () => {
    const line: Line = {
      width: px(1),
      cap: "flat",
      compound: "sng",
      alignment: "ctr",
      fill: { type: "noFill" },
      dash: "solid",
      join: "miter",
    };

    const el = serializeLine(line);
    const miter = getChild(el, "a:miter");
    expect(miter).toBeDefined();
    expect(miter!.attrs.lim).toBeUndefined();
  });

  it("serializes line with noFill", () => {
    const line: Line = {
      width: px(1),
      cap: "flat",
      compound: "sng",
      alignment: "ctr",
      fill: { type: "noFill" },
      dash: "solid",
      join: "round",
    };

    const el = serializeLine(line);
    expect(getChild(el, "a:noFill")).toBeDefined();
    expect(getChild(el, "a:solidFill")).toBeUndefined();
  });

  it("serializes line with gradient fill", () => {
    const line: Line = {
      width: px(1),
      cap: "flat",
      compound: "sng",
      alignment: "ctr",
      fill: {
        type: "gradientFill",
        rotWithShape: true,
        stops: [
          { position: pct(0), color: { spec: { type: "srgb", value: "FF0000" } } },
          { position: pct(100), color: { spec: { type: "srgb", value: "0000FF" } } },
        ],
        linear: { angle: deg(90), scaled: false },
      },
      dash: "solid",
      join: "round",
    };

    const el = serializeLine(line);
    const gradFill = getChild(el, "a:gradFill");
    expect(gradFill).toBeDefined();
    const gsLst = getChild(gradFill!, "a:gsLst");
    expect(gsLst).toBeDefined();
    const stops = getChildren(gsLst!, "a:gs");
    expect(stops).toHaveLength(2);
    expect(stops[0].attrs.pos).toBe("0");
    expect(stops[1].attrs.pos).toBe("100000");
    const lin = getChild(gradFill!, "a:lin");
    expect(lin).toBeDefined();
    expect(lin!.attrs.scaled).toBe("0");
  });
});
