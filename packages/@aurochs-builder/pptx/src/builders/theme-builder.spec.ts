/** @file Unit tests for theme-builder */
import { applyThemeEditsToThemeXml, applyThemeEditsToPackage } from "./theme-builder";
import type { ZipPackage } from "@aurochs/zip";
import type { ThemeEditSpec } from "../types";

const MINIMAL_THEME_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Test">
  <a:themeElements>
    <a:clrScheme name="Custom">
      <a:dk1><a:srgbClr val="000000"/></a:dk1>
      <a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="333333"/></a:dk2>
      <a:lt2><a:srgbClr val="EEEEEE"/></a:lt2>
      <a:accent1><a:srgbClr val="4472C4"/></a:accent1>
      <a:accent2><a:srgbClr val="ED7D31"/></a:accent2>
      <a:accent3><a:srgbClr val="A5A5A5"/></a:accent3>
      <a:accent4><a:srgbClr val="FFC000"/></a:accent4>
      <a:accent5><a:srgbClr val="5B9BD5"/></a:accent5>
      <a:accent6><a:srgbClr val="70AD47"/></a:accent6>
      <a:hlink><a:srgbClr val="0563C1"/></a:hlink>
      <a:folHlink><a:srgbClr val="954F72"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Custom">
      <a:majorFont>
        <a:latin typeface="Calibri Light"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
      </a:majorFont>
      <a:minorFont>
        <a:latin typeface="Calibri"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
      </a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Custom">
      <a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>
      <a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>
      <a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
      <a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`;

describe("applyThemeEditsToThemeXml", () => {
  it("modifies color scheme", () => {
    const result = applyThemeEditsToThemeXml(MINIMAL_THEME_XML, {
      colorScheme: { accent1: "FF0000" },
    });
    expect(result).toContain("FF0000");
    expect(result).toContain("a:clrScheme");
  });

  it("modifies font scheme", () => {
    const result = applyThemeEditsToThemeXml(MINIMAL_THEME_XML, {
      fontScheme: { majorFont: { latin: "Arial" } },
    });
    expect(result).toContain("Arial");
  });

  it("modifies both color and font scheme", () => {
    const result = applyThemeEditsToThemeXml(MINIMAL_THEME_XML, {
      colorScheme: { dk1: "111111" },
      fontScheme: { minorFont: { latin: "Helvetica" } },
    });
    expect(result).toContain("111111");
    expect(result).toContain("Helvetica");
  });

  it("throws when no edits provided", () => {
    expect(() => applyThemeEditsToThemeXml(MINIMAL_THEME_XML, {})).toThrow(
      "theme edits require at least one of colorScheme or fontScheme",
    );
  });

  it("throws for unsupported color scheme key", () => {
    expect(() =>
      applyThemeEditsToThemeXml(MINIMAL_THEME_XML, {
        colorScheme: { bogusKey: "FF0000" } as never,
      }),
    ).toThrow("unsupported key");
  });

  it("skips undefined color values", () => {
    const result = applyThemeEditsToThemeXml(MINIMAL_THEME_XML, {
      colorScheme: { accent1: "AABBCC", accent2: undefined as never },
    });
    expect(result).toContain("AABBCC");
  });

  it("throws when colorScheme is empty object", () => {
    expect(() =>
      applyThemeEditsToThemeXml(MINIMAL_THEME_XML, {
        colorScheme: {},
      }),
    ).toThrow("theme edits require at least one of colorScheme or fontScheme");
  });

  it("modifies multiple color scheme entries", () => {
    const result = applyThemeEditsToThemeXml(MINIMAL_THEME_XML, {
      colorScheme: {
        dk1: "111111",
        lt1: "FAFAFA",
        accent1: "FF0000",
        accent2: "00FF00",
        hlink: "0000FF",
        folHlink: "FF00FF",
      },
    });
    expect(result).toContain("111111");
    expect(result).toContain("FAFAFA");
    expect(result).toContain("FF0000");
    expect(result).toContain("00FF00");
    expect(result).toContain("0000FF");
    expect(result).toContain("FF00FF");
  });

  it("modifies font scheme with minorFont only", () => {
    const result = applyThemeEditsToThemeXml(MINIMAL_THEME_XML, {
      fontScheme: { minorFont: { latin: "Georgia" } },
    });
    expect(result).toContain("Georgia");
    // majorFont should still exist as Calibri Light
    expect(result).toContain("Calibri Light");
  });

  it("modifies font scheme with both majorFont and minorFont", () => {
    const result = applyThemeEditsToThemeXml(MINIMAL_THEME_XML, {
      fontScheme: {
        majorFont: { latin: "Arial Black", eastAsian: "Yu Gothic" },
        minorFont: { latin: "Verdana", complexScript: "Tahoma" },
      },
    });
    expect(result).toContain("Arial Black");
    expect(result).toContain("Yu Gothic");
    expect(result).toContain("Verdana");
    expect(result).toContain("Tahoma");
  });

  it("returns a valid XML declaration", () => {
    const result = applyThemeEditsToThemeXml(MINIMAL_THEME_XML, {
      colorScheme: { accent1: "AABBCC" },
    });
    expect(result).toMatch(/^<\?xml version="1\.0"/);
    expect(result).toContain('standalone="yes"');
  });

  it("preserves font scheme base values when patch is partial", () => {
    const result = applyThemeEditsToThemeXml(MINIMAL_THEME_XML, {
      fontScheme: { majorFont: { eastAsian: "Yu Mincho" } },
    });
    // majorFont latin should still be Calibri Light (base)
    expect(result).toContain("Calibri Light");
    expect(result).toContain("Yu Mincho");
  });
});

describe("applyThemeEditsToPackage", () => {
  function createMockZipPackage(files: Record<string, string>): ZipPackage {
    const store = new Map(Object.entries(files));
    return {
      readText: (p: string) => store.get(p) ?? null,
      writeText: (p: string, data: string) => {
        store.set(p, data);
      },
      // Provide the stored value for verification
      _store: store,
    } as never;
  }

  it("reads theme XML from the package, applies edits, and writes back", () => {
    const pkg = createMockZipPackage({
      "ppt/theme/theme1.xml": MINIMAL_THEME_XML,
    });

    const theme: ThemeEditSpec = {
      path: "ppt/theme/theme1.xml",
      colorScheme: { accent1: "AABBCC" },
    };

    applyThemeEditsToPackage(pkg, theme);

    const result = (pkg as never as { _store: Map<string, string> })._store.get("ppt/theme/theme1.xml")!;
    expect(result).toContain("AABBCC");
  });

  it("throws when theme.path is not provided", () => {
    const pkg = createMockZipPackage({});
    const theme: ThemeEditSpec = {
      colorScheme: { accent1: "FF0000" },
    };

    expect(() => applyThemeEditsToPackage(pkg, theme)).toThrow("theme.path is required");
  });

  it("throws when theme XML is not found in the package", () => {
    const pkg = createMockZipPackage({});
    const theme: ThemeEditSpec = {
      path: "ppt/theme/theme1.xml",
      colorScheme: { accent1: "FF0000" },
    };

    expect(() => applyThemeEditsToPackage(pkg, theme)).toThrow("Theme XML not found in template");
  });
});
