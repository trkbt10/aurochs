/**
 * @file Theme exporter - exports theme as POTX file
 *
 * Creates a PowerPoint template (.potx) file from theme data.
 * All constants (namespaces, content types, relationship types) are
 * sourced from @aurochs-office/opc and @aurochs-office/pptx/domain (SoT).
 * Serialization uses the authoritative serializers from @aurochs-builder/pptx.
 *
 * ## ECMA-376 Coverage
 *
 * ### a:theme (CT_OfficeStyleSheet §20.1.6.9)
 * | Element              | §ECMA-376   | Domain Type           | Status |
 * |----------------------|-------------|-----------------------|--------|
 * | a:clrScheme          | 20.1.6.2    | ColorScheme           | ✅     |
 * | a:fontScheme         | 20.1.4.1.18 | FontScheme            | ✅     |
 * | a:fmtScheme          | 20.1.4.1.14 | FormatScheme          | ✅     |
 * | a:objectDefaults     | 20.1.6.7    | ObjectDefaults        | ✅     |
 * | a:extraClrSchemeLst  | 20.1.6.5    | ExtraColorScheme[]    | ✅     |
 * | a:custClrLst         | 20.1.6.3    | CustomColor[]         | ✅     |
 *
 * ### p:sldMaster (CT_SlideMaster §19.3.1.42)
 * | Element              | §ECMA-376   | Domain Type           | Status |
 * |----------------------|-------------|-----------------------|--------|
 * | p:clrMap             | 19.3.1.6    | ColorMapping          | ✅     |
 * | p:bg                 | 19.3.1.2    | Background            | ✅     |
 * | p:txStyles           | 19.3.1.51   | MasterTextStyles      | ✅     |
 *
 * @see ECMA-376 Part 1, Section 20.1.6 - Theme Definitions
 */

import { SCHEME_COLOR_NAMES, type SchemeColorName, type Color } from "@aurochs-office/drawing-ml/domain/color";
import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { BaseLine } from "@aurochs-office/drawing-ml/domain/line";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { FontScheme } from "@aurochs-office/ooxml/domain/font-scheme";
import type { Theme, CustomColor, ExtraColorScheme, FormatScheme, ObjectDefaults, ObjectDefaultProperties } from "@aurochs-office/pptx/domain/theme/types";
import type { MasterTextStyles } from "@aurochs-office/pptx/domain/text-style";
import type { TextStyleLevels, TextLevelStyle } from "@aurochs-office/pptx/domain/text-style";
import { TEXT_STYLE_LEVEL_KEYS } from "@aurochs-office/pptx/domain/text-style";
import { DEFAULT_COLOR_MAPPING, type ColorMapping, type ColorMapOverride } from "@aurochs-office/pptx/domain/color/types";
import type { Background, SlideLayoutType } from "@aurochs-office/pptx/domain";
import type { SlideTransition } from "@aurochs-office/pptx/domain/transition";
import { serializeFill } from "../patcher/serializer/fill";
import { serializeLine } from "../patcher/serializer/line";
import { serializeEffects } from "../patcher/serializer/effects";
import { serializeBodyProperties, serializeParagraphProperties, serializeRunProperties } from "../patcher/serializer/text-properties";
import { CONTENT_TYPES } from "@aurochs-office/pptx/domain";
import { serializeColor } from "../patcher/serializer/color";
import {
  serializeRelationships,
  type OpcRelationship,
} from "@aurochs-office/opc";
import {
  buildContentTypes as buildContentTypesOfficeLayer,
  buildAppProperties as buildAppPropertiesOfficeLayer,
  buildRootRels as buildRootRelsOfficeLayer,
  buildPresentation as buildPresentationOfficeLayer,
  buildPresentationRels as buildPresentationRelsOfficeLayer,
  buildSlideRels as buildSlideRelsOfficeLayer,
  buildLayoutRels as buildLayoutRelsOfficeLayer,
  buildMasterRels as buildMasterRelsOfficeLayer,
  buildBlankSlide as buildBlankSlideOfficeLayer,
  buildEmptyGroupSpPr,
  buildRootNvGrpSpPr as buildNvGrpSpPr,
  buildClrMapOvr,
  type BuildContentTypesOptions as OfficeBuildContentTypesOptions,
  type BuildPresentationOptions as OfficeBuildPresentationOptions,
  type BuildPresentationRelsOptions as OfficeBuildPresentationRelsOptions,
  type BuildSlideRelsOptions as OfficeBuildSlideRelsOptions,
} from "@aurochs-office/pptx/builders";
import {
  OFFICE_RELATIONSHIP_TYPES,
  OFFICE_NAMESPACES,
  DRAWINGML_NAMESPACES,
  PRESENTATIONML_NAMESPACES,
} from "@aurochs-office/opc";
import { createElement, createText, serializeDocument, type XmlDocument, type XmlElement } from "@aurochs/xml";
import { createEmptyZipPackage } from "@aurochs/zip";
import { RELATIONSHIP_TYPES } from "@aurochs-office/pptx/domain/relationships";

