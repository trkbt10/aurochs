/**
 * @file Tests for SpreadsheetML Drawing parsing helpers
 */

type MutableXmlText = {
  type: "text";
  value: string;
};

type MutableXmlElement = {
  type: "element";
  name: string;
  attrs: Record<string, string>;
  children: MutableXmlNode[];
};

type MutableXmlNode = MutableXmlElement | MutableXmlText;
import {
  parseAbsoluteAnchorElement,
  parseClientDataElement,
  parseCNvGraphicFramePrElement,
  parseCNvGrpSpPrElement,
  parseCNvSpPrElement,
  parseColOffElement,
  parseContentPartElement,
  parseOneCellAnchorElement,
  parseRowOffElementPublic,
  parseTwoCellAnchorElement,
  parseWsDrElement,
  parseCxnSpLocksElement,
} from "./xdr-drawing";

function el(
  name: string,
  attrs: Record<string, string> = {},
  children: MutableXmlNode[] = [],
): MutableXmlElement {
  return { type: "element", name, attrs, children };
}

describe("parseAbsoluteAnchorElement", () => {
  it("parses absolute anchor position and extent", () => {
    const anchor = el("xdr:absoluteAnchor", {}, [
      el("xdr:pos", { x: "0", y: "914400" }),
      el("xdr:ext", { cx: "914400", cy: "457200" }),
    ]);
    const result = parseAbsoluteAnchorElement(anchor);
    expect(result?.position.x).toBe(0);
    expect(result?.position.y).toBeCloseTo(96, 0);
    expect(result?.size.width).toBeCloseTo(96, 0);
    expect(result?.size.height).toBeCloseTo(48, 0);
  });

  it("returns undefined when required children are missing", () => {
    const anchor = el("xdr:absoluteAnchor", {}, [el("xdr:pos", { x: "0", y: "0" })]);
    expect(parseAbsoluteAnchorElement(anchor)).toBeUndefined();
  });
});

describe("parseClientDataElement", () => {
  it("parses client data flags", () => {
    const clientData = el("xdr:clientData", { fLocksWithSheet: "1", fPrintsWithSheet: "0" });
    const result = parseClientDataElement(clientData);
    expect(result).toEqual({ locksWithSheet: true, printsWithSheet: false });
  });

  it("returns undefined when no flags are set", () => {
    const clientData = el("xdr:clientData");
    expect(parseClientDataElement(clientData)).toBeUndefined();
  });
});

describe("parseCNvGraphicFramePrElement", () => {
  it("parses graphic frame locks", () => {
    const cNvGraphicFramePr = el("xdr:cNvGraphicFramePr", {}, [
      el("a:graphicFrameLocks", { noResize: "1", noMove: "0" }),
    ]);
    const result = parseCNvGraphicFramePrElement(cNvGraphicFramePr);
    expect(result?.noResize).toBe(true);
    expect(result?.noMove).toBe(false);
  });

  it("returns undefined when locks are missing", () => {
    const cNvGraphicFramePr = el("xdr:cNvGraphicFramePr");
    expect(parseCNvGraphicFramePrElement(cNvGraphicFramePr)).toBeUndefined();
  });
});

describe("parseCNvGrpSpPrElement", () => {
  it("parses group shape locks", () => {
    const cNvGrpSpPr = el("xdr:cNvGrpSpPr", {}, [
      el("a:grpSpLocks", { noUngrp: "1", noMove: "0" }),
    ]);
    const result = parseCNvGrpSpPrElement(cNvGrpSpPr);
    expect(result?.noUngrp).toBe(true);
    expect(result?.noMove).toBe(false);
  });

  it("returns undefined when locks are missing", () => {
    const cNvGrpSpPr = el("xdr:cNvGrpSpPr");
    expect(parseCNvGrpSpPrElement(cNvGrpSpPr)).toBeUndefined();
  });
});

describe("parseCNvSpPrElement", () => {
  it("parses txBox attribute", () => {
    const cNvSpPr = el("xdr:cNvSpPr", { txBox: "1" });
    expect(parseCNvSpPrElement(cNvSpPr)).toEqual({ txBox: true });
  });

  it("returns undefined when txBox is missing", () => {
    const cNvSpPr = el("xdr:cNvSpPr");
    expect(parseCNvSpPrElement(cNvSpPr)).toBeUndefined();
  });
});

