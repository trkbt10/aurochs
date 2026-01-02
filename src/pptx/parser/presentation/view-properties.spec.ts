/**
 * @file Tests for ECMA-376 compliant view properties parsing
 */

import type { XmlElement } from "../../../xml/index";
import {
  parseCommonViewProperties,
  parseGuideList,
  parseNormalViewProperties,
  parseOutlineViewProperties,
  parseSlideViewProperties,
  parseSorterViewProperties,
  parseViewProperties,
} from "./view-properties";

/**
 * Create a mock XmlElement for testing
 */
function el(name: string, attrs: Record<string, string> = {}, children: XmlElement[] = []): XmlElement {
  return { type: "element", name, attrs, children };
}

describe("parseCommonViewProperties - ECMA-376 Section 19.2.2.2 compliance", () => {
  it("parses scale and origin", () => {
    const cViewPr = el("p:cViewPr", { varScale: "1" }, [
      el("p:scale", {}, [el("a:sx", { n: "107", d: "100" }), el("a:sy", { n: "107", d: "100" })]),
      el("p:origin", { x: "-112", y: "-128" }),
    ]);
    const result = parseCommonViewProperties(cViewPr);
    expect(result.varScale).toBe(true);
    expect(result.scale?.x.value).toBeCloseTo(1.07);
    expect(result.origin?.x).toBe(-112);
  });
});

describe("parseGuideList - ECMA-376 Section 19.2.2.5 compliance", () => {
  it("parses guide entries", () => {
    const guideLst = el("p:guideLst", {}, [
      el("p:guide", { orient: "horz", pos: "2160" }),
      el("p:guide", { pos: "2880" }),
    ]);
    const result = parseGuideList(guideLst);
    expect(result.guides).toHaveLength(2);
    expect(result.guides[0].orient).toBe("horz");
    expect(result.guides[1].pos).toBe(2880);
  });
});

describe("parseNormalViewProperties - ECMA-376 Section 19.2.2.6 compliance", () => {
  it("parses restored portions", () => {
    const normalViewPr = el(
      "p:normalViewPr",
      { showOutlineIcons: "0", horzBarState: "maximized", vertBarState: "minimized" },
      [
      el("p:restoredLeft", { sz: "15620" }),
      el("p:restoredTop", { sz: "94660" }),
      ]
    );
    const result = parseNormalViewProperties(normalViewPr);
    expect(result.showOutlineIcons).toBe(false);
    expect(result.horzBarState).toBe("maximized");
    expect(result.vertBarState).toBe("minimized");
    expect(result.restoredLeft?.size).toBe(15620);
    expect(result.restoredTop?.size).toBe(94660);
  });
});

describe("parseOutlineViewProperties - ECMA-376 Section 19.2.2.10 compliance", () => {
  it("parses outline slide list", () => {
    const outlineViewPr = el("p:outlineViewPr", {}, [
      el("p:cViewPr", {}, [
        el("p:scale", {}, [el("a:sx", { n: "33", d: "100" }), el("a:sy", { n: "33", d: "100" })]),
        el("p:origin", { x: "0", y: "0" }),
      ]),
      el("p:sldLst", {}, [el("p:sld", { "r:id": "rId1", collapse: "1" })]),
    ]);
    const result = parseOutlineViewProperties(outlineViewPr);
    expect(result.slideList?.slides[0].rId).toBe("rId1");
    expect(result.slideList?.slides[0].collapse).toBe(true);
  });
});

describe("parseSlideViewProperties - ECMA-376 Section 19.2.2.16 compliance", () => {
  it("parses slide view properties with guides", () => {
    const slideViewPr = el("p:slideViewPr", {}, [
      el("p:cSldViewPr", {}, [
        el("p:cViewPr", {}, [
          el("p:scale", {}, [el("a:sx", { n: "100", d: "100" }), el("a:sy", { n: "100", d: "100" })]),
          el("p:origin", { x: "0", y: "0" }),
        ]),
        el("p:guideLst", {}, [el("p:guide", { orient: "horz", pos: "2160" })]),
      ]),
    ]);
    const result = parseSlideViewProperties(slideViewPr);
    expect(result.commonSlideView?.guideList?.guides).toHaveLength(1);
  });
});

describe("parseSorterViewProperties - ECMA-376 Section 19.2.2.17 compliance", () => {
  it("parses sorter view properties", () => {
    const sorterViewPr = el("p:sorterViewPr", { showFormatting: "1" }, [
      el("p:cViewPr", {}, [
        el("p:scale", {}, [el("a:sx", { n: "66", d: "100" }), el("a:sy", { n: "66", d: "100" })]),
        el("p:origin", { x: "0", y: "0" }),
      ]),
    ]);
    const result = parseSorterViewProperties(sorterViewPr);
    expect(result.showFormatting).toBe(true);
  });
});

describe("parseViewProperties - ECMA-376 Section 19.2.2.18 compliance", () => {
  it("parses view properties structure", () => {
    const viewPr = el("p:viewPr", { lastView: "outlineView" }, [
      el("p:normalViewPr", { showOutlineIcons: "0" }, [
        el("p:restoredLeft", { sz: "15620" }),
        el("p:restoredTop", { sz: "94660" }),
      ]),
      el("p:slideViewPr", {}, [
        el("p:cSldViewPr", {}, [
          el("p:cViewPr", { varScale: "1" }, [
            el("p:scale", {}, [el("a:sx", { n: "107", d: "100" }), el("a:sy", { n: "107", d: "100" })]),
            el("p:origin", { x: "-112", y: "-128" }),
          ]),
          el("p:guideLst", {}, [el("p:guide", { orient: "horz", pos: "2160" })]),
        ]),
      ]),
      el("p:outlineViewPr", {}, [
        el("p:cViewPr", {}, [
          el("p:scale", {}, [el("a:sx", { n: "33", d: "100" }), el("a:sy", { n: "33", d: "100" })]),
          el("p:origin", { x: "0", y: "0" }),
        ]),
      ]),
      el("p:notesTextViewPr", {}, [
        el("p:cViewPr", {}, [
          el("p:scale", {}, [el("a:sx", { n: "100", d: "100" }), el("a:sy", { n: "100", d: "100" })]),
          el("p:origin", { x: "0", y: "0" }),
        ]),
      ]),
      el("p:sorterViewPr", {}, [
        el("p:cViewPr", {}, [
          el("p:scale", {}, [el("a:sx", { n: "66", d: "100" }), el("a:sy", { n: "66", d: "100" })]),
          el("p:origin", { x: "0", y: "0" }),
        ]),
      ]),
      el("p:gridSpacing", { cx: "78028800", cy: "78028800" }),
    ]);
    const result = parseViewProperties(viewPr);
    expect(result.lastView).toBe("outlineView");
    expect(result.normalView?.restoredLeft?.size).toBe(15620);
    expect(result.slideView?.commonSlideView?.commonView?.scale?.x.value).toBeCloseTo(1.07);
    expect(result.gridSpacing?.cx).toBe(78028800);
  });
});
