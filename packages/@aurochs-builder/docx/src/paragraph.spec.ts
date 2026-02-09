/**
 * @file Tests for DOCX paragraph serialization
 */
import { getChild, getChildren } from "@aurochs/xml";
import type {
  DocxParagraphSpacing,
  DocxParagraphIndent,
  DocxParagraphBorders,
  DocxNumberingProperties,
  DocxFrameProperties,
  DocxHyperlink,
  DocxBookmarkStart,
  DocxBookmarkEnd,
  DocxParagraphContent,
  DocxParagraph,
} from "@aurochs-office/docx/domain/paragraph";
import {
  serializeSpacing,
  serializeIndent,
  serializeParagraphBorders,
  serializeTabStops,
  serializeNumberingProperties,
  serializeFrameProperties,
  serializeParagraphProperties,
  serializeHyperlink,
  serializeBookmarkStart,
  serializeBookmarkEnd,
  serializeParagraphContent,
  serializeParagraph,
} from "./paragraph";

// =============================================================================
// serializeSpacing
// =============================================================================

describe("serializeSpacing", () => {
  it("serializes all spacing attributes", () => {
    const spacing: DocxParagraphSpacing = {
      before: 240,
      beforeLines: 100,
      beforeAutospacing: true,
      after: 120,
      afterLines: 50,
      afterAutospacing: false,
      line: 360,
      lineRule: "auto",
    };
    const el = serializeSpacing(spacing);
    expect(el.name).toBe("w:spacing");
    expect(el.attrs["w:before"]).toBe("240");
    expect(el.attrs["w:beforeLines"]).toBe("100");
    expect(el.attrs["w:beforeAutospacing"]).toBe("1");
    expect(el.attrs["w:after"]).toBe("120");
    expect(el.attrs["w:afterLines"]).toBe("50");
    expect(el.attrs["w:afterAutospacing"]).toBe("0");
    expect(el.attrs["w:line"]).toBe("360");
    expect(el.attrs["w:lineRule"]).toBe("auto");
  });

  it("omits undefined attributes", () => {
    const el = serializeSpacing({ before: 100 });
    expect(el.attrs["w:before"]).toBe("100");
    expect(el.attrs["w:after"]).toBeUndefined();
    expect(el.attrs["w:line"]).toBeUndefined();
  });
});

// =============================================================================
// serializeIndent
// =============================================================================

describe("serializeIndent", () => {
  it("serializes all indent attributes", () => {
    const indent: DocxParagraphIndent = {
      left: 720,
      leftChars: 200,
      right: 360,
      rightChars: 100,
      hanging: 360,
      hangingChars: 100,
      firstLine: 720,
      firstLineChars: 200,
    };
    const el = serializeIndent(indent);
    expect(el.name).toBe("w:ind");
    expect(el.attrs["w:left"]).toBe("720");
    expect(el.attrs["w:leftChars"]).toBe("200");
    expect(el.attrs["w:right"]).toBe("360");
    expect(el.attrs["w:rightChars"]).toBe("100");
    expect(el.attrs["w:hanging"]).toBe("360");
    expect(el.attrs["w:hangingChars"]).toBe("100");
    expect(el.attrs["w:firstLine"]).toBe("720");
    expect(el.attrs["w:firstLineChars"]).toBe("200");
  });

  it("serializes left indent only", () => {
    const el = serializeIndent({ left: 1440 });
    expect(el.attrs["w:left"]).toBe("1440");
    expect(el.attrs["w:right"]).toBeUndefined();
  });
});

// =============================================================================
// serializeParagraphBorders
// =============================================================================

