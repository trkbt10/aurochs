/**
 * @file Line serializer tests
 */

import { getChild } from "@oxen/xml";
import { pct, px } from "@oxen/ooxml/domain/units";
import type { Line } from "../../domain";
import { parseLine } from "../../parser/graphics/line-parser";
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
});
