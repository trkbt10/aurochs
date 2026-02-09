/** @file Unit tests for default text style patcher */
import { createElement, isXmlElement, type XmlElement } from "@aurochs/xml";
import type { ParagraphProperties, TextStyleLevels } from "@aurochs-office/pptx/domain";
import { pct, pt, px } from "@aurochs-office/drawing-ml/domain/units";
import {
  patchTextStyleLevelElement,
  patchTextStyleLevelsElement,
  patchTextStyleLevelByNumber,
} from "./default-text-style-patcher";

function getChildElement(parent: XmlElement, name: string): XmlElement | undefined {
  return parent.children.find((c): c is XmlElement => isXmlElement(c) && c.name === name);
}

describe("patchTextStyleLevelElement", () => {
  it("merges attributes from patch into existing element", () => {
    const existing = createElement("a:lvl1pPr", { marL: "100" });
    const patch: ParagraphProperties = { level: 1 };
    const result = patchTextStyleLevelElement(existing, patch);
    expect(result.attrs.marL).toBe("100");
    expect(result.attrs.lvl).toBe("1");
  });

  it("replaces lineSpacing child", () => {
    const existing = createElement("a:lvl1pPr", {}, [
      createElement("a:lnSpc", {}, [createElement("a:spcPts", { val: "1000" })]),
    ]);
    const patch: ParagraphProperties = {
      lineSpacing: { type: "percent", value: pct(150) },
    };
    const result = patchTextStyleLevelElement(existing, patch);
    const lnSpc = getChildElement(result, "a:lnSpc");
    expect(lnSpc).toBeDefined();
    const spcPct = getChildElement(lnSpc!, "a:spcPct");
    expect(spcPct).toBeDefined();
  });

  it("replaces spaceBefore child", () => {
    const existing = createElement("a:lvl1pPr", {}, [
      createElement("a:spcBef", {}, [createElement("a:spcPts", { val: "500" })]),
    ]);
    const patch: ParagraphProperties = {
      spaceBefore: { type: "points", value: pt(12) },
    };
    const result = patchTextStyleLevelElement(existing, patch);
    const spcBef = getChildElement(result, "a:spcBef");
    expect(spcBef).toBeDefined();
  });

  it("replaces spaceAfter child", () => {
    const existing = createElement("a:lvl1pPr", {}, [
      createElement("a:spcAft", {}, [createElement("a:spcPts", { val: "500" })]),
    ]);
    const patch: ParagraphProperties = {
      spaceAfter: { type: "points", value: pt(6) },
    };
    const result = patchTextStyleLevelElement(existing, patch);
    const spcAft = getChildElement(result, "a:spcAft");
    expect(spcAft).toBeDefined();
  });

  it("replaces bullet style children", () => {
    const existing = createElement("a:lvl1pPr", {}, [createElement("a:buAutoNum", { type: "arabicPeriod" })]);
    const patch: ParagraphProperties = {
      bulletStyle: {
        bullet: { type: "none" },
        colorFollowText: false,
        sizeFollowText: false,
        fontFollowText: false,
      },
    };
    const result = patchTextStyleLevelElement(existing, patch);
    const buNone = getChildElement(result, "a:buNone");
    expect(buNone).toBeDefined();
    expect(getChildElement(result, "a:buAutoNum")).toBeUndefined();
  });

  it("replaces tabStops child", () => {
    const existing = createElement("a:lvl1pPr", {}, [createElement("a:tabLst")]);
    const patch: ParagraphProperties = {
      tabStops: [{ position: px(100), alignment: "left" }],
    };
    const result = patchTextStyleLevelElement(existing, patch);
    const tabLst = getChildElement(result, "a:tabLst");
    expect(tabLst).toBeDefined();
  });

  it("removes tabStops child when empty array (clears)", () => {
    const existing = createElement("a:lvl1pPr", {}, [createElement("a:tabLst")]);
    const patch: ParagraphProperties = {
      tabStops: [],
    };
    const result = patchTextStyleLevelElement(existing, patch);
    // Empty tabStops removes old a:tabLst but doesn't create new one
    const tabLst = getChildElement(result, "a:tabLst");
    expect(tabLst).toBeUndefined();
  });

  it("replaces defRPr child", () => {
    const existing = createElement("a:lvl1pPr", {}, [createElement("a:defRPr", { sz: "1000" })]);
    const patch: ParagraphProperties = {
      defaultRunProperties: { fontSize: pt(14) },
    };
    const result = patchTextStyleLevelElement(existing, patch);
    const defRPr = getChildElement(result, "a:defRPr");
    expect(defRPr).toBeDefined();
  });

  it("preserves a:extLst at end of children", () => {
    const existing = createElement("a:lvl1pPr", {}, [
      createElement("a:defRPr", { sz: "1000" }),
      createElement("a:extLst"),
    ]);
    const patch: ParagraphProperties = {
      defaultRunProperties: { fontSize: pt(16) },
    };
    const result = patchTextStyleLevelElement(existing, patch);
    const children = result.children.filter(isXmlElement);
    const last = children[children.length - 1];
    expect(last?.name).toBe("a:extLst");
  });

  it("preserves unrelated children when patching", () => {
    const existing = createElement("a:lvl1pPr", {}, [
      createElement("a:someCustom"),
      createElement("a:defRPr", { sz: "1000" }),
    ]);
    const patch: ParagraphProperties = {
      defaultRunProperties: { bold: true },
    };
    const result = patchTextStyleLevelElement(existing, patch);
    const custom = getChildElement(result, "a:someCustom");
    expect(custom).toBeDefined();
  });
});

