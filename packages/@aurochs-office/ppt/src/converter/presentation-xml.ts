/**
 * @file PPTX presentation-level XML generation
 */

import type { PptSlideSize } from "../domain/types";

const SLIDE_ID_START = 256;
const SLIDE_MASTER_ID = 2147483648;

const CT_PRESENTATION = "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml";
const CT_SLIDE = "application/vnd.openxmlformats-officedocument.presentationml.slide+xml";
const CT_SLIDE_LAYOUT = "application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml";
const CT_SLIDE_MASTER = "application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml";
const CT_THEME = "application/vnd.openxmlformats-officedocument.theme+xml";
const CT_NOTES = "application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml";
const CT_CHART = "application/vnd.openxmlformats-officedocument.drawingml.chart+xml";

const RT_SLIDE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide";
const RT_SLIDE_LAYOUT = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout";
const RT_SLIDE_MASTER = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster";
const RT_THEME = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme";
const RT_IMAGE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";
const RT_HYPERLINK = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink";
const RT_NOTES = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide";

export type SlideRelationship = {
  readonly id: string;
  readonly type: string;
  readonly target: string;
  readonly targetMode?: string;
};

export function buildContentTypesXml(
  slideCount: number,
  options?: { hasNotes?: readonly boolean[]; imageExtensions?: readonly string[]; hasCharts?: readonly number[] },
): string {
  const overrides: string[] = [];

  overrides.push(`<Override PartName="/ppt/presentation.xml" ContentType="${CT_PRESENTATION}"/>`);
  overrides.push(`<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="${CT_SLIDE_LAYOUT}"/>`);
  overrides.push(`<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="${CT_SLIDE_MASTER}"/>`);
  overrides.push(`<Override PartName="/ppt/theme/theme1.xml" ContentType="${CT_THEME}"/>`);

  for (let i = 1; i <= slideCount; i++) {
    overrides.push(`<Override PartName="/ppt/slides/slide${i}.xml" ContentType="${CT_SLIDE}"/>`);
  }

  if (options?.hasNotes) {
    for (let i = 0; i < options.hasNotes.length; i++) {
      if (options.hasNotes[i]) {
        overrides.push(`<Override PartName="/ppt/notesSlides/notesSlide${i + 1}.xml" ContentType="${CT_NOTES}"/>`);
      }
    }
  }

  if (options?.hasCharts) {
    for (const chartIdx of options.hasCharts) {
      overrides.push(`<Override PartName="/ppt/charts/chart${chartIdx}.xml" ContentType="${CT_CHART}"/>`);
    }
  }

  // Default extensions for images
  const defaultExtensions: string[] = [
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`,
    `<Default Extension="xml" ContentType="application/xml"/>`,
  ];

  const imageExts = new Set(options?.imageExtensions ?? []);
  if (imageExts.has("png")) defaultExtensions.push(`<Default Extension="png" ContentType="image/png"/>`);
  if (imageExts.has("jpeg") || imageExts.has("jpg")) defaultExtensions.push(`<Default Extension="jpeg" ContentType="image/jpeg"/>`);
  if (imageExts.has("emf")) defaultExtensions.push(`<Default Extension="emf" ContentType="image/x-emf"/>`);
  if (imageExts.has("wmf")) defaultExtensions.push(`<Default Extension="wmf" ContentType="image/x-wmf"/>`);
  if (imageExts.has("bmp")) defaultExtensions.push(`<Default Extension="bmp" ContentType="image/bmp"/>`);
  if (imageExts.has("tiff")) defaultExtensions.push(`<Default Extension="tiff" ContentType="image/tiff"/>`);

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    defaultExtensions.join("") +
    overrides.join("") +
    `</Types>`
  );
}

export function buildPresentationXml(slideCount: number, slideSize: PptSlideSize): string {
  const sldIds: string[] = [];
  for (let i = 1; i <= slideCount; i++) {
    const id = SLIDE_ID_START - 1 + i;
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
    `<p:sldSz cx="${slideSize.widthEmu}" cy="${slideSize.heightEmu}"/>` +
    `<p:defaultTextStyle><a:defPPr><a:defRPr sz="1800"/></a:defPPr></p:defaultTextStyle>` +
    `</p:presentation>`
  );
}

export function buildPresentationRelsXml(slideCount: number): string {
  const rels: string[] = [];

  rels.push(`<Relationship Id="rId1" Type="${RT_SLIDE_MASTER}" Target="slideMasters/slideMaster1.xml"/>`);

  for (let i = 1; i <= slideCount; i++) {
    rels.push(`<Relationship Id="rId${i + 1}" Type="${RT_SLIDE}" Target="slides/slide${i}.xml"/>`);
  }

  return wrapRelationships(rels);
}

export function buildSlideRelsXml(extraRels?: readonly SlideRelationship[]): string {
  const rels: string[] = [];
  rels.push(`<Relationship Id="rId1" Type="${RT_SLIDE_LAYOUT}" Target="../slideLayouts/slideLayout1.xml"/>`);

  if (extraRels) {
    for (const rel of extraRels) {
      const targetMode = rel.targetMode ? ` TargetMode="${rel.targetMode}"` : "";
      rels.push(`<Relationship Id="${rel.id}" Type="${rel.type}" Target="${rel.target}"${targetMode}/>`);
    }
  }

  return wrapRelationships(rels);
}

export function buildLayoutRelsXml(): string {
  return wrapRelationships([
    `<Relationship Id="rId1" Type="${RT_SLIDE_MASTER}" Target="../slideMasters/slideMaster1.xml"/>`,
  ]);
}

export function buildMasterRelsXml(): string {
  return wrapRelationships([
    `<Relationship Id="rId1" Type="${RT_THEME}" Target="../theme/theme1.xml"/>`,
  ]);
}

export function buildNotesSlideXml(text: string): string {
  const escapedText = escapeXml(text);
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" ` +
    `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<p:cSld><p:spTree>` +
    `<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>` +
    `<p:grpSpPr/>` +
    `<p:sp><p:nvSpPr><p:cNvPr id="2" name="Notes Placeholder"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>` +
    `<p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr>` +
    `<p:spPr/>` +
    `<p:txBody><a:bodyPr/><a:lstStyle/>` +
    `<a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t>${escapedText}</a:t></a:r></a:p>` +
    `</p:txBody></p:sp>` +
    `</p:spTree></p:cSld></p:notes>`
  );
}

export function buildNotesRelsXml(slideIndex: number): string {
  return wrapRelationships([
    `<Relationship Id="rId1" Type="${RT_SLIDE}" Target="../slides/slide${slideIndex}.xml"/>`,
  ]);
}

function wrapRelationships(rels: readonly string[]): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    rels.join("") +
    `</Relationships>`
  );
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export {
  RT_IMAGE, RT_HYPERLINK, RT_NOTES, RT_SLIDE,
};