describe("serializeParagraphBorders", () => {
  it("serializes all 6 border edges", () => {
    const edge = { val: "single", sz: 4, space: 1, color: "000000" };
    const borders: DocxParagraphBorders = {
      top: edge,
      left: edge,
      bottom: edge,
      right: edge,
      between: edge,
      bar: edge,
    };
    const el = serializeParagraphBorders(borders);
    expect(el.name).toBe("w:pBdr");
    expect(getChild(el, "w:top")?.attrs["w:val"]).toBe("single");
    expect(getChild(el, "w:left")).toBeDefined();
    expect(getChild(el, "w:bottom")).toBeDefined();
    expect(getChild(el, "w:right")).toBeDefined();
    expect(getChild(el, "w:between")).toBeDefined();
    expect(getChild(el, "w:bar")).toBeDefined();
  });

  it("serializes border edge with shadow and frame", () => {
    const borders: DocxParagraphBorders = {
      top: { val: "single", shadow: true, frame: false },
    };
    const el = serializeParagraphBorders(borders);
    const top = getChild(el, "w:top")!;
    expect(top.attrs["w:shadow"]).toBe("1");
    expect(top.attrs["w:frame"]).toBe("0");
  });

  it("serializes partial borders", () => {
    const el = serializeParagraphBorders({ top: { val: "single" } });
    expect(getChild(el, "w:top")).toBeDefined();
    expect(getChild(el, "w:bottom")).toBeUndefined();
  });
});

// =============================================================================
// serializeTabStops
// =============================================================================

describe("serializeTabStops", () => {
  it("serializes tab stops array", () => {
    const el = serializeTabStops({
      tabs: [
        { val: "left", pos: 2160, leader: "dot" },
        { val: "right", pos: 9360 },
      ],
    });
    expect(el.name).toBe("w:tabs");
    const tabs = getChildren(el, "w:tab");
    expect(tabs).toHaveLength(2);
    expect(tabs[0].attrs["w:val"]).toBe("left");
    expect(tabs[0].attrs["w:pos"]).toBe("2160");
    expect(tabs[0].attrs["w:leader"]).toBe("dot");
    expect(tabs[1].attrs["w:val"]).toBe("right");
    expect(tabs[1].attrs["w:leader"]).toBeUndefined();
  });

  it("serializes empty tabs", () => {
    const el = serializeTabStops({ tabs: [] });
    expect(el.name).toBe("w:tabs");
    expect(el.children).toHaveLength(0);
  });
});

// =============================================================================
// serializeNumberingProperties
// =============================================================================

describe("serializeNumberingProperties", () => {
  it("serializes numPr with ilvl and numId", () => {
    const numPr: DocxNumberingProperties = { ilvl: 0, numId: 1 };
    const el = serializeNumberingProperties(numPr);
    expect(el.name).toBe("w:numPr");
    expect(getChild(el, "w:ilvl")?.attrs["w:val"]).toBe("0");
    expect(getChild(el, "w:numId")?.attrs["w:val"]).toBe("1");
  });

  it("omits undefined ilvl", () => {
    const el = serializeNumberingProperties({ numId: 5 } as DocxNumberingProperties);
    expect(getChild(el, "w:ilvl")).toBeUndefined();
    expect(getChild(el, "w:numId")?.attrs["w:val"]).toBe("5");
  });
});

// =============================================================================
// serializeFrameProperties
// =============================================================================

