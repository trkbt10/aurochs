import { describe, it, expect } from "vitest";
import { getChild, getChildren } from "@aurochs/xml";
import type {
  DocxPageSize,
  DocxPageMargins,
  DocxPageBorders,
  DocxColumns,
  DocxHeaderFooterRef,
  DocxLineNumbering,
  DocxPageNumberType,
  DocxDocGrid,
  DocxNotePr,
  DocxSectionProperties,
} from "@aurochs-office/docx/domain/section";
import {
  serializePageSize,
  serializePageMargins,
  serializePageBorders,
  serializeColumns,
  serializeHeaderReference,
  serializeFooterReference,
  serializeLineNumbering,
  serializePageNumberType,
  serializeDocGrid,
  serializeNotePr,
  serializeSectionProperties,
} from "./section";

// =============================================================================
// serializePageSize
// =============================================================================

describe("serializePageSize", () => {
  it("serializes all attributes", () => {
    const pgSz: DocxPageSize = { w: 12240, h: 15840, orient: "portrait", code: 1 };
    const el = serializePageSize(pgSz);
    expect(el.name).toBe("w:pgSz");
    expect(el.attrs["w:w"]).toBe("12240");
    expect(el.attrs["w:h"]).toBe("15840");
    expect(el.attrs["w:orient"]).toBe("portrait");
    expect(el.attrs["w:code"]).toBe("1");
  });

  it("serializes landscape", () => {
    const el = serializePageSize({ w: 15840, h: 12240, orient: "landscape" });
    expect(el.attrs["w:orient"]).toBe("landscape");
  });

  it("omits undefined attributes", () => {
    const el = serializePageSize({ w: 12240, h: 15840 });
    expect(el.attrs["w:orient"]).toBeUndefined();
    expect(el.attrs["w:code"]).toBeUndefined();
  });
});

// =============================================================================
// serializePageMargins
// =============================================================================

describe("serializePageMargins", () => {
  it("serializes all margin attributes", () => {
    const pgMar: DocxPageMargins = {
      top: 1440, right: 1440, bottom: 1440, left: 1440,
      header: 720, footer: 720, gutter: 0,
    };
    const el = serializePageMargins(pgMar);
    expect(el.name).toBe("w:pgMar");
    expect(el.attrs["w:top"]).toBe("1440");
    expect(el.attrs["w:right"]).toBe("1440");
    expect(el.attrs["w:bottom"]).toBe("1440");
    expect(el.attrs["w:left"]).toBe("1440");
    expect(el.attrs["w:header"]).toBe("720");
    expect(el.attrs["w:footer"]).toBe("720");
    expect(el.attrs["w:gutter"]).toBe("0");
  });
});

// =============================================================================
// serializePageBorders
// =============================================================================

describe("serializePageBorders", () => {
  it("serializes attributes and edges", () => {
    const pgBorders: DocxPageBorders = {
      zOrder: "front",
      display: "allPages",
      offsetFrom: "page",
      top: { val: "single", sz: 12, color: "FF0000" },
      bottom: { val: "single", sz: 12, color: "FF0000" },
    };
    const el = serializePageBorders(pgBorders);
    expect(el.name).toBe("w:pgBorders");
    expect(el.attrs["w:zOrder"]).toBe("front");
    expect(el.attrs["w:display"]).toBe("allPages");
    expect(el.attrs["w:offsetFrom"]).toBe("page");
    expect(getChild(el, "w:top")?.attrs["w:val"]).toBe("single");
    expect(getChild(el, "w:bottom")).toBeDefined();
    expect(getChild(el, "w:left")).toBeUndefined();
  });
});

// =============================================================================
// serializeColumns
// =============================================================================