describe("parseColOffElement", () => {
  it("parses column offset", () => {
    const colOff = el("xdr:colOff", {}, []);
    colOff.children = [{ type: "text", value: "914400" }];
    const result = parseColOffElement(colOff);
    expect(result).toBeCloseTo(96, 0);
  });

  it("returns undefined when element is missing", () => {
    expect(parseColOffElement(undefined)).toBeUndefined();
  });
});

describe("parseContentPartElement", () => {
  it("parses contentPart attributes", () => {
    const contentPart = el("xdr:contentPart", { "r:id": "rId10", bwMode: "gray" });
    const result = parseContentPartElement(contentPart);
    expect(result).toEqual({ id: "rId10", bwMode: "gray" });
  });

  it("returns undefined when id is missing", () => {
    const contentPart = el("xdr:contentPart");
    expect(parseContentPartElement(contentPart)).toBeUndefined();
  });
});

describe("parseOneCellAnchorElement", () => {
  it("parses oneCellAnchor with marker, extent, and client data", () => {
    const anchor = el("xdr:oneCellAnchor", {}, [
      el("xdr:from", {}, [
        el("xdr:col", {}, [{ type: "text", value: "2" }]),
        el("xdr:colOff", {}, [{ type: "text", value: "12700" }]),
        el("xdr:row", {}, [{ type: "text", value: "3" }]),
        el("xdr:rowOff", {}, [{ type: "text", value: "25400" }]),
      ]),
      el("xdr:ext", { cx: "914400", cy: "457200" }),
      el("xdr:clientData", { fLocksWithSheet: "1" }),
    ]);
    const result = parseOneCellAnchorElement(anchor);
    expect(result?.from.col).toBe(2);
    expect(result?.from.row).toBe(3);
    expect(result?.from.colOff).toBeCloseTo(1.33, 1);
    expect(result?.size.width).toBeCloseTo(96, 0);
    expect(result?.clientData?.locksWithSheet).toBe(true);
  });

  it("returns undefined when required children are missing", () => {
    const anchor = el("xdr:oneCellAnchor", {}, []);
    expect(parseOneCellAnchorElement(anchor)).toBeUndefined();
  });
});

describe("parseRowOffElement", () => {
  it("parses row offset", () => {
    const rowOff = el("xdr:rowOff", {}, []);
    rowOff.children = [{ type: "text", value: "457200" }];
    const result = parseRowOffElementPublic(rowOff);
    expect(result).toBeCloseTo(48, 0);
  });

  it("returns undefined when element is missing", () => {
    expect(parseRowOffElementPublic(undefined)).toBeUndefined();
  });
});

describe("parseTwoCellAnchorElement", () => {
  it("parses twoCellAnchor markers and client data", () => {
    const anchor = el("xdr:twoCellAnchor", {}, [
      el("xdr:from", {}, [
        el("xdr:col", {}, [{ type: "text", value: "1" }]),
        el("xdr:row", {}, [{ type: "text", value: "2" }]),
      ]),
      el("xdr:to", {}, [
        el("xdr:col", {}, [{ type: "text", value: "3" }]),
        el("xdr:row", {}, [{ type: "text", value: "4" }]),
      ]),
      el("xdr:clientData", { fPrintsWithSheet: "1" }),
    ]);
    const result = parseTwoCellAnchorElement(anchor);
    expect(result?.from.col).toBe(1);
    expect(result?.to.row).toBe(4);
    expect(result?.clientData?.printsWithSheet).toBe(true);
  });

  it("returns undefined when required markers are missing", () => {
    const anchor = el("xdr:twoCellAnchor", {}, []);
    expect(parseTwoCellAnchorElement(anchor)).toBeUndefined();
  });
});

describe("parseWsDrElement", () => {
  it("returns element as-is", () => {
    const wsDr = el("xdr:wsDr", {}, [el("xdr:absoluteAnchor", {}, [])]);
    expect(parseWsDrElement(wsDr)).toBe(wsDr);
  });

  it("returns undefined when element is missing", () => {
    expect(parseWsDrElement(undefined)).toBeUndefined();
  });
});

describe("parseCxnSpLocksElement", () => {
  it("parses connector locks", () => {
    const locks = el("a:cxnSpLocks", { noGrp: "1", noChangeArrowheads: "1" });
    const result = parseCxnSpLocksElement(locks);
    expect(result?.noGrp).toBe(true);
    expect(result?.noChangeArrowheads).toBe(true);
  });

  it("returns undefined when no attributes are present", () => {
    const locks = el("a:cxnSpLocks");
    expect(parseCxnSpLocksElement(locks)).toBeUndefined();
  });
});
