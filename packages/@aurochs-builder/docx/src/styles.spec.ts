/**
 * @file Tests for DOCX styles serialization
 */
import { getChild, getChildren } from "@aurochs/xml";
import type {
  DocxDocDefaults,
  DocxLatentStyleException,
  DocxLatentStyles,
  DocxTableStylePr,
  DocxStyle,
  DocxStyles,
} from "@aurochs-office/docx/domain/styles";
import {
  serializeDocDefaults,
  serializeLatentStyleException,
  serializeLatentStyles,
  serializeTableStylePr,
  serializeStyle,
  serializeStyles,
} from "./styles";

// =============================================================================
// serializeDocDefaults
// =============================================================================

describe("serializeDocDefaults", () => {
  it("serializes rPrDefault", () => {
    const docDefaults: DocxDocDefaults = {
      rPrDefault: { rPr: { sz: 24, rFonts: { ascii: "Calibri" } } },
    };
    const el = serializeDocDefaults(docDefaults);
    expect(el.name).toBe("w:docDefaults");
    const rPrDefault = getChild(el, "w:rPrDefault");
    expect(rPrDefault).toBeDefined();
    expect(getChild(rPrDefault!, "w:rPr")).toBeDefined();
  });

  it("serializes pPrDefault", () => {
    const docDefaults: DocxDocDefaults = {
      pPrDefault: { pPr: { spacing: { after: 200, line: 276, lineRule: "auto" } } },
    };
    const el = serializeDocDefaults(docDefaults);
    const pPrDefault = getChild(el, "w:pPrDefault");
    expect(pPrDefault).toBeDefined();
    expect(getChild(pPrDefault!, "w:pPr")).toBeDefined();
  });

  it("serializes empty defaults", () => {
    const el = serializeDocDefaults({});
    expect(el.name).toBe("w:docDefaults");
    expect(el.children).toHaveLength(0);
  });

  it("skips rPrDefault when rPr is empty", () => {
    const el = serializeDocDefaults({ rPrDefault: { rPr: {} } });
    // Empty rPr returns undefined, so rPrDefault should not be added
    expect(getChild(el, "w:rPrDefault")).toBeUndefined();
  });
});

// =============================================================================
// serializeLatentStyleException
// =============================================================================

describe("serializeLatentStyleException", () => {
  it("serializes all attributes", () => {
    const exception: DocxLatentStyleException = {
      name: "Normal",
      locked: false,
      uiPriority: 0,
      semiHidden: false,
      unhideWhenUsed: false,
      qFormat: true,
    };
    const el = serializeLatentStyleException(exception);
    expect(el.name).toBe("w:lsdException");
    expect(el.attrs["w:name"]).toBe("Normal");
    expect(el.attrs["w:locked"]).toBe("0");
    expect(el.attrs["w:uiPriority"]).toBe("0");
    expect(el.attrs["w:semiHidden"]).toBe("0");
    expect(el.attrs["w:unhideWhenUsed"]).toBe("0");
    expect(el.attrs["w:qFormat"]).toBe("1");
  });

  it("serializes name only", () => {
    const el = serializeLatentStyleException({ name: "Heading1" });
    expect(el.attrs["w:name"]).toBe("Heading1");
    expect(el.attrs["w:locked"]).toBeUndefined();
  });
});

// =============================================================================
// serializeLatentStyles
// =============================================================================

describe("serializeLatentStyles", () => {
  it("serializes default attributes and exceptions", () => {
    const latent: DocxLatentStyles = {
      defLockedState: false,
      defUIPriority: 99,
      defSemiHidden: true,
      defUnhideWhenUsed: true,
      defQFormat: false,
      count: 376,
      lsdException: [{ name: "Normal", qFormat: true }],
    };
    const el = serializeLatentStyles(latent);
    expect(el.name).toBe("w:latentStyles");
    expect(el.attrs["w:defLockedState"]).toBe("0");
    expect(el.attrs["w:defUIPriority"]).toBe("99");
    expect(el.attrs["w:defSemiHidden"]).toBe("1");
    expect(el.attrs["w:defUnhideWhenUsed"]).toBe("1");
    expect(el.attrs["w:defQFormat"]).toBe("0");
    expect(el.attrs["w:count"]).toBe("376");
    expect(getChildren(el, "w:lsdException")).toHaveLength(1);
  });

  it("serializes empty exceptions", () => {
    const el = serializeLatentStyles({ lsdException: [] });
    expect(el.children).toHaveLength(0);
  });

  it("serializes without lsdException array", () => {
    const el = serializeLatentStyles({});
    expect(el.children).toHaveLength(0);
  });
});

// =============================================================================
// serializeTableStylePr
// =============================================================================

