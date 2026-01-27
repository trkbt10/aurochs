/**
 * @file Theme exporter - exports theme as POTX file
 *
 * Creates a PowerPoint template (.potx) file from theme data.
 * The generated POTX contains:
 * - Theme XML with color and font schemes
 * - Minimal slide master and layout
 * - No slides (template only)
 *
 * @see ECMA-376 Part 1, Section 20.1.6 - Theme Definitions
 */

import type { ThemeColorScheme, ThemeFontScheme } from "./types";
import { CONTENT_TYPES } from "@oxen/pptx/opc/content-types";
import { RELATIONSHIP_TYPES } from "@oxen/pptx/domain/relationships";
import { createEmptyZipPackage } from "@oxen/zip";

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

/**
 * OOXML specification: ST_SlideMasterId uses values >= 2^31
 * @see ISO/IEC 29500-1:2016 §19.7.4
 */
const SLIDE_MASTER_ID = 2147483648;

/** Default slide size (standard 16:9) in EMUs */
const DEFAULT_SLIDE_SIZE = {
  cx: "9144000", // 10 inches
  cy: "6858000", // 7.5 inches
};

// =============================================================================
// XML Templates
// =============================================================================

const APP_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <AppVersion>16.0</AppVersion>
</Properties>`;

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const MINIMAL_SLIDE_MASTER = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483649" r:id="rId1"/>
  </p:sldLayoutIdLst>
  <p:txStyles>
    <p:titleStyle/>
    <p:bodyStyle/>
  </p:txStyles>
</p:sldMaster>`;

const MINIMAL_SLIDE_LAYOUT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  type="blank"
  preserve="1">
  <p:cSld name="Blank">
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
</p:sldLayout>`;

// =============================================================================
// XML Builders
// =============================================================================

/**
 * Build theme XML with color and font schemes.
 *
 * @see ECMA-376 Part 1, Section 20.1.6.9 (a:theme)
 */
function buildThemeXml(options: ThemeExportOptions): string {
  const { name, colorScheme, fontScheme } = options;

  // Build color scheme children (a:dk1, a:lt1, etc.)
  const colorElements = [
    `<a:dk1><a:srgbClr val="${colorScheme.dk1}"/></a:dk1>`,
    `<a:lt1><a:srgbClr val="${colorScheme.lt1}"/></a:lt1>`,
    `<a:dk2><a:srgbClr val="${colorScheme.dk2}"/></a:dk2>`,
    `<a:lt2><a:srgbClr val="${colorScheme.lt2}"/></a:lt2>`,
    `<a:accent1><a:srgbClr val="${colorScheme.accent1}"/></a:accent1>`,
    `<a:accent2><a:srgbClr val="${colorScheme.accent2}"/></a:accent2>`,
    `<a:accent3><a:srgbClr val="${colorScheme.accent3}"/></a:accent3>`,
    `<a:accent4><a:srgbClr val="${colorScheme.accent4}"/></a:accent4>`,
    `<a:accent5><a:srgbClr val="${colorScheme.accent5}"/></a:accent5>`,
    `<a:accent6><a:srgbClr val="${colorScheme.accent6}"/></a:accent6>`,
    `<a:hlink><a:srgbClr val="${colorScheme.hlink}"/></a:hlink>`,
    `<a:folHlink><a:srgbClr val="${colorScheme.folHlink}"/></a:folHlink>`,
  ].join("");

  // Build font elements for major and minor fonts
  const buildFontElement = (prefix: string, font: ThemeFontScheme["majorFont"]): string => {
    const elements: string[] = [];
    if (font.latin) {
      elements.push(`<a:latin typeface="${escapeXml(font.latin)}"/>`);
    }
    if (font.eastAsian) {
      elements.push(`<a:ea typeface="${escapeXml(font.eastAsian)}"/>`);
    }
    if (font.complexScript) {
      elements.push(`<a:cs typeface="${escapeXml(font.complexScript)}"/>`);
    }
    return `<a:${prefix}Font>${elements.join("")}</a:${prefix}Font>`;
  };

  const majorFontXml = buildFontElement("major", fontScheme.majorFont);
  const minorFontXml = buildFontElement("minor", fontScheme.minorFont);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="${escapeXml(name)}">
  <a:themeElements>
    <a:clrScheme name="${escapeXml(name)}">
      ${colorElements}
    </a:clrScheme>
    <a:fontScheme name="${escapeXml(name)}">
      ${majorFontXml}
      ${minorFontXml}
    </a:fontScheme>
    <a:fmtScheme name="${escapeXml(name)}">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
        <a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
        <a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
      </a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`;
}