// =============================================================================
// Types
// =============================================================================

export type ThemeExportOptions = {
  /** Theme name (used in XML and file name) */
  readonly name: string;
  /** Color scheme (12 scheme colors as hex strings) */
  readonly colorScheme: Readonly<Record<SchemeColorName, string>>;
  /** Font scheme (major and minor fonts) */
  readonly fontScheme: FontScheme;
  /** Font scheme name (optional, defaults to theme name) */
  readonly fontSchemeName?: string;
  /** Custom colors (a:custClrLst) §20.1.6.3 */
  readonly customColors?: readonly CustomColor[];
  /** Master slide color mapping (p:clrMap) §19.3.1.6 */
  readonly colorMapping?: ColorMapping;
  /** Format scheme (domain typed) §20.1.4.1.14 */
  readonly formatScheme?: FormatScheme;
  /** Extra color schemes (a:extraClrSchemeLst) §20.1.6.5 */
  readonly extraColorSchemes?: readonly ExtraColorScheme[];
  /** Object defaults (a:objectDefaults) §20.1.6.7 — XmlElement refs preserved from parser */
  readonly objectDefaults?: ObjectDefaults;
  /** Master text styles (p:txStyles) §19.3.1.51 — XmlElement refs preserved from parser */
  /** Master text styles (p:txStyles) §19.3.1.51 — domain typed (SoT) */
  readonly masterTextStyles?: MasterTextStyles;
  /** Master background §19.3.1.2 — Background domain type. Serialized to p:bg XmlElement on export. */
  readonly masterBackground?: Background;
  /** Slide layouts with per-layout overrides (§19.3.1.39). If omitted, a single blank layout is generated. */
  readonly layouts?: readonly LayoutExportEntry[];
  /** Slide size in pixels (§19.2.1.36 p:sldSz). If omitted, uses standard 16:9 (960×540px). */
  readonly slideSize?: { readonly width: number; readonly height: number };
};

/**
 * Per-layout export data (ECMA-376 §19.3.1.39 p:sldLayout).
 */
export type LayoutExportEntry = {
  readonly name: string;
  readonly type: SlideLayoutType;
  readonly matchingName?: string;
  readonly showMasterShapes?: boolean;
  readonly preserve?: boolean;
  readonly userDrawn?: boolean;
  readonly background?: Background;
  readonly colorMapOverride?: ColorMapOverride;
  readonly transition?: SlideTransition;
};

// =============================================================================
// Constants (derived from SoT, no hardcoded URIs)
// =============================================================================

/** Standard PresentationML xmlns attributes */
const PPTX_XMLNS = {
  "xmlns:p": PRESENTATIONML_NAMESPACES.main,
  "xmlns:a": DRAWINGML_NAMESPACES.main,
  "xmlns:r": OFFICE_NAMESPACES.relationships,
} as const;

/**
 * OOXML specification: ST_SlideMasterId uses values >= 2^31
 * @see ISO/IEC 29500-1:2016 §19.7.4
 */
const SLIDE_MASTER_ID = "2147483648";

/** Default slide size (standard 16:9) in EMUs */
const DEFAULT_SLIDE_SIZE_EMU = {
  cx: "9144000", // 10 inches
  cy: "6858000", // 7.5 inches
};

/** EMUs per inch (ECMA-376 §20.1.10.16) */
const PX_TO_EMU = 914400 / 96;

// =============================================================================
// OPC Part Builders — re-export the office-layer SoT
//
// The authoritative builders for OPC scaffolding parts live in
// `@aurochs-office/pptx/builders`. Re-export them here so the
// `@aurochs-builder/pptx/builders` public surface stays unchanged for
// downstream consumers (pdf-to-pptx, fig-to-pptx, etc.).
// =============================================================================

