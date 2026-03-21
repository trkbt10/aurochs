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
 * | p:bg                 | 19.3.1.2    | XmlElement (raw)      | ✅     |
 * | p:txStyles           | 19.3.1.51   | RawMasterTextStyles   | ✅     |
 *
 * @see ECMA-376 Part 1, Section 20.1.6 - Theme Definitions
 */

import type { SchemeColorName, Color } from "@aurochs-office/drawing-ml/domain/color";
import type { FontScheme } from "@aurochs-office/ooxml/domain/font-scheme";
import type { Theme, CustomColor, ExtraColorScheme, FormatScheme, ObjectDefaults, RawMasterTextStyles } from "@aurochs-office/pptx/domain/theme/types";
import type { ColorMapping } from "@aurochs-office/pptx/domain/color/types";
import { CONTENT_TYPES } from "@aurochs-office/pptx/domain";
import { serializeColor } from "../patcher/serializer/color";
import {
  serializeRelationships,
  serializeContentTypes,
  STANDARD_CONTENT_TYPE_DEFAULTS,
  type ContentTypeEntry,
  type OpcRelationship,
} from "@aurochs-office/opc";
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
  /** Format scheme style elements (preserved XmlElement arrays) §20.1.4.1.14 */
  readonly formatSchemeElements?: {
    readonly fillStyles?: readonly XmlElement[];
    readonly lineStyles?: readonly XmlElement[];
    readonly effectStyles?: readonly XmlElement[];
    readonly bgFillStyles?: readonly XmlElement[];
  };
  /** Extra color schemes (a:extraClrSchemeLst) §20.1.6.5 */
  readonly extraColorSchemes?: readonly ExtraColorScheme[];
  /** Object defaults (a:objectDefaults) §20.1.6.7 — XmlElement refs preserved from parser */
  readonly objectDefaults?: ObjectDefaults;
  /** Master text styles (p:txStyles) §19.3.1.51 — XmlElement refs preserved from parser */
  readonly masterTextStyles?: RawMasterTextStyles;
  /** Master background (p:bg) §19.3.1.2 — raw XmlElement preserved from parser */
  readonly masterBackground?: XmlElement;
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
const DEFAULT_SLIDE_SIZE = {
  cx: "9144000", // 10 inches
  cy: "6858000", // 7.5 inches
};

/** Default color map per ECMA-376 convention */
const DEFAULT_COLOR_MAP: ColorMapping = {
  bg1: "lt1", tx1: "dk1", bg2: "lt2", tx2: "dk2",
  accent1: "accent1", accent2: "accent2", accent3: "accent3",
  accent4: "accent4", accent5: "accent5", accent6: "accent6",
  hlink: "hlink", folHlink: "folHlink",
};

/** 12 ECMA-376 scheme color slots in specification order */
const SCHEME_COLOR_SLOTS: readonly SchemeColorName[] = [
  "dk1", "lt1", "dk2", "lt2",
  "accent1", "accent2", "accent3", "accent4", "accent5", "accent6",
  "hlink", "folHlink",
];

// =============================================================================
// OPC Part Builders
// =============================================================================

function buildRootRels(): XmlDocument {
  const rels: OpcRelationship[] = [
    { id: "rId1", type: OFFICE_RELATIONSHIP_TYPES.officeDocument, target: "ppt/presentation.xml" },
    { id: "rId2", type: OFFICE_RELATIONSHIP_TYPES.extendedProperties, target: "docProps/app.xml" },
  ];
  return { children: [serializeRelationships(rels)] };
}

function buildContentTypes(): XmlDocument {
  const entries: ContentTypeEntry[] = [
    ...STANDARD_CONTENT_TYPE_DEFAULTS,
    { kind: "override", partName: "/ppt/presentation.xml", contentType: CONTENT_TYPES.PRESENTATION },
    { kind: "override", partName: "/ppt/slides/slide1.xml", contentType: CONTENT_TYPES.SLIDE },
    { kind: "override", partName: "/ppt/slideMasters/slideMaster1.xml", contentType: CONTENT_TYPES.SLIDE_MASTER },
    { kind: "override", partName: "/ppt/slideLayouts/slideLayout1.xml", contentType: CONTENT_TYPES.SLIDE_LAYOUT },
    { kind: "override", partName: "/ppt/theme/theme1.xml", contentType: CONTENT_TYPES.THEME },
  ];
  return { children: [serializeContentTypes(entries)] };
}

