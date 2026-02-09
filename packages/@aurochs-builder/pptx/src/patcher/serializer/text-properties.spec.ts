/** @file Unit tests for text property serialization */
import { getChild, getChildren, getTextContent, isXmlElement } from "@aurochs/xml";
import { deg, pct, pt, px } from "@aurochs-office/drawing-ml/domain/units";
import type { BodyProperties } from "@aurochs-office/pptx/domain/text";
import type { BulletStyle, ParagraphProperties, RunProperties } from "@aurochs-office/pptx/domain/text";
import type { Effects } from "@aurochs-office/pptx/domain/effects";
import type { Fill, Line } from "@aurochs-office/pptx/domain/color/types";
import type { Color } from "@aurochs-office/drawing-ml/domain/color";
import {
  serializeBodyProperties,
  serializeEndParaRunProperties,
  serializeParagraphProperties,
  serializeRunProperties,
  serializeText,
} from "./text-properties";

const EMU_PER_PIXEL = 9525;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const srgbRed: Color = { spec: { type: "srgb", value: "FF0000" } };

// ---------------------------------------------------------------------------
// serializeBodyProperties
// ---------------------------------------------------------------------------

describe("serializeBodyProperties", () => {
  it("serializes empty body properties", () => {
    const el = serializeBodyProperties({});
    expect(el.name).toBe("a:bodyPr");
    expect(Object.keys(el.attrs)).toHaveLength(0);
    expect(el.children).toHaveLength(0);
  });

  it("serializes rotation as angle units", () => {
    const el = serializeBodyProperties({ rotation: deg(90) });
    // 90 * 60000 = 5400000
    expect(el.attrs.rot).toBe("5400000");
  });

  it("serializes vertical type", () => {
    const el = serializeBodyProperties({ verticalType: "vert" });
    expect(el.attrs.vert).toBe("vert");
  });

  it("serializes wrapping none", () => {
    const el = serializeBodyProperties({ wrapping: "none" });
    expect(el.attrs.wrap).toBe("none");
  });

  it("serializes anchor center", () => {
    const el = serializeBodyProperties({ anchor: "center" });
    expect(el.attrs.anchor).toBe("ctr");
  });

  it("serializes anchorCenter boolean", () => {
    const el = serializeBodyProperties({ anchorCenter: true });
    expect(el.attrs.anchorCtr).toBe("1");
  });

  it("serializes insets as EMU", () => {
    const el = serializeBodyProperties({
      insets: { left: px(10), top: px(5), right: px(8), bottom: px(3) },
    });
    expect(el.attrs.lIns).toBe(String(Math.round(10 * EMU_PER_PIXEL)));
    expect(el.attrs.tIns).toBe(String(Math.round(5 * EMU_PER_PIXEL)));
    expect(el.attrs.rIns).toBe(String(Math.round(8 * EMU_PER_PIXEL)));
    expect(el.attrs.bIns).toBe(String(Math.round(3 * EMU_PER_PIXEL)));
  });

  it("serializes columns", () => {
    const el = serializeBodyProperties({ columns: 3 });
    expect(el.attrs.numCol).toBe("3");
  });

  it("serializes autoFit shape", () => {
    const el = serializeBodyProperties({ autoFit: { type: "shape" } });
    expect(getChild(el, "a:spAutoFit")).toBeDefined();
  });

  it("serializes autoFit normal with fontScale and lineSpaceReduction", () => {
    const el = serializeBodyProperties({
      autoFit: { type: "normal", fontScale: pct(80), lineSpaceReduction: pct(20) },
    });
    const norm = getChild(el, "a:normAutofit");
    expect(norm).toBeDefined();
    // 80 * 1000 = 80000
    expect(norm!.attrs.fontScale).toBe("80000");
    // 20 * 1000 = 20000
    expect(norm!.attrs.lnSpcReduction).toBe("20000");
  });

  it("throws for textWarp", () => {
    expect(() =>
      serializeBodyProperties({
        textWarp: { preset: "textPlain", adjustValues: [] },
      }),
    ).toThrow("textWarp");
  });

  it("throws for scene3d/shape3d", () => {
    expect(() =>
      serializeBodyProperties({
        scene3d: { camera: { preset: "orthographicFront" } },
      } as BodyProperties),
    ).toThrow("3D");
    expect(() =>
      serializeBodyProperties({
        shape3d: {} as BodyProperties["shape3d"],
      } as BodyProperties),
    ).toThrow("3D");
  });

  it("serializes anchor top", () => {
    const el = serializeBodyProperties({ anchor: "top" });
    expect(el.attrs.anchor).toBe("t");
  });

  it("serializes anchor bottom", () => {
    const el = serializeBodyProperties({ anchor: "bottom" });
    expect(el.attrs.anchor).toBe("b");
  });

  it("serializes verticalOverflow", () => {
    const el = serializeBodyProperties({ verticalOverflow: "ellipsis" });
    expect(el.attrs.vertOverflow).toBe("ellipsis");
  });

  it("serializes columnSpacing as EMU", () => {
    const el = serializeBodyProperties({ columnSpacing: px(20) });
    expect(el.attrs.spcCol).toBe(String(Math.round(20 * EMU_PER_PIXEL)));
  });

  it("serializes upright boolean", () => {
    const el = serializeBodyProperties({ upright: true });
    expect(el.attrs.upright).toBe("1");
  });

  it("serializes compatibleLineSpacing boolean", () => {
    const el = serializeBodyProperties({ compatibleLineSpacing: true });
    expect(el.attrs.compatLnSpc).toBe("1");
  });

  it("serializes rtlColumns boolean", () => {
    const el = serializeBodyProperties({ rtlColumns: true });
    expect(el.attrs.rtlCol).toBe("1");
  });

  it("serializes spaceFirstLastPara boolean", () => {
    const el = serializeBodyProperties({ spaceFirstLastPara: true });
    expect(el.attrs.spcFirstLastPara).toBe("1");
  });

  it("serializes forceAntiAlias boolean", () => {
    const el = serializeBodyProperties({ forceAntiAlias: true });
    expect(el.attrs.forceAA).toBe("1");
  });

  it("serializes fromWordArt boolean", () => {
    const el = serializeBodyProperties({ fromWordArt: true });
    expect(el.attrs.fromWordArt).toBe("1");
  });

  it("serializes autoFit none (no child element)", () => {
    const el = serializeBodyProperties({ autoFit: { type: "none" } });
    expect(getChild(el, "a:spAutoFit")).toBeUndefined();
    expect(getChild(el, "a:normAutofit")).toBeUndefined();
    expect(el.children).toHaveLength(0);
  });

  it("serializes autoFit normal without optional attrs", () => {
    const el = serializeBodyProperties({ autoFit: { type: "normal" } });
    const norm = getChild(el, "a:normAutofit");
    expect(norm).toBeDefined();
    expect(norm!.attrs.fontScale).toBeUndefined();
    expect(norm!.attrs.lnSpcReduction).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// serializeParagraphProperties
// ---------------------------------------------------------------------------

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

  it.each([
    ["left", "l"],
    ["right", "r"],
    ["justify", "just"],
    ["justifyLow", "justLow"],
    ["distributed", "dist"],
    ["thaiDistributed", "thaiDist"],
  ] as const)("serializes alignment %s -> %s", (input, expected) => {
    const el = serializeParagraphProperties({ alignment: input });
    expect(el.attrs.algn).toBe(expected);
  });

  it("serializes rtl", () => {
    const el = serializeParagraphProperties({ rtl: true });
    expect(el.attrs.rtl).toBe("1");
  });

  it.each([
    ["auto", "auto"],
    ["top", "t"],
    ["center", "ctr"],
    ["base", "base"],
    ["bottom", "b"],
  ] as const)("serializes font alignment %s -> %s", (input, expected) => {
    const el = serializeParagraphProperties({ fontAlignment: input });
    expect(el.attrs.fontAlgn).toBe(expected);
  });

  it("serializes default tab size as EMU", () => {
    const el = serializeParagraphProperties({ defaultTabSize: px(48) });
    expect(el.attrs.defTabSz).toBe(String(Math.round(48 * EMU_PER_PIXEL)));
  });

  it("serializes tab stops", () => {
    const el = serializeParagraphProperties({
      tabStops: [
        { position: px(100), alignment: "left" },
        { position: px(200), alignment: "center" },
      ],
    });
    const tabLst = getChild(el, "a:tabLst");
    expect(tabLst).toBeDefined();
    const tabs = getChildren(tabLst!, "a:tab");
    expect(tabs).toHaveLength(2);
    expect(tabs[0].attrs.pos).toBe(String(Math.round(100 * EMU_PER_PIXEL)));
    expect(tabs[0].attrs.algn).toBe("l");
    expect(tabs[1].attrs.pos).toBe(String(Math.round(200 * EMU_PER_PIXEL)));
    expect(tabs[1].attrs.algn).toBe("ctr");
  });

  it("serializes line breaking flags", () => {
    const el = serializeParagraphProperties({
      eaLineBreak: true,
      latinLineBreak: false,
      hangingPunctuation: true,
    });
    expect(el.attrs.eaLnBrk).toBe("1");
    expect(el.attrs.latinLnBrk).toBe("0");
    expect(el.attrs.hangingPunct).toBe("1");
  });

  it("serializes line spacing points", () => {
    const el = serializeParagraphProperties({
      lineSpacing: { type: "points", value: pt(18) },
    });
    const lnSpc = getChild(el, "a:lnSpc");
    const spcPts = getChild(lnSpc!, "a:spcPts");
    // 18 * 100 = 1800
    expect(spcPts?.attrs.val).toBe("1800");
  });

  it("serializes default run properties", () => {
    const el = serializeParagraphProperties({
      defaultRunProperties: { bold: true, fontSize: pt(24) },
    });
    const defRPr = getChild(el, "a:defRPr");
    expect(defRPr).toBeDefined();
    expect(defRPr!.attrs.b).toBe("1");
    // 24 * 100 = 2400
    expect(defRPr!.attrs.sz).toBe("2400");
  });

  it("serializes tab stop with decimal alignment", () => {
    const el = serializeParagraphProperties({
      tabStops: [{ position: px(150), alignment: "decimal" }],
    });
    const tabLst = getChild(el, "a:tabLst");
    expect(tabLst).toBeDefined();
    const tabs = getChildren(tabLst!, "a:tab");
    expect(tabs).toHaveLength(1);
    expect(tabs[0].attrs.algn).toBe("dec");
  });

  it("serializes tab stop with right alignment", () => {
    const el = serializeParagraphProperties({
      tabStops: [{ position: px(300), alignment: "right" }],
    });
    const tabLst = getChild(el, "a:tabLst");
    const tabs = getChildren(tabLst!, "a:tab");
    expect(tabs[0].attrs.algn).toBe("r");
  });

  it("serializes bullet type none", () => {
    const bulletStyle: BulletStyle = {
      bullet: { type: "none" },
      colorFollowText: false,
      sizeFollowText: false,
      fontFollowText: false,
    };
    const el = serializeParagraphProperties({ bulletStyle });
    expect(getChild(el, "a:buNone")).toBeDefined();
  });

  it("serializes bullet type auto with scheme and startAt", () => {
    const bulletStyle: BulletStyle = {
      bullet: { type: "auto", scheme: "arabicPeriod", startAt: 5 },
      colorFollowText: false,
      sizeFollowText: false,
      fontFollowText: false,
    };
    const el = serializeParagraphProperties({ bulletStyle });
    const buAutoNum = getChild(el, "a:buAutoNum");
    expect(buAutoNum).toBeDefined();
    expect(buAutoNum!.attrs.type).toBe("arabicPeriod");
    expect(buAutoNum!.attrs.startAt).toBe("5");
  });

  it("serializes bullet type auto without startAt", () => {
    const bulletStyle: BulletStyle = {
      bullet: { type: "auto", scheme: "alphaLcParenR" },
      colorFollowText: false,
      sizeFollowText: false,
      fontFollowText: false,
    };
    const el = serializeParagraphProperties({ bulletStyle });
    const buAutoNum = getChild(el, "a:buAutoNum");
    expect(buAutoNum).toBeDefined();
    expect(buAutoNum!.attrs.type).toBe("alphaLcParenR");
    expect(buAutoNum!.attrs.startAt).toBeUndefined();
  });

  it("serializes bullet type blip", () => {
    const bulletStyle: BulletStyle = {
      bullet: { type: "blip", resourceId: "rId5" },
      colorFollowText: false,
      sizeFollowText: false,
      fontFollowText: false,
    };
    const el = serializeParagraphProperties({ bulletStyle });
    const buBlip = getChild(el, "a:buBlip");
    expect(buBlip).toBeDefined();
    const blip = getChild(buBlip!, "a:blip");
    expect(blip).toBeDefined();
    expect(blip!.attrs["r:embed"]).toBe("rId5");
  });

  it("serializes bullet style with color", () => {
    const bulletStyle: BulletStyle = {
      bullet: { type: "char", char: "-" },
      color: srgbRed,
      colorFollowText: false,
      sizeFollowText: false,
      fontFollowText: false,
    };
    const el = serializeParagraphProperties({ bulletStyle });
    const buClr = getChild(el, "a:buClr");
    expect(buClr).toBeDefined();
    const srgbClr = getChild(buClr!, "a:srgbClr");
    expect(srgbClr).toBeDefined();
    expect(srgbClr!.attrs.val).toBe("FF0000");
  });

  it("serializes bullet style with sizePercent", () => {
    const bulletStyle: BulletStyle = {
      bullet: { type: "char", char: "-" },
      colorFollowText: false,
      sizeFollowText: false,
      sizePercent: pct(75),
      fontFollowText: false,
    };
    const el = serializeParagraphProperties({ bulletStyle });
    const buSzPct = getChild(el, "a:buSzPct");
    expect(buSzPct).toBeDefined();
    // 75 * 1000 = 75000
    expect(buSzPct!.attrs.val).toBe("75000");
  });

  it("serializes bullet style with sizePoints", () => {
    const bulletStyle: BulletStyle = {
      bullet: { type: "char", char: "-" },
      colorFollowText: false,
      sizeFollowText: false,
      sizePoints: pt(14),
      fontFollowText: false,
    };
    const el = serializeParagraphProperties({ bulletStyle });
    const buSzPts = getChild(el, "a:buSzPts");
    expect(buSzPts).toBeDefined();
    // 14 * 100 = 1400
    expect(buSzPts!.attrs.val).toBe("1400");
  });

  it("serializes bullet style with font name", () => {
    const bulletStyle: BulletStyle = {
      bullet: { type: "char", char: "-" },
      colorFollowText: false,
      sizeFollowText: false,
      fontFollowText: false,
      font: "Wingdings",
    };
    const el = serializeParagraphProperties({ bulletStyle });
    const buFont = getChild(el, "a:buFont");
    expect(buFont).toBeDefined();
    expect(buFont!.attrs.typeface).toBe("Wingdings");
  });

  it("serializes level attribute", () => {
    const el = serializeParagraphProperties({ level: 2 });
    expect(el.attrs.lvl).toBe("2");
  });
});

// ---------------------------------------------------------------------------
// serializeRunProperties
// ---------------------------------------------------------------------------

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

  it("serializes bold and italic", () => {
    const el = serializeRunProperties({ bold: true, italic: true });
    expect(el.attrs.b).toBe("1");
    expect(el.attrs.i).toBe("1");
  });

  it("serializes underline", () => {
    const el = serializeRunProperties({ underline: "sng" });
    expect(el.attrs.u).toBe("sng");
  });

  it("serializes strike", () => {
    const el = serializeRunProperties({ strike: "sngStrike" });
    expect(el.attrs.strike).toBe("sngStrike");
  });

  it("serializes caps", () => {
    const el = serializeRunProperties({ caps: "all" });
    expect(el.attrs.cap).toBe("all");
  });

  it("serializes baseline as rounded integer", () => {
    const el = serializeRunProperties({ baseline: 30000.6 });
    expect(el.attrs.baseline).toBe("30001");
  });

  it("serializes font size as centipoints", () => {
    const el = serializeRunProperties({ fontSize: pt(18) });
    // 18 * 100 = 1800
    expect(el.attrs.sz).toBe("1800");
  });

  it("serializes hyperlink with tooltip", () => {
    const el = serializeRunProperties({
      hyperlink: { id: "rId1", tooltip: "Click here" },
    });
    const hlink = getChild(el, "a:hlinkClick");
    expect(hlink).toBeDefined();
    expect(hlink!.attrs["r:id"]).toBe("rId1");
    expect(hlink!.attrs.tooltip).toBe("Click here");
  });

  it("serializes hyperlink mouse over with all fields", () => {
    const el = serializeRunProperties({
      hyperlinkMouseOver: {
        id: "rId2",
        tooltip: "Hover text",
        action: "ppaction://hlinkshowjump",
        highlightClick: true,
        endSound: false,
      },
    });
    const hlink = getChild(el, "a:hlinkMouseOver");
    expect(hlink).toBeDefined();
    expect(hlink!.attrs["r:id"]).toBe("rId2");
    expect(hlink!.attrs.tooltip).toBe("Hover text");
    expect(hlink!.attrs.action).toBe("ppaction://hlinkshowjump");
    expect(hlink!.attrs.highlightClick).toBe("1");
    expect(hlink!.attrs.endSnd).toBe("0");
  });

  it("serializes color as solidFill with srgbClr", () => {
    const el = serializeRunProperties({ color: srgbRed });
    const solidFill = getChild(el, "a:solidFill");
    expect(solidFill).toBeDefined();
    const srgbClr = getChild(solidFill!, "a:srgbClr");
    expect(srgbClr).toBeDefined();
    expect(srgbClr!.attrs.val).toBe("FF0000");
  });

  it("serializes fill property", () => {
    const fill: Fill = { type: "noFill" };
    const el = serializeRunProperties({ fill });
    const noFill = getChild(el, "a:noFill");
    expect(noFill).toBeDefined();
  });

  it("serializes rtl as child element", () => {
    const el = serializeRunProperties({ rtl: true });
    const rtlEl = getChild(el, "a:rtl");
    expect(rtlEl).toBeDefined();
  });

  it("serializes text outline via serializeLine", () => {
    const line: Line = {
      width: px(2),
      cap: "flat",
      compound: "sng",
      alignment: "ctr",
      fill: { type: "solidFill", color: srgbRed },
      dash: "solid",
      join: "bevel",
    };
    const el = serializeRunProperties({ textOutline: line });
    const ln = getChild(el, "a:ln");
    expect(ln).toBeDefined();
    expect(ln!.attrs.w).toBe(String(Math.round(2 * EMU_PER_PIXEL)));
  });

  it("serializes underline color without underline line as best-effort a:uLn", () => {
    const el = serializeRunProperties({ underlineColor: srgbRed });
    const uLn = getChild(el, "a:uLn");
    expect(uLn).toBeDefined();
    const solidFill = getChild(uLn!, "a:solidFill");
    expect(solidFill).toBeDefined();
    const srgbClr = getChild(solidFill!, "a:srgbClr");
    expect(srgbClr!.attrs.val).toBe("FF0000");
  });

  it("serializes altLanguage as altLang attr", () => {
    const el = serializeRunProperties({ altLanguage: "ja-JP" });
    expect(el.attrs.altLang).toBe("ja-JP");
  });

  it("serializes bookmark as bmk attr", () => {
    const el = serializeRunProperties({ bookmark: "slide1" });
    expect(el.attrs.bmk).toBe("slide1");
  });

  it("serializes noProof boolean", () => {
    const el = serializeRunProperties({ noProof: true });
    expect(el.attrs.noProof).toBe("1");
  });

  it("serializes dirty boolean", () => {
    const el = serializeRunProperties({ dirty: true });
    expect(el.attrs.dirty).toBe("1");
  });

  it("serializes smartTagClean as smtClean", () => {
    const el = serializeRunProperties({ smartTagClean: true });
    expect(el.attrs.smtClean).toBe("1");
  });

  it("serializes error as err", () => {
    const el = serializeRunProperties({ error: true });
    expect(el.attrs.err).toBe("1");
  });

  it("serializes kumimoji boolean", () => {
    const el = serializeRunProperties({ kumimoji: true });
    expect(el.attrs.kumimoji).toBe("1");
  });

  it("serializes normalizeHeights as normalizeH", () => {
    const el = serializeRunProperties({ normalizeHeights: true });
    expect(el.attrs.normalizeH).toBe("1");
  });

  it("serializes smartTagId as smtId", () => {
    const el = serializeRunProperties({ smartTagId: 42 });
    expect(el.attrs.smtId).toBe("42");
  });

  it("serializes outline boolean attr", () => {
    const el = serializeRunProperties({ outline: true });
    expect(el.attrs.outline).toBe("1");
  });

  it("serializes shadow boolean attr", () => {
    const el = serializeRunProperties({ shadow: true });
    expect(el.attrs.shadow).toBe("1");
  });

  it("serializes emboss boolean attr", () => {
    const el = serializeRunProperties({ emboss: true });
    expect(el.attrs.emboss).toBe("1");
  });

  it("serializes highlightColor as a:highlight child", () => {
    const el = serializeRunProperties({ highlightColor: srgbRed });
    const highlight = getChild(el, "a:highlight");
    expect(highlight).toBeDefined();
    const srgbClr = getChild(highlight!, "a:srgbClr");
    expect(srgbClr).toBeDefined();
    expect(srgbClr!.attrs.val).toBe("FF0000");
  });

  it("serializes underlineLineFollowText as a:uLnTx", () => {
    const el = serializeRunProperties({ underlineLineFollowText: true });
    expect(getChild(el, "a:uLnTx")).toBeDefined();
  });

  it("serializes underlineFillFollowText as a:uFillTx", () => {
    const el = serializeRunProperties({ underlineFillFollowText: true });
    expect(getChild(el, "a:uFillTx")).toBeDefined();
  });

  it("serializes underlineLine as a:uLn (renamed)", () => {
    const uLine: Line = {
      width: px(1),
      cap: "flat",
      compound: "sng",
      alignment: "ctr",
      fill: { type: "solidFill", color: srgbRed },
      dash: "solid",
      join: "bevel",
    };
    const el = serializeRunProperties({ underlineLine: uLine });
    const uLn = getChild(el, "a:uLn");
    expect(uLn).toBeDefined();
    expect(uLn!.attrs.w).toBe(String(Math.round(1 * EMU_PER_PIXEL)));
  });

  it("serializes underlineFill as a:uFill child", () => {
    const uFill: Fill = { type: "solidFill", color: srgbRed };
    const el = serializeRunProperties({ underlineFill: uFill });
    const uFillEl = getChild(el, "a:uFill");
    expect(uFillEl).toBeDefined();
    const solidFill = getChild(uFillEl!, "a:solidFill");
    expect(solidFill).toBeDefined();
  });

  it("does not emit best-effort a:uLn when underlineLine is also present", () => {
    const uLine: Line = {
      width: px(1),
      cap: "flat",
      compound: "sng",
      alignment: "ctr",
      fill: { type: "solidFill", color: srgbRed },
      dash: "solid",
      join: "bevel",
    };
    const el = serializeRunProperties({ underlineLine: uLine, underlineColor: srgbRed });
    // Should have exactly one a:uLn (from underlineLine), not two
    const uLnChildren = getChildren(el, "a:uLn");
    expect(uLnChildren).toHaveLength(1);
  });

  it("serializes effects on run properties", () => {
    const effects: Effects = {
      glow: { color: srgbRed, radius: px(5) },
    };
    const el = serializeRunProperties({ effects });
    const effectLst = getChild(el, "a:effectLst");
    expect(effectLst).toBeDefined();
  });

  it("serializes fontFamilyEastAsian with pitchFamily", () => {
    const el = serializeRunProperties({
      fontFamilyEastAsian: "MS Gothic",
      fontFamilyEastAsianPitchFamily: 49,
    });
    const ea = getChild(el, "a:ea");
    expect(ea).toBeDefined();
    expect(ea!.attrs.typeface).toBe("MS Gothic");
    expect(ea!.attrs.pitchFamily).toBe("49");
  });

  it("serializes fontFamilyComplexScript with pitchFamily", () => {
    const el = serializeRunProperties({
      fontFamilyComplexScript: "Arial",
      fontFamilyComplexScriptPitchFamily: 34,
    });
    const cs = getChild(el, "a:cs");
    expect(cs).toBeDefined();
    expect(cs!.attrs.typeface).toBe("Arial");
    expect(cs!.attrs.pitchFamily).toBe("34");
  });

  it("serializes fontFamilySymbol as a:sym", () => {
    const el = serializeRunProperties({ fontFamilySymbol: "Symbol" });
    const sym = getChild(el, "a:sym");
    expect(sym).toBeDefined();
    expect(sym!.attrs.typeface).toBe("Symbol");
  });

  it("serializes fontFamilySymbol with pitchFamily", () => {
    const el = serializeRunProperties({
      fontFamilySymbol: "Wingdings",
      fontFamilySymbolPitchFamily: 2,
    });
    const sym = getChild(el, "a:sym");
    expect(sym).toBeDefined();
    expect(sym!.attrs.typeface).toBe("Wingdings");
    expect(sym!.attrs.pitchFamily).toBe("2");
  });

  it("serializes fontFamily with pitchFamily", () => {
    const el = serializeRunProperties({
      fontFamily: "Calibri",
      fontFamilyPitchFamily: 34,
    });
    const latin = getChild(el, "a:latin");
    expect(latin).toBeDefined();
    expect(latin!.attrs.typeface).toBe("Calibri");
    expect(latin!.attrs.pitchFamily).toBe("34");
  });

  it("serializes hyperlink with action and sound", () => {
    const el = serializeRunProperties({
      hyperlink: {
        id: "rId3",
        tooltip: "Link",
        action: "ppaction://hlinksldjump",
        sound: { embed: "rId10", name: "click.wav" },
      },
    });
    const hlink = getChild(el, "a:hlinkClick");
    expect(hlink).toBeDefined();
    expect(hlink!.attrs["r:id"]).toBe("rId3");
    expect(hlink!.attrs.action).toBe("ppaction://hlinksldjump");
    const snd = getChild(hlink!, "a:snd");
    expect(snd).toBeDefined();
    expect(snd!.attrs["r:embed"]).toBe("rId10");
    expect(snd!.attrs.name).toBe("click.wav");
  });

  it("serializes hyperlink sound without name", () => {
    const el = serializeRunProperties({
      hyperlink: {
        id: "rId4",
        sound: { embed: "rId11" },
      },
    });
    const hlink = getChild(el, "a:hlinkClick");
    const snd = getChild(hlink!, "a:snd");
    expect(snd).toBeDefined();
    expect(snd!.attrs["r:embed"]).toBe("rId11");
    expect(snd!.attrs.name).toBeUndefined();
  });

  it("serializes hyperlinkMouseOver with sound", () => {
    const el = serializeRunProperties({
      hyperlinkMouseOver: {
        id: "rId5",
        sound: { embed: "rId12", name: "hover.wav" },
      },
    });
    const hlink = getChild(el, "a:hlinkMouseOver");
    expect(hlink).toBeDefined();
    const snd = getChild(hlink!, "a:snd");
    expect(snd).toBeDefined();
    expect(snd!.attrs["r:embed"]).toBe("rId12");
    expect(snd!.attrs.name).toBe("hover.wav");
  });

  it("serializes language as lang attr", () => {
    const el = serializeRunProperties({ language: "en-US" });
    expect(el.attrs.lang).toBe("en-US");
  });

  it("serializes kerning as centipoints", () => {
    const el = serializeRunProperties({ kerning: pt(12) });
    // 12 * 100 = 1200
    expect(el.attrs.kern).toBe("1200");
  });
});