/**
 * Build presentation.xml for template (no slides).
 */
function buildPresentationXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:sldMasterIdLst>
    <p:sldMasterId id="${SLIDE_MASTER_ID}" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldSz cx="${DEFAULT_SLIDE_SIZE.cx}" cy="${DEFAULT_SLIDE_SIZE.cy}"/>
  <p:defaultTextStyle>
    <a:defPPr><a:defRPr sz="1800"/></a:defPPr>
  </p:defaultTextStyle>
</p:presentation>`;
}

/**
 * Build Content_Types.xml for POTX.
 */
function buildContentTypesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="${CONTENT_TYPES.PRESENTATION}"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="${CONTENT_TYPES.SLIDE_MASTER}"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="${CONTENT_TYPES.SLIDE_LAYOUT}"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="${CONTENT_TYPES.THEME}"/>
</Types>`;
}

/**
 * Build presentation relationships.
 */
function buildPresentationRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="${RELATIONSHIP_TYPES.SLIDE_MASTER}" Target="slideMasters/slideMaster1.xml"/>
</Relationships>`;
}

/**
 * Build slide master relationships.
 */
function buildMasterRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="${RELATIONSHIP_TYPES.SLIDE_LAYOUT}" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="${RELATIONSHIP_TYPES.THEME}" Target="../theme/theme1.xml"/>
</Relationships>`;
}

/**
 * Build slide layout relationships.
 */
function buildLayoutRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="${RELATIONSHIP_TYPES.SLIDE_MASTER}" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Escape special XML characters.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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
 *
 * @param options - Theme export options
 * @returns Promise resolving to Blob containing the POTX file
 *
 * @example
 * ```typescript
 * const blob = await exportThemeAsPotx({
 *   name: "My Theme",
 *   colorScheme: OFFICE_THEME.colorScheme,
 *   fontScheme: OFFICE_THEME.fontScheme,
 * });
 * // Download the blob as "My Theme.potx"
 * ```
 */
export async function exportThemeAsPotx(options: ThemeExportOptions): Promise<Blob> {
  const pkg = createEmptyZipPackage();

  // Root relationships
  pkg.writeText("_rels/.rels", ROOT_RELS_XML);

  // Content types
  pkg.writeText("[Content_Types].xml", buildContentTypesXml());

  // App properties
  pkg.writeText("docProps/app.xml", APP_XML);

  // Presentation
  pkg.writeText("ppt/presentation.xml", buildPresentationXml());
  pkg.writeText("ppt/_rels/presentation.xml.rels", buildPresentationRelsXml());

  // Theme
  pkg.writeText("ppt/theme/theme1.xml", buildThemeXml(options));

  // Slide master
  pkg.writeText("ppt/slideMasters/slideMaster1.xml", MINIMAL_SLIDE_MASTER);
  pkg.writeText("ppt/slideMasters/_rels/slideMaster1.xml.rels", buildMasterRelsXml());

  // Slide layout
  pkg.writeText("ppt/slideLayouts/slideLayout1.xml", MINIMAL_SLIDE_LAYOUT);
  pkg.writeText("ppt/slideLayouts/_rels/slideLayout1.xml.rels", buildLayoutRelsXml());

  // Generate ZIP and return as Blob
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