function buildAppProperties(): XmlDocument {
  return {
    children: [
      createElement("Properties", { xmlns: OFFICE_NAMESPACES.extendedProperties }, [
        createElement("AppVersion", {}, [createText("16.0")]),
      ]),
    ],
  };
}

function buildPresentationRels(): XmlDocument {
  const rels: OpcRelationship[] = [
    { id: "rId1", type: RELATIONSHIP_TYPES.SLIDE_MASTER, target: "slideMasters/slideMaster1.xml" },
    { id: "rId2", type: RELATIONSHIP_TYPES.SLIDE, target: "slides/slide1.xml" },
  ];
  return { children: [serializeRelationships(rels)] };
}

function buildMasterRels(): XmlDocument {
  const rels: OpcRelationship[] = [
    { id: "rId1", type: RELATIONSHIP_TYPES.SLIDE_LAYOUT, target: "../slideLayouts/slideLayout1.xml" },
    { id: "rId2", type: RELATIONSHIP_TYPES.THEME, target: "../theme/theme1.xml" },
  ];
  return { children: [serializeRelationships(rels)] };
}

function buildLayoutRels(): XmlDocument {
  const rels: OpcRelationship[] = [
    { id: "rId1", type: RELATIONSHIP_TYPES.SLIDE_MASTER, target: "../slideMasters/slideMaster1.xml" },
  ];
  return { children: [serializeRelationships(rels)] };
}

function buildSlideRels(): XmlDocument {
  const rels: OpcRelationship[] = [
    { id: "rId1", type: RELATIONSHIP_TYPES.SLIDE_LAYOUT, target: "../slideLayouts/slideLayout1.xml" },
  ];
  return { children: [serializeRelationships(rels)] };
}

// =============================================================================
// PresentationML Part Builders
// =============================================================================

function buildEmptyGroupSpPr(): XmlElement {
  return createElement("p:grpSpPr", {}, [
    createElement("a:xfrm", {}, [
      createElement("a:off", { x: "0", y: "0" }),
      createElement("a:ext", { cx: "0", cy: "0" }),
      createElement("a:chOff", { x: "0", y: "0" }),
      createElement("a:chExt", { cx: "0", cy: "0" }),
    ]),
  ]);
}

function buildNvGrpSpPr(): XmlElement {
  return createElement("p:nvGrpSpPr", {}, [
    createElement("p:cNvPr", { id: "1", name: "" }),
    createElement("p:cNvGrpSpPr"),
    createElement("p:nvPr"),
  ]);
}

function buildPresentation(): XmlDocument {
  return {
    children: [
      createElement("p:presentation", PPTX_XMLNS, [
        createElement("p:sldIdLst", {}, [
          createElement("p:sldId", { id: "256", "r:id": "rId2" }),
        ]),
        createElement("p:sldMasterIdLst", {}, [
          createElement("p:sldMasterId", { id: SLIDE_MASTER_ID, "r:id": "rId1" }),
        ]),
        createElement("p:sldSz", DEFAULT_SLIDE_SIZE),
        createElement("p:defaultTextStyle", {}, [
          createElement("a:defPPr", {}, [createElement("a:defRPr", { sz: "1800" })]),
        ]),
      ]),
    ],
  };
}

