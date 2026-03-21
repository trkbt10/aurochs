/**
 * @file Layout ops tests
 *
 * Tests addSlideLayout, deleteSlideLayout, and duplicateSlideLayout operations
 * against a minimal in-memory PPTX package.
 */

import { parseXml, getByPath, getChildren } from "@aurochs/xml";
import { createEmptyZipPackage } from "@aurochs/zip";
import type { PresentationDocument } from "@aurochs-office/pptx/app/presentation-document";
import { EMPTY_FONT_SCHEME } from "@aurochs-office/ooxml/domain/font-scheme";
import { addSlideLayout, deleteSlideLayout, duplicateSlideLayout } from "./layout-ops";

// =============================================================================
// Fixture Helpers
// =============================================================================

const SLIDE_LAYOUT_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml";
const SLIDE_LAYOUT_REL_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout";
const SLIDE_MASTER_REL_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster";
const RELS_XMLNS = "http://schemas.openxmlformats.org/package/2006/relationships";

/**
 * Build a minimal valid PPTX package with one slide master and one layout.
 * Returns a PresentationDocument whose presentationFile supports listFiles().
 */
function createMinimalPptxDoc(): PresentationDocument {
  const pkg = createEmptyZipPackage();

  // [Content_Types].xml
  pkg.writeText(
    "[Content_Types].xml",
    [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
      `  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="${SLIDE_LAYOUT_CONTENT_TYPE}"/>`,
      "</Types>",
    ].join("\n"),
  );

  // Slide master XML with sldLayoutIdLst referencing layout1
  pkg.writeText(
    "ppt/slideMasters/slideMaster1.xml",
    [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"',
      '  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
      '  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">',
      "  <p:cSld><p:spTree/></p:cSld>",
      '  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1"',
      '    accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5"',
      '    accent6="accent6" hlink="hlink" folHlink="folHlink"/>',
      "  <p:sldLayoutIdLst>",
      '    <p:sldLayoutId id="2147483649" r:id="rId1"/>',
      "  </p:sldLayoutIdLst>",
      "</p:sldMaster>",
    ].join("\n"),
  );

  // Slide master rels pointing to layout1
  pkg.writeText(
    "ppt/slideMasters/_rels/slideMaster1.xml.rels",
    [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      `<Relationships xmlns="${RELS_XMLNS}">`,
      `  <Relationship Id="rId1" Type="${SLIDE_LAYOUT_REL_TYPE}" Target="../slideLayouts/slideLayout1.xml"/>`,
      "</Relationships>",
    ].join("\n"),
  );

  // Layout1 XML
  pkg.writeText(
    "ppt/slideLayouts/slideLayout1.xml",
    [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"',
      '  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
      '  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"',
      '  type="blank" preserve="1">',
      '  <p:cSld name="Blank"><p:spTree/></p:cSld>',
      "  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>",
      "</p:sldLayout>",
    ].join("\n"),
  );

  // Layout1 rels pointing back to master
  pkg.writeText(
    "ppt/slideLayouts/_rels/slideLayout1.xml.rels",
    [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      `<Relationships xmlns="${RELS_XMLNS}">`,
      `  <Relationship Id="rId1" Type="${SLIDE_MASTER_REL_TYPE}" Target="../slideMasters/slideMaster1.xml"/>`,
      "</Relationships>",
    ].join("\n"),
  );

  const presentationFile = pkg.asPresentationFile();
  const emptyResolver = { getTarget: () => undefined, getType: () => undefined, resolve: () => undefined, getMimeType: () => undefined, getFilePath: () => undefined, readFile: () => null, getResourceByType: () => undefined };
  return {
    presentation: { slideSize: { width: 9144000, height: 6858000 } },
    slides: [],
    slideWidth: 9144000,
    slideHeight: 6858000,
    colorContext: { colorScheme: {}, colorMap: {} },
    fontScheme: EMPTY_FONT_SCHEME,
    resources: emptyResolver,
    presentationFile,
  } satisfies PresentationDocument;
}

