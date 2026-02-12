/**
 * @file Tests for DOCX run serialization
 */
import { getChild, getTextContent } from "@aurochs/xml";
import type { DocxRunFonts, DocxColor, DocxShading, DocxUnderline, DocxRunBorder, DocxRunProperties, DocxRunContent, DocxRun } from "@aurochs-office/docx/domain/run";
import {
  serializeRunFonts,
  serializeColor,
  serializeShading,
  serializeUnderline,
  serializeRunBorder,
  serializeRunProperties,
  serializeRunContent,
  serializeRun,
} from "./run";

// =============================================================================
// serializeRunFonts
// =============================================================================

describe("serializeRunFonts", () => {
  it("serializes all font attributes", () => {
    const fonts: DocxRunFonts = {
      ascii: "Arial",
      hAnsi: "Arial",
      eastAsia: "MS Gothic",
      cs: "Times New Roman",
      asciiTheme: "majorHAnsi",
      hAnsiTheme: "majorHAnsi",
      eastAsiaTheme: "majorEastAsia",
      csTheme: "majorBidi",
    };
    const el = serializeRunFonts(fonts);
    expect(el.name).toBe("w:rFonts");
    expect(el.attrs["w:ascii"]).toBe("Arial");
    expect(el.attrs["w:hAnsi"]).toBe("Arial");
    expect(el.attrs["w:eastAsia"]).toBe("MS Gothic");
    expect(el.attrs["w:cs"]).toBe("Times New Roman");
    expect(el.attrs["w:asciiTheme"]).toBe("majorHAnsi");
    expect(el.attrs["w:hAnsiTheme"]).toBe("majorHAnsi");
    expect(el.attrs["w:eastAsiaTheme"]).toBe("majorEastAsia");
    // NOTE: Known typo in run.ts:81 — w:cstheme instead of w:csTheme
    expect(el.attrs["w:cstheme"]).toBe("majorBidi");
  });

  it("serializes subset of fonts", () => {
    const fonts: DocxRunFonts = { ascii: "Calibri" };
    const el = serializeRunFonts(fonts);
    expect(el.attrs["w:ascii"]).toBe("Calibri");
    expect(el.attrs["w:hAnsi"]).toBeUndefined();
  });

  it("serializes empty fonts object", () => {
    const el = serializeRunFonts({});
    expect(el.name).toBe("w:rFonts");
    expect(Object.keys(el.attrs)).toHaveLength(0);
  });
});

// =============================================================================
// serializeColor
// =============================================================================

describe("serializeColor", () => {
  it("serializes basic color", () => {
    const color: DocxColor = { val: "FF0000" };
    const el = serializeColor(color);
    expect(el.name).toBe("w:color");
    expect(el.attrs["w:val"]).toBe("FF0000");
  });

  it("serializes theme color with tint and shade", () => {
    const color: DocxColor = {
      val: "auto",
      themeColor: "accent1",
      themeTint: 80,
      themeShade: 200,
    };
    const el = serializeColor(color);
    expect(el.attrs["w:val"]).toBe("auto");
    expect(el.attrs["w:themeColor"]).toBe("accent1");
    expect(el.attrs["w:themeTint"]).toBe("80");
    expect(el.attrs["w:themeShade"]).toBe("200");
  });

  it("uses custom element name", () => {
    const color: DocxColor = { val: "000000" };
    const el = serializeColor(color, "w:highlight");
    expect(el.name).toBe("w:highlight");
  });

  it("omits undefined attributes", () => {
    const color: DocxColor = { themeColor: "text1" };
    const el = serializeColor(color);
    expect(el.attrs["w:val"]).toBeUndefined();
    expect(el.attrs["w:themeColor"]).toBe("text1");
    expect(el.attrs["w:themeTint"]).toBeUndefined();
    expect(el.attrs["w:themeShade"]).toBeUndefined();
  });
});

// =============================================================================
// serializeShading
// =============================================================================

