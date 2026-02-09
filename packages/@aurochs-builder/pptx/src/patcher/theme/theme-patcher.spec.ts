/** @file theme-patcher tests */
import { createElement, getChild, type XmlDocument, type XmlElement } from "@aurochs/xml";
import type { Color } from "@aurochs-office/drawing-ml/domain/color";
import type { FormatScheme } from "@aurochs-office/pptx/domain/theme/types";
import { patchTheme, type ThemeChange } from "./theme-patcher";

function doc(root: XmlElement): XmlDocument {
  return { children: [root] };
}

function srgb(value: string): Color {
  return { spec: { type: "srgb", value } };
}

function createMinimalThemeXml(): XmlDocument {
  return doc(
    createElement("a:theme", { name: "Office Theme" }, [
      createElement("a:themeElements", {}, [
        createElement("a:clrScheme", { name: "Office" }, [
          createElement("a:dk1", {}, [createElement("a:sysClr", { val: "windowText", lastClr: "000000" })]),
          createElement("a:lt1", {}, [createElement("a:sysClr", { val: "window", lastClr: "FFFFFF" })]),
          createElement("a:accent1", {}, [createElement("a:srgbClr", { val: "4472C4" })]),
        ]),
        createElement("a:fontScheme", { name: "Office" }, [
          createElement("a:majorFont", {}, [
            createElement("a:latin", { typeface: "Calibri Light" }),
            createElement("a:ea", { typeface: "" }),
            createElement("a:cs", { typeface: "" }),
          ]),
          createElement("a:minorFont", {}, [
            createElement("a:latin", { typeface: "Calibri" }),
            createElement("a:ea", { typeface: "" }),
            createElement("a:cs", { typeface: "" }),
          ]),
        ]),
        createElement("a:fmtScheme", { name: "Office" }, [
          createElement("a:fillStyleLst", {}, []),
          createElement("a:lnStyleLst", {}, []),
          createElement("a:effectStyleLst", {}, []),
          createElement("a:bgFillStyleLst", {}, []),
        ]),
      ]),
    ]),
  );
}

