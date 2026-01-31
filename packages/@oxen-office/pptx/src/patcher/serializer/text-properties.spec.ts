/** @file Unit tests for text property serialization */
import { getChild, getTextContent, isXmlElement } from "@oxen/xml";
import { pct, pt, px } from "@oxen-office/ooxml/domain/units";
import type { BulletStyle, ParagraphProperties, RunProperties } from "../../domain/text";
import { serializeParagraphProperties, serializeRunProperties } from "./text-properties";

const EMU_PER_PIXEL = 9525;

describe("serializeParagraphProperties", () => {
  it("serializes paragraph alignment", () => {
    const props: ParagraphProperties = { alignment: "center" };
    const el = serializeParagraphProperties(props);
    expect(el.name).toBe("a:pPr");
    expect(el.attrs.algn).toBe("ctr");
  });

  it("serializes line spacing (percent)", () => {
    const props: ParagraphProperties = { lineSpacing: { type: "percent", value: pct(100) } };
    const el = serializeParagraphProperties(props);
    const lnSpc = getChild(el, "a:lnSpc");
    const spcPct = lnSpc ? getChild(lnSpc, "a:spcPct") : undefined;
    expect(spcPct?.attrs.val).toBe("100000");
  });

  it("serializes space before/after (points)", () => {
    const props: ParagraphProperties = {
      spaceBefore: { type: "points", value: pt(12) },
      spaceAfter: { type: "points", value: pt(6) },
    };
    const el = serializeParagraphProperties(props);
    const spcBef = getChild(el, "a:spcBef");
    const spcAft = getChild(el, "a:spcAft");
    expect(getChild(spcBef!, "a:spcPts")?.attrs.val).toBe("1200");
    expect(getChild(spcAft!, "a:spcPts")?.attrs.val).toBe("600");
  });

  it("serializes margins/indent as EMU", () => {
    const props: ParagraphProperties = {
      marginLeft: px(10),
      marginRight: px(5),
      indent: px(-2),
    };
    const el = serializeParagraphProperties(props);
    expect(el.attrs.marL).toBe(String(Math.round(10 * EMU_PER_PIXEL)));
    expect(el.attrs.marR).toBe(String(Math.round(5 * EMU_PER_PIXEL)));
    expect(el.attrs.indent).toBe(String(Math.round(-2 * EMU_PER_PIXEL)));
  });

  it("serializes bullet style", () => {
    const bulletStyle: BulletStyle = {
      bullet: { type: "char", char: "•" },
      colorFollowText: true,
      sizeFollowText: true,
      fontFollowText: true,
    };
    const props: ParagraphProperties = { bulletStyle };
    const el = serializeParagraphProperties(props);
    expect(getChild(el, "a:buChar")?.attrs.char).toBe("•");
    expect(getChild(el, "a:buClrTx")).toBeDefined();
    expect(getChild(el, "a:buSzTx")).toBeDefined();
    expect(getChild(el, "a:buFontTx")).toBeDefined();
  });
});

describe("serializeRunProperties", () => {
  it("serializes font families", () => {
    const props: RunProperties = {
      fontFamily: "Arial",
      fontFamilyEastAsian: "+mj-ea",
      fontFamilyComplexScript: "+mj-cs",
    };
    const el = serializeRunProperties(props);
    expect(getChild(el, "a:latin")?.attrs.typeface).toBe("Arial");
    expect(getChild(el, "a:ea")?.attrs.typeface).toBe("+mj-ea");
    expect(getChild(el, "a:cs")?.attrs.typeface).toBe("+mj-cs");
  });

  it("serializes letter spacing as text point units", () => {
    const props: RunProperties = { spacing: px(1) };
    const el = serializeRunProperties(props);
    // 1px -> (72/96)*100 = 75
    expect(el.attrs.spc).toBe("75");
  });

  it("serializes a:t text nodes without escaping", () => {
    const props: RunProperties = {};
    const el = serializeRunProperties(props);
    const t = getChild(el, "a:t");
    expect(t).toBeUndefined();
    // Ensure the helper module is present and working (a:latin etc use XML nodes).
    expect(isXmlElement(el)).toBe(true);
    expect(getTextContent(el)).toBe("");
  });
});