function buildSlideMaster(options: ThemeExportOptions): XmlDocument {
  const clrMap = options.colorMapping ?? DEFAULT_COLOR_MAP;

  // p:cSld children: optional p:bg, then p:spTree
  const cSldChildren: XmlElement[] = [];

  // p:bg §19.3.1.2 — raw XmlElement from parser
  if (options.masterBackground) {
    cSldChildren.push(options.masterBackground);
  }

  cSldChildren.push(
    createElement("p:spTree", {}, [buildNvGrpSpPr(), createElement("p:grpSpPr")]),
  );

  // p:txStyles §19.3.1.51
  const txStylesChildren: XmlElement[] = [];
  const mts = options.masterTextStyles;
  txStylesChildren.push(mts?.titleStyle ?? createElement("p:titleStyle"));
  txStylesChildren.push(mts?.bodyStyle ?? createElement("p:bodyStyle"));
  if (mts?.otherStyle) {
    txStylesChildren.push(mts.otherStyle);
  }

  return {
    children: [
      createElement("p:sldMaster", PPTX_XMLNS, [
        createElement("p:cSld", {}, cSldChildren),
        createElement("p:clrMap", clrMap as Record<string, string>),
        createElement("p:sldLayoutIdLst", {}, [
          createElement("p:sldLayoutId", { id: "2147483649", "r:id": "rId1" }),
        ]),
        createElement("p:txStyles", {}, txStylesChildren),
      ]),
    ],
  };
}

function buildBlankLayout(): XmlDocument {
  return {
    children: [
      createElement("p:sldLayout", { ...PPTX_XMLNS, type: "blank", preserve: "1" }, [
        createElement("p:cSld", { name: "Blank" }, [
          createElement("p:spTree", {}, [buildNvGrpSpPr(), buildEmptyGroupSpPr()]),
        ]),
        createElement("p:clrMapOvr", {}, [createElement("a:masterClrMapping")]),
      ]),
    ],
  };
}

function buildBlankSlide(): XmlDocument {
  return {
    children: [
      createElement("p:sld", PPTX_XMLNS, [
        createElement("p:cSld", {}, [
          createElement("p:spTree", {}, [buildNvGrpSpPr(), buildEmptyGroupSpPr()]),
        ]),
        createElement("p:clrMapOvr", {}, [createElement("a:masterClrMapping")]),
      ]),
    ],
  };
}

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

/** Build a:objectDefaults children from domain ObjectDefaults. */
function buildObjectDefaultsChildren(od: ObjectDefaults): XmlElement[] {
  const children: XmlElement[] = [];
  if (od.shapeDefault) { children.push(od.shapeDefault); }
  if (od.lineDefault) { children.push(od.lineDefault); }
  if (od.textDefault) { children.push(od.textDefault); }
  return children;
}

/** Adapter: build theme XML from ThemeExportOptions (delegates to buildThemeXml). */
function buildThemeFromExportOptions(options: ThemeExportOptions): XmlDocument {
  return buildThemeXml({
    name: options.name,
    theme: exportOptionsToTheme(options),
    fontSchemeName: options.fontSchemeName,
  });
}

/** Convert ThemeExportOptions to Theme domain type for buildThemeXml. */
function exportOptionsToTheme(options: ThemeExportOptions): Theme {
  return {
    colorScheme: options.colorScheme,
    fontScheme: options.fontScheme,
    formatScheme: formatSchemeFromExportOptions(options.formatSchemeElements),
    customColors: options.customColors ?? [],
    extraColorSchemes: options.extraColorSchemes ?? [],
    objectDefaults: options.objectDefaults ?? {},
    themeOverrides: [],
  };
}

function formatSchemeFromExportOptions(fmt: ThemeExportOptions["formatSchemeElements"]): FormatScheme {
  if (!fmt) { return defaultFormatScheme(); }
  return {
    fillStyles: [...fmt.fillStyles ?? []],
    lineStyles: [...fmt.lineStyles ?? []],
    effectStyles: [...fmt.effectStyles ?? []],
    bgFillStyles: [...fmt.bgFillStyles ?? []],
  };
}

/** Default format scheme with placeholder elements per ECMA-376 §20.1.4.1.14. */
function defaultFormatScheme(): FormatScheme {
  const phFill = createElement("a:solidFill", {}, [createElement("a:schemeClr", { val: "phClr" })]);
  const phLine = (w: string) => createElement("a:ln", { w }, [
    createElement("a:solidFill", {}, [createElement("a:schemeClr", { val: "phClr" })]),
  ]);
  const phEffect = createElement("a:effectStyle", {}, [createElement("a:effectLst")]);
  return {
    fillStyles: [phFill, phFill, phFill],
    lineStyles: [phLine("6350"), phLine("12700"), phLine("19050")],
    effectStyles: [phEffect, phEffect, phEffect],
    bgFillStyles: [phFill, phFill, phFill],
  };
}