describe("serializeFrameProperties", () => {
  it("serializes all frame properties", () => {
    const framePr: DocxFrameProperties = {
      w: 4320,
      h: 2160,
      hRule: "exact",
      hSpace: 180,
      vSpace: 180,
      wrap: "around",
      hAnchor: "margin",
      vAnchor: "text",
      x: 720,
      xAlign: "center",
      y: 360,
      yAlign: "top",
      anchorLock: true,
      dropCap: "drop",
      lines: 3,
    };
    const el = serializeFrameProperties(framePr);
    expect(el.name).toBe("w:framePr");
    expect(el.attrs["w:w"]).toBe("4320");
    expect(el.attrs["w:h"]).toBe("2160");
    expect(el.attrs["w:hRule"]).toBe("exact");
    expect(el.attrs["w:hSpace"]).toBe("180");
    expect(el.attrs["w:vSpace"]).toBe("180");
    expect(el.attrs["w:wrap"]).toBe("around");
    expect(el.attrs["w:hAnchor"]).toBe("margin");
    expect(el.attrs["w:vAnchor"]).toBe("text");
    expect(el.attrs["w:x"]).toBe("720");
    expect(el.attrs["w:xAlign"]).toBe("center");
    expect(el.attrs["w:y"]).toBe("360");
    expect(el.attrs["w:yAlign"]).toBe("top");
    expect(el.attrs["w:anchorLock"]).toBe("1");
    expect(el.attrs["w:dropCap"]).toBe("drop");
    expect(el.attrs["w:lines"]).toBe("3");
  });

  it("serializes anchorLock false", () => {
    const el = serializeFrameProperties({ anchorLock: false } as DocxFrameProperties);
    expect(el.attrs["w:anchorLock"]).toBe("0");
  });
});

// =============================================================================
// serializeParagraphProperties
// =============================================================================

describe("serializeParagraphProperties", () => {
  it("returns undefined for undefined input", () => {
    expect(serializeParagraphProperties(undefined)).toBeUndefined();
  });

  it("returns undefined for empty properties", () => {
    expect(serializeParagraphProperties({})).toBeUndefined();
  });

  it("serializes pStyle", () => {
    const el = serializeParagraphProperties({ pStyle: "Heading1" })!;
    expect(getChild(el, "w:pStyle")?.attrs["w:val"]).toBe("Heading1");
  });

  it("serializes toggle properties", () => {
    const el = serializeParagraphProperties({
      keepNext: true,
      keepLines: false,
      pageBreakBefore: true,
      widowControl: false,
      suppressLineNumbers: true,
    })!;
    expect(getChild(el, "w:keepNext")).toBeDefined();
    expect(getChild(el, "w:keepNext")!.attrs["w:val"]).toBeUndefined();
    expect(getChild(el, "w:keepLines")?.attrs["w:val"]).toBe("0");
    expect(getChild(el, "w:pageBreakBefore")).toBeDefined();
    expect(getChild(el, "w:widowControl")?.attrs["w:val"]).toBe("0");
    expect(getChild(el, "w:suppressLineNumbers")).toBeDefined();
  });

  it("serializes framePr", () => {
    const el = serializeParagraphProperties({ framePr: { w: 1440 } as DocxFrameProperties })!;
    expect(getChild(el, "w:framePr")?.attrs["w:w"]).toBe("1440");
  });

  it("serializes numPr", () => {
    const el = serializeParagraphProperties({ numPr: { ilvl: 0, numId: 1 } })!;
    expect(getChild(el, "w:numPr")).toBeDefined();
  });

  it("serializes paragraph borders", () => {
    const el = serializeParagraphProperties({
      pBdr: { top: { val: "single" } },
    })!;
    expect(getChild(el, "w:pBdr")).toBeDefined();
  });

  it("serializes shading via run module", () => {
    const el = serializeParagraphProperties({
      shd: { val: "clear", fill: "FFFF00" },
    })!;
    expect(getChild(el, "w:shd")?.attrs["w:fill"]).toBe("FFFF00");
  });

  it("serializes tabs", () => {
    const el = serializeParagraphProperties({
      tabs: { tabs: [{ val: "left", pos: 720 }] },
    })!;
    expect(getChild(el, "w:tabs")).toBeDefined();
  });

  it("serializes Asian typography toggles", () => {
    const el = serializeParagraphProperties({
      suppressAutoHyphens: true,
      kinsoku: true,
      wordWrap: false,
      overflowPunct: true,
      topLinePunct: true,
      autoSpaceDE: false,
      autoSpaceDN: false,
    })!;
    expect(getChild(el, "w:suppressAutoHyphens")).toBeDefined();
    expect(getChild(el, "w:kinsoku")).toBeDefined();
    expect(getChild(el, "w:wordWrap")?.attrs["w:val"]).toBe("0");
    expect(getChild(el, "w:overflowPunct")).toBeDefined();
    expect(getChild(el, "w:topLinePunct")).toBeDefined();
    expect(getChild(el, "w:autoSpaceDE")?.attrs["w:val"]).toBe("0");
    expect(getChild(el, "w:autoSpaceDN")?.attrs["w:val"]).toBe("0");
  });

  it("serializes bidi", () => {
    const el = serializeParagraphProperties({ bidi: true })!;
    expect(getChild(el, "w:bidi")).toBeDefined();
  });

  it("serializes spacing", () => {
    const el = serializeParagraphProperties({ spacing: { before: 240, after: 120 } })!;
    const sp = getChild(el, "w:spacing")!;
    expect(sp.attrs["w:before"]).toBe("240");
    expect(sp.attrs["w:after"]).toBe("120");
  });

  it("serializes indent", () => {
    const el = serializeParagraphProperties({ ind: { left: 720 } })!;
    expect(getChild(el, "w:ind")?.attrs["w:left"]).toBe("720");
  });

  it("serializes contextualSpacing and mirrorIndents", () => {
    const el = serializeParagraphProperties({
      contextualSpacing: true,
      mirrorIndents: true,
    })!;
    expect(getChild(el, "w:contextualSpacing")).toBeDefined();
    expect(getChild(el, "w:mirrorIndents")).toBeDefined();
  });

  it("serializes jc", () => {
    const el = serializeParagraphProperties({ jc: "center" })!;
    expect(getChild(el, "w:jc")?.attrs["w:val"]).toBe("center");
  });

  it("serializes textDirection and textAlignment", () => {
    const el = serializeParagraphProperties({
      textDirection: "lrTb",
      textAlignment: "auto",
    })!;
    expect(getChild(el, "w:textDirection")?.attrs["w:val"]).toBe("lrTb");
    expect(getChild(el, "w:textAlignment")?.attrs["w:val"]).toBe("auto");
  });

  it("serializes outlineLvl", () => {
    const el = serializeParagraphProperties({ outlineLvl: 0 })!;
    expect(getChild(el, "w:outlineLvl")?.attrs["w:val"]).toBe("0");
  });

  it("serializes rPr for paragraph mark", () => {
    const el = serializeParagraphProperties({ rPr: { b: true, sz: 24 } })!;
    const rPr = getChild(el, "w:rPr");
    expect(rPr).toBeDefined();
    expect(getChild(rPr!, "w:b")).toBeDefined();
  });
});

