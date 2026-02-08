/**
 * @file Test fixtures for app layer tests
 *
 * Provides minimal PPTX XML structures and helper functions for testing.
 */

import type { PresentationFile } from "../domain";

/**
 * Create a fake PresentationFile for testing
 */
export function createFakePresentationFile(
  files: Record<string, string | ArrayBuffer>,
): PresentationFile {
  return {
    readText(path: string): string | null {
      const content = files[path];
      if (content === undefined) {
        return null;
      }
      if (typeof content === "string") {
        return content;
      }
      return null;
    },
    readBinary(path: string): ArrayBuffer | null {
      const content = files[path];
      if (content === undefined) {
        return null;
      }
      if (content instanceof ArrayBuffer) {
        return content;
      }
      return null;
    },
    exists(path: string): boolean {
      return path in files;
    },
  };
}

/**
 * Minimal content types XML for testing
 */
export const MINIMAL_CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>`;

/**
 * Minimal presentation XML for testing
 */
export const MINIMAL_PRESENTATION = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId1"/>
    <p:sldId id="257" r:id="rId2"/>
  </p:sldIdLst>
  <p:sldSz cx="9144000" cy="6858000"/>
  <p:defaultTextStyle>
    <a:defPPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <a:defRPr sz="1800"/>
    </a:defPPr>
  </p:defaultTextStyle>
</p:presentation>`;

/**
 * Minimal presentation relationships XML for testing
 */
export const MINIMAL_PRESENTATION_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/>
</Relationships>`;

/**
 * Minimal slide XML for testing
 */
export const MINIMAL_SLIDE = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
</p:sld>`;

/**
 * Minimal slide relationships XML for testing
 */
export const MINIMAL_SLIDE_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;

/**
 * Minimal slide layout XML for testing
 */
export const MINIMAL_LAYOUT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
</p:sldLayout>`;

/**
 * Minimal layout relationships XML for testing
 */
export const MINIMAL_LAYOUT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;

/**
 * Minimal slide master XML for testing
 */
export const MINIMAL_MASTER = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
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
 * Minimal master relationships XML for testing
 */
export const MINIMAL_MASTER_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`;

/**
 * Minimal theme XML for testing
 */
export const MINIMAL_THEME = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Test Theme">
  <a:themeElements>
    <a:clrScheme name="Test">
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
    <a:fontScheme name="Test">
      <a:majorFont><a:latin typeface="Calibri"/></a:majorFont>
      <a:minorFont><a:latin typeface="Calibri"/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Test">
      <a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>
      <a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>
      <a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
      <a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`;

/**
 * App XML with version for testing
 */
export const APP_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <AppVersion>16.0</AppVersion>
</Properties>`;

/**
 * Create a minimal fake presentation file for testing
 */
export function createMinimalFakePresentationFile(): PresentationFile {
  return createFakePresentationFile({
    "[Content_Types].xml": MINIMAL_CONTENT_TYPES,
    "ppt/presentation.xml": MINIMAL_PRESENTATION,
    "ppt/_rels/presentation.xml.rels": MINIMAL_PRESENTATION_RELS,
    "ppt/slides/slide1.xml": MINIMAL_SLIDE,
    "ppt/slides/slide2.xml": MINIMAL_SLIDE,
    "ppt/slides/_rels/slide1.xml.rels": MINIMAL_SLIDE_RELS,
    "ppt/slides/_rels/slide2.xml.rels": MINIMAL_SLIDE_RELS,
    "ppt/slideLayouts/slideLayout1.xml": MINIMAL_LAYOUT,
    "ppt/slideLayouts/_rels/slideLayout1.xml.rels": MINIMAL_LAYOUT_RELS,
    "ppt/slideMasters/slideMaster1.xml": MINIMAL_MASTER,
    "ppt/slideMasters/_rels/slideMaster1.xml.rels": MINIMAL_MASTER_RELS,
    "ppt/theme/theme1.xml": MINIMAL_THEME,
    "docProps/app.xml": APP_XML,
  });
}