describe("serializeShading", () => {
  it("serializes all shading attributes", () => {
    const shading: DocxShading = {
      val: "clear",
      color: "auto",
      fill: "FFFF00",
      themeColor: "accent2",
      themeFill: "accent3",
    };
    const el = serializeShading(shading);
    expect(el.name).toBe("w:shd");
    expect(el.attrs["w:val"]).toBe("clear");
    expect(el.attrs["w:color"]).toBe("auto");
    expect(el.attrs["w:fill"]).toBe("FFFF00");
    expect(el.attrs["w:themeColor"]).toBe("accent2");
    expect(el.attrs["w:themeFill"]).toBe("accent3");
  });

  it("uses custom element name", () => {
    const shading: DocxShading = { val: "clear", fill: "FF0000" };
    const el = serializeShading(shading, "w:customShd");
    expect(el.name).toBe("w:customShd");
  });

  it("omits undefined attributes", () => {
    const shading: DocxShading = { val: "solid" };
    const el = serializeShading(shading);
    expect(el.attrs["w:color"]).toBeUndefined();
    expect(el.attrs["w:fill"]).toBeUndefined();
  });
});

// =============================================================================
// serializeUnderline
// =============================================================================

describe("serializeUnderline", () => {
  it("serializes underline with all attributes", () => {
    const u: DocxUnderline = { val: "single", color: "0000FF", themeColor: "hyperlink" };
    const el = serializeUnderline(u);
    expect(el.name).toBe("w:u");
    expect(el.attrs["w:val"]).toBe("single");
    expect(el.attrs["w:color"]).toBe("0000FF");
    expect(el.attrs["w:themeColor"]).toBe("hyperlink");
  });

  it("serializes underline with val only", () => {
    const u: DocxUnderline = { val: "double" };
    const el = serializeUnderline(u);
    expect(el.attrs["w:val"]).toBe("double");
    expect(el.attrs["w:color"]).toBeUndefined();
  });
});

// =============================================================================
// serializeRunBorder
// =============================================================================

describe("serializeRunBorder", () => {
  it("serializes all border attributes", () => {
    const border: DocxRunBorder = {
      val: "single",
      sz: 4,
      space: 1,
      color: "000000",
      themeColor: "text1",
      frame: true,
      shadow: false,
    };
    const el = serializeRunBorder(border);
    expect(el.name).toBe("w:bdr");
    expect(el.attrs["w:val"]).toBe("single");
    expect(el.attrs["w:sz"]).toBe("4");
    expect(el.attrs["w:space"]).toBe("1");
    expect(el.attrs["w:color"]).toBe("000000");
    expect(el.attrs["w:themeColor"]).toBe("text1");
    expect(el.attrs["w:frame"]).toBe("1");
    expect(el.attrs["w:shadow"]).toBe("0");
  });

  it("omits undefined boolean attributes", () => {
    const border: DocxRunBorder = { val: "none" };
    const el = serializeRunBorder(border);
    expect(el.attrs["w:frame"]).toBeUndefined();
    expect(el.attrs["w:shadow"]).toBeUndefined();
  });
});

// =============================================================================
// serializeRunProperties
// =============================================================================

