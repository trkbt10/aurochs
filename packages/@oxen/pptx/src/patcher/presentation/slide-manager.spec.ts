/**
 * @file Slide manager unit tests (Phase 8)
 */

import type { PresentationDocument } from "../../app/presentation-document";
import { parseXml } from "@oxen/xml";
import { getByPath, getChildren } from "@oxen/xml";
import { createEmptyZipPackage } from "@oxen/zip";
import { CONTENT_TYPES } from "../../opc/content-types";
import { RELATIONSHIP_TYPES } from "../../domain/relationships";
import { addSlide, duplicateSlide, removeSlide, reorderSlide } from "./slide-manager";

function getPresentationSlideIds(presentationXmlText: string): string[] {
  const doc = parseXml(presentationXmlText);
  const sldIdLst = getByPath(doc, ["p:presentation", "p:sldIdLst"]);
  if (!sldIdLst) {
    throw new Error("missing p:sldIdLst");
  }
  return getChildren(sldIdLst, "p:sldId").map((el) => el.attrs.id ?? "");
}

function getPresentationRelsTargets(relsText: string): string[] {
  const doc = parseXml(relsText);
  const root = getByPath(doc, ["Relationships"]);
  if (!root) {
    throw new Error("missing Relationships");
  }
  return getChildren(root, "Relationship")
    .filter((rel) => rel.attrs.Type === RELATIONSHIP_TYPES.SLIDE)
    .map((rel) => rel.attrs.Target ?? "");
}

function hasContentTypeOverride(contentTypesText: string, partName: string, contentType: string): boolean {
  const doc = parseXml(contentTypesText);
  const root = getByPath(doc, ["Types"]);
  if (!root) {
    throw new Error("missing Types");
  }
  return getChildren(root, "Override").some(
    (o) => o.attrs.PartName === partName && o.attrs.ContentType === contentType,
  );
}

function createTestDoc(): PresentationDocument {
  const pkg = createEmptyZipPackage();

  pkg.writeText(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/ppt/presentation.xml" ContentType="${CONTENT_TYPES.PRESENTATION}"/>` +
      `<Override PartName="/ppt/slides/slide1.xml" ContentType="${CONTENT_TYPES.SLIDE}"/>` +
      `<Override PartName="/ppt/slides/slide2.xml" ContentType="${CONTENT_TYPES.SLIDE}"/>` +
      `<Override PartName="/ppt/slides/slide3.xml" ContentType="${CONTENT_TYPES.SLIDE}"/>` +
      `<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="${CONTENT_TYPES.SLIDE_LAYOUT}"/>` +
      `</Types>`,
  );

  pkg.writeText(
    "ppt/presentation.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" ` +
      `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
      `<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>` +
      `<p:sldIdLst>` +
      `<p:sldId id="256" r:id="rId2"/>` +
      `<p:sldId id="257" r:id="rId3"/>` +
      `<p:sldId id="258" r:id="rId4"/>` +
      `</p:sldIdLst>` +
      `</p:presentation>`,
  );

  pkg.writeText(
    "ppt/_rels/presentation.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="${RELATIONSHIP_TYPES.SLIDE_MASTER}" Target="slideMasters/slideMaster1.xml"/>` +
      `<Relationship Id="rId2" Type="${RELATIONSHIP_TYPES.SLIDE}" Target="slides/slide1.xml"/>` +
      `<Relationship Id="rId3" Type="${RELATIONSHIP_TYPES.SLIDE}" Target="slides/slide2.xml"/>` +
      `<Relationship Id="rId4" Type="${RELATIONSHIP_TYPES.SLIDE}" Target="slides/slide3.xml"/>` +
      `</Relationships>`,
  );

  pkg.writeText("ppt/slideLayouts/slideLayout1.xml", "<p:sldLayout/>");

  for (const n of [1, 2, 3]) {
    pkg.writeText(
      `ppt/slides/slide${n}.xml`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>`,
    );
    pkg.writeText(
      `ppt/slides/_rels/slide${n}.xml.rels`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="${RELATIONSHIP_TYPES.SLIDE_LAYOUT}" Target="../slideLayouts/slideLayout1.xml"/>` +
        `</Relationships>`,
    );
  }

  return {
    presentation: {
      slideSize: {
        width: 960 as PresentationDocument["slideWidth"],
        height: 540 as PresentationDocument["slideHeight"],
      },
    } as PresentationDocument["presentation"],
    slides: [
      { id: "slide-1", slide: { shapes: [] } },
      { id: "slide-2", slide: { shapes: [] } },
      { id: "slide-3", slide: { shapes: [] } },
    ],
    slideWidth: 960 as PresentationDocument["slideWidth"],
    slideHeight: 540 as PresentationDocument["slideHeight"],
    colorContext: {} as PresentationDocument["colorContext"],
    resources: {
      getTarget: () => undefined,
      getType: () => undefined,
      resolve: () => undefined,
      getMimeType: () => undefined,
      getFilePath: () => undefined,
      readFile: () => null,
      getResourceByType: () => undefined,
    },
    presentationFile: pkg.asPresentationFile(),
  };
}

describe("slide-manager", () => {
  it("adds a slide at the end", async () => {
    const doc = createTestDoc();
    const result = await addSlide(doc, "ppt/slideLayouts/slideLayout1.xml");
    const file = result.doc.presentationFile!;

    expect(result.doc.slides).toHaveLength(4);
    expect(file.exists("ppt/slides/slide4.xml")).toBe(true);
    expect(file.exists("ppt/slides/_rels/slide4.xml.rels")).toBe(true);

    const presentationText = file.readText("ppt/presentation.xml")!;
    expect(getPresentationSlideIds(presentationText)).toEqual(["256", "257", "258", "259"]);

    const relsText = file.readText("ppt/_rels/presentation.xml.rels")!;
    expect(getPresentationRelsTargets(relsText)).toContain("slides/slide4.xml");

    const contentTypesText = file.readText("[Content_Types].xml")!;
    expect(hasContentTypeOverride(contentTypesText, "/ppt/slides/slide4.xml", CONTENT_TYPES.SLIDE)).toBe(true);
  });

  it("removes the first slide", () => {
    const doc = createTestDoc();
    const result = removeSlide(doc, 0);
    const file = result.doc.presentationFile!;

    expect(result.doc.slides.map((s) => s.id)).toEqual(["slide-2", "slide-3"]);
    expect(file.exists("ppt/slides/slide1.xml")).toBe(false);

    const presentationText = file.readText("ppt/presentation.xml")!;
    expect(getPresentationSlideIds(presentationText)).toEqual(["257", "258"]);
  });

  it("reorders slides forward (0 -> 2)", () => {
    const doc = createTestDoc();
    const result = reorderSlide(doc, 0, 2);
    const file = result.doc.presentationFile!;

    expect(result.doc.slides.map((s) => s.id)).toEqual(["slide-2", "slide-3", "slide-1"]);
    const presentationText = file.readText("ppt/presentation.xml")!;
    expect(getPresentationSlideIds(presentationText)).toEqual(["257", "258", "256"]);
  });

  it("duplicates a slide", async () => {
    const doc = createTestDoc();
    const result = await duplicateSlide(doc, 1);
    const file = result.doc.presentationFile!;

    expect(result.doc.slides).toHaveLength(4);
    expect(file.exists("ppt/slides/slide4.xml")).toBe(true);
  });
});
