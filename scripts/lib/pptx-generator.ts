/**
 * @file PPTX test file generator
 *
 * Creates minimal PPTX files for testing specific ECMA-376 features.
 * PPTX files are ZIP archives containing XML parts.
 *
 * @see ECMA-376 Part 1 for Office Open XML structure
 */

import JSZip from "jszip";
import * as fs from "node:fs";
import * as path from "node:path";

// =============================================================================
// Types
// =============================================================================

export type SlideContent = {
  /** Title text */
  title?: string;
  /** Body paragraphs with optional styling */
  paragraphs: ParagraphContent[];
  /** Text body properties */
  bodyPr?: BodyProperties;
}

export type BodyProperties = {
  /** Vertical anchor: top, center, bottom */
  anchor?: "t" | "ctr" | "b";
  /** Horizontal anchor center */
  anchorCtr?: boolean;
  /** Word wrap mode */
  wrap?: "square" | "none";
  /** Insets in EMU */
  lIns?: number;
  rIns?: number;
  tIns?: number;
  bIns?: number;
}

export type ParagraphContent = {
  /** Paragraph text (simple case) */
  text?: string;
  /** Multiple runs with different formatting */
  runs?: RunContent[];
  /** Paragraph-level properties */
  pPr?: ParagraphProperties;
  /** Run-level properties (applied to all runs in paragraph) */
  rPr?: RunProperties;
}

export type RunContent = {
  /** Run text */
  text: string;
  /** Run properties */
  rPr?: RunProperties;
  /** Is this a line break? */
  isBreak?: boolean;
}

export type ParagraphProperties = {
  /** Line spacing - a:lnSpc */
  lineSpacing?: LineSpacing;
  /** Space before - a:spcBef */
  spaceBefore?: SpacingValue;
  /** Space after - a:spcAft */
  spaceAfter?: SpacingValue;
  /** Alignment */
  align?: "l" | "ctr" | "r" | "just";
  /** Left margin in EMU - marL */
  marginLeft?: number;
  /** First line indent in EMU - indent */
  indent?: number;
  /** Bullet properties */
  bullet?: BulletProperties;
  /** Indentation level (0-8) */
  level?: number;
}

export type BulletProperties = {
  /** Bullet type */
  type: "none" | "char" | "auto";
  /** Bullet character (for type="char") */
  char?: string;
  /** Auto numbering type (for type="auto") */
  autoType?: "arabicPeriod" | "arabicParenR" | "romanUcPeriod" | "romanLcPeriod" | "alphaUcPeriod" | "alphaLcPeriod";
  /** Start at value */
  startAt?: number;
  /** Bullet font */
  font?: string;
  /** Bullet size in percentage (e.g., 100000 = 100%) */
  sizePct?: number;
}

export type RunProperties = {
  /** Character spacing in EMU - a:spc (ECMA-376 21.1.2.3.9) */
  charSpacing?: number;
  /** Kerning threshold in 1/100pt - a:kern (ECMA-376 21.1.2.3.9) */
  kerning?: number;
  /** Font size in 1/100pt - sz */
  fontSize?: number;
  /** Bold - b */
  bold?: boolean;
}

export type LineSpacing =
  | { type: "pct"; value: number }  // Percentage (100000 = 100%)
  | { type: "pts"; value: number }; // Points (in 1/100 pt)

export type SpacingValue =
  | { type: "pct"; value: number }  // Percentage
  | { type: "pts"; value: number }; // Points (in 1/100 pt)

// =============================================================================
// XML Templates
// =============================================================================

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
</Types>`;

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`;

const PRESENTATION_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
</Relationships>`;

const PRESENTATION_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId2"/>
  </p:sldIdLst>
  <p:sldSz cx="9144000" cy="6858000"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`;

const SLIDE_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;

const SLIDE_LAYOUT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;

const SLIDE_MASTER_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`;

const SLIDE_LAYOUT_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank">
  <p:cSld name="Blank">
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
</p:sldLayout>`;

const SLIDE_MASTER_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg>
      <p:bgPr>
        <a:solidFill>
          <a:srgbClr val="FFFFFF"/>
        </a:solidFill>
      </p:bgPr>
    </p:bg>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483649" r:id="rId1"/>
  </p:sldLayoutIdLst>
