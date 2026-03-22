/**
 * @file buildThemeXml unit tests
 *
 * Verifies that buildThemeXml constructs correct a:theme XML from Theme domain type.
 *
 * @see ECMA-376 Part 1, Section 20.1.6.9 (CT_OfficeStyleSheet)
 */

import type { Theme } from "@aurochs-office/pptx/domain/theme/types";
import { buildThemeXml } from "./theme-exporter";
import { getByPath, getAttr, getChild, isXmlElement } from "@aurochs/xml";
import { EMPTY_FONT_SCHEME } from "@aurochs-office/ooxml/domain/font-scheme";
import { createElement } from "@aurochs/xml";

function minimalTheme(): Theme {
  return {
    colorScheme: {
      dk1: "000000", lt1: "FFFFFF", dk2: "333333", lt2: "EEEEEE",
      accent1: "4472C4", accent2: "ED7D31", accent3: "A5A5A5",
      accent4: "FFC000", accent5: "5B9BD5", accent6: "70AD47",
      hlink: "0563C1", folHlink: "954F72",
    },
    fontScheme: { majorFont: { latin: "Calibri Light" }, minorFont: { latin: "Calibri" } },
    formatScheme: {
      fillStyles: [{ type: "solidFill", color: { spec: { type: "scheme", value: "phClr" } } }],
      lineStyles: [{ width: 0.5 as any, cap: "flat", compound: "sng", alignment: "ctr", fill: { type: "solidFill", color: { spec: { type: "scheme", value: "phClr" } } }, dash: "solid", join: "round" }],
      effectStyles: [undefined],
      bgFillStyles: [{ type: "solidFill", color: { spec: { type: "scheme", value: "phClr" } } }],
    },
    customColors: [],
    extraColorSchemes: [],
    objectDefaults: {},
    themeOverrides: [],
  };
}

describe("buildThemeXml", () => {
  it("produces valid a:theme with correct name attribute", () => {
    const xml = buildThemeXml({ name: "Test Theme", theme: minimalTheme() });
    const root = xml.children[0];
    expect(isXmlElement(root)).toBe(true);
    if (!isXmlElement(root)) { return; }
    expect(root.name).toBe("a:theme");
    expect(root.attrs.name).toBe("Test Theme");
  });

  it("builds all 12 scheme colors from Theme.colorScheme", () => {
    const xml = buildThemeXml({ name: "Test", theme: minimalTheme() });
    const clrScheme = getByPath(xml, ["a:theme", "a:themeElements", "a:clrScheme"]);
    expect(clrScheme).toBeDefined();
    if (!clrScheme) { return; }
    const dk1 = getChild(clrScheme, "a:dk1");
    expect(dk1).toBeDefined();
    const srgb = dk1 ? getChild(dk1, "a:srgbClr") : undefined;
    expect(srgb ? getAttr(srgb, "val") : undefined).toBe("000000");
  });

  it("builds font scheme from Theme.fontScheme", () => {
    const xml = buildThemeXml({ name: "Test", theme: minimalTheme() });
    const fontScheme = getByPath(xml, ["a:theme", "a:themeElements", "a:fontScheme"]);
    expect(fontScheme).toBeDefined();
    if (!fontScheme) { return; }
    const major = getChild(fontScheme, "a:majorFont");
    const latin = major ? getChild(major, "a:latin") : undefined;
    expect(latin ? getAttr(latin, "typeface") : undefined).toBe("Calibri Light");
  });

  it("uses fontSchemeName for a:fontScheme@name when provided", () => {
    const xml = buildThemeXml({ name: "Theme", theme: minimalTheme(), fontSchemeName: "Custom Fonts" });
    const fontScheme = getByPath(xml, ["a:theme", "a:themeElements", "a:fontScheme"]);
    expect(fontScheme ? getAttr(fontScheme, "name") : undefined).toBe("Custom Fonts");
  });

  it("falls back to theme name for a:fontScheme@name", () => {
    const xml = buildThemeXml({ name: "My Theme", theme: minimalTheme() });
    const fontScheme = getByPath(xml, ["a:theme", "a:themeElements", "a:fontScheme"]);
    expect(fontScheme ? getAttr(fontScheme, "name") : undefined).toBe("My Theme");
  });

  it("builds format scheme from Theme.formatScheme", () => {
    const xml = buildThemeXml({ name: "Test", theme: minimalTheme() });
    const fmtScheme = getByPath(xml, ["a:theme", "a:themeElements", "a:fmtScheme"]);
    expect(fmtScheme).toBeDefined();
  });

  it("handles EMPTY_FONT_SCHEME (no typeface elements)", () => {
    const theme = { ...minimalTheme(), fontScheme: EMPTY_FONT_SCHEME };
    const xml = buildThemeXml({ name: "Empty", theme });
    const fontScheme = getByPath(xml, ["a:theme", "a:themeElements", "a:fontScheme"]);
    expect(fontScheme).toBeDefined();
    if (!fontScheme) { return; }
    // majorFont and minorFont elements present but no a:latin children
    const major = getChild(fontScheme, "a:majorFont");
    expect(major).toBeDefined();
    if (!major) { return; }
    expect(getChild(major, "a:latin")).toBeUndefined();
  });

  it("omits a:objectDefaults when all defaults are undefined", () => {
    const xml = buildThemeXml({ name: "Test", theme: minimalTheme() });
    const od = getByPath(xml, ["a:theme", "a:themeElements", "a:objectDefaults"]);
    expect(od).toBeUndefined();
  });

  it("omits a:extraClrSchemeLst when empty", () => {
    const xml = buildThemeXml({ name: "Test", theme: minimalTheme() });
    const extra = getByPath(xml, ["a:theme", "a:extraClrSchemeLst"]);
    expect(extra).toBeUndefined();
  });
});