describe("serializeColumns", () => {
  it("serializes equal width columns", () => {
    const cols: DocxColumns = { space: 720, num: 2, equalWidth: true, sep: false };
    const el = serializeColumns(cols);
    expect(el.name).toBe("w:cols");
    expect(el.attrs["w:space"]).toBe("720");
    expect(el.attrs["w:num"]).toBe("2");
    expect(el.attrs["w:equalWidth"]).toBe("1");
    expect(el.attrs["w:sep"]).toBe("0");
  });

  it("serializes custom column definitions", () => {
    const cols: DocxColumns = {
      equalWidth: false,
      col: [{ w: 4320, space: 720 }, { w: 4320 }],
    };
    const el = serializeColumns(cols);
    const colEls = getChildren(el, "w:col");
    expect(colEls).toHaveLength(2);
    expect(colEls[0].attrs["w:w"]).toBe("4320");
    expect(colEls[0].attrs["w:space"]).toBe("720");
    expect(colEls[1].attrs["w:space"]).toBeUndefined();
  });

  it("serializes empty columns", () => {
    const el = serializeColumns({});
    expect(el.name).toBe("w:cols");
    expect(el.children).toHaveLength(0);
  });
});

// =============================================================================
// serializeHeaderReference / serializeFooterReference
// =============================================================================

describe("serializeHeaderReference", () => {
  it("serializes header reference", () => {
    const ref: DocxHeaderFooterRef = { type: "default", rId: "rId1" };
    const el = serializeHeaderReference(ref);
    expect(el.name).toBe("w:headerReference");
    expect(el.attrs["w:type"]).toBe("default");
    expect(el.attrs["r:id"]).toBe("rId1");
  });
});

describe("serializeFooterReference", () => {
  it("serializes footer reference", () => {
    const ref: DocxHeaderFooterRef = { type: "even", rId: "rId2" };
    const el = serializeFooterReference(ref);
    expect(el.name).toBe("w:footerReference");
    expect(el.attrs["w:type"]).toBe("even");
    expect(el.attrs["r:id"]).toBe("rId2");
  });
});

// =============================================================================
// serializeLineNumbering
// =============================================================================

describe("serializeLineNumbering", () => {
  it("serializes all attributes", () => {
    const lnNum: DocxLineNumbering = {
      countBy: 5,
      start: 1,
      distance: 360,
      restart: "newPage",
    };
    const el = serializeLineNumbering(lnNum);
    expect(el.name).toBe("w:lnNumType");
    expect(el.attrs["w:countBy"]).toBe("5");
    expect(el.attrs["w:start"]).toBe("1");
    expect(el.attrs["w:distance"]).toBe("360");
    expect(el.attrs["w:restart"]).toBe("newPage");
  });
});

// =============================================================================
// serializePageNumberType
// =============================================================================

describe("serializePageNumberType", () => {
  it("serializes all attributes", () => {
    const pgNum: DocxPageNumberType = {
      fmt: "decimal",
      start: 1,
      chapStyle: 1,
      chapSep: "hyphen",
    };
    const el = serializePageNumberType(pgNum);
    expect(el.name).toBe("w:pgNumType");
    expect(el.attrs["w:fmt"]).toBe("decimal");
    expect(el.attrs["w:start"]).toBe("1");
    expect(el.attrs["w:chapStyle"]).toBe("1");
    expect(el.attrs["w:chapSep"]).toBe("hyphen");
  });
});

// =============================================================================
// serializeDocGrid
// =============================================================================

describe("serializeDocGrid", () => {
  it("serializes all attributes", () => {
    const grid: DocxDocGrid = { type: "lines", linePitch: 360, charSpace: 0 };
    const el = serializeDocGrid(grid);
    expect(el.name).toBe("w:docGrid");
    expect(el.attrs["w:type"]).toBe("lines");
    expect(el.attrs["w:linePitch"]).toBe("360");
    expect(el.attrs["w:charSpace"]).toBe("0");
  });
});

// =============================================================================
// serializeNotePr
// =============================================================================