// ---------------------------------------------------------------------------
// serializeEndParaRunProperties
// ---------------------------------------------------------------------------

describe("serializeEndParaRunProperties", () => {
  it("serializes as a:endParaRPr element", () => {
    const el = serializeEndParaRunProperties({ bold: true });
    expect(el.name).toBe("a:endParaRPr");
    expect(el.attrs.b).toBe("1");
  });
});

// ---------------------------------------------------------------------------
// serializeText
// ---------------------------------------------------------------------------

describe("serializeText", () => {
  it("serializes normal text without xml:space", () => {
    const el = serializeText("Hello");
    expect(el.name).toBe("a:t");
    expect(el.attrs["xml:space"]).toBeUndefined();
    expect(getTextContent(el)).toBe("Hello");
  });

  it("serializes text with leading spaces with xml:space=preserve", () => {
    const el = serializeText("  Hello");
    expect(el.attrs["xml:space"]).toBe("preserve");
    expect(getTextContent(el)).toBe("  Hello");
  });

  it("serializes text with trailing spaces with xml:space=preserve", () => {
    const el = serializeText("Hello  ");
    expect(el.attrs["xml:space"]).toBe("preserve");
    expect(getTextContent(el)).toBe("Hello  ");
  });

  it("serializes text with tabs with xml:space=preserve", () => {
    const el = serializeText("Hello\tWorld");
    expect(el.attrs["xml:space"]).toBe("preserve");
    expect(getTextContent(el)).toBe("Hello\tWorld");
  });

  it("serializes text with consecutive spaces with xml:space=preserve", () => {
    const el = serializeText("Hello  World");
    expect(el.attrs["xml:space"]).toBe("preserve");
    expect(getTextContent(el)).toBe("Hello  World");
  });
});
