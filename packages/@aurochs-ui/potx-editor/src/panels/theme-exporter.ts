/**
 * @file Theme exporter - exports theme as POTX file
 *
 * Creates a PowerPoint template (.potx) file from theme data.
 * Uses @aurochs-builder/pptx and @aurochs/xml infrastructure
 * for XML construction instead of raw string templates.
 *
 * @see ECMA-376 Part 1, Section 20.1.6 - Theme Definitions
 */

import type { ThemeColorScheme, ThemeFontScheme } from "./types";
import { CONTENT_TYPES, RELATIONSHIP_TYPES } from "@aurochs-office/pptx/domain";
import { createElement, createText, serializeDocument, type XmlDocument } from "@aurochs/xml";
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
};

// =============================================================================
// Constants
// =============================================================================

const RELS_XMLNS = "http://schemas.openxmlformats.org/package/2006/relationships";
const OOXML_OFFICE_DOC_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument";
const OOXML_EXTENDED_PROPS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties";
const OPC_CONTENT_TYPES_XMLNS = "http://schemas.openxmlformats.org/package/2006/content-types";

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

// =============================================================================
// XML Element Builders
// =============================================================================

function buildRootRels(): XmlDocument {
  return {
    children: [
      createElement("Relationships", { xmlns: RELS_XMLNS }, [
        createElement("Relationship", { Id: "rId1", Type: OOXML_OFFICE_DOC_REL, Target: "ppt/presentation.xml" }),
        createElement("Relationship", { Id: "rId2", Type: OOXML_EXTENDED_PROPS_REL, Target: "docProps/app.xml" }),
      ]),
    ],
  };
}

function buildAppProperties(): XmlDocument {
  return {
    children: [
      createElement("Properties", { xmlns: "http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" }, [
        createElement("AppVersion", {}, [createText("16.0")]),
      ]),
    ],
  };
}

function buildContentTypes(): XmlDocument {
  return {
    children: [
      createElement("Types", { xmlns: OPC_CONTENT_TYPES_XMLNS }, [
        createElement("Default", { Extension: "rels", ContentType: "application/vnd.openxmlformats-package.relationships+xml" }),
        createElement("Default", { Extension: "xml", ContentType: "application/xml" }),
        createElement("Override", { PartName: "/ppt/presentation.xml", ContentType: CONTENT_TYPES.PRESENTATION }),
        createElement("Override", { PartName: "/ppt/slides/slide1.xml", ContentType: CONTENT_TYPES.SLIDE }),
        createElement("Override", { PartName: "/ppt/slideMasters/slideMaster1.xml", ContentType: CONTENT_TYPES.SLIDE_MASTER }),
        createElement("Override", { PartName: "/ppt/slideLayouts/slideLayout1.xml", ContentType: CONTENT_TYPES.SLIDE_LAYOUT }),
        createElement("Override", { PartName: "/ppt/theme/theme1.xml", ContentType: CONTENT_TYPES.THEME }),
      ]),
    ],
  };
}

function buildPresentation(): XmlDocument {
  return {
    children: [
      createElement(
        "p:presentation",
        {
          "xmlns:p": "http://schemas.openxmlformats.org/presentationml/2006/main",
          "xmlns:r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
          "xmlns:a": "http://schemas.openxmlformats.org/drawingml/2006/main",
        },
        [
          createElement("p:sldIdLst", {}, [
            createElement("p:sldId", { id: "256", "r:id": "rId2" }),
          ]),
          createElement("p:sldMasterIdLst", {}, [
            createElement("p:sldMasterId", { id: SLIDE_MASTER_ID, "r:id": "rId1" }),
          ]),
          createElement("p:sldSz", { cx: DEFAULT_SLIDE_SIZE.cx, cy: DEFAULT_SLIDE_SIZE.cy }),
          createElement("p:defaultTextStyle", {}, [
            createElement("a:defPPr", {}, [
              createElement("a:defRPr", { sz: "1800" }),
            ]),
          ]),
        ],
      ),
    ],
  };
}

function buildPresentationRels(): XmlDocument {
  return {
    children: [
      createElement("Relationships", { xmlns: RELS_XMLNS }, [
        createElement("Relationship", { Id: "rId1", Type: RELATIONSHIP_TYPES.SLIDE_MASTER, Target: "slideMasters/slideMaster1.xml" }),
        createElement("Relationship", { Id: "rId2", Type: RELATIONSHIP_TYPES.SLIDE, Target: "slides/slide1.xml" }),
      ]),
    ],
  };
}

