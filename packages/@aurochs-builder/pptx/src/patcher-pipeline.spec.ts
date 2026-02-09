/** @file Unit tests for patcher-pipeline */
import { patchPptx, getPatchData } from "./patcher-pipeline";
import type { PptxPatchSpec } from "./patch-types";
import { parseXml, isXmlElement, isXmlText, type XmlNode } from "@aurochs/xml";
import { loadZipPackage } from "@aurochs/zip";
import { zipSync } from "fflate";

// =============================================================================
// Helpers
// =============================================================================

/** Minimal PPTX ZIP structure with one slide containing text */
function createMinimalPptx(slideTexts: string[] = ["Hello {{NAME}}"]): Uint8Array {
  const encoder = new TextEncoder();
  const entries: Record<string, Uint8Array> = {};

  // [Content_Types].xml
  const slideOverrides = slideTexts
    .map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`)
    .join("");
  entries["[Content_Types].xml"] = encoder.encode(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  ${slideOverrides}
</Types>`,
  );

  // _rels/.rels
  entries["_rels/.rels"] = encoder.encode(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`,
  );

  // ppt/presentation.xml
  const slideList = slideTexts
    .map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`)
    .join("");
  entries["ppt/presentation.xml"] = encoder.encode(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>${slideList}</p:sldIdLst>
  <p:sldSz cx="9144000" cy="6858000"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`,
  );

  // ppt/_rels/presentation.xml.rels
  const slideRels = slideTexts
    .map((_, i) => `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`)
    .join("");
  entries["ppt/_rels/presentation.xml.rels"] = encoder.encode(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${slideRels}
</Relationships>`,
  );

  // ppt/slideMasters/slideMaster1.xml (minimal)
  entries["ppt/slideMasters/slideMaster1.xml"] = encoder.encode(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>
</p:sldMaster>`,
  );

  // ppt/slideMasters/_rels/slideMaster1.xml.rels
  entries["ppt/slideMasters/_rels/slideMaster1.xml.rels"] = encoder.encode(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`,
  );

  // Slides
  for (let i = 0; i < slideTexts.length; i++) {
    entries[`ppt/slides/slide${i + 1}.xml`] = encoder.encode(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="TextBox 1"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="9144000" cy="6858000"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p><a:r><a:rPr lang="en-US"/><a:t>${slideTexts[i]}</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`,
    );
  }

  return new Uint8Array(zipSync(entries, { level: 6 }));
}

/** Extract text from `<a:t>` elements in slide XML */
function extractTextFromSlideXml(xml: string): string[] {
  const doc = parseXml(xml);
  const texts: string[] = [];

  function walk(node: XmlNode): void {
    if (!isXmlElement(node)) {
      return;
    }
    if (node.name === "a:t") {
      for (const child of node.children) {
        if (isXmlText(child)) {
          texts.push(child.value);
        }
      }
    }
    for (const child of node.children) {
      walk(child);
    }
  }

  for (const child of doc.children) {
    walk(child);
  }
  return texts;
}

// =============================================================================
// getPatchData
// =============================================================================

describe("getPatchData", () => {
  test("returns correct metadata for spec", () => {
    const spec: PptxPatchSpec = {
      source: "./template.pptx",
      output: "./output.pptx",
      patches: [
        { type: "text.replace", search: "{{NAME}}", replace: "Alice" },
        { type: "text.replace", search: "{{DATE}}", replace: "2025-01-01" },
        { type: "slide.modify", slideNumber: 1, addShapes: [] },
      ],
    };

    const data = getPatchData(spec);

    expect(data.sourcePath).toBe("./template.pptx");
    expect(data.outputPath).toBe("./output.pptx");
    expect(data.patchCount).toBe(3);
    expect(data.textReplacements).toBe(2);
    expect(data.slidesModified).toBe(1);
  });

  test("returns zeros for empty patches", () => {
    const spec: PptxPatchSpec = {
      source: "./src.pptx",
      output: "./out.pptx",
      patches: [],
    };

    const data = getPatchData(spec);

    expect(data.patchCount).toBe(0);
    expect(data.textReplacements).toBe(0);
    expect(data.slidesModified).toBe(0);
  });
});

// =============================================================================
// patchPptx - text.replace
// =============================================================================

describe("patchPptx text.replace", () => {
  test("replaces text in a single slide", async () => {
    const sourceData = createMinimalPptx(["Hello {{NAME}}"]);

    const spec: PptxPatchSpec = {
      source: "ignored",
      output: "ignored",
      patches: [{ type: "text.replace", search: "{{NAME}}", replace: "Alice" }],
    };

    const result = await patchPptx(spec, sourceData, "/tmp");
    const pkg = await loadZipPackage(result);
    const slideXml = pkg.readText("ppt/slides/slide1.xml")!;
    const texts = extractTextFromSlideXml(slideXml);

    expect(texts).toContain("Hello Alice");
    expect(texts).not.toContain("Hello {{NAME}}");
  });

  test("replaces all occurrences by default", async () => {
    const sourceData = createMinimalPptx(["AAA BBB AAA"]);

    const spec: PptxPatchSpec = {
      source: "ignored",
      output: "ignored",
      patches: [{ type: "text.replace", search: "AAA", replace: "CCC" }],
    };

    const result = await patchPptx(spec, sourceData, "/tmp");
    const pkg = await loadZipPackage(result);
    const slideXml = pkg.readText("ppt/slides/slide1.xml")!;
    const texts = extractTextFromSlideXml(slideXml);

    expect(texts).toContain("CCC BBB CCC");
  });

  test("replaces only first occurrence when replaceAll is false", async () => {
    const sourceData = createMinimalPptx(["AAA BBB AAA"]);

    const spec: PptxPatchSpec = {
      source: "ignored",
      output: "ignored",
      patches: [{ type: "text.replace", search: "AAA", replace: "CCC", replaceAll: false }],
    };

    const result = await patchPptx(spec, sourceData, "/tmp");
    const pkg = await loadZipPackage(result);
    const slideXml = pkg.readText("ppt/slides/slide1.xml")!;
    const texts = extractTextFromSlideXml(slideXml);

    expect(texts).toContain("CCC BBB AAA");
  });

  test("applies to all slides by default", async () => {
    const sourceData = createMinimalPptx(["Hello {{NAME}}", "Dear {{NAME}}"]);

    const spec: PptxPatchSpec = {
      source: "ignored",
      output: "ignored",
      patches: [{ type: "text.replace", search: "{{NAME}}", replace: "Bob" }],
    };

    const result = await patchPptx(spec, sourceData, "/tmp");
    const pkg = await loadZipPackage(result);

    const slide1Texts = extractTextFromSlideXml(pkg.readText("ppt/slides/slide1.xml")!);
    const slide2Texts = extractTextFromSlideXml(pkg.readText("ppt/slides/slide2.xml")!);

    expect(slide1Texts).toContain("Hello Bob");
    expect(slide2Texts).toContain("Dear Bob");
  });

  test("limits to specific slides when specified", async () => {
    const sourceData = createMinimalPptx(["Hello {{NAME}}", "Dear {{NAME}}"]);

    const spec: PptxPatchSpec = {
      source: "ignored",
      output: "ignored",
      patches: [{ type: "text.replace", search: "{{NAME}}", replace: "Carol", slides: [1] }],
    };

    const result = await patchPptx(spec, sourceData, "/tmp");
    const pkg = await loadZipPackage(result);

    const slide1Texts = extractTextFromSlideXml(pkg.readText("ppt/slides/slide1.xml")!);
    const slide2Texts = extractTextFromSlideXml(pkg.readText("ppt/slides/slide2.xml")!);

    expect(slide1Texts).toContain("Hello Carol");
    expect(slide2Texts).toContain("Dear {{NAME}}"); // Unchanged
  });

  test("applies multiple text.replace patches in order", async () => {
    const sourceData = createMinimalPptx(["{{GREETING}} {{NAME}}"]);

    const spec: PptxPatchSpec = {
      source: "ignored",
      output: "ignored",
      patches: [
        { type: "text.replace", search: "{{GREETING}}", replace: "Hi" },
        { type: "text.replace", search: "{{NAME}}", replace: "Dave" },
      ],
    };

    const result = await patchPptx(spec, sourceData, "/tmp");
    const pkg = await loadZipPackage(result);
    const slideXml = pkg.readText("ppt/slides/slide1.xml")!;
    const texts = extractTextFromSlideXml(slideXml);

    expect(texts).toContain("Hi Dave");
  });

  test("no-op when search text is not found", async () => {
    const sourceData = createMinimalPptx(["Hello World"]);

    const spec: PptxPatchSpec = {
      source: "ignored",
      output: "ignored",
      patches: [{ type: "text.replace", search: "{{MISSING}}", replace: "X" }],
    };

    const result = await patchPptx(spec, sourceData, "/tmp");
    const pkg = await loadZipPackage(result);
    const slideXml = pkg.readText("ppt/slides/slide1.xml")!;
    const texts = extractTextFromSlideXml(slideXml);

    expect(texts).toContain("Hello World");
  });
});

// =============================================================================
// patchPptx - empty patches
// =============================================================================

describe("patchPptx empty patches", () => {
  test("returns valid PPTX with no patches", async () => {
    const sourceData = createMinimalPptx(["Untouched"]);

    const spec: PptxPatchSpec = {
      source: "ignored",
      output: "ignored",
      patches: [],
    };

    const result = await patchPptx(spec, sourceData, "/tmp");
    const pkg = await loadZipPackage(result);
    const slideXml = pkg.readText("ppt/slides/slide1.xml")!;
    const texts = extractTextFromSlideXml(slideXml);

    expect(texts).toContain("Untouched");
  });
});