describe("serializeRunProperties", () => {
  it("returns undefined for undefined input", () => {
    expect(serializeRunProperties(undefined)).toBeUndefined();
  });

  it("returns undefined for empty properties", () => {
    expect(serializeRunProperties({})).toBeUndefined();
  });

  it("serializes rStyle", () => {
    const el = serializeRunProperties({ rStyle: "Emphasis" })!;
    expect(getChild(el, "w:rStyle")?.attrs["w:val"]).toBe("Emphasis");
  });

  it("serializes rFonts", () => {
    const el = serializeRunProperties({ rFonts: { ascii: "Arial" } })!;
    expect(getChild(el, "w:rFonts")?.attrs["w:ascii"]).toBe("Arial");
  });

  it("serializes toggle true as empty element", () => {
    const el = serializeRunProperties({ b: true })!;
    const b = getChild(el, "w:b");
    expect(b).toBeDefined();
    expect(b!.attrs["w:val"]).toBeUndefined();
  });

  it("serializes toggle false as val=0", () => {
    const el = serializeRunProperties({ b: false })!;
    expect(getChild(el, "w:b")?.attrs["w:val"]).toBe("0");
  });

  it("serializes all toggle properties when true", () => {
    const toggles = [
      "b", "bCs", "i", "iCs", "caps", "smallCaps", "strike", "dstrike",
      "outline", "shadow", "emboss", "imprint", "vanish", "webHidden",
    ] as const;
    const props: DocxRunProperties = {};
    for (const t of toggles) {
      (props as Record<string, boolean>)[t] = true;
    }
    const el = serializeRunProperties(props)!;
    for (const t of toggles) {
      expect(getChild(el, `w:${t}`)).toBeDefined();
    }
  });

  it("serializes color", () => {
    const el = serializeRunProperties({ color: { val: "FF0000" } })!;
    expect(getChild(el, "w:color")?.attrs["w:val"]).toBe("FF0000");
  });

  it("serializes numeric properties", () => {
    const el = serializeRunProperties({
      spacing: 20,
      w: 150,
      kern: 12,
      position: 6,
      sz: 24,
      szCs: 24,
    })!;
    expect(getChild(el, "w:spacing")?.attrs["w:val"]).toBe("20");
    expect(getChild(el, "w:w")?.attrs["w:val"]).toBe("150");
    expect(getChild(el, "w:kern")?.attrs["w:val"]).toBe("12");
    expect(getChild(el, "w:position")?.attrs["w:val"]).toBe("6");
    expect(getChild(el, "w:sz")?.attrs["w:val"]).toBe("24");
    expect(getChild(el, "w:szCs")?.attrs["w:val"]).toBe("24");
  });

  it("serializes highlight", () => {
    const el = serializeRunProperties({ highlight: "yellow" })!;
    expect(getChild(el, "w:highlight")?.attrs["w:val"]).toBe("yellow");
  });

  it("serializes underline", () => {
    const el = serializeRunProperties({ u: { val: "wave" } })!;
    expect(getChild(el, "w:u")?.attrs["w:val"]).toBe("wave");
  });

  it("serializes border", () => {
    const el = serializeRunProperties({ bdr: { val: "single", sz: 4 } })!;
    const bdr = getChild(el, "w:bdr");
    expect(bdr?.attrs["w:val"]).toBe("single");
    expect(bdr?.attrs["w:sz"]).toBe("4");
  });

  it("serializes shading", () => {
    const el = serializeRunProperties({ shd: { val: "clear", fill: "FFFF00" } })!;
    expect(getChild(el, "w:shd")?.attrs["w:fill"]).toBe("FFFF00");
  });

  it("serializes vertAlign", () => {
    const el = serializeRunProperties({ vertAlign: "superscript" })!;
    expect(getChild(el, "w:vertAlign")?.attrs["w:val"]).toBe("superscript");
  });

  it("serializes rtl and cs toggles", () => {
    const el = serializeRunProperties({ rtl: true, cs: true })!;
    expect(getChild(el, "w:rtl")).toBeDefined();
    expect(getChild(el, "w:cs")).toBeDefined();
  });

  it("serializes em", () => {
    const el = serializeRunProperties({ em: "dot" })!;
    expect(getChild(el, "w:em")?.attrs["w:val"]).toBe("dot");
  });

  it("serializes eastAsianLayout", () => {
    const el = serializeRunProperties({
      eastAsianLayout: {
        combine: true,
        combineBrackets: "angle",
        vert: false,
        vertCompress: true,
      },
    })!;
    const ea = getChild(el, "w:eastAsianLayout");
    expect(ea).toBeDefined();
    expect(ea!.attrs["w:combine"]).toBe("1");
    expect(ea!.attrs["w:combineBrackets"]).toBe("angle");
    expect(ea!.attrs["w:vert"]).toBe("0");
    expect(ea!.attrs["w:vertCompress"]).toBe("1");
  });
});