// =============================================================================
// Color Scheme — §20.1.6.2
// =============================================================================

/**
 * Convert a hex string to a Color domain object.
 * ColorScheme stores resolved hex values — these are always srgb.
 */
function hexToColor(hex: string): Color {
  return { spec: { type: "srgb", value: hex } };
}

/**
 * Build 12 color scheme children from hex color values.
 * ColorScheme is Record<string, string> — resolved hex values from parser.
 * Uses serializeColor (SoT) for XML generation.
 */
function buildColorSchemeChildren(cs: Readonly<Record<SchemeColorName, string>>): XmlElement[] {
  return SCHEME_COLOR_SLOTS.map((key) =>
    createElement(`a:${key}`, {}, [serializeColor(hexToColor(cs[key]))]),
  );
}

// =============================================================================
// Font Scheme — §20.1.4.1.18
// =============================================================================

function buildFontElement(prefix: string, font: FontScheme["majorFont"]): XmlElement {
  const children: XmlElement[] = [];
  if (font.latin) { children.push(createElement("a:latin", { typeface: font.latin })); }
  if (font.eastAsian) { children.push(createElement("a:ea", { typeface: font.eastAsian })); }
  if (font.complexScript) { children.push(createElement("a:cs", { typeface: font.complexScript })); }
  return createElement(`a:${prefix}Font`, {}, children);
}

// =============================================================================
// Format Scheme — §20.1.4.1.14
// =============================================================================

/** Build a:fmtScheme from domain FormatScheme (SoT). */
function buildFormatSchemeFromDomain(name: string, fmt: FormatScheme): XmlElement {
  return createElement("a:fmtScheme", { name }, [
    createElement("a:fillStyleLst", {}, [...fmt.fillStyles]),
    createElement("a:lnStyleLst", {}, [...fmt.lineStyles]),
    createElement("a:effectStyleLst", {}, [...fmt.effectStyles]),
    createElement("a:bgFillStyleLst", {}, [...fmt.bgFillStyles]),
  ]);
}

// =============================================================================
// Extra Color Schemes — §20.1.6.5
// =============================================================================

function buildExtraColorSchemeList(schemes: readonly ExtraColorScheme[]): XmlElement {
  return createElement("a:extraClrSchemeLst", {}, schemes.map(buildExtraColorScheme));
}

function buildExtraColorScheme(scheme: ExtraColorScheme): XmlElement {
  const clrSchemeAttrs: Record<string, string> = {};
  if (scheme.name) { clrSchemeAttrs.name = scheme.name; }

  // Build color scheme children using serializeColor (SoT)
  const colorChildren = SCHEME_COLOR_SLOTS
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

function buildCustomColorsList(customColors?: readonly CustomColor[]): XmlElement[] {
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

  writeXml(pkg, "_rels/.rels", buildRootRels());
  writeXml(pkg, "[Content_Types].xml", buildContentTypes());
  writeXml(pkg, "docProps/app.xml", buildAppProperties());
  writeXml(pkg, "ppt/presentation.xml", buildPresentation());
  writeXml(pkg, "ppt/_rels/presentation.xml.rels", buildPresentationRels());
  writeXml(pkg, "ppt/theme/theme1.xml", buildThemeFromExportOptions(options));
  writeXml(pkg, "ppt/slideMasters/slideMaster1.xml", buildSlideMaster(options));
  writeXml(pkg, "ppt/slideMasters/_rels/slideMaster1.xml.rels", buildMasterRels());
  writeXml(pkg, "ppt/slideLayouts/slideLayout1.xml", buildBlankLayout());
  writeXml(pkg, "ppt/slideLayouts/_rels/slideLayout1.xml.rels", buildLayoutRels());
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