export const buildRootRels = buildRootRelsOfficeLayer;
export const buildAppProperties = buildAppPropertiesOfficeLayer;
export const buildContentTypes = buildContentTypesOfficeLayer;
export type BuildContentTypesOptions = OfficeBuildContentTypesOptions;
export const buildLayoutRels = buildLayoutRelsOfficeLayer;
export const buildMasterRels = buildMasterRelsOfficeLayer;

/**
 * Build the presentation part's relationships.
 *
 * Backwards-compatible signature: accepts a slide count (number) or a
 * full options object. The number form is preserved because most
 * downstream callers just need to vary the slide count.
 *
 * @see ECMA-376 Part 2, §9.3 (Relationships)
 */
export function buildPresentationRels(arg: number | OfficeBuildPresentationRelsOptions = 1): XmlDocument {
  if (typeof arg === "number") {
    return buildPresentationRelsOfficeLayer({ slideCount: arg });
  }
  return buildPresentationRelsOfficeLayer(arg);
}

/**
 * Options for buildSlideRels — either reference a layout by canonical
 * 1-based index or supply an explicit target path. Re-exported from
 * the office-layer SoT.
 */
export type BuildSlideRelsOptions = OfficeBuildSlideRelsOptions;

/**
 * Build a slide's relationships pointing at the slide layout it is
 * bound to. Delegates to the office-layer SoT.
 */
export function buildSlideRels(arg?: number | OfficeBuildSlideRelsOptions): XmlDocument {
  return buildSlideRelsOfficeLayer(arg);
}

// =============================================================================
// PresentationML Part Builders
// =============================================================================

/**
 * Build the presentation part (ECMA-376 §19.2.1.26 CT_Presentation).
 *
 * Delegates to the office-layer SoT.
 */
export const buildPresentation = buildPresentationOfficeLayer;
export type BuildPresentationOptions = OfficeBuildPresentationOptions;

/**
 * Build the slide master part (ECMA-376 §19.3.1.42).
 *
 * The schema requires p:clrMap and p:sldLayoutIdLst — both are emitted
 * here using the canonical identity color mapping (or the override
 * supplied via options.colorMapping) and the rId range allocated by
 * buildMasterRels.
 */
export function buildSlideMaster(options: ThemeExportOptions, layoutCount: number): XmlDocument {
  const clrMap = options.colorMapping ?? DEFAULT_COLOR_MAPPING;

  // p:cSld children: optional p:bg, then p:spTree
  const cSldChildren: XmlElement[] = [];

  // p:bg §19.3.1.2 — serialize Background domain type to XML
  if (options.masterBackground) {
    const fillXml = serializeFill(options.masterBackground.fill);
    const bgPrAttrs: Record<string, string> = {};
    if (options.masterBackground.shadeToTitle) { bgPrAttrs.shadeToTitle = "1"; }
    cSldChildren.push(createElement("p:bg", {}, [createElement("p:bgPr", bgPrAttrs, [fillXml])]));
  }

  cSldChildren.push(
    createElement("p:spTree", {}, [buildNvGrpSpPr(), buildEmptyGroupSpPr()]),
  );

  // p:txStyles §19.3.1.51 — serialize domain MasterTextStyles to XML.
  // PowerPoint expects all three children (title, body, other) to be
  // present even when empty; emit stubs when the domain doesn't supply
  // a level set.
  const txStylesChildren: XmlElement[] = [];
  const mts = options.masterTextStyles;
  txStylesChildren.push(mts?.titleStyle ? serializeTextStyleLevelsElement("p:titleStyle", mts.titleStyle) : createElement("p:titleStyle"));
  txStylesChildren.push(mts?.bodyStyle ? serializeTextStyleLevelsElement("p:bodyStyle", mts.bodyStyle) : createElement("p:bodyStyle"));
  txStylesChildren.push(mts?.otherStyle ? serializeTextStyleLevelsElement("p:otherStyle", mts.otherStyle) : createElement("p:otherStyle"));

  return {
    children: [
      createElement("p:sldMaster", PPTX_XMLNS, [
        createElement("p:cSld", {}, cSldChildren),
        createElement("p:clrMap", clrMap as Record<string, string>),
        createElement("p:sldLayoutIdLst", {},
          Array.from({ length: layoutCount }, (_, i) =>
            createElement("p:sldLayoutId", { id: String(2147483649 + i), "r:id": `rId${i + 1}` }),
          ),
        ),
        createElement("p:txStyles", {}, txStylesChildren),
      ]),
    ],
  };
}