function buildSlideMaster(): XmlDocument {
  return {
    children: [
      createElement(
        "p:sldMaster",
        {
          "xmlns:p": "http://schemas.openxmlformats.org/presentationml/2006/main",
          "xmlns:a": "http://schemas.openxmlformats.org/drawingml/2006/main",
          "xmlns:r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        },
        [
          createElement("p:cSld", {}, [
            createElement("p:spTree", {}, [
              createElement("p:nvGrpSpPr", {}, [
                createElement("p:cNvPr", { id: "1", name: "" }),
                createElement("p:cNvGrpSpPr"),
                createElement("p:nvPr"),
              ]),
              createElement("p:grpSpPr"),
            ]),
          ]),
          createElement("p:clrMap", {
            bg1: "lt1", tx1: "dk1", bg2: "lt2", tx2: "dk2",
            accent1: "accent1", accent2: "accent2", accent3: "accent3",
            accent4: "accent4", accent5: "accent5", accent6: "accent6",
            hlink: "hlink", folHlink: "folHlink",
          }),
          createElement("p:sldLayoutIdLst", {}, [
            createElement("p:sldLayoutId", { id: "2147483649", "r:id": "rId1" }),
          ]),
          createElement("p:txStyles", {}, [
            createElement("p:titleStyle"),
            createElement("p:bodyStyle"),
          ]),
        ],
      ),
    ],
  };
}

function buildMasterRels(): XmlDocument {
  return {
    children: [
      createElement("Relationships", { xmlns: RELS_XMLNS }, [
        createElement("Relationship", { Id: "rId1", Type: RELATIONSHIP_TYPES.SLIDE_LAYOUT, Target: "../slideLayouts/slideLayout1.xml" }),
        createElement("Relationship", { Id: "rId2", Type: RELATIONSHIP_TYPES.THEME, Target: "../theme/theme1.xml" }),
      ]),
    ],
  };
}

function buildLayoutRels(): XmlDocument {
  return {
    children: [
      createElement("Relationships", { xmlns: RELS_XMLNS }, [
        createElement("Relationship", { Id: "rId1", Type: RELATIONSHIP_TYPES.SLIDE_MASTER, Target: "../slideMasters/slideMaster1.xml" }),
      ]),
    ],
  };
}

function buildBlankSlide(): XmlDocument {
  return {
    children: [
      createElement(
        "p:sld",
        {
          "xmlns:p": "http://schemas.openxmlformats.org/presentationml/2006/main",
          "xmlns:a": "http://schemas.openxmlformats.org/drawingml/2006/main",
          "xmlns:r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        },
        [
          createElement("p:cSld", {}, [
            createElement("p:spTree", {}, [
              createElement("p:nvGrpSpPr", {}, [
                createElement("p:cNvPr", { id: "1", name: "" }),
                createElement("p:cNvGrpSpPr"),
                createElement("p:nvPr"),
              ]),
              createElement("p:grpSpPr", {}, [
                createElement("a:xfrm", {}, [
                  createElement("a:off", { x: "0", y: "0" }),
                  createElement("a:ext", { cx: "0", cy: "0" }),
                  createElement("a:chOff", { x: "0", y: "0" }),
                  createElement("a:chExt", { cx: "0", cy: "0" }),
                ]),
              ]),
            ]),
          ]),
          createElement("p:clrMapOvr", {}, [createElement("a:masterClrMapping")]),
        ],
      ),
    ],
  };
}

function buildBlankLayout(): XmlDocument {
  return {
    children: [
      createElement(
        "p:sldLayout",
        {
          "xmlns:a": "http://schemas.openxmlformats.org/drawingml/2006/main",
          "xmlns:r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
          "xmlns:p": "http://schemas.openxmlformats.org/presentationml/2006/main",
          type: "blank",
          preserve: "1",
        },
        [
          createElement("p:cSld", { name: "Blank" }, [
            createElement("p:spTree", {}, [
              createElement("p:nvGrpSpPr", {}, [
                createElement("p:cNvPr", { id: "1", name: "" }),
                createElement("p:cNvGrpSpPr"),
                createElement("p:nvPr"),
              ]),
              createElement("p:grpSpPr", {}, [
                createElement("a:xfrm", {}, [
                  createElement("a:off", { x: "0", y: "0" }),
                  createElement("a:ext", { cx: "0", cy: "0" }),
                  createElement("a:chOff", { x: "0", y: "0" }),
                  createElement("a:chExt", { cx: "0", cy: "0" }),
                ]),
              ]),
            ]),
          ]),
          createElement("p:clrMapOvr", {}, [createElement("a:masterClrMapping")]),
        ],
      ),
    ],
  };
}

function buildSlideRels(): XmlDocument {
  return {
    children: [
      createElement("Relationships", { xmlns: RELS_XMLNS }, [
        createElement("Relationship", { Id: "rId1", Type: RELATIONSHIP_TYPES.SLIDE_LAYOUT, Target: "../slideLayouts/slideLayout1.xml" }),
      ]),
    ],
  };
}

/**
 * Build theme XML with color and font schemes.
 *
 * Constructs the a:theme element tree with a:clrScheme, a:fontScheme,
 * and minimal a:fmtScheme using createElement.
 *
 * @see ECMA-376 Part 1, Section 20.1.6.9 (a:theme)
 */
function buildTheme(options: ThemeExportOptions): XmlDocument {
  const { name, colorScheme, fontScheme } = options;

  const colorChildren = [
    createElement("a:dk1", {}, [createElement("a:srgbClr", { val: colorScheme.dk1 })]),
    createElement("a:lt1", {}, [createElement("a:srgbClr", { val: colorScheme.lt1 })]),
    createElement("a:dk2", {}, [createElement("a:srgbClr", { val: colorScheme.dk2 })]),
    createElement("a:lt2", {}, [createElement("a:srgbClr", { val: colorScheme.lt2 })]),
    createElement("a:accent1", {}, [createElement("a:srgbClr", { val: colorScheme.accent1 })]),
    createElement("a:accent2", {}, [createElement("a:srgbClr", { val: colorScheme.accent2 })]),
    createElement("a:accent3", {}, [createElement("a:srgbClr", { val: colorScheme.accent3 })]),
    createElement("a:accent4", {}, [createElement("a:srgbClr", { val: colorScheme.accent4 })]),
    createElement("a:accent5", {}, [createElement("a:srgbClr", { val: colorScheme.accent5 })]),
    createElement("a:accent6", {}, [createElement("a:srgbClr", { val: colorScheme.accent6 })]),
    createElement("a:hlink", {}, [createElement("a:srgbClr", { val: colorScheme.hlink })]),
    createElement("a:folHlink", {}, [createElement("a:srgbClr", { val: colorScheme.folHlink })]),
  ];

  function buildFontElement(prefix: string, font: ThemeFontScheme["majorFont"]) {
    const children = [];
    if (font.latin) children.push(createElement("a:latin", { typeface: font.latin }));
    if (font.eastAsian) children.push(createElement("a:ea", { typeface: font.eastAsian }));
    if (font.complexScript) children.push(createElement("a:cs", { typeface: font.complexScript }));
    return createElement(`a:${prefix}Font`, {}, children);
  }

  const placeholderFill = createElement("a:solidFill", {}, [createElement("a:schemeClr", { val: "phClr" })]);
  const placeholderLine = (w: string) => createElement("a:ln", { w }, [
    createElement("a:solidFill", {}, [createElement("a:schemeClr", { val: "phClr" })]),
  ]);

  return {
    children: [
      createElement("a:theme", { "xmlns:a": "http://schemas.openxmlformats.org/drawingml/2006/main", name }, [
        createElement("a:themeElements", {}, [
          createElement("a:clrScheme", { name }, colorChildren),
          createElement("a:fontScheme", { name }, [
            buildFontElement("major", fontScheme.majorFont),
            buildFontElement("minor", fontScheme.minorFont),
          ]),
          createElement("a:fmtScheme", { name }, [
            createElement("a:fillStyleLst", {}, [placeholderFill, placeholderFill, placeholderFill]),
            createElement("a:lnStyleLst", {}, [placeholderLine("6350"), placeholderLine("12700"), placeholderLine("19050")]),
            createElement("a:effectStyleLst", {}, [
              createElement("a:effectStyle", {}, [createElement("a:effectLst")]),
              createElement("a:effectStyle", {}, [createElement("a:effectLst")]),
              createElement("a:effectStyle", {}, [createElement("a:effectLst")]),
            ]),
            createElement("a:bgFillStyleLst", {}, [placeholderFill, placeholderFill, placeholderFill]),
          ]),
        ]),
      ]),
    ],
  };
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
 * - Theme with specified colors and fonts
 * - One slide master with default color map
 * - One blank slide layout
 * - One blank slide (required by openPresentation)
 *
 * All XML is constructed using createElement/serializeDocument
 * following the @aurochs-builder/pptx pattern.
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
  writeXml(pkg, "ppt/slideMasters/slideMaster1.xml", buildSlideMaster());
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