</p:sldMaster>`;

const THEME_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">
  <a:themeElements>
    <a:clrScheme name="Office">
      <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="1F497D"/></a:dk2>
      <a:lt2><a:srgbClr val="EEECE1"/></a:lt2>
      <a:accent1><a:srgbClr val="4F81BD"/></a:accent1>
      <a:accent2><a:srgbClr val="C0504D"/></a:accent2>
      <a:accent3><a:srgbClr val="9BBB59"/></a:accent3>
      <a:accent4><a:srgbClr val="8064A2"/></a:accent4>
      <a:accent5><a:srgbClr val="4BACC6"/></a:accent5>
      <a:accent6><a:srgbClr val="F79646"/></a:accent6>
      <a:hlink><a:srgbClr val="0000FF"/></a:hlink>
      <a:folHlink><a:srgbClr val="800080"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Office">
      <a:majorFont>
        <a:latin typeface="Calibri"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
      </a:majorFont>
      <a:minorFont>
        <a:latin typeface="Calibri"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
      </a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Office">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
        <a:ln w="25400"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
        <a:ln w="38100"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
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

// =============================================================================
// XML Generation Helpers
// =============================================================================

function generateLineSpacingXml(spacing: LineSpacing): string {
  if (spacing.type === "pct") {
    return `<a:lnSpc><a:spcPct val="${spacing.value}"/></a:lnSpc>`;
  }
  return `<a:lnSpc><a:spcPts val="${spacing.value}"/></a:lnSpc>`;
}

function generateSpacingXml(spacing: SpacingValue, element: "spcBef" | "spcAft"): string {
  if (spacing.type === "pct") {
    return `<a:${element}><a:spcPct val="${spacing.value}"/></a:${element}>`;
  }
  return `<a:${element}><a:spcPts val="${spacing.value}"/></a:${element}>`;
}

function generateBulletXml(bullet: BulletProperties): string {
  const parts: string[] = [];

  // Bullet font
  if (bullet.font) {
    parts.push(`<a:buFont typeface="${escapeXml(bullet.font)}"/>`);
  }

  // Bullet size
  if (bullet.sizePct !== undefined) {
    parts.push(`<a:buSzPct val="${bullet.sizePct}"/>`);
  }

  // Bullet type
  switch (bullet.type) {
    case "none":
      parts.push("<a:buNone/>");
      break;
    case "char":
      parts.push(`<a:buChar char="${escapeXml(bullet.char ?? "•")}"/>`);
      break;
    case "auto": {
      const startAtAttr = bullet.startAt !== undefined ? ` startAt="${bullet.startAt}"` : "";
      parts.push(`<a:buAutoNum type="${bullet.autoType ?? "arabicPeriod"}"${startAtAttr}/>`);
      break;
    }
  }

  return parts.join("");
}

function generateParagraphPropertiesXml(pPr: ParagraphProperties | undefined): string {
  if (!pPr) {return "";}

  const attrs: string[] = [];
  if (pPr.align) {attrs.push(`algn="${pPr.align}"`);}
  if (pPr.marginLeft !== undefined) {attrs.push(`marL="${pPr.marginLeft}"`);}
  if (pPr.indent !== undefined) {attrs.push(`indent="${pPr.indent}"`);}
  if (pPr.level !== undefined) {attrs.push(`lvl="${pPr.level}"`);}

  const children: string[] = [];
  if (pPr.lineSpacing) {children.push(generateLineSpacingXml(pPr.lineSpacing));}
  if (pPr.spaceBefore) {children.push(generateSpacingXml(pPr.spaceBefore, "spcBef"));}
  if (pPr.spaceAfter) {children.push(generateSpacingXml(pPr.spaceAfter, "spcAft"));}
  if (pPr.bullet) {children.push(generateBulletXml(pPr.bullet));}

  if (attrs.length === 0 && children.length === 0) {return "";}

  const attrStr = attrs.length > 0 ? " " + attrs.join(" ") : "";
  if (children.length === 0) {
    return `<a:pPr${attrStr}/>`;
  }
  return `<a:pPr${attrStr}>${children.join("")}</a:pPr>`;
}

function generateRunPropertiesXml(rPr: RunProperties | undefined): string {
  if (!rPr) {return '<a:rPr lang="en-US"/>';}

  const attrs: string[] = ['lang="en-US"'];

  // Font size - sz in 1/100pt (ECMA-376 20.1.10.72)
  if (rPr.fontSize !== undefined) {
    attrs.push(`sz="${rPr.fontSize}"`);
  }

  // Bold
  if (rPr.bold !== undefined) {
    attrs.push(`b="${rPr.bold ? "1" : "0"}"`);
  }

  // Kerning - kern in 1/100pt (ECMA-376 21.1.2.3.9)
  if (rPr.kerning !== undefined) {
    attrs.push(`kern="${rPr.kerning}"`);
  }

  // Character spacing - spc in EMU (ECMA-376 21.1.2.3.9)
  if (rPr.charSpacing !== undefined) {
    attrs.push(`spc="${rPr.charSpacing}"`);
  }

  return `<a:rPr ${attrs.join(" ")}/>`;
}

function generateRunXml(run: RunContent, defaultRPr?: RunProperties): string {
  if (run.isBreak) {
    return "<a:br/>";
  }
  const rPr = generateRunPropertiesXml(run.rPr ?? defaultRPr);
  const text = escapeXml(run.text);
  return `<a:r>${rPr}<a:t>${text}</a:t></a:r>`;
}

function generateParagraphXml(para: ParagraphContent): string {
  const pPr = generateParagraphPropertiesXml(para.pPr);

  // Handle multiple runs or simple text
  if (para.runs && para.runs.length > 0) {
    const runsXml = para.runs.map((run) => generateRunXml(run, para.rPr)).join("");
    return `<a:p>${pPr}${runsXml}</a:p>`;
  }

  // Simple text case
  const rPr = generateRunPropertiesXml(para.rPr);
  const text = escapeXml(para.text ?? "");
  return `<a:p>${pPr}<a:r>${rPr}<a:t>${text}</a:t></a:r></a:p>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function generateBodyPropertiesXml(bodyPr?: BodyProperties): string {
  const attrs: string[] = [];
  attrs.push('rtlCol="0"');

  if (bodyPr) {
    if (bodyPr.wrap) {attrs.push(`wrap="${bodyPr.wrap}"`);}
    if (bodyPr.anchor) {attrs.push(`anchor="${bodyPr.anchor}"`);}
    if (bodyPr.anchorCtr) {attrs.push(`anchorCtr="1"`);}
    if (bodyPr.lIns !== undefined) {attrs.push(`lIns="${bodyPr.lIns}"`);}
    if (bodyPr.rIns !== undefined) {attrs.push(`rIns="${bodyPr.rIns}"`);}
    if (bodyPr.tIns !== undefined) {attrs.push(`tIns="${bodyPr.tIns}"`);}
    if (bodyPr.bIns !== undefined) {attrs.push(`bIns="${bodyPr.bIns}"`);}
  } else {
    attrs.push('wrap="square"');
  }

  return `<a:bodyPr ${attrs.join(" ")}><a:spAutoFit/></a:bodyPr>`;
}