/** Read and parse XML from the updated doc's presentationFile. */
function readXml(doc: PresentationDocument, path: string) {
  const text = doc.presentationFile!.readText(path);
  if (!text) {
    throw new Error(`Missing file: ${path}`);
  }
  return parseXml(text);
}

// =============================================================================
// addSlideLayout
// =============================================================================

describe("addSlideLayout", () => {
  it("creates a new layout file in the package", () => {
    const doc = createMinimalPptxDoc();
    const result = addSlideLayout(doc);

    expect(result.layoutPath).toBe("ppt/slideLayouts/slideLayout2.xml");
    expect(result.doc.presentationFile!.exists(result.layoutPath)).toBe(true);
  });

  it("generates layoutId >= 2^31", () => {
    const doc = createMinimalPptxDoc();
    const result = addSlideLayout(doc);

    expect(result.layoutId).toBeGreaterThanOrEqual(2147483648);
  });

  it("adds sldLayoutId entry to the slide master", () => {
    const doc = createMinimalPptxDoc();
    const result = addSlideLayout(doc);

    const masterXml = readXml(result.doc, "ppt/slideMasters/slideMaster1.xml");
    const sldMaster = getByPath(masterXml, ["p:sldMaster"]);
    const sldLayoutIdLst = getByPath(sldMaster!, ["p:sldLayoutIdLst"]);
    expect(sldLayoutIdLst).toBeDefined();

    const entries = getChildren(sldLayoutIdLst!, "p:sldLayoutId");
    // Original layout + new layout = 2
    expect(entries.length).toBe(2);

    const newEntry = entries.find((e) => e.attrs["r:id"] === result.rId);
    expect(newEntry).toBeDefined();
    expect(newEntry!.attrs.id).toBe(String(result.layoutId));
  });

  it("adds relationship entry in master rels", () => {
    const doc = createMinimalPptxDoc();
    const result = addSlideLayout(doc);

    const relsXml = readXml(result.doc, "ppt/slideMasters/_rels/slideMaster1.xml.rels");
    const relsRoot = getByPath(relsXml, ["Relationships"]);
    const rels = getChildren(relsRoot!, "Relationship");

    const newRel = rels.find((r) => r.attrs.Id === result.rId);
    expect(newRel).toBeDefined();
    expect(newRel!.attrs.Type).toBe(SLIDE_LAYOUT_REL_TYPE);
    expect(newRel!.attrs.Target).toBe("../slideLayouts/slideLayout2.xml");
  });

  it("adds content type override in [Content_Types].xml", () => {
    const doc = createMinimalPptxDoc();
    const result = addSlideLayout(doc);

    const ctXml = readXml(result.doc, "[Content_Types].xml");
    const typesRoot = getByPath(ctXml, ["Types"]);
    const overrides = getChildren(typesRoot!, "Override");

    const layoutOverride = overrides.find(
      (o) => o.attrs.PartName === "/ppt/slideLayouts/slideLayout2.xml",
    );
    expect(layoutOverride).toBeDefined();
    expect(layoutOverride!.attrs.ContentType).toBe(SLIDE_LAYOUT_CONTENT_TYPE);
  });

  it("creates layout rels pointing back to master", () => {
    const doc = createMinimalPptxDoc();
    const result = addSlideLayout(doc);

    const layoutRelsPath = "ppt/slideLayouts/_rels/slideLayout2.xml.rels";
    expect(result.doc.presentationFile!.exists(layoutRelsPath)).toBe(true);

    const relsXml = readXml(result.doc, layoutRelsPath);
    const relsRoot = getByPath(relsXml, ["Relationships"]);
    const rels = getChildren(relsRoot!, "Relationship");

    const masterRel = rels.find((r) => r.attrs.Type === SLIDE_MASTER_REL_TYPE);
    expect(masterRel).toBeDefined();
    expect(masterRel!.attrs.Target).toBe("../slideMasters/slideMaster1.xml");
  });

  it("uses specified master path when provided", () => {
    const doc = createMinimalPptxDoc();
    const result = addSlideLayout(doc, "ppt/slideMasters/slideMaster1.xml");

    expect(result.layoutPath).toBe("ppt/slideLayouts/slideLayout2.xml");
  });

  it("throws when master path does not exist", () => {
    const doc = createMinimalPptxDoc();
    expect(() => addSlideLayout(doc, "ppt/slideMasters/slideMaster99.xml")).toThrow(
      /does not exist/,
    );
  });
});