/** Build a slide layout document from export data (ECMA-376 §19.3.1.39). */
export function buildLayoutDocument(entry: LayoutExportEntry): XmlDocument {
  const attrs: Record<string, string> = { ...PPTX_XMLNS, type: entry.type };
  if (entry.matchingName) { attrs.matchingName = entry.matchingName; }
  if (entry.showMasterShapes === false) { attrs.showMasterSp = "0"; }
  if (entry.preserve) { attrs.preserve = "1"; }
  if (entry.userDrawn) { attrs.userDrawn = "1"; }

  // p:cSld children: optional p:bg, then p:spTree
  const cSldChildren: XmlElement[] = [];
  if (entry.background) {
    const fillXml = serializeFill(entry.background.fill);
    const bgPrAttrs: Record<string, string> = {};
    if (entry.background.shadeToTitle) { bgPrAttrs.shadeToTitle = "1"; }
    cSldChildren.push(createElement("p:bg", {}, [createElement("p:bgPr", bgPrAttrs, [fillXml])]));
  }
  cSldChildren.push(createElement("p:spTree", {}, [buildNvGrpSpPr(), buildEmptyGroupSpPr()]));

  const sldLayoutChildren: XmlElement[] = [
    createElement("p:cSld", { name: entry.name }, cSldChildren),
  ];

  // p:clrMapOvr §19.3.1.7
  if (entry.colorMapOverride?.type === "override") {
    sldLayoutChildren.push(buildClrMapOvr(entry.colorMapOverride.mappings as Record<string, string>));
  } else {
    sldLayoutChildren.push(buildClrMapOvr());
  }

  return { children: [createElement("p:sldLayout", attrs, sldLayoutChildren)] };
}

/**
 * Build an empty p:sld document with a blank spTree and a master
 * color-map override. Delegates to the office-layer SoT.
 */
export const buildBlankSlide = buildBlankSlideOfficeLayer;

// =============================================================================
// Theme XML Builder — §20.1.6.9 (a:theme)
// =============================================================================

/**
 * Options for building a theme XML document from domain types.
 */
export type BuildThemeXmlOptions = {
  /** Theme name (a:theme@name attribute) */
  readonly name: string;
  /** Theme domain object (SoT) */
  readonly theme: Theme;
  /** Font scheme name (a:fontScheme@name, defaults to theme name) */
  readonly fontSchemeName?: string;
};

/**
 * Build a complete a:theme XML document from domain types.
 *
 * This is the single authoritative function for constructing theme XML
 * from the Theme domain type (SoT). Used by both:
 * - exportThemeAsPotx (POTX file generation)
 * - pptx-editor APPLY_THEME (live theme replacement)
 *
 * @see ECMA-376 Part 1, Section 20.1.6.9 (CT_OfficeStyleSheet)
 */
export function buildThemeXml(options: BuildThemeXmlOptions): XmlDocument {
  const { name, theme, fontSchemeName } = options;

  const colorChildren = buildColorSchemeChildren(theme.colorScheme as Readonly<Record<SchemeColorName, string>>);

  // a:themeElements children (all required per §20.1.6.10)
  const themeElementsChildren: XmlElement[] = [
    createElement("a:clrScheme", { name }, colorChildren),
    createElement("a:fontScheme", { name: fontSchemeName || name }, [
      buildFontElement("major", theme.fontScheme.majorFont),
      buildFontElement("minor", theme.fontScheme.minorFont),
    ]),
    buildFormatSchemeFromDomain(name, theme.formatScheme),
  ];

  // a:objectDefaults §20.1.6.7 — optional
  const odChildren = buildObjectDefaultsChildren(theme.objectDefaults);
  if (odChildren.length > 0) {
    themeElementsChildren.push(createElement("a:objectDefaults", {}, odChildren));
  }

  // a:theme children (after a:themeElements)
  const themeChildren: XmlElement[] = [
    createElement("a:themeElements", {}, themeElementsChildren),
  ];

  // a:extraClrSchemeLst §20.1.6.5 — optional
  if (theme.extraColorSchemes.length > 0) {
    themeChildren.push(buildExtraColorSchemeList(theme.extraColorSchemes));
  }

  // a:custClrLst §20.1.6.3 — optional
  themeChildren.push(...buildCustomColorsList(theme.customColors));

  return {
    children: [
      createElement("a:theme", { "xmlns:a": DRAWINGML_NAMESPACES.main, name }, themeChildren),
    ],
  };
}