function generateSlideXml(content: SlideContent): string {
  const paragraphs = content.paragraphs.map(generateParagraphXml).join("\n            ");
  const bodyPr = generateBodyPropertiesXml(content.bodyPr);

  // Position and size for the text box
  const offX = 457200;   // 0.5 inch
  const offY = 457200;   // 0.5 inch
  const extCx = 8229600; // 9 inch - 1 inch margin
  const extCy = 5943600; // 6.5 inch - 1 inch margin

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="TextBox 1"/>
          <p:cNvSpPr txBox="1"/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${offX}" y="${offY}"/>
            <a:ext cx="${extCx}" cy="${extCy}"/>
          </a:xfrm>
          <a:prstGeom prst="rect">
            <a:avLst/>
          </a:prstGeom>
        </p:spPr>
        <p:txBody>
          ${bodyPr}
          <a:lstStyle/>
          ${paragraphs}
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;
}

// =============================================================================
// PPTX Generation
// =============================================================================

/**
 * Generate a PPTX file with the given slide content.
 */
export async function generatePptx(content: SlideContent, outputPath: string): Promise<void> {
  const zip = new JSZip();

  // Add required files
  zip.file("[Content_Types].xml", CONTENT_TYPES_XML);
  zip.file("_rels/.rels", ROOT_RELS_XML);
  zip.file("ppt/_rels/presentation.xml.rels", PRESENTATION_RELS_XML);
  zip.file("ppt/presentation.xml", PRESENTATION_XML);
  zip.file("ppt/slides/_rels/slide1.xml.rels", SLIDE_RELS_XML);
  zip.file("ppt/slides/slide1.xml", generateSlideXml(content));
  zip.file("ppt/slideLayouts/_rels/slideLayout1.xml.rels", SLIDE_LAYOUT_RELS_XML);
  zip.file("ppt/slideLayouts/slideLayout1.xml", SLIDE_LAYOUT_XML);
  zip.file("ppt/slideMasters/_rels/slideMaster1.xml.rels", SLIDE_MASTER_RELS_XML);
  zip.file("ppt/slideMasters/slideMaster1.xml", SLIDE_MASTER_XML);
  zip.file("ppt/theme/theme1.xml", THEME_XML);

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write ZIP file
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  fs.writeFileSync(outputPath, buffer);
}

/**
 * Convenience function to create a simple text slide.
 */
export function createSimpleSlide(text: string, options?: {
  pPr?: ParagraphProperties;
  rPr?: RunProperties;
}): SlideContent {
  return {
    paragraphs: [{
      text,
      pPr: options?.pPr,
      rPr: options?.rPr,
    }],
  };
}

/**
 * Create a slide with multiple paragraphs for comparison.
 */
export function createComparisonSlide(paragraphs: ParagraphContent[]): SlideContent {
  return { paragraphs };
}
