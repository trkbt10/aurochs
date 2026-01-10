/**
 * @file Theme patcher tests (Phase 9)
 */

import { createElement, getChild, type XmlDocument, type XmlElement } from "../../../xml";
import type { Color } from "../../domain/color/types";
import type { FormatScheme } from "../../domain/theme/types";
import { patchTheme } from "./theme-patcher";

function doc(root: XmlElement): XmlDocument {
  return { children: [root] };
}

function srgb(value: string): Color {
  return { spec: { type: "srgb", value } };
}

describe("patchTheme", () => {
  it("patches colorScheme + fontScheme + formatScheme", () => {
    const themeXml = doc(
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
});

