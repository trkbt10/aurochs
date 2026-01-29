/**
 * @file src/pdf/importer/pptx-template.ts
 */

import type { Pixels } from "@oxen-office/ooxml/domain/units";
import { ooxmlEmu } from "@oxen-office/ooxml/serializer/units";
import type { PresentationFile } from "@oxen-office/pptx/domain";
import { CONTENT_TYPES } from "@oxen-office/pptx/opc/content-types";
import { RELATIONSHIP_TYPES } from "@oxen-office/pptx/domain/relationships";
import { createEmptyZipPackage } from "@oxen/zip";

/**
 * OOXML仕様: ST_SlideId は 256〜2147483647 の範囲
 * スライドIDは256から開始（255 + 1）
 * @see ISO/IEC 29500-1:2016 §19.7.4
 */
const SLIDE_ID_START = 256;

/**
 * OOXML仕様: ST_SlideMasterId は 2147483648 (2^31) 以上を使用
 * マスターIDはスライドIDと衝突しない値を使用
 * @see ISO/IEC 29500-1:2016 §19.7.4
 */
const SLIDE_MASTER_ID = 2147483648;

export type BlankPptxSlideSize = {
  readonly width: Pixels;
  readonly height: Pixels;
};

const APP_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <AppVersion>16.0</AppVersion>
</Properties>`;

/**
 * Root relationships file (_rels/.rels)
 * Required by OPC (ECMA-376 Part 2) to identify the main document.
 */
const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const MINIMAL_THEME = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="WebPptx PDF Import">
  <a:themeElements>
    <a:clrScheme name="WebPptx">
      <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="44546A"/></a:dk2>
      <a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>
      <a:accent1><a:srgbClr val="5B9BD5"/></a:accent1>
      <a:accent2><a:srgbClr val="ED7D31"/></a:accent2>
      <a:accent3><a:srgbClr val="A5A5A5"/></a:accent3>
      <a:accent4><a:srgbClr val="FFC000"/></a:accent4>
      <a:accent5><a:srgbClr val="4472C4"/></a:accent5>
      <a:accent6><a:srgbClr val="70AD47"/></a:accent6>
      <a:hlink><a:srgbClr val="0563C1"/></a:hlink>
      <a:folHlink><a:srgbClr val="954F72"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="WebPptx">
      <a:majorFont><a:latin typeface="Calibri"/></a:majorFont>
      <a:minorFont><a:latin typeface="Calibri"/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="WebPptx">
      <a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>
      <a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>
      <a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
      <a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`;

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
  <p:txStyles>
    <p:titleStyle/>
    <p:bodyStyle/>
  </p:txStyles>
</p:sldMaster>`;

/**
 * Minimal slide layout XML.
 *
 * ECMA-376 Part 1, Section 19.3.1.39 requires the `type` attribute
 * on sldLayout to specify the layout type. We use "blank" for PDF imports.
 *
 * @see ISO/IEC 29500-1:2016 §19.3.1.39 (sldLayout)
 */
const MINIMAL_SLIDE_LAYOUT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  type="blank">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
</p:sldLayout>`;