describe("serializeTableStylePr", () => {
  it("serializes with type and properties", () => {
    const tsp: DocxTableStylePr = {
      type: "firstRow",
      pPr: { jc: "center" },
      rPr: { b: true },
    };
    const el = serializeTableStylePr(tsp);
    expect(el.name).toBe("w:tblStylePr");
    expect(el.attrs["w:type"]).toBe("firstRow");
    expect(getChild(el, "w:pPr")).toBeDefined();
    expect(getChild(el, "w:rPr")).toBeDefined();
  });

  it("serializes with type only", () => {
    const el = serializeTableStylePr({ type: "band1Horz" });
    expect(el.attrs["w:type"]).toBe("band1Horz");
    expect(el.children).toHaveLength(0);
  });
});

// =============================================================================
// serializeStyle
// =============================================================================

describe("serializeStyle", () => {
  it("serializes paragraph style", () => {
    const style: DocxStyle = {
      type: "paragraph",
      styleId: "Heading1",
      name: { val: "heading 1" },
      basedOn: { val: "Normal" },
      next: { val: "Normal" },
      uiPriority: { val: 9 },
      qFormat: true,
      pPr: { spacing: { before: 240, after: 0 }, outlineLvl: 0 },
      rPr: { b: true, sz: 32 },
    };
    const el = serializeStyle(style);
    expect(el.name).toBe("w:style");
    expect(el.attrs["w:type"]).toBe("paragraph");
    expect(el.attrs["w:styleId"]).toBe("Heading1");
    expect(getChild(el, "w:name")?.attrs["w:val"]).toBe("heading 1");
    expect(getChild(el, "w:basedOn")?.attrs["w:val"]).toBe("Normal");
    expect(getChild(el, "w:next")?.attrs["w:val"]).toBe("Normal");
    expect(getChild(el, "w:uiPriority")?.attrs["w:val"]).toBe("9");
    expect(getChild(el, "w:qFormat")).toBeDefined();
    expect(getChild(el, "w:pPr")).toBeDefined();
    expect(getChild(el, "w:rPr")).toBeDefined();
  });

  it("serializes default and customStyle attributes", () => {
    const el = serializeStyle({
      type: "paragraph",
      styleId: "Normal",
      default: true,
      customStyle: false,
    });
    expect(el.attrs["w:default"]).toBe("1");
    expect(el.attrs["w:customStyle"]).toBe("0");
  });

  it("serializes aliases and link", () => {
    const el = serializeStyle({
      type: "character",
      styleId: "Emphasis",
      aliases: { val: "em,italic" },
      link: { val: "EmphasisPara" },
    });
    expect(getChild(el, "w:aliases")?.attrs["w:val"]).toBe("em,italic");
    expect(getChild(el, "w:link")?.attrs["w:val"]).toBe("EmphasisPara");
  });

  it("serializes boolean flags as empty elements", () => {
    const el = serializeStyle({
      type: "paragraph",
      styleId: "Test",
      semiHidden: true,
      unhideWhenUsed: true,
      locked: true,
      personal: true,
      personalCompose: true,
      personalReply: true,
    });
    expect(getChild(el, "w:semiHidden")).toBeDefined();
    expect(getChild(el, "w:unhideWhenUsed")).toBeDefined();
    expect(getChild(el, "w:locked")).toBeDefined();
    expect(getChild(el, "w:personal")).toBeDefined();
    expect(getChild(el, "w:personalCompose")).toBeDefined();
    expect(getChild(el, "w:personalReply")).toBeDefined();
  });

  it("serializes tblStylePr array", () => {
    const el = serializeStyle({
      type: "table",
      styleId: "TableGrid",
      tblStylePr: [
        { type: "firstRow", rPr: { b: true } },
        { type: "lastRow", rPr: { i: true } },
      ],
    });
    expect(getChildren(el, "w:tblStylePr")).toHaveLength(2);
  });
});

// =============================================================================
// serializeStyles
// =============================================================================

describe("serializeStyles", () => {
  it("serializes styles document with namespaces", () => {
    const styles: DocxStyles = {
      docDefaults: { rPrDefault: { rPr: { sz: 22 } } },
      style: [
        { type: "paragraph", styleId: "Normal", name: { val: "Normal" } },
      ],
    };
    const el = serializeStyles(styles);
    expect(el.name).toBe("w:styles");
    expect(el.attrs["xmlns:w"]).toBeDefined();
    expect(el.attrs["xmlns:r"]).toBeDefined();
    expect(getChild(el, "w:docDefaults")).toBeDefined();
    expect(getChildren(el, "w:style")).toHaveLength(1);
  });

  it("serializes with latent styles", () => {
    const styles: DocxStyles = {
      latentStyles: { defUIPriority: 99, lsdException: [{ name: "Normal" }] },
    };
    const el = serializeStyles(styles);
    expect(getChild(el, "w:latentStyles")).toBeDefined();
  });

  it("serializes empty styles", () => {
    const el = serializeStyles({});
    expect(el.name).toBe("w:styles");
  });
});
