/**
 * @file Minimal theme builder
 *
 * Office-layer authoritative builder for the canonical minimal
 * `a:theme` part used when generating a deck without a domain Theme
 * object (e.g. .ppt → .pptx conversion, blank-deck importers).
 *
 * The richer `buildThemeXml` in `@aurochs-builder/pptx/builders` takes
 * a full domain `Theme` (including FormatScheme/ObjectDefaults/etc.)
 * and serialises it via the patcher's fill/line/effect serializers.
 *
 * @see ECMA-376 Part 1, §20.1.6.9 (CT_OfficeStyleSheet)
 */

import { DRAWINGML_NAMESPACES } from "@aurochs-office/opc";
import { createElement, type XmlDocument, type XmlElement } from "@aurochs/xml";

/** Office's stock 12-slot color scheme (the "Office" theme). */
const DEFAULT_COLOR_SCHEME: Readonly<Record<string, string>> = {
  dk1: "000000",
  lt1: "FFFFFF",
  dk2: "44546A",
  lt2: "E7E6E6",
  accent1: "5B9BD5",
  accent2: "ED7D31",
  accent3: "A5A5A5",
  accent4: "FFC000",
  accent5: "4472C4",
  accent6: "70AD47",
  hlink: "0563C1",
  folHlink: "954F72",
};

const SCHEME_KEYS_DK_LT: readonly string[] = ["dk1", "lt1", "dk2", "lt2"];
const SCHEME_KEYS_ACCENT_HLINK: readonly string[] = [
  "accent1", "accent2", "accent3", "accent4", "accent5", "accent6",
  "hlink", "folHlink",
];

export type BuildMinimalThemeOptions = {
  /** Theme name (a:theme@name and a:clrScheme@name). Defaults to "Office". */
  readonly name?: string;
  /** 12-slot color scheme. Defaults to Office's stock palette. */
  readonly colorScheme?: Readonly<Record<string, string>>;
  /** Major font typeface (Latin). Defaults to "Calibri Light". */
  readonly majorLatin?: string;
  /** Minor font typeface (Latin). Defaults to "Calibri". */
  readonly minorLatin?: string;
};

/**
 * Build a structurally complete but minimal `<a:theme>` document.
 *
 * Emits:
 *   - a:clrScheme  (12 slots; dk1/lt1 use a:sysClr, others a:srgbClr)
 *   - a:fontScheme (major + minor with a:latin only)
 *   - a:fmtScheme  (3× phClr fill / line / effect / bg-fill)
 *
 * No `a:objectDefaults`, no `a:extraClrSchemeLst`, no `a:custClrLst`.
 */
export function buildMinimalTheme(options: BuildMinimalThemeOptions = {}): XmlDocument {
  const name = options.name ?? "Office";
  const cs = options.colorScheme ?? DEFAULT_COLOR_SCHEME;
  const majorLatin = options.majorLatin ?? "Calibri Light";
  const minorLatin = options.minorLatin ?? "Calibri";

  return {
    children: [
      createElement(
        "a:theme",
        { "xmlns:a": DRAWINGML_NAMESPACES.main, name },
        [
          createElement("a:themeElements", {}, [
            buildClrScheme(name, cs),
            buildFontScheme(name, majorLatin, minorLatin),
            buildPlaceholderFormatScheme(name),
          ]),
          createElement("a:objectDefaults"),
          createElement("a:extraClrSchemeLst"),
        ],
      ),
    ],
  };
}

function buildClrScheme(name: string, cs: Readonly<Record<string, string>>): XmlElement {
  const children: XmlElement[] = [];
  // dk1/lt1 use a:sysClr (windowText/window) with lastClr fallback.
  // Office writes them this way; PowerPoint accepts a:srgbClr too,
  // but matching Office output minimises surprise on round-trip.
  const sysMap: Record<string, string> = { dk1: "windowText", lt1: "window" };
  for (const key of SCHEME_KEYS_DK_LT) {
    const hex = cs[key];
    const sysVal = sysMap[key];
    const inner = sysVal !== undefined
      ? createElement("a:sysClr", { val: sysVal, lastClr: hex })
      : createElement("a:srgbClr", { val: hex });
    children.push(createElement(`a:${key}`, {}, [inner]));
  }
  for (const key of SCHEME_KEYS_ACCENT_HLINK) {
    children.push(createElement(`a:${key}`, {}, [createElement("a:srgbClr", { val: cs[key] })]));
  }
  return createElement("a:clrScheme", { name }, children);
}

function buildFontScheme(name: string, majorLatin: string, minorLatin: string): XmlElement {
  return createElement("a:fontScheme", { name }, [
    createElement("a:majorFont", {}, [createElement("a:latin", { typeface: majorLatin })]),
    createElement("a:minorFont", {}, [createElement("a:latin", { typeface: minorLatin })]),
  ]);
}

function phSolidFill(): XmlElement {
  return createElement("a:solidFill", {}, [createElement("a:schemeClr", { val: "phClr" })]);
}

function phLine(width: number): XmlElement {
  return createElement(
    "a:ln",
    { w: String(width), cap: "flat", cmpd: "sng", algn: "ctr" },
    [
      phSolidFill(),
      createElement("a:prstDash", { val: "solid" }),
      createElement("a:miter", { lim: "800000" }),
    ],
  );
}

function buildPlaceholderFormatScheme(name: string): XmlElement {
  return createElement("a:fmtScheme", { name }, [
    createElement("a:fillStyleLst", {}, [phSolidFill(), phSolidFill(), phSolidFill()]),
    createElement("a:lnStyleLst", {}, [phLine(6350), phLine(12700), phLine(19050)]),
    createElement("a:effectStyleLst", {}, [
      createElement("a:effectStyle", {}, [createElement("a:effectLst")]),
      createElement("a:effectStyle", {}, [createElement("a:effectLst")]),
      createElement("a:effectStyle", {}, [createElement("a:effectLst")]),
    ]),
    createElement("a:bgFillStyleLst", {}, [phSolidFill(), phSolidFill(), phSolidFill()]),
  ]);
}