const BLANK_SLIDE_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
</p:sld>`;











/** Create a minimal blank PPTX `PresentationFile` with the given slide count/size. */
export function createBlankPptxPresentationFile(
  slideCount: number,
  slideSize: BlankPptxSlideSize,
): PresentationFile {
  if (!Number.isInteger(slideCount) || slideCount < 1) {
    throw new Error(`createBlankPptxPresentationFile: invalid slideCount: ${slideCount}`);
  }
  if (!slideSize) {
    throw new Error("createBlankPptxPresentationFile: slideSize is required");
  }

  const pkg = createEmptyZipPackage();

  // Root relationships (required by OPC)
  pkg.writeText("_rels/.rels", ROOT_RELS_XML);

  const contentTypesXml = buildContentTypesXml(slideCount);
  pkg.writeText("[Content_Types].xml", contentTypesXml);

  pkg.writeText(
    "ppt/presentation.xml",
    buildPresentationXml(slideCount, {
      cx: ooxmlEmu(slideSize.width),
      cy: ooxmlEmu(slideSize.height),
    }),
  );
  pkg.writeText("ppt/_rels/presentation.xml.rels", buildPresentationRelsXml(slideCount));

  pkg.writeText("ppt/slideLayouts/slideLayout1.xml", MINIMAL_SLIDE_LAYOUT);
  pkg.writeText("ppt/slideLayouts/_rels/slideLayout1.xml.rels", buildLayoutRelsXml());

  pkg.writeText("ppt/slideMasters/slideMaster1.xml", MINIMAL_SLIDE_MASTER);
  pkg.writeText("ppt/slideMasters/_rels/slideMaster1.xml.rels", buildMasterRelsXml());

  pkg.writeText("ppt/theme/theme1.xml", MINIMAL_THEME);
  pkg.writeText("docProps/app.xml", APP_XML);

  for (let i = 1; i <= slideCount; i++) {
    pkg.writeText(`ppt/slides/slide${i}.xml`, BLANK_SLIDE_XML);
    pkg.writeText(`ppt/slides/_rels/slide${i}.xml.rels`, buildSlideRelsXml());
  }

  return pkg.asPresentationFile();
}

function buildContentTypesXml(slideCount: number): string {
  const overrides: string[] = [];

  overrides.push(`<Override PartName="/ppt/presentation.xml" ContentType="${CONTENT_TYPES.PRESENTATION}"/>`);
  overrides.push(`<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="${CONTENT_TYPES.SLIDE_LAYOUT}"/>`);
  overrides.push(`<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="${CONTENT_TYPES.SLIDE_MASTER}"/>`);
  overrides.push(`<Override PartName="/ppt/theme/theme1.xml" ContentType="${CONTENT_TYPES.THEME}"/>`);

  for (let i = 1; i <= slideCount; i++) {
    overrides.push(`<Override PartName="/ppt/slides/slide${i}.xml" ContentType="${CONTENT_TYPES.SLIDE}"/>`);
  }

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    overrides.join("") +
    `</Types>`
  );
}

function buildPresentationXml(
  slideCount: number,
  sizeEmu: Readonly<{ cx: string; cy: string }>,
): string {
  const sldIds: string[] = [];
  for (let i = 1; i <= slideCount; i++) {
    // スライドIDは SLIDE_ID_START (256) から開始
    const id = SLIDE_ID_START - 1 + i;
    // rId1 は slideMaster 用に予約、スライドは rId2 から開始
    const rId = `rId${i + 1}`;
    sldIds.push(`<p:sldId id="${id}" r:id="${rId}"/>`);
  }

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<p:presentation ` +
    `xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ` +
    `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
    `<p:sldMasterIdLst><p:sldMasterId id="${SLIDE_MASTER_ID}" r:id="rId1"/></p:sldMasterIdLst>` +
    `<p:sldIdLst>${sldIds.join("")}</p:sldIdLst>` +
    `<p:sldSz cx="${sizeEmu.cx}" cy="${sizeEmu.cy}"/>` +
    `<p:defaultTextStyle><a:defPPr><a:defRPr sz="1800"/></a:defPPr></p:defaultTextStyle>` +
    `</p:presentation>`
  );
}

function buildPresentationRelsXml(slideCount: number): string {
  const rels: string[] = [];

  rels.push(
    `<Relationship ` +
      `Id="rId1" ` +
      `Type="${RELATIONSHIP_TYPES.SLIDE_MASTER}" ` +
      `Target="slideMasters/slideMaster1.xml"/>`,
  );

  for (let i = 1; i <= slideCount; i++) {
    rels.push(
      `<Relationship ` +
        `Id="rId${i + 1}" ` +
        `Type="${RELATIONSHIP_TYPES.SLIDE}" ` +
        `Target="slides/slide${i}.xml"/>`,
    );
  }

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    rels.join("") +
    `</Relationships>`
  );
}

function buildSlideRelsXml(): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship ` +
    `Id="rId1" ` +
    `Type="${RELATIONSHIP_TYPES.SLIDE_LAYOUT}" ` +
    `Target="../slideLayouts/slideLayout1.xml"/>` +
    `</Relationships>`
  );
}

function buildLayoutRelsXml(): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship ` +
    `Id="rId1" ` +
    `Type="${RELATIONSHIP_TYPES.SLIDE_MASTER}" ` +
    `Target="../slideMasters/slideMaster1.xml"/>` +
    `</Relationships>`
  );
}

function buildMasterRelsXml(): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship ` +
    `Id="rId1" ` +
    `Type="${RELATIONSHIP_TYPES.THEME}" ` +
    `Target="../theme/theme1.xml"/>` +
    `</Relationships>`
  );
}