// =============================================================================
// serializeHyperlink
// =============================================================================

describe("serializeHyperlink", () => {
  it("serializes external hyperlink", () => {
    const hyperlink: DocxHyperlink = {
      type: "hyperlink",
      rId: "rId1",
      tooltip: "Click here",
      content: [{ type: "run", content: [{ type: "text", value: "Link" }] }],
    };
    const el = serializeHyperlink(hyperlink);
    expect(el.name).toBe("w:hyperlink");
    expect(el.attrs["r:id"]).toBe("rId1");
    expect(el.attrs["w:tooltip"]).toBe("Click here");
    expect(getChild(el, "w:r")).toBeDefined();
  });

  it("serializes internal anchor", () => {
    const hyperlink: DocxHyperlink = {
      type: "hyperlink",
      anchor: "bookmark1",
      content: [{ type: "run", content: [{ type: "text", value: "Go to bookmark" }] }],
    };
    const el = serializeHyperlink(hyperlink);
    expect(el.attrs["w:anchor"]).toBe("bookmark1");
    expect(el.attrs["r:id"]).toBeUndefined();
  });

  it("serializes tgtFrame and history", () => {
    const hyperlink: DocxHyperlink = {
      type: "hyperlink",
      rId: "rId1",
      tgtFrame: "_blank",
      history: true,
      content: [],
    };
    const el = serializeHyperlink(hyperlink);
    expect(el.attrs["w:tgtFrame"]).toBe("_blank");
    expect(el.attrs["w:history"]).toBe("1");
  });

  it("serializes history false", () => {
    const hyperlink: DocxHyperlink = {
      type: "hyperlink",
      rId: "rId1",
      history: false,
      content: [],
    };
    const el = serializeHyperlink(hyperlink);
    expect(el.attrs["w:history"]).toBe("0");
  });
});