describe("patchTheme", () => {
  it("patches colorScheme + fontScheme + formatScheme", () => {
    const themeXml = createMinimalThemeXml();

    const newFmt: FormatScheme = {
      fillStyles: [createElement("a:solidFill", {}, [createElement("a:srgbClr", { val: "FF0000" })])],
      lineStyles: [createElement("a:ln", { w: "12700" }, [])],
      effectStyles: [createElement("a:effectStyle", {}, [createElement("a:effectLst")])],
      bgFillStyles: [createElement("a:noFill", {}, [])],
    };

    const updated = patchTheme(themeXml, [
      { type: "colorScheme", scheme: { dk1: srgb("111111"), accent1: srgb("FF0000") } },
      { type: "fontScheme", scheme: { majorFont: { latin: "Aptos Display" }, minorFont: { latin: "Aptos" } } },
      { type: "formatScheme", scheme: newFmt },
    ]);

    const root = updated.children[0] as XmlElement;
    const themeElements = getChild(root, "a:themeElements")!;
    const clrScheme = getChild(themeElements, "a:clrScheme")!;
    expect(getChild(getChild(clrScheme, "a:dk1")!, "a:srgbClr")?.attrs.val).toBe("111111");
    expect(getChild(getChild(clrScheme, "a:accent1")!, "a:srgbClr")?.attrs.val).toBe("FF0000");

    const fontScheme = getChild(themeElements, "a:fontScheme")!;
    expect(getChild(getChild(fontScheme, "a:majorFont")!, "a:latin")?.attrs.typeface).toBe("Aptos Display");
    expect(getChild(getChild(fontScheme, "a:minorFont")!, "a:latin")?.attrs.typeface).toBe("Aptos");

    const fmtScheme = getChild(themeElements, "a:fmtScheme")!;
    expect(getChild(fmtScheme, "a:fillStyleLst")?.children.length).toBe(1);
    expect(getChild(fmtScheme, "a:lnStyleLst")?.children.length).toBe(1);
    expect(getChild(fmtScheme, "a:effectStyleLst")?.children.length).toBe(1);
    expect(getChild(fmtScheme, "a:bgFillStyleLst")?.children.length).toBe(1);
  });

  it("throws when themeXml is falsy", () => {
    expect(() => patchTheme(null as never, [])).toThrow("patchTheme requires themeXml");
  });

  it("throws when changes is falsy", () => {
    const themeXml = createMinimalThemeXml();
    expect(() => patchTheme(themeXml, null as never)).toThrow("patchTheme requires changes");
  });

  it("throws when root element is not a:theme", () => {
    const themeXml = doc(createElement("wrong:root", {}, []));
    expect(() => patchTheme(themeXml, [{ type: "colorScheme", scheme: {} }])).toThrow("unexpected root element");
  });

  it("throws when a:themeElements is missing", () => {
    const themeXml = doc(createElement("a:theme", {}, []));
    expect(() => patchTheme(themeXml, [{ type: "colorScheme", scheme: {} }])).toThrow("missing a:themeElements");
  });

  it("throws when a:clrScheme is missing", () => {
    const themeXml = doc(
      createElement("a:theme", {}, [
        createElement("a:themeElements", {}, [
          createElement("a:fontScheme", { name: "Office" }, []),
          createElement("a:fmtScheme", { name: "Office" }, []),
        ]),
      ]),
    );
    expect(() => patchTheme(themeXml, [{ type: "colorScheme", scheme: { dk1: srgb("000000") } }])).toThrow(
      "missing a:clrScheme",
    );
  });

  it("throws when a:fontScheme is missing", () => {
    const themeXml = doc(
      createElement("a:theme", {}, [
        createElement("a:themeElements", {}, [
          createElement("a:clrScheme", { name: "Office" }, []),
          createElement("a:fmtScheme", { name: "Office" }, []),
        ]),
      ]),
    );
    expect(() =>
      patchTheme(themeXml, [
        { type: "fontScheme", scheme: { majorFont: { latin: "Arial" }, minorFont: { latin: "Arial" } } },
      ]),
    ).toThrow("missing a:fontScheme");
  });

  it("throws when a:fmtScheme is missing", () => {
    const themeXml = doc(
      createElement("a:theme", {}, [
        createElement("a:themeElements", {}, [
          createElement("a:clrScheme", { name: "Office" }, []),
          createElement("a:fontScheme", { name: "Office" }, []),
        ]),
      ]),
    );
    expect(() =>
      patchTheme(themeXml, [
        {
          type: "formatScheme",
          scheme: { fillStyles: [], lineStyles: [], effectStyles: [], bgFillStyles: [] },
        },
      ]),
    ).toThrow("missing a:fmtScheme");
  });

  it("returns unchanged doc when changes array is empty", () => {
    const themeXml = createMinimalThemeXml();
    const result = patchTheme(themeXml, []);
    expect(result).toBe(themeXml);
  });

  it("patches only colorScheme when that is the only change", () => {
    const themeXml = createMinimalThemeXml();
    const updated = patchTheme(themeXml, [{ type: "colorScheme", scheme: { accent1: srgb("AABBCC") } }]);

    const root = updated.children[0] as XmlElement;
    const themeElements = getChild(root, "a:themeElements")!;
    const clrScheme = getChild(themeElements, "a:clrScheme")!;
    expect(getChild(getChild(clrScheme, "a:accent1")!, "a:srgbClr")?.attrs.val).toBe("AABBCC");
    // Font scheme should remain unchanged
    const fontScheme = getChild(themeElements, "a:fontScheme")!;
    expect(getChild(getChild(fontScheme, "a:majorFont")!, "a:latin")?.attrs.typeface).toBe("Calibri Light");
  });

  it("patches only fontScheme when that is the only change", () => {
    const themeXml = createMinimalThemeXml();
    const updated = patchTheme(themeXml, [
      { type: "fontScheme", scheme: { majorFont: { latin: "Helvetica" }, minorFont: { latin: "Arial" } } },
    ]);

    const root = updated.children[0] as XmlElement;
    const themeElements = getChild(root, "a:themeElements")!;
    const fontScheme = getChild(themeElements, "a:fontScheme")!;
    expect(getChild(getChild(fontScheme, "a:majorFont")!, "a:latin")?.attrs.typeface).toBe("Helvetica");
    expect(getChild(getChild(fontScheme, "a:minorFont")!, "a:latin")?.attrs.typeface).toBe("Arial");
    // Color scheme should remain unchanged
    const clrScheme = getChild(themeElements, "a:clrScheme")!;
    expect(getChild(getChild(clrScheme, "a:accent1")!, "a:srgbClr")?.attrs.val).toBe("4472C4");
  });

  it("preserves lt1 when only patching dk1", () => {
    const themeXml = createMinimalThemeXml();
    const updated = patchTheme(themeXml, [{ type: "colorScheme", scheme: { dk1: srgb("222222") } }]);

    const root = updated.children[0] as XmlElement;
    const themeElements = getChild(root, "a:themeElements")!;
    const clrScheme = getChild(themeElements, "a:clrScheme")!;
    // lt1 should be preserved
    const lt1 = getChild(clrScheme, "a:lt1")!;
    expect(getChild(lt1, "a:sysClr")?.attrs.val).toBe("window");
  });

  it("applies multiple changes sequentially", () => {
    const themeXml = createMinimalThemeXml();
    const changes: ThemeChange[] = [
      { type: "colorScheme", scheme: { dk1: srgb("111111") } },
      { type: "colorScheme", scheme: { accent1: srgb("FF0000") } },
    ];
    const updated = patchTheme(themeXml, changes);

    const root = updated.children[0] as XmlElement;
    const themeElements = getChild(root, "a:themeElements")!;
    const clrScheme = getChild(themeElements, "a:clrScheme")!;
    expect(getChild(getChild(clrScheme, "a:dk1")!, "a:srgbClr")?.attrs.val).toBe("111111");
    expect(getChild(getChild(clrScheme, "a:accent1")!, "a:srgbClr")?.attrs.val).toBe("FF0000");
  });

  it("preserves extLst in format scheme style lists", () => {
    const themeXml = doc(
      createElement("a:theme", { name: "Test" }, [
        createElement("a:themeElements", {}, [
          createElement("a:clrScheme", { name: "Test" }, []),
          createElement("a:fontScheme", { name: "Test" }, []),
          createElement("a:fmtScheme", { name: "Test" }, [
            createElement("a:fillStyleLst", {}, [
              createElement("a:solidFill", {}, []),
              createElement("a:extLst", {}, [createElement("a:ext")]),
            ]),
            createElement("a:lnStyleLst", {}, []),
            createElement("a:effectStyleLst", {}, []),
            createElement("a:bgFillStyleLst", {}, []),
          ]),
        ]),
      ]),
    );

    const newFmt: FormatScheme = {
      fillStyles: [createElement("a:gradFill", {}, [])],
      lineStyles: [createElement("a:ln", {}, [])],
      effectStyles: [createElement("a:effectStyle", {}, [])],
      bgFillStyles: [createElement("a:noFill", {}, [])],
    };

    const updated = patchTheme(themeXml, [{ type: "formatScheme", scheme: newFmt }]);

    const root = updated.children[0] as XmlElement;
    const themeElements = getChild(root, "a:themeElements")!;
    const fmtScheme = getChild(themeElements, "a:fmtScheme")!;
    const fillStyleLst = getChild(fmtScheme, "a:fillStyleLst")!;
    // Should have the new fill style + preserved extLst
    const hasExtLst = fillStyleLst.children.some(
      (c) => c.type === "element" && c.name === "a:extLst",
    );
    expect(hasExtLst).toBe(true);
    const hasGradFill = fillStyleLst.children.some(
      (c) => c.type === "element" && c.name === "a:gradFill",
    );
    expect(hasGradFill).toBe(true);
  });

  it("patches east-asian and complex-script fonts", () => {
    const themeXml = createMinimalThemeXml();
    const updated = patchTheme(themeXml, [
      {
        type: "fontScheme",
        scheme: {
          majorFont: { latin: "Helvetica", eastAsian: "MS Gothic", complexScript: "Arabic Transparent" },
          minorFont: { latin: "Arial" },
        },
      },
    ]);

    const root = updated.children[0] as XmlElement;
    const themeElements = getChild(root, "a:themeElements")!;
    const fontScheme = getChild(themeElements, "a:fontScheme")!;
    const majorFont = getChild(fontScheme, "a:majorFont")!;
    expect(getChild(majorFont, "a:ea")?.attrs.typeface).toBe("MS Gothic");
    expect(getChild(majorFont, "a:cs")?.attrs.typeface).toBe("Arabic Transparent");
  });

  it("handles system colors in colorScheme patch", () => {
    const themeXml = createMinimalThemeXml();
    const sysColor: Color = {
      spec: { type: "system", value: "windowText", lastColor: "000000" },
    };
    const updated = patchTheme(themeXml, [{ type: "colorScheme", scheme: { dk1: sysColor } }]);

    const root = updated.children[0] as XmlElement;
    const themeElements = getChild(root, "a:themeElements")!;
    const clrScheme = getChild(themeElements, "a:clrScheme")!;
    const dk1 = getChild(clrScheme, "a:dk1")!;
    expect(getChild(dk1, "a:sysClr")?.attrs.val).toBe("windowText");
  });

  it("preserves a:theme name attribute", () => {
    const themeXml = createMinimalThemeXml();
    const updated = patchTheme(themeXml, [{ type: "colorScheme", scheme: { dk1: srgb("111111") } }]);
    const root = updated.children[0] as XmlElement;
    expect(root.attrs.name).toBe("Office Theme");
  });

  it("creates new style list when existing fmtScheme lacks one", () => {
    const themeXml = doc(
      createElement("a:theme", {}, [
        createElement("a:themeElements", {}, [
          createElement("a:clrScheme", { name: "Test" }, []),
          createElement("a:fontScheme", { name: "Test" }, []),
          createElement("a:fmtScheme", { name: "Test" }, []),
        ]),
      ]),
    );

    const newFmt: FormatScheme = {
      fillStyles: [createElement("a:solidFill", {}, [])],
      lineStyles: [createElement("a:ln", {}, [])],
      effectStyles: [createElement("a:effectStyle", {}, [])],
      bgFillStyles: [createElement("a:noFill", {}, [])],
    };

    const updated = patchTheme(themeXml, [{ type: "formatScheme", scheme: newFmt }]);

    const root = updated.children[0] as XmlElement;
    const themeElements = getChild(root, "a:themeElements")!;
    const fmtScheme = getChild(themeElements, "a:fmtScheme")!;
    expect(getChild(fmtScheme, "a:fillStyleLst")).toBeDefined();
    expect(getChild(fmtScheme, "a:lnStyleLst")).toBeDefined();
    expect(getChild(fmtScheme, "a:effectStyleLst")).toBeDefined();
    expect(getChild(fmtScheme, "a:bgFillStyleLst")).toBeDefined();
  });
});