/**
 * Serialize a single `ObjectDefaultProperties` block to its container
 * element (`<a:spDef>`, `<a:lnDef>`, or `<a:txDef>`).
 *
 * @see ECMA-376 Part 1, §20.1.6.10 (a:spDef / a:lnDef / a:txDef)
 */
export function serializeObjectDefaultElement(name: "a:spDef" | "a:lnDef" | "a:txDef", props: ObjectDefaultProperties): XmlElement {
  const children: XmlElement[] = [];
  if (props.shapeProperties) {
    const spPrChildren: XmlElement[] = [];
    if (props.shapeProperties.fill) { spPrChildren.push(serializeFill(props.shapeProperties.fill)); }
    if (props.shapeProperties.line) { spPrChildren.push(serializeLine(props.shapeProperties.line)); }
    children.push(createElement("a:spPr", {}, spPrChildren));
  }
  if (props.bodyProperties) { children.push(serializeBodyProperties(props.bodyProperties)); }
  if (props.textStyleLevels) { children.push(serializeTextStyleLevelsElement("a:lstStyle", props.textStyleLevels)); }
  return createElement(name, {}, children);
}

/**
 * Build the children of `<a:objectDefaults>` from a domain
 * `ObjectDefaults`.
 *
 * The returned array carries 0..3 elements (one each for `<a:spDef>`,
 * `<a:lnDef>`, `<a:txDef>`) — callers wrap them in
 * `<a:objectDefaults>` only when the array is non-empty.
 *
 * @see ECMA-376 Part 1, §20.1.6.7 (a:objectDefaults)
 */
export function buildObjectDefaultsChildren(od: ObjectDefaults): XmlElement[] {
  const children: XmlElement[] = [];
  if (od.shapeDefault) { children.push(serializeObjectDefaultElement("a:spDef", od.shapeDefault)); }
  if (od.lineDefault) { children.push(serializeObjectDefaultElement("a:lnDef", od.lineDefault)); }
  if (od.textDefault) { children.push(serializeObjectDefaultElement("a:txDef", od.textDefault)); }
  return children;
}

// =============================================================================
// Text Style Levels Serialization
// =============================================================================

const LEVEL_ELEMENT_NAMES = [
  "a:defPPr", "a:lvl1pPr", "a:lvl2pPr", "a:lvl3pPr", "a:lvl4pPr",
  "a:lvl5pPr", "a:lvl6pPr", "a:lvl7pPr", "a:lvl8pPr", "a:lvl9pPr",
] as const;

const LEVEL_KEYS = TEXT_STYLE_LEVEL_KEYS;

/** Serialize TextLevelStyle to a paragraph-level XmlElement (a:lvlNpPr). */
function serializeTextLevelStyleElement(name: string, level: TextLevelStyle): XmlElement {
  const pPr = level.paragraphProperties ? serializeParagraphProperties(level.paragraphProperties) : undefined;
  const defRPr = level.defaultRunProperties ? serializeRunProperties(level.defaultRunProperties) : undefined;

  // Start from serialized pPr (has all paragraph attributes/children), add defRPr
  if (pPr) {
    const children = [...pPr.children];
    if (defRPr) {
      children.push({ ...defRPr, name: "a:defRPr" });
    }
    return { ...pPr, name, children };
  }

  // No paragraph properties, just defRPr
  if (defRPr) {
    return createElement(name, {}, [{ ...defRPr, name: "a:defRPr" }]);
  }

  return createElement(name);
}

/**
 * Serialize TextStyleLevels to a named container element.
 *
 * Used for `p:titleStyle`/`p:bodyStyle`/`p:otherStyle` (master text
 * styles, ECMA-376 §19.3.1.51) and `a:lstStyle` (object defaults
 * §20.1.6.7 and theme overrides). The container element name is the
 * caller's responsibility because the same level structure appears
 * under many parent names.
 *
 * @see ECMA-376 §21.1.2.4 (TextListStyle) for the level layout.
 */
export function serializeTextStyleLevelsElement(containerName: string, levels: TextStyleLevels): XmlElement {
  const children: XmlElement[] = [];
  for (let i = 0; i < LEVEL_KEYS.length; i++) {
    const level = levels[LEVEL_KEYS[i]];
    if (level) {
      children.push(serializeTextLevelStyleElement(LEVEL_ELEMENT_NAMES[i], level));
    }
  }
  return createElement(containerName, {}, children);
}