// =============================================================================
// deleteSlideLayout
// =============================================================================

describe("deleteSlideLayout", () => {
  it("removes the layout file from the package", () => {
    const doc = createMinimalPptxDoc();
    const result = deleteSlideLayout(doc, "ppt/slideLayouts/slideLayout1.xml");

    expect(result.doc.presentationFile!.exists("ppt/slideLayouts/slideLayout1.xml")).toBe(false);
  });

  it("removes the layout rels file from the package", () => {
    const doc = createMinimalPptxDoc();
    const result = deleteSlideLayout(doc, "ppt/slideLayouts/slideLayout1.xml");

    expect(
      result.doc.presentationFile!.exists("ppt/slideLayouts/_rels/slideLayout1.xml.rels"),
    ).toBe(false);
  });

  it("removes the sldLayoutId entry from the slide master", () => {
    const doc = createMinimalPptxDoc();
    const result = deleteSlideLayout(doc, "ppt/slideLayouts/slideLayout1.xml");

    const masterXml = readXml(result.doc, "ppt/slideMasters/slideMaster1.xml");
    const sldMaster = getByPath(masterXml, ["p:sldMaster"]);
    const sldLayoutIdLst = getByPath(sldMaster!, ["p:sldLayoutIdLst"]);
    expect(sldLayoutIdLst).toBeDefined();

    const entries = getChildren(sldLayoutIdLst!, "p:sldLayoutId");
    expect(entries.length).toBe(0);
  });

  it("removes the relationship entry from master rels", () => {
    const doc = createMinimalPptxDoc();
    const result = deleteSlideLayout(doc, "ppt/slideLayouts/slideLayout1.xml");

    const relsXml = readXml(result.doc, "ppt/slideMasters/_rels/slideMaster1.xml.rels");
    const relsRoot = getByPath(relsXml, ["Relationships"]);
    const rels = getChildren(relsRoot!, "Relationship");

    const layoutRel = rels.find((r) => r.attrs.Type === SLIDE_LAYOUT_REL_TYPE);
    expect(layoutRel).toBeUndefined();
  });

  it("removes the content type override", () => {
    const doc = createMinimalPptxDoc();
    const result = deleteSlideLayout(doc, "ppt/slideLayouts/slideLayout1.xml");

    const ctXml = readXml(result.doc, "[Content_Types].xml");
    const typesRoot = getByPath(ctXml, ["Types"]);
    const overrides = getChildren(typesRoot!, "Override");

    const layoutOverride = overrides.find(
      (o) => o.attrs.PartName === "/ppt/slideLayouts/slideLayout1.xml",
    );
    expect(layoutOverride).toBeUndefined();
  });

  it("returns correct metadata about removed layout", () => {
    const doc = createMinimalPptxDoc();
    const result = deleteSlideLayout(doc, "ppt/slideLayouts/slideLayout1.xml");

    expect(result.layoutPath).toBe("ppt/slideLayouts/slideLayout1.xml");
    expect(result.layoutId).toBe(2147483649);
    expect(result.rId).toBe("rId1");
  });

  it("throws when layout path is invalid", () => {
    const doc = createMinimalPptxDoc();
    expect(() => deleteSlideLayout(doc, "invalid/path.xml")).toThrow(/invalid layoutPath/);
  });

  it("throws when layout does not exist", () => {
    const doc = createMinimalPptxDoc();
    expect(() => deleteSlideLayout(doc, "ppt/slideLayouts/slideLayout99.xml")).toThrow(
      /does not exist/,
    );
  });
});

// =============================================================================
// duplicateSlideLayout
// =============================================================================

