/**
 * @file Theme exporter - exports theme as POTX file
 *
 * Creates a PowerPoint template (.potx) file from theme data.
 * All constants (namespaces, content types, relationship types) are
 * sourced from @aurochs-office/opc and @aurochs-office/pptx/domain (SoT).
 *
 * @see ECMA-376 Part 1, Section 20.1.6 - Theme Definitions
 */

import type { ThemeColorScheme, ThemeFontScheme } from "./types";
import type { CustomColor } from "@aurochs-office/pptx/domain/theme/types";
import type { ColorMapping } from "@aurochs-office/pptx/domain/color/types";
import { CONTENT_TYPES, RELATIONSHIP_TYPES } from "@aurochs-office/pptx/domain";
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

// =============================================================================
// Types
// =============================================================================

export type ThemeExportOptions = {
  /** Theme name (used in XML and file name) */
  readonly name: string;
  /** Color scheme (12 scheme colors) */
  readonly colorScheme: ThemeColorScheme;
  /** Font scheme (major and minor fonts) */
  readonly fontScheme: ThemeFontScheme;
  /** Font scheme name (optional, defaults to theme name) */
  readonly fontSchemeName?: string;
  /** Custom colors (a:custClrLst) */
  readonly customColors?: readonly CustomColor[];
  /** Master slide color mapping */
  readonly colorMapping?: ColorMapping;
  /** Format scheme style elements (preserved XmlElement arrays) */
  readonly formatSchemeElements?: {
    readonly fillStyles?: readonly XmlElement[];
    readonly lineStyles?: readonly XmlElement[];
    readonly effectStyles?: readonly XmlElement[];
    readonly bgFillStyles?: readonly XmlElement[];
  };
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

// =============================================================================
// OPC Part Builders (using serializeRelationships / serializeContentTypes)
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

/** Empty group shape properties (required by spTree) */
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

/** Non-visual group shape properties (required by spTree) */
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

function buildSlideMaster(colorMapping?: ColorMapping): XmlDocument {
  const clrMap = colorMapping ?? DEFAULT_COLOR_MAP;
  return {
    children: [
      createElement("p:sldMaster", PPTX_XMLNS, [
        createElement("p:cSld", {}, [
          createElement("p:spTree", {}, [buildNvGrpSpPr(), createElement("p:grpSpPr")]),
        ]),
        createElement("p:clrMap", clrMap as Record<string, string>),
        createElement("p:sldLayoutIdLst", {}, [
          createElement("p:sldLayoutId", { id: "2147483649", "r:id": "rId1" }),
        ]),
        createElement("p:txStyles", {}, [
          createElement("p:titleStyle"),
          createElement("p:bodyStyle"),
        ]),
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
// Theme XML Builder
// =============================================================================

/**
 * Build theme XML with color and font schemes.
 * @see ECMA-376 Part 1, Section 20.1.6.9 (a:theme)
 */
function buildTheme(options: ThemeExportOptions): XmlDocument {
  const { name, colorScheme, fontScheme, fontSchemeName, customColors, formatSchemeElements } = options;

  const colorChildren = buildColorSchemeChildren(colorScheme);

  const placeholderFill = createElement("a:solidFill", {}, [createElement("a:schemeClr", { val: "phClr" })]);
  const placeholderLine = (w: string) => createElement("a:ln", { w }, [
    createElement("a:solidFill", {}, [createElement("a:schemeClr", { val: "phClr" })]),
  ]);

  return {
    children: [
      createElement("a:theme", { "xmlns:a": DRAWINGML_NAMESPACES.main, name }, [
        createElement("a:themeElements", {}, [
          createElement("a:clrScheme", { name }, colorChildren),
          createElement("a:fontScheme", { name: fontSchemeName || name }, [
            buildFontElement("major", fontScheme.majorFont),
            buildFontElement("minor", fontScheme.minorFont),
          ]),
          buildFormatScheme({ name, elements: formatSchemeElements, placeholderFill, placeholderLine }),
        ]),
        ...buildCustomColorsList(customColors),
      ]),
    ],
  };
}

function buildColorSchemeChildren(cs: ThemeColorScheme): XmlElement[] {
  const slots: readonly (keyof ThemeColorScheme)[] = [
    "dk1", "lt1", "dk2", "lt2",
    "accent1", "accent2", "accent3", "accent4", "accent5", "accent6",
    "hlink", "folHlink",
  ];
  return slots.map((key) =>
    createElement(`a:${key}`, {}, [createElement("a:srgbClr", { val: cs[key] })]),
  );
}

function buildFontElement(prefix: string, font: ThemeFontScheme["majorFont"]): XmlElement {
  const children: XmlElement[] = [];
  if (font.latin) { children.push(createElement("a:latin", { typeface: font.latin })); }
  if (font.eastAsian) { children.push(createElement("a:ea", { typeface: font.eastAsian })); }
  if (font.complexScript) { children.push(createElement("a:cs", { typeface: font.complexScript })); }
  return createElement(`a:${prefix}Font`, {}, children);
}

function buildFormatScheme(options: {
  name: string;
  elements: ThemeExportOptions["formatSchemeElements"];
  placeholderFill: XmlElement;
  placeholderLine: (w: string) => XmlElement;
}): XmlElement {
  const { name, elements, placeholderFill, placeholderLine } = options;
  const fills = elements?.fillStyles ?? [placeholderFill, placeholderFill, placeholderFill];
  const lines = elements?.lineStyles ?? [placeholderLine("6350"), placeholderLine("12700"), placeholderLine("19050")];
  const effects = elements?.effectStyles ?? [
    createElement("a:effectStyle", {}, [createElement("a:effectLst")]),
    createElement("a:effectStyle", {}, [createElement("a:effectLst")]),
    createElement("a:effectStyle", {}, [createElement("a:effectLst")]),
  ];
  const bgFills = elements?.bgFillStyles ?? [placeholderFill, placeholderFill, placeholderFill];

  return createElement("a:fmtScheme", { name }, [
    createElement("a:fillStyleLst", {}, [...fills]),
    createElement("a:lnStyleLst", {}, [...lines]),
    createElement("a:effectStyleLst", {}, [...effects]),
    createElement("a:bgFillStyleLst", {}, [...bgFills]),
  ]);
}

function serializeCustomColorValue(c: CustomColor): XmlElement {
  if (c.type === "srgb") {
    return createElement("a:srgbClr", { val: c.color ?? "000000" });
  }
  return createElement("a:sysClr", { val: c.systemColor ?? "windowText" });
}

function buildCustomColorsList(customColors?: readonly CustomColor[]): XmlElement[] {
  if (!customColors || customColors.length === 0) {
    return [];
  }
  const colorElements = customColors.map((c) => {
    const colorEl = serializeCustomColorValue(c);
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
 * Creates a minimal POTX containing:
 * - Theme with specified colors, fonts, and optional format scheme
 * - One slide master with color map
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
  writeXml(pkg, "ppt/theme/theme1.xml", buildTheme(options));
  writeXml(pkg, "ppt/slideMasters/slideMaster1.xml", buildSlideMaster(options.colorMapping));
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