// =============================================================================
// serializeBookmarkStart / serializeBookmarkEnd
// =============================================================================

describe("serializeBookmarkStart", () => {
  it("serializes bookmark start", () => {
    const bookmark: DocxBookmarkStart = { type: "bookmarkStart", id: 0, name: "_GoBack" };
    const el = serializeBookmarkStart(bookmark);
    expect(el.name).toBe("w:bookmarkStart");
    expect(el.attrs["w:id"]).toBe("0");
    expect(el.attrs["w:name"]).toBe("_GoBack");
  });
});

describe("serializeBookmarkEnd", () => {
  it("serializes bookmark end", () => {
    const bookmark: DocxBookmarkEnd = { type: "bookmarkEnd", id: 0 };
    const el = serializeBookmarkEnd(bookmark);
    expect(el.name).toBe("w:bookmarkEnd");
    expect(el.attrs["w:id"]).toBe("0");
  });
});

// =============================================================================
// serializeParagraphContent
// =============================================================================

describe("serializeParagraphContent", () => {
  it("serializes run content", () => {
    const content: DocxParagraphContent = {
      type: "run",
      content: [{ type: "text", value: "Hello" }],
    };
    const el = serializeParagraphContent(content);
    expect(el?.name).toBe("w:r");
  });

  it("serializes hyperlink content", () => {
    const content: DocxParagraphContent = {
      type: "hyperlink",
      rId: "rId1",
      content: [],
    };
    const el = serializeParagraphContent(content);
    expect(el?.name).toBe("w:hyperlink");
  });

  it("serializes bookmarkStart", () => {
    const content: DocxParagraphContent = { type: "bookmarkStart", id: 0, name: "test" };
    const el = serializeParagraphContent(content);
    expect(el?.name).toBe("w:bookmarkStart");
  });

  it("serializes bookmarkEnd", () => {
    const content: DocxParagraphContent = { type: "bookmarkEnd", id: 0 };
    const el = serializeParagraphContent(content);
    expect(el?.name).toBe("w:bookmarkEnd");
  });

});

// =============================================================================
// serializeParagraph
// =============================================================================

describe("serializeParagraph", () => {
  it("serializes paragraph with properties and content", () => {
    const paragraph: DocxParagraph = {
      type: "paragraph",
      properties: { jc: "center" },
      content: [
        { type: "run", content: [{ type: "text", value: "Hello" }] },
      ],
    };
    const el = serializeParagraph(paragraph);
    expect(el.name).toBe("w:p");
    expect(getChild(el, "w:pPr")).toBeDefined();
    expect(getChild(el, "w:r")).toBeDefined();
  });

  it("serializes empty paragraph", () => {
    const paragraph: DocxParagraph = { type: "paragraph", content: [] };
    const el = serializeParagraph(paragraph);
    expect(el.name).toBe("w:p");
    expect(el.children).toHaveLength(0);
  });

  it("serializes paragraph without properties", () => {
    const paragraph: DocxParagraph = {
      type: "paragraph",
      content: [{ type: "run", content: [{ type: "text", value: "text" }] }],
    };
    const el = serializeParagraph(paragraph);
    expect(getChild(el, "w:pPr")).toBeUndefined();
    expect(getChild(el, "w:r")).toBeDefined();
  });
});
