/**
 * @file Tests for WordprocessingML Drawing parsing helpers
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
  parseAlignHElement,
  parseAlignVElement,
  parseDocPrElement,
  parseEffectExtentElement,
  parsePositionHElement,
  parsePositionVElement,
  parsePosOffsetElement,
  parseSimplePosElement,
  parseWrapNoneElement,
  parseWrapPolygonElement,
  parseWrapSquareElement,
  parseWrapThroughElement,
  parseWrapTightElement,
  parseWrapTopAndBottomElement,
  parseCNvCnPrElement,
  parseCNvContentPartPrElement,
  parseCNvFrPrElement,
  parseCNvGrpSpPrElement,
  parseCNvSpPrElement,
  parseContentPartElement,
  parseLinkedTxbxElement,
  parseTxbxElement,
  parseTxbxContentElement,
  parseWgpElement,
  parseWpcElement,
  parseWspElement,
  parseCxnSpLocksElement,
} from "./wp-drawing";

function el(
  name: string,
  children: MutableXmlNode[] = [],
  attrs: Record<string, string> = {},
): MutableXmlElement {
  return { type: "element", name, attrs, children };
}

function text(value: string): MutableXmlText {
  return { type: "text", value };
}

describe("parseAlignHElement", () => {
  it("parses horizontal alignment values", () => {
    const align = el("wp:align", [text("left")]);
    expect(parseAlignHElement(align)).toBe("left");
  });
});

describe("parseAlignVElement", () => {
  it("parses vertical alignment values", () => {
    const align = el("wp:align", [text("top")]);
    expect(parseAlignVElement(align)).toBe("top");
  });
});

describe("parseDocPrElement", () => {
  it("parses docPr attributes", () => {
    const docPr = el("wp:docPr", []);
    docPr.attrs = { id: "7", name: "Drawing 1", descr: "desc", hidden: "1", title: "Title" };
    const result = parseDocPrElement(docPr);
    expect(result?.id).toBe("7");
    expect(result?.name).toBe("Drawing 1");
    expect(result?.description).toBe("desc");
    expect(result?.hidden).toBe(true);
    expect(result?.title).toBe("Title");
  });
});

describe("parseEffectExtentElement", () => {
  it("parses effect extent attributes", () => {
    const effectExtent = el("wp:effectExtent", []);
    effectExtent.attrs = { l: "12700", t: "25400", r: "38100", b: "50800" };
    const result = parseEffectExtentElement(effectExtent);
    expect(result).toEqual({
      left: expect.any(Number),
      top: expect.any(Number),
      right: expect.any(Number),
      bottom: expect.any(Number),
    });
    expect(result?.left).toBeCloseTo(1.33, 1);
    expect(result?.top).toBeCloseTo(2.66, 1);
  });

  it("returns undefined when attributes are missing", () => {
    const effectExtent = el("wp:effectExtent", []);
    effectExtent.attrs = { l: "12700", t: "25400" };
    expect(parseEffectExtentElement(effectExtent)).toBeUndefined();
  });
});

describe("parsePositionHElement", () => {
  it("parses horizontal positioning with alignment", () => {
    const positionH = el("wp:positionH", [el("wp:align", [text("center")])]);
    positionH.attrs = { relativeFrom: "margin" };
    const result = parsePositionHElement(positionH);
    expect(result).toEqual({ relativeFrom: "margin", align: "center", offset: undefined });
  });

  it("parses horizontal positioning with absolute offset", () => {
    const positionH = el("wp:positionH", [el("wp:posOffset", [text("457200")])]);
    positionH.attrs = { relativeFrom: "page" };
    const result = parsePositionHElement(positionH);
    expect(result?.relativeFrom).toBe("page");
    expect(result?.offset).toBeCloseTo(48, 0);
    expect(result?.align).toBeUndefined();
  });
});

describe("parsePositionVElement", () => {
  it("parses vertical positioning with alignment", () => {
    const positionV = el("wp:positionV", [el("wp:align", [text("top")])]);
    positionV.attrs = { relativeFrom: "page" };
    const result = parsePositionVElement(positionV);
    expect(result).toEqual({ relativeFrom: "page", align: "top", offset: undefined });
  });

  it("parses vertical positioning with absolute offset", () => {
    const positionV = el("wp:positionV", [el("wp:posOffset", [text("914400")])]);
    positionV.attrs = { relativeFrom: "paragraph" };
    const result = parsePositionVElement(positionV);
    expect(result?.relativeFrom).toBe("paragraph");
    expect(result?.offset).toBeCloseTo(96, 0);
    expect(result?.align).toBeUndefined();
  });
});

describe("parsePosOffsetElement", () => {
  it("parses posOffset value", () => {
    const posOffset = el("wp:posOffset", [text("457200")]);
    const result = parsePosOffsetElement(posOffset);
    expect(result).toBeCloseTo(48, 0);
  });
});

describe("parseSimplePosElement", () => {
  it("parses simple position coordinates", () => {
    const simplePos = el("wp:simplePos", []);
    simplePos.attrs = { x: "914400", y: "457200" };
    const result = parseSimplePosElement(simplePos);
    expect(result).toEqual({ x: expect.any(Number), y: expect.any(Number) });
    expect(result?.x).toBeCloseTo(96, 0);
    expect(result?.y).toBeCloseTo(48, 0);
  });

  it("returns undefined when attributes are missing", () => {
    const simplePos = el("wp:simplePos", []);
    simplePos.attrs = { x: "914400" };
    expect(parseSimplePosElement(simplePos)).toBeUndefined();
  });
});

describe("parseWrapNoneElement", () => {
  it("returns true when element exists", () => {
    const wrapNone = el("wp:wrapNone", []);
    expect(parseWrapNoneElement(wrapNone)).toBe(true);
  });

  it("returns false when element is missing", () => {
    expect(parseWrapNoneElement(undefined)).toBe(false);
  });
});

describe("parseWrapPolygonElement", () => {
  it("parses wrap polygon with start and lineTo points", () => {
    const wrapPolygon = el("wp:wrapPolygon", [
      el("wp:start", []),
      el("wp:lineTo", []),
      el("wp:lineTo", []),
    ]);
    wrapPolygon.attrs = { edited: "1" };
    (wrapPolygon.children[0] as MutableXmlElement).attrs = { x: "0", y: "0" };
    (wrapPolygon.children[1] as MutableXmlElement).attrs = { x: "914400", y: "0" };
    (wrapPolygon.children[2] as MutableXmlElement).attrs = { x: "914400", y: "914400" };

    const result = parseWrapPolygonElement(wrapPolygon);
    expect(result?.edited).toBe(true);
    expect(result?.start).toEqual({ x: 0, y: 0 });
    expect(result?.lineTo).toHaveLength(2);
    expect(result?.lineTo[0].x).toBeCloseTo(96, 0);
  });

  it("returns undefined when required points are missing", () => {
    const wrapPolygon = el("wp:wrapPolygon", [el("wp:start", [])]);
    expect(parseWrapPolygonElement(wrapPolygon)).toBeUndefined();
  });
});

describe("parseWrapSquareElement", () => {
  it("parses wrapSquare attributes and effectExtent", () => {
    const wrapSquare = el("wp:wrapSquare", [el("wp:effectExtent", [])]);
    wrapSquare.attrs = {
      wrapText: "bothSides",
      distT: "12700",
      distB: "25400",
      distL: "38100",
      distR: "50800",
    };
    (wrapSquare.children[0] as MutableXmlElement).attrs = {
      l: "0",
      t: "0",
      r: "12700",
      b: "25400",
    };

    const result = parseWrapSquareElement(wrapSquare);
    expect(result?.wrapText).toBe("bothSides");
    expect(result?.distTop).toBeCloseTo(1.33, 1);
    expect(result?.distRight).toBeCloseTo(5.33, 1);
    expect(result?.effectExtent?.right).toBeCloseTo(1.33, 1);
  });

  it("returns undefined when wrapText is missing", () => {
    const wrapSquare = el("wp:wrapSquare", []);
    expect(parseWrapSquareElement(wrapSquare)).toBeUndefined();
  });
});

describe("parseWrapThroughElement", () => {
  it("parses wrapThrough with polygon and distances", () => {
    const wrapThrough = el("wp:wrapThrough", [
      el("wp:wrapPolygon", [
        el("wp:start", []),
        el("wp:lineTo", []),
        el("wp:lineTo", []),
      ]),
    ]);
    wrapThrough.attrs = { wrapText: "left", distL: "12700", distR: "25400" };
    const polygon = wrapThrough.children[0] as MutableXmlElement;
    (polygon.children[0] as MutableXmlElement).attrs = { x: "0", y: "0" };
    (polygon.children[1] as MutableXmlElement).attrs = { x: "914400", y: "0" };
    (polygon.children[2] as MutableXmlElement).attrs = { x: "914400", y: "914400" };

    const result = parseWrapThroughElement(wrapThrough);
    expect(result?.wrapText).toBe("left");
    expect(result?.distLeft).toBeCloseTo(1.33, 1);
    expect(result?.polygon.lineTo).toHaveLength(2);
  });

  it("returns undefined when wrapPolygon is missing", () => {
    const wrapThrough = el("wp:wrapThrough", []);
    wrapThrough.attrs = { wrapText: "bothSides" };
    expect(parseWrapThroughElement(wrapThrough)).toBeUndefined();
  });
});

describe("parseWrapTightElement", () => {
  it("parses wrapTight with polygon and distances", () => {
    const wrapTight = el("wp:wrapTight", [
      el("wp:wrapPolygon", [
        el("wp:start", []),
        el("wp:lineTo", []),
        el("wp:lineTo", []),
      ]),
    ]);
    wrapTight.attrs = { wrapText: "right", distL: "12700", distR: "25400" };
    const polygon = wrapTight.children[0] as MutableXmlElement;
    (polygon.children[0] as MutableXmlElement).attrs = { x: "0", y: "0" };
    (polygon.children[1] as MutableXmlElement).attrs = { x: "914400", y: "0" };
    (polygon.children[2] as MutableXmlElement).attrs = { x: "914400", y: "914400" };

    const result = parseWrapTightElement(wrapTight);
    expect(result?.wrapText).toBe("right");
    expect(result?.distLeft).toBeCloseTo(1.33, 1);
    expect(result?.polygon.lineTo).toHaveLength(2);
  });

  it("returns undefined when wrapPolygon is missing", () => {
    const wrapTight = el("wp:wrapTight", []);
    wrapTight.attrs = { wrapText: "bothSides" };
    expect(parseWrapTightElement(wrapTight)).toBeUndefined();
  });
});

describe("parseWrapTopAndBottomElement", () => {
  it("parses wrapTopAndBottom distances", () => {
    const wrapTopAndBottom = el("wp:wrapTopAndBottom", []);
    wrapTopAndBottom.attrs = { distT: "457200", distB: "914400" };
    const result = parseWrapTopAndBottomElement(wrapTopAndBottom);
    expect(result?.distTop).toBeCloseTo(48, 0);
    expect(result?.distBottom).toBeCloseTo(96, 0);
  });

  it("returns undefined when element is missing", () => {
    expect(parseWrapTopAndBottomElement(undefined)).toBeUndefined();
  });
});

describe("parseCNvCnPrElement", () => {
  it("parses connector start/end connections", () => {
    const cNvCnPr = el("wp:cNvCnPr", [
      el("a:stCxn", []),
      el("a:endCxn", []),
    ]);
    (cNvCnPr.children[0] as MutableXmlElement).attrs = { id: "5", idx: "1" };
    (cNvCnPr.children[1] as MutableXmlElement).attrs = { id: "9", idx: "2" };
    const result = parseCNvCnPrElement(cNvCnPr);
    expect(result?.startConnection).toEqual({ shapeId: "5", siteIndex: 1 });
    expect(result?.endConnection).toEqual({ shapeId: "9", siteIndex: 2 });
  });

  it("returns undefined when no connections are present", () => {
    const cNvCnPr = el("wp:cNvCnPr", []);
    expect(parseCNvCnPrElement(cNvCnPr)).toBeUndefined();
  });
});

describe("parseCNvContentPartPrElement", () => {
  it("parses isComment attribute", () => {
    const cNvContentPartPr = el("wp:cNvContentPartPr", []);
    cNvContentPartPr.attrs = { isComment: "false" };
    expect(parseCNvContentPartPrElement(cNvContentPartPr)).toEqual({ isComment: false, locks: undefined });
  });

  it("parses cpLocks attributes", () => {
    const cNvContentPartPr = el("wp:cNvContentPartPr", [
      el("a:cpLocks", []),
    ]);
    (cNvContentPartPr.children[0] as MutableXmlElement).attrs = { noGrp: "1", noResize: "0" };
    const result = parseCNvContentPartPrElement(cNvContentPartPr);
    expect(result?.locks?.noGrp).toBe(true);
    expect(result?.locks?.noResize).toBe(false);
  });

  it("returns undefined when element is missing", () => {
    expect(parseCNvContentPartPrElement(undefined)).toBeUndefined();
  });
});

describe("parseCNvFrPrElement", () => {
  it("parses graphic frame locks", () => {
    const cNvFrPr = el("wp:cNvFrPr", [el("a:graphicFrameLocks", [])]);
    (cNvFrPr.children[0] as MutableXmlElement).attrs = { noResize: "1", noMove: "0" };
    const result = parseCNvFrPrElement(cNvFrPr);
    expect(result?.noResize).toBe(true);
    expect(result?.noMove).toBe(false);
  });

  it("returns undefined when no locks are present", () => {
    const cNvFrPr = el("wp:cNvFrPr", []);
    expect(parseCNvFrPrElement(cNvFrPr)).toBeUndefined();
  });
});

describe("parseCNvGrpSpPrElement", () => {
  it("parses group shape locks", () => {
    const cNvGrpSpPr = el("wp:cNvGrpSpPr", [el("a:grpSpLocks", [])]);
    (cNvGrpSpPr.children[0] as MutableXmlElement).attrs = { noUngrp: "1", noMove: "0" };
    const result = parseCNvGrpSpPrElement(cNvGrpSpPr);
    expect(result?.noUngrp).toBe(true);
    expect(result?.noMove).toBe(false);
  });

  it("returns undefined when no locks are present", () => {
    const cNvGrpSpPr = el("wp:cNvGrpSpPr", []);
    expect(parseCNvGrpSpPrElement(cNvGrpSpPr)).toBeUndefined();
  });
});

describe("parseCNvSpPrElement", () => {
  it("parses txBox attribute", () => {
    const cNvSpPr = el("wp:cNvSpPr", []);
    cNvSpPr.attrs = { txBox: "1" };
    expect(parseCNvSpPrElement(cNvSpPr)).toEqual({ txBox: true });
  });

  it("returns undefined when txBox is missing", () => {
    const cNvSpPr = el("wp:cNvSpPr", []);
    expect(parseCNvSpPrElement(cNvSpPr)).toBeUndefined();
  });
});

describe("parseContentPartElement", () => {
  it("parses contentPart attributes", () => {
    const contentPart = el("wp:contentPart", []);
    contentPart.attrs = { "r:id": "rId10", bwMode: "blackWhite" };
    const result = parseContentPartElement(contentPart);
    expect(result).toEqual({ id: "rId10", bwMode: "blackWhite" });
  });

  it("returns undefined when id is missing", () => {
    const contentPart = el("wp:contentPart", []);
    expect(parseContentPartElement(contentPart)).toBeUndefined();
  });
});

describe("parseLinkedTxbxElement", () => {
  it("parses linked textbox attributes", () => {
    const linkedTxbx = el("wp:linkedTxbx", []);
    linkedTxbx.attrs = { id: "3", seq: "2" };
    expect(parseLinkedTxbxElement(linkedTxbx)).toEqual({ id: 3, seq: 2 });
  });

  it("returns undefined when attributes are missing", () => {
    const linkedTxbx = el("wp:linkedTxbx", []);
    expect(parseLinkedTxbxElement(linkedTxbx)).toBeUndefined();
  });
});

describe("parseTxbxElement", () => {
  it("parses txbx id attribute", () => {
    const txbx = el("wp:txbx", []);
    txbx.attrs = { id: "12" };
    expect(parseTxbxElement(txbx)).toEqual({ id: 12 });
  });

  it("returns undefined when id is missing", () => {
    const txbx = el("wp:txbx", []);
    expect(parseTxbxElement(txbx)).toBeUndefined();
  });
});

describe("parseTxbxContentElement", () => {
  it("returns element as-is", () => {
    const txbxContent = el("wp:txbxContent", [el("w:p", [])]);
    expect(parseTxbxContentElement(txbxContent)).toBe(txbxContent);
  });

  it("returns undefined when element is missing", () => {
    expect(parseTxbxContentElement(undefined)).toBeUndefined();
  });
});

describe("parseWgpElement", () => {
  it("returns element as-is", () => {
    const wgp = el("wp:wgp", [el("wp:wsp", [])]);
    expect(parseWgpElement(wgp)).toBe(wgp);
  });

  it("returns undefined when element is missing", () => {
    expect(parseWgpElement(undefined)).toBeUndefined();
  });
});

describe("parseWpcElement", () => {
  it("returns element as-is", () => {
    const wpc = el("wp:wpc", [el("wp:wsp", [])]);
    expect(parseWpcElement(wpc)).toBe(wpc);
  });

  it("returns undefined when element is missing", () => {
    expect(parseWpcElement(undefined)).toBeUndefined();
  });
});

describe("parseWspElement", () => {
  it("parses normalEastAsianFlow attribute", () => {
    const wsp = el("wp:wsp", []);
    wsp.attrs = { normalEastAsianFlow: "true" };
    expect(parseWspElement(wsp)).toEqual({ normalEastAsianFlow: true });
  });

  it("returns undefined when attribute is missing", () => {
    const wsp = el("wp:wsp", []);
    expect(parseWspElement(wsp)).toBeUndefined();
  });
});

describe("parseCxnSpLocksElement", () => {
  it("parses connector locks", () => {
    const locks = el("a:cxnSpLocks", []);
    locks.attrs = { noGrp: "1", noEditPoints: "1", noResize: "0" };
    const result = parseCxnSpLocksElement(locks);
    expect(result?.noGrp).toBe(true);
    expect(result?.noEditPoints).toBe(true);
    expect(result?.noResize).toBe(false);
  });

  it("returns undefined when no attributes are present", () => {
    const locks = el("a:cxnSpLocks", []);
    expect(parseCxnSpLocksElement(locks)).toBeUndefined();
  });
});
