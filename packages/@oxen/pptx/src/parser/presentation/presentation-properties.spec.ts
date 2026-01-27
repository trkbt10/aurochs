/**
 * @file Tests for ECMA-376 compliant presentation properties parsing
 *
 * Tests parsing of p:presentationPr and p:showPr elements per ECMA-376 Part 1.
 */

import type { XmlElement } from "@oxen/xml";
import {
  parseClrMru,
  parsePresentationProperties,
  parsePrintProperties,
  parseShowProperties,
} from "./presentation-properties";

/**
 * Create a mock XmlElement for testing
 */
function el(name: string, attrs: Record<string, string> = {}, children: XmlElement[] = []): XmlElement {
  return { type: "element", name, attrs, children };
}

describe("parseClrMru - ECMA-376 Section 19.2.1.4 compliance", () => {
  it("parses color entries", () => {
    const clrMru = el("p:clrMru", {}, [
      el("a:srgbClr", { val: "FF0000" }),
      el("a:schemeClr", { val: "tx1" }),
    ]);
    const result = parseClrMru(clrMru);
    expect(result).toHaveLength(2);
    expect(result[0].spec.type).toBe("srgb");
    expect(result[1].spec.type).toBe("scheme");
  });
});

describe("parseShowProperties - ECMA-376 Section 19.2.1.30 compliance", () => {
  it("parses show properties with present mode and sldAll", () => {
    const showPr = el("p:showPr", { showNarration: "1", useTimings: "0" }, [
      el("p:present"),
      el("p:sldAll"),
      el("p:penClr", {}, [el("a:schemeClr", { val: "tx1" })]),
    ]);
    const result = parseShowProperties(showPr);
    expect(result.present).toEqual({});
    expect(result.slideRange?.type).toBe("all");
    expect(result.penColor?.spec.type).toBe("scheme");
    expect(result.showNarration).toBe(true);
    expect(result.useTimings).toBe(false);
  });

  it("parses browse mode with scrollbar flag", () => {
    const showPr = el("p:showPr", {}, [el("p:browse", { showScrollbar: "1" })]);
    const result = parseShowProperties(showPr);
    expect(result.browse?.showScrollbar).toBe(true);
  });

  it("parses slide range and slide list when present", () => {
    const rangeShow = el("p:showPr", {}, [el("p:sldRg", { st: "2", end: "5" })]);
    const rangeResult = parseShowProperties(rangeShow);
    expect(rangeResult.slideRange).toEqual({ type: "range", start: 2, end: 5 });

    const listShow = el("p:showPr", {}, [
      el("p:sldLst", {}, [el("p:sld", { "r:id": "rId1" }), el("p:sld", { "r:id": "rId2" })]),
    ]);
    const listResult = parseShowProperties(listShow);
    expect(listResult.slideRange).toEqual({ type: "list", slideIds: ["rId1", "rId2"] });
  });
});

describe("parsePresentationProperties - ECMA-376 Section 19.2.1.27 compliance", () => {
  it("parses show properties and recent colors", () => {
    const presProps = el("p:presentationPr", {}, [
      el("p:showPr", {}, [el("p:present")]),
      el("p:clrMru", {}, [el("a:srgbClr", { val: "276288" })]),
      el("p:prnPr", { clrMode: "clr", frameSlides: "1", hiddenSlides: "0", prnWhat: "handouts1", scaleToFitPaper: "1" }),
    ]);
    const result = parsePresentationProperties(presProps);
    expect(result.showProperties?.present).toEqual({});
    expect(result.recentColors).toHaveLength(1);
    expect(result.printProperties?.colorMode).toBe("clr");
  });
});

describe("parsePrintProperties - ECMA-376 Section 19.2.1.28 compliance", () => {
  it("parses print properties attributes", () => {
    const prnPr = el("p:prnPr", {
      clrMode: "bw",
      frameSlides: "1",
      hiddenSlides: "0",
      prnWhat: "handouts1",
      scaleToFitPaper: "1",
    });
    const result = parsePrintProperties(prnPr);
    expect(result.colorMode).toBe("bw");
    expect(result.frameSlides).toBe(true);
    expect(result.hiddenSlides).toBe(false);
    expect(result.printWhat).toBe("handouts1");
    expect(result.scaleToFitPaper).toBe(true);
  });
});