/** Adapter: build theme XML from ThemeExportOptions (delegates to buildThemeXml). */
export function buildThemeFromExportOptions(options: ThemeExportOptions): XmlDocument {
  return buildThemeXml({
    name: options.name,
    theme: exportOptionsToTheme(options),
    fontSchemeName: options.fontSchemeName,
  });
}

/** Office's stock 12-slot color scheme used by Office's "Office" theme. */
const DEFAULT_THEME_COLOR_SCHEME: Readonly<Record<SchemeColorName, string>> = {
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

/**
 * Build a complete ThemeExportOptions populated with Office defaults.
 *
 * Use this when a builder needs a full theme but does not have one to
 * supply (e.g. when synthesising a blank deck). Each call returns a
 * fresh object so the caller may mutate/override fields freely.
 */
export function defaultThemeExportOptions(name: string = "Office"): ThemeExportOptions {
  return {
    name,
    colorScheme: { ...DEFAULT_THEME_COLOR_SCHEME },
    fontScheme: {
      majorFont: { latin: "Calibri Light" },
      minorFont: { latin: "Calibri" },
    },
    formatScheme: defaultFormatScheme(),
    colorMapping: { ...DEFAULT_COLOR_MAPPING },
  };
}

/** Convert ThemeExportOptions to Theme domain type for buildThemeXml. */
function exportOptionsToTheme(options: ThemeExportOptions): Theme {
  return {
    colorScheme: options.colorScheme,
    fontScheme: options.fontScheme,
    formatScheme: options.formatScheme ?? defaultFormatScheme(),
    customColors: options.customColors ?? [],
    extraColorSchemes: options.extraColorSchemes ?? [],
    objectDefaults: options.objectDefaults ?? {},
    themeOverrides: [],
  };
}

/**
 * Build the default format scheme.
 *
 * Emits 3 placeholder-color fills, 3 placeholder-color stroked lines
 * (subtle/moderate/intense), 3 effect-style stubs, and 3 background
 * fills — exactly the minimum needed to satisfy ECMA-376
 * §20.1.4.1.14 and the PowerPoint reader.
 *
 * @see ECMA-376 Part 1, §20.1.4.1.14 (a:fmtScheme)
 */
export function defaultFormatScheme(): FormatScheme {
  const phFill: BaseFill = { type: "solidFill", color: { spec: { type: "scheme", value: "phClr" } } };
  const phLine = (w: number): BaseLine => ({
    width: px(w) as Pixels,
    cap: "flat",
    compound: "sng",
    alignment: "ctr",
    fill: { type: "solidFill", color: { spec: { type: "scheme", value: "phClr" } } },
    dash: "solid",
    join: "round",
  });
  return {
    fillStyles: [phFill, phFill, phFill],
    lineStyles: [phLine(0.5), phLine(1), phLine(1.5)],
    effectStyles: [undefined, undefined, undefined],
    bgFillStyles: [phFill, phFill, phFill],
  };
}

// =============================================================================
// Color Scheme — §20.1.6.2
// =============================================================================

/**
 * Convert a hex string to a Color domain object.
 *
 * Theme color-scheme entries always serialise as `<a:srgbClr val="...">`
 * regardless of how the parser obtained them; this helper keeps the
 * call sites in `buildClrSchemeElement` / `buildExtraColorScheme`
 * concise.
 */
function hexToColor(hex: string): Color {
  return { spec: { type: "srgb", value: hex } };
}

/**
 * Build the children of an `<a:clrScheme>` element from a 12-slot
 * color scheme.
 *
 * @see ECMA-376 Part 1, §20.1.6.2 (CT_ColorScheme)
 */
export function buildColorSchemeChildren(cs: Readonly<Record<SchemeColorName, string>>): XmlElement[] {
  return SCHEME_COLOR_NAMES.map((key) =>
    createElement(`a:${key}`, {}, [serializeColor(hexToColor(cs[key]))]),
  );
}

/**
 * Build a complete `<a:clrScheme name="...">` element from a 12-slot
 * color scheme.
 *
 * @see ECMA-376 Part 1, §20.1.6.2 (CT_ColorScheme)
 */
export function buildColorSchemeElement(
  name: string,
  cs: Readonly<Record<SchemeColorName, string>>,
): XmlElement {
  return createElement("a:clrScheme", { name }, buildColorSchemeChildren(cs));
}

// =============================================================================
// Font Scheme — §20.1.4.1.18
// =============================================================================

/**
 * Build a single `<a:majorFont>` or `<a:minorFont>` element under
 * `<a:fontScheme>` from a domain `FontSpec`.
 *
 * @param prefix - either `"major"` or `"minor"` — the resulting tag is
 *   `a:${prefix}Font`.
 *
 * @see ECMA-376 Part 1, §20.1.4.1.16 (a:majorFont)
 * @see ECMA-376 Part 1, §20.1.4.1.17 (a:minorFont)
 */
export function buildFontElement(prefix: "major" | "minor", font: FontScheme["majorFont"]): XmlElement {
  const children: XmlElement[] = [];
  if (font.latin) { children.push(createElement("a:latin", { typeface: font.latin })); }
  if (font.eastAsian) { children.push(createElement("a:ea", { typeface: font.eastAsian })); }
  if (font.complexScript) { children.push(createElement("a:cs", { typeface: font.complexScript })); }
  return createElement(`a:${prefix}Font`, {}, children);
}

/**
 * Build the `<a:fontScheme>` container with both `majorFont` and
 * `minorFont` children populated from the domain `FontScheme`.
 *
 * @see ECMA-376 Part 1, §20.1.4.1.18 (a:fontScheme)
 */
export function buildFontSchemeElement(name: string, fontScheme: FontScheme): XmlElement {
  return createElement("a:fontScheme", { name }, [
    buildFontElement("major", fontScheme.majorFont),
    buildFontElement("minor", fontScheme.minorFont),
  ]);
}

// =============================================================================
// Format Scheme — §20.1.4.1.14
// =============================================================================

/**
 * Build the `<a:fmtScheme>` element from a domain `FormatScheme`.
 *
 * The domain shape is fixed at three fill / line / effect / bgFill
 * style entries — emit each as a positional child of the standard
 * `fillStyleLst` / `lnStyleLst` / `effectStyleLst` / `bgFillStyleLst`
 * containers per the schema sequence.
 *
 * @see ECMA-376 Part 1, §20.1.4.1.14 (a:fmtScheme)
 */
export function buildFormatSchemeFromDomain(name: string, fmt: FormatScheme): XmlElement {
  const effectStyleElements = fmt.effectStyles.map((e) => {
    const effectChild = e ? serializeEffects(e) : null;
    return createElement("a:effectStyle", {}, effectChild ? [effectChild] : [createElement("a:effectLst")]);
  });

  return createElement("a:fmtScheme", { name }, [
    createElement("a:fillStyleLst", {}, fmt.fillStyles.map(serializeFill)),
    createElement("a:lnStyleLst", {}, fmt.lineStyles.map(serializeLine)),
    createElement("a:effectStyleLst", {}, effectStyleElements),
    createElement("a:bgFillStyleLst", {}, fmt.bgFillStyles.map(serializeFill)),
  ]);
}

// =============================================================================
// Extra Color Schemes — §20.1.6.5
// =============================================================================

/**
 * Build the `<a:extraClrSchemeLst>` container from an array of
 * domain extra-color-scheme entries. Returns an empty list element
 * when the input is empty (callers may choose to skip emission).
 *
 * @see ECMA-376 Part 1, §20.1.6.5 (a:extraClrSchemeLst)
 */
export function buildExtraColorSchemeList(schemes: readonly ExtraColorScheme[]): XmlElement {
  return createElement("a:extraClrSchemeLst", {}, schemes.map(buildExtraColorScheme));
}

/**
 * Build a single `<a:extraClrScheme>` entry containing a clrScheme
 * + clrMap pair.
 *
 * @see ECMA-376 Part 1, §20.1.6.5 (a:extraClrSchemeLst)
 */
export function buildExtraColorScheme(scheme: ExtraColorScheme): XmlElement {
  const clrSchemeAttrs: Record<string, string> = {};
  if (scheme.name) { clrSchemeAttrs.name = scheme.name; }

  // Build color scheme children using serializeColor (SoT)
  const colorChildren = SCHEME_COLOR_NAMES
    .filter((key) => scheme.colorScheme[key] !== undefined)
    .map((key) =>
      createElement(`a:${key}`, {}, [serializeColor(hexToColor(scheme.colorScheme[key]))]),
    );

  return createElement("a:extraClrScheme", {}, [
    createElement("a:clrScheme", clrSchemeAttrs, colorChildren),
    createElement("a:clrMap", scheme.colorMap as Record<string, string>),
  ]);
}

// =============================================================================
// Custom Colors — §20.1.6.3
// =============================================================================

/**
 * Convert CustomColor domain type to Color for serialization.
 * CustomColor and Color both map to EG_ColorChoice (§20.1.2.3) in ECMA-376.
 */
function customColorToColor(c: CustomColor): Color {
  if (c.type === "srgb") {
    return { spec: { type: "srgb", value: c.color ?? "000000" } };
  }
  return { spec: { type: "system", value: c.systemColor ?? "windowText" } };
}

/**
 * Build the `<a:custClrLst>` container (returns 0 or 1 elements).
 *
 * Returns an empty array when no custom colors are provided so the
 * caller can spread the result into a parent's children without an
 * extra `if`.
 *
 * @see ECMA-376 Part 1, §20.1.6.3 (a:custClrLst)
 */
export function buildCustomColorsList(customColors?: readonly CustomColor[]): XmlElement[] {
  if (!customColors || customColors.length === 0) {
    return [];
  }
  const colorElements = customColors.map((c) => {
    const colorEl = serializeColor(customColorToColor(c));
    const attrs: Record<string, string> = {};
    if (c.name) { attrs["name"] = c.name; }
    return createElement("a:custClr", attrs, [colorEl]);
  });
  return [createElement("a:custClrLst", {}, colorElements)];
}

// =============================================================================
// Serialization Helper
// =============================================================================

function writeXml(pkg: ReturnType<typeof createEmptyZipPackage>, path: string, doc: XmlDocument): void {
  pkg.writeText(path, serializeDocument(doc, { declaration: true, standalone: true }));
}

// =============================================================================
// Main Export Function
// =============================================================================

/**
 * Export theme as a POTX (PowerPoint Template) file.
 *
 * Creates a minimal POTX containing all ECMA-376 theme elements:
 * - Theme with colors, fonts, format scheme, object defaults, extra color schemes, custom colors
 * - One slide master with color map, background, text styles
 * - One blank slide layout
 * - One blank slide (required by openPresentation)
 *
 * @param options - Theme export options
 * @returns Promise resolving to Blob containing the POTX file
 */
export async function exportThemeAsPotx(options: ThemeExportOptions): Promise<Blob> {
  const pkg = createEmptyZipPackage();
  const layouts = options.layouts ?? [{ name: "Blank", type: "blank" as SlideLayoutType, preserve: true }];
  const layoutCount = layouts.length;

  writeXml(pkg, "_rels/.rels", buildRootRels());
  writeXml(pkg, "[Content_Types].xml", buildContentTypes({ layoutCount, slideCount: 1 }));
  writeXml(pkg, "docProps/app.xml", buildAppProperties());
  writeXml(pkg, "ppt/presentation.xml", buildPresentation({ slideSize: options.slideSize, slideCount: 1 }));
  writeXml(pkg, "ppt/_rels/presentation.xml.rels", buildPresentationRels(1));
  writeXml(pkg, "ppt/theme/theme1.xml", buildThemeFromExportOptions(options));
  writeXml(pkg, "ppt/slideMasters/slideMaster1.xml", buildSlideMaster(options, layoutCount));
  writeXml(pkg, "ppt/slideMasters/_rels/slideMaster1.xml.rels", buildMasterRels(layoutCount));

  for (let i = 0; i < layoutCount; i++) {
    writeXml(pkg, `ppt/slideLayouts/slideLayout${i + 1}.xml`, buildLayoutDocument(layouts[i]));
    writeXml(pkg, `ppt/slideLayouts/_rels/slideLayout${i + 1}.xml.rels`, buildLayoutRels());
  }

  writeXml(pkg, "ppt/slides/slide1.xml", buildBlankSlide());
  writeXml(pkg, "ppt/slides/_rels/slide1.xml.rels", buildSlideRels());

  const arrayBuffer = await pkg.toArrayBuffer();
  return new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.template",
  });
}

/**
 * Generate a sanitized file name for the theme.
 */
export function getThemeFileName(themeName: string): string {
  const sanitized = themeName.replace(/[<>:"/\\|?*]/g, "_").trim();
  return `${sanitized}.potx`;
}