describe("patchTextStyleLevelsElement", () => {
  it("patches defaultStyle (a:defPPr) in style element", () => {
    const styleEl = createElement("p:bodyStyle", {}, [createElement("a:defPPr", { marL: "200" })]);
    const levels: TextStyleLevels = {
      defaultStyle: {
        paragraphProperties: { level: 0 },
      },
    };
    const result = patchTextStyleLevelsElement(styleEl, levels);
    const defPPr = getChildElement(result, "a:defPPr");
    expect(defPPr).toBeDefined();
    expect(defPPr?.attrs.marL).toBe("200");
  });

  it("creates a:defPPr when it does not exist", () => {
    const styleEl = createElement("p:bodyStyle");
    const levels: TextStyleLevels = {
      defaultStyle: {
        paragraphProperties: { alignment: "center" },
      },
    };
    const result = patchTextStyleLevelsElement(styleEl, levels);
    const defPPr = getChildElement(result, "a:defPPr");
    expect(defPPr).toBeDefined();
    expect(defPPr?.attrs.algn).toBe("ctr");
  });

  it("patches level1 through level9", () => {
    const styleEl = createElement("p:bodyStyle", {}, [createElement("a:lvl1pPr")]);
    const levels: TextStyleLevels = {
      level1: { paragraphProperties: { alignment: "left" } },
      level2: { paragraphProperties: { alignment: "center" } },
      level3: { paragraphProperties: { alignment: "right" } },
      level4: { paragraphProperties: { alignment: "justify" } },
      level5: { paragraphProperties: { alignment: "left" } },
      level6: { paragraphProperties: { alignment: "center" } },
      level7: { paragraphProperties: { alignment: "right" } },
      level8: { paragraphProperties: { alignment: "justify" } },
      level9: { paragraphProperties: { alignment: "left" } },
    };
    const result = patchTextStyleLevelsElement(styleEl, levels);
    expect(getChildElement(result, "a:lvl1pPr")).toBeDefined();
    expect(getChildElement(result, "a:lvl2pPr")).toBeDefined();
    expect(getChildElement(result, "a:lvl3pPr")).toBeDefined();
    expect(getChildElement(result, "a:lvl4pPr")).toBeDefined();
    expect(getChildElement(result, "a:lvl5pPr")).toBeDefined();
    expect(getChildElement(result, "a:lvl6pPr")).toBeDefined();
    expect(getChildElement(result, "a:lvl7pPr")).toBeDefined();
    expect(getChildElement(result, "a:lvl8pPr")).toBeDefined();
    expect(getChildElement(result, "a:lvl9pPr")).toBeDefined();
  });

  it("skips levels with undefined style", () => {
    const styleEl = createElement("p:bodyStyle");
    const levels: TextStyleLevels = {
      level1: undefined,
    };
    const result = patchTextStyleLevelsElement(styleEl, levels);
    expect(getChildElement(result, "a:lvl1pPr")).toBeUndefined();
  });

  it("skips levels with empty paragraph properties", () => {
    const styleEl = createElement("p:bodyStyle");
    const levels: TextStyleLevels = {
      level1: {
        paragraphProperties: {},
      },
    };
    const result = patchTextStyleLevelsElement(styleEl, levels);
    // Empty props means no patch needed, so element not created
    expect(getChildElement(result, "a:lvl1pPr")).toBeUndefined();
  });

  it("uses defaultRunProperties when paragraphProperties is undefined", () => {
    const styleEl = createElement("p:bodyStyle");
    const levels: TextStyleLevels = {
      level1: {
        defaultRunProperties: { bold: true },
      },
    };
    const result = patchTextStyleLevelsElement(styleEl, levels);
    const lvl1 = getChildElement(result, "a:lvl1pPr");
    expect(lvl1).toBeDefined();
    const defRPr = getChildElement(lvl1!, "a:defRPr");
    expect(defRPr).toBeDefined();
    expect(defRPr?.attrs.b).toBe("1");
  });

  it("inserts new level before a:extLst", () => {
    const styleEl = createElement("p:bodyStyle", {}, [createElement("a:extLst")]);
    const levels: TextStyleLevels = {
      level1: { paragraphProperties: { alignment: "left" } },
    };
    const result = patchTextStyleLevelsElement(styleEl, levels);
    const children = result.children.filter(isXmlElement);
    expect(children[0]?.name).toBe("a:lvl1pPr");
    expect(children[1]?.name).toBe("a:extLst");
  });
});