describe("serializeNotePr", () => {
  it("serializes footnote properties", () => {
    const notePr: DocxNotePr = {
      pos: "pageBottom",
      numFmt: "decimal",
      numStart: 1,
      numRestart: "continuous",
    };
    const el = serializeNotePr(notePr, "footnotePr");
    expect(el.name).toBe("w:footnotePr");
    expect(getChild(el, "w:pos")?.attrs["w:val"]).toBe("pageBottom");
    expect(getChild(el, "w:numFmt")?.attrs["w:val"]).toBe("decimal");
    expect(getChild(el, "w:numStart")?.attrs["w:val"]).toBe("1");
    expect(getChild(el, "w:numRestart")?.attrs["w:val"]).toBe("continuous");
  });

  it("serializes endnote properties", () => {
    const el = serializeNotePr({ pos: "sectEnd" }, "endnotePr");
    expect(el.name).toBe("w:endnotePr");
    expect(getChild(el, "w:pos")?.attrs["w:val"]).toBe("sectEnd");
  });
});

// =============================================================================
// serializeSectionProperties
// =============================================================================

describe("serializeSectionProperties", () => {
  it("returns undefined for undefined", () => {
    expect(serializeSectionProperties(undefined)).toBeUndefined();
  });

  it("returns undefined for empty", () => {
    expect(serializeSectionProperties({})).toBeUndefined();
  });

  it("serializes header and footer references", () => {
    const el = serializeSectionProperties({
      headerReference: [{ type: "default", rId: "rId1" }, { type: "first", rId: "rId2" }],
      footerReference: [{ type: "default", rId: "rId3" }],
    })!;
    expect(getChildren(el, "w:headerReference")).toHaveLength(2);
    expect(getChildren(el, "w:footerReference")).toHaveLength(1);
  });

  it("serializes footnote and endnote properties", () => {
    const el = serializeSectionProperties({
      footnotePr: { pos: "pageBottom" },
      endnotePr: { pos: "sectEnd" },
    })!;
    expect(getChild(el, "w:footnotePr")).toBeDefined();
    expect(getChild(el, "w:endnotePr")).toBeDefined();
  });

  it("serializes section type", () => {
    const el = serializeSectionProperties({ type: "continuous" })!;
    expect(getChild(el, "w:type")?.attrs["w:val"]).toBe("continuous");
  });

  it("serializes page size and margins", () => {
    const el = serializeSectionProperties({
      pgSz: { w: 12240, h: 15840 },
      pgMar: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
    })!;
    expect(getChild(el, "w:pgSz")).toBeDefined();
    expect(getChild(el, "w:pgMar")).toBeDefined();
  });

  it("serializes page borders", () => {
    const el = serializeSectionProperties({
      pgBorders: { top: { val: "single" } },
    })!;
    expect(getChild(el, "w:pgBorders")).toBeDefined();
  });

  it("serializes line numbering and page number type", () => {
    const el = serializeSectionProperties({
      lnNumType: { countBy: 1 },
      pgNumType: { fmt: "decimal", start: 1 },
    })!;
    expect(getChild(el, "w:lnNumType")).toBeDefined();
    expect(getChild(el, "w:pgNumType")).toBeDefined();
  });

  it("serializes columns", () => {
    const el = serializeSectionProperties({
      cols: { num: 2, space: 720 },
    })!;
    expect(getChild(el, "w:cols")).toBeDefined();
  });

  it("serializes boolean flags as empty elements", () => {
    const el = serializeSectionProperties({
      noEndnote: true,
      titlePg: true,
      bidi: true,
      rtlGutter: true,
    })!;
    expect(getChild(el, "w:noEndnote")).toBeDefined();
    expect(getChild(el, "w:titlePg")).toBeDefined();
    expect(getChild(el, "w:bidi")).toBeDefined();
    expect(getChild(el, "w:rtlGutter")).toBeDefined();
  });

  it("serializes vAlign", () => {
    const el = serializeSectionProperties({ vAlign: "center" })!;
    expect(getChild(el, "w:vAlign")?.attrs["w:val"]).toBe("center");
  });

  it("serializes docGrid", () => {
    const el = serializeSectionProperties({
      docGrid: { type: "lines", linePitch: 360 },
    })!;
    expect(getChild(el, "w:docGrid")).toBeDefined();
  });
});