describe("duplicateSlideLayout", () => {
  it("creates a duplicate layout file", () => {
    const doc = createMinimalPptxDoc();
    const result = duplicateSlideLayout(doc, "ppt/slideLayouts/slideLayout1.xml");

    expect(result.layoutPath).toBe("ppt/slideLayouts/slideLayout2.xml");
    expect(result.sourceLayoutPath).toBe("ppt/slideLayouts/slideLayout1.xml");
    expect(result.doc.presentationFile!.exists(result.layoutPath)).toBe(true);
  });

  it("copies the source layout XML content", () => {
    const doc = createMinimalPptxDoc();
    const result = duplicateSlideLayout(doc, "ppt/slideLayouts/slideLayout1.xml");

    const sourceText = doc.presentationFile!.readText("ppt/slideLayouts/slideLayout1.xml");
    const duplicateText = result.doc.presentationFile!.readText(result.layoutPath);
    // The duplicate should contain the same XML content as the source
    expect(duplicateText).toBe(sourceText);
  });

  it("copies the source layout rels", () => {
    const doc = createMinimalPptxDoc();
    const result = duplicateSlideLayout(doc, "ppt/slideLayouts/slideLayout1.xml");

    const duplicateRelsPath = "ppt/slideLayouts/_rels/slideLayout2.xml.rels";
    expect(result.doc.presentationFile!.exists(duplicateRelsPath)).toBe(true);
  });

  it("adds sldLayoutId entry with new unique ID", () => {
    const doc = createMinimalPptxDoc();
    const result = duplicateSlideLayout(doc, "ppt/slideLayouts/slideLayout1.xml");

    const masterXml = readXml(result.doc, "ppt/slideMasters/slideMaster1.xml");
    const sldMaster = getByPath(masterXml, ["p:sldMaster"]);
    const sldLayoutIdLst = getByPath(sldMaster!, ["p:sldLayoutIdLst"]);
    const entries = getChildren(sldLayoutIdLst!, "p:sldLayoutId");

    expect(entries.length).toBe(2);

    // New layout ID should be different from original
    expect(result.layoutId).toBeGreaterThan(2147483649);
  });

  it("adds relationship entry in master rels", () => {
    const doc = createMinimalPptxDoc();
    const result = duplicateSlideLayout(doc, "ppt/slideLayouts/slideLayout1.xml");

    const relsXml = readXml(result.doc, "ppt/slideMasters/_rels/slideMaster1.xml.rels");
    const relsRoot = getByPath(relsXml, ["Relationships"]);
    const rels = getChildren(relsRoot!, "Relationship");

    // Original + new = 2
    expect(rels.length).toBe(2);

    const newRel = rels.find((r) => r.attrs.Id === result.rId);
    expect(newRel).toBeDefined();
    expect(newRel!.attrs.Target).toBe("../slideLayouts/slideLayout2.xml");
  });

  it("adds content type override for duplicate", () => {
    const doc = createMinimalPptxDoc();
    const result = duplicateSlideLayout(doc, "ppt/slideLayouts/slideLayout1.xml");

    const ctXml = readXml(result.doc, "[Content_Types].xml");
    const typesRoot = getByPath(ctXml, ["Types"]);
    const overrides = getChildren(typesRoot!, "Override");

    const duplicateOverride = overrides.find(
      (o) => o.attrs.PartName === "/ppt/slideLayouts/slideLayout2.xml",
    );
    expect(duplicateOverride).toBeDefined();
    expect(duplicateOverride!.attrs.ContentType).toBe(SLIDE_LAYOUT_CONTENT_TYPE);
  });

  it("throws when layout path is invalid", () => {
    const doc = createMinimalPptxDoc();
    expect(() => duplicateSlideLayout(doc, "invalid/path.xml")).toThrow(/invalid layoutPath/);
  });

  it("throws when layout does not exist", () => {
    const doc = createMinimalPptxDoc();
    expect(() => duplicateSlideLayout(doc, "ppt/slideLayouts/slideLayout99.xml")).toThrow(
      /does not exist/,
    );
  });
});