describe("patchTextStyleLevelByNumber", () => {
  it("patches existing level element", () => {
    const styleEl = createElement("p:bodyStyle", {}, [createElement("a:lvl3pPr", { marL: "300" })]);
    const patch: ParagraphProperties = { alignment: "center" };
    const result = patchTextStyleLevelByNumber(styleEl, 3, patch);
    const lvl3 = getChildElement(result, "a:lvl3pPr");
    expect(lvl3).toBeDefined();
    expect(lvl3?.attrs.algn).toBe("ctr");
    expect(lvl3?.attrs.marL).toBe("300");
  });

  it("creates level element when it does not exist", () => {
    const styleEl = createElement("p:bodyStyle");
    const patch: ParagraphProperties = { alignment: "right" };
    const result = patchTextStyleLevelByNumber(styleEl, 5, patch);
    const lvl5 = getChildElement(result, "a:lvl5pPr");
    expect(lvl5).toBeDefined();
    expect(lvl5?.attrs.algn).toBe("r");
  });

  it("throws for invalid level number (0)", () => {
    const styleEl = createElement("p:bodyStyle");
    const patch: ParagraphProperties = { alignment: "left" };
    expect(() => patchTextStyleLevelByNumber(styleEl, 0, patch)).toThrow("Text style level must be an integer 1-9");
  });

  it("throws for invalid level number (10)", () => {
    const styleEl = createElement("p:bodyStyle");
    const patch: ParagraphProperties = { alignment: "left" };
    expect(() => patchTextStyleLevelByNumber(styleEl, 10, patch)).toThrow("Text style level must be an integer 1-9");
  });

  it("throws for non-integer level number", () => {
    const styleEl = createElement("p:bodyStyle");
    const patch: ParagraphProperties = { alignment: "left" };
    expect(() => patchTextStyleLevelByNumber(styleEl, 1.5, patch)).toThrow("Text style level must be an integer 1-9");
  });

  it("inserts before a:extLst when creating new level", () => {
    const styleEl = createElement("p:bodyStyle", {}, [createElement("a:extLst")]);
    const patch: ParagraphProperties = { alignment: "left" };
    const result = patchTextStyleLevelByNumber(styleEl, 2, patch);
    const children = result.children.filter(isXmlElement);
    expect(children[0]?.name).toBe("a:lvl2pPr");
    expect(children[1]?.name).toBe("a:extLst");
  });
});