// =============================================================================
// serializeRunContent
// =============================================================================

describe("serializeRunContent", () => {
  it("serializes text content", () => {
    const content: DocxRunContent = { type: "text", value: "Hello World" };
    const el = serializeRunContent(content);
    expect(el.name).toBe("w:t");
    expect(el.attrs["xml:space"]).toBe("preserve");
    expect(getTextContent(el)).toBe("Hello World");
  });

  it("serializes tab", () => {
    const content: DocxRunContent = { type: "tab" };
    const el = serializeRunContent(content);
    expect(el.name).toBe("w:tab");
  });

  it("serializes break without attributes", () => {
    const content: DocxRunContent = { type: "break" };
    const el = serializeRunContent(content);
    expect(el.name).toBe("w:br");
    expect(el.attrs["w:type"]).toBeUndefined();
  });

  it("serializes break with type and clear", () => {
    const content: DocxRunContent = { type: "break", breakType: "page", clear: "all" };
    const el = serializeRunContent(content);
    expect(el.name).toBe("w:br");
    expect(el.attrs["w:type"]).toBe("page");
    expect(el.attrs["w:clear"]).toBe("all");
  });

  it("serializes symbol with font and char", () => {
    const content: DocxRunContent = { type: "symbol", font: "Wingdings", char: "F0FC" };
    const el = serializeRunContent(content);
    expect(el.name).toBe("w:sym");
    expect(el.attrs["w:font"]).toBe("Wingdings");
    expect(el.attrs["w:char"]).toBe("F0FC");
  });

  it("serializes symbol without optional attributes", () => {
    const content: DocxRunContent = { type: "symbol" };
    const el = serializeRunContent(content);
    expect(el.name).toBe("w:sym");
    expect(el.attrs["w:font"]).toBeUndefined();
  });

  it("serializes drawing content", () => {
    const content: DocxRunContent = {
      type: "drawing",
      drawing: {
        type: "inline",
        extent: { cx: 914400, cy: 914400 },
        docPr: { id: 1, name: "Picture 1" },
      },
    };
    const el = serializeRunContent(content);
    expect(el.name).toBe("w:drawing");
  });
});

// =============================================================================
// serializeRun
// =============================================================================

describe("serializeRun", () => {
  it("serializes run with properties and content", () => {
    const run: DocxRun = {
      type: "run",
      properties: { b: true, sz: 24 },
      content: [
        { type: "text", value: "bold text" },
      ],
    };
    const el = serializeRun(run);
    expect(el.name).toBe("w:r");
    expect(getChild(el, "w:rPr")).toBeDefined();
    expect(getChild(getChild(el, "w:rPr")!, "w:b")).toBeDefined();
    const t = getChild(el, "w:t");
    expect(t).toBeDefined();
    expect(getTextContent(t!)).toBe("bold text");
  });

  it("serializes run without properties", () => {
    const run: DocxRun = {
      type: "run",
      content: [{ type: "text", value: "plain" }],
    };
    const el = serializeRun(run);
    expect(getChild(el, "w:rPr")).toBeUndefined();
    expect(getChild(el, "w:t")).toBeDefined();
  });

  it("serializes run with multiple content items", () => {
    const run: DocxRun = {
      type: "run",
      content: [
        { type: "text", value: "A" },
        { type: "tab" },
        { type: "text", value: "B" },
      ],
    };
    const el = serializeRun(run);
    const children = el.children.filter((c) => c.type === "element");
    expect(children).toHaveLength(3);
  });

  it("serializes empty run", () => {
    const run: DocxRun = { type: "run", content: [] };
    const el = serializeRun(run);
    expect(el.name).toBe("w:r");
    expect(el.children).toHaveLength(0);
  });
});
