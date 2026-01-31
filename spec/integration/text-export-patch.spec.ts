/**
 * @file Integration: patchSlideXml textBody update against a real slide XML.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPptxFile } from "../../scripts/lib/pptx-loader";
import { parseXml, getChild, getChildren, getTextContent, isXmlElement } from "@oxen/xml";
import { patchSlideXml } from "@oxen-builder/pptx/patcher";
import { parseTextBody } from "@oxen-office/pptx/parser/text/text-parser";
import type { ShapeChange } from "@oxen-builder/pptx/patcher/core/shape-differ";
import type { TextBody } from "@oxen-office/pptx/domain/text";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.resolve(__dirname, "../../fixtures");

describe("patchSlideXml (textBody) integration", () => {
  it("updates a shape p:txBody text in a real PPTX slide XML", async () => {
    const fixturePath = path.join(FIXTURE_DIR, "decompressed-pptx/Sample_demo1.pptx");
    const { zipPackage } = await loadPptxFile(fixturePath);

    const slideXml = zipPackage.readText("ppt/slides/slide1.xml");
    expect(slideXml).toBeDefined();

    const doc = parseXml(slideXml!);
    const root = doc.children.find(isXmlElement);
    expect(root?.name).toBe("p:sld");

    const cSld = root ? getChild(root, "p:cSld") : undefined;
    const spTree = cSld ? getChild(cSld, "p:spTree") : undefined;
    expect(spTree).toBeDefined();

    const firstShape = spTree?.children.find((c) => isXmlElement(c) && c.name === "p:sp");
    expect(firstShape && isXmlElement(firstShape)).toBe(true);
    if (!firstShape || !isXmlElement(firstShape)) {
      throw new Error("Expected first shape to be a p:sp element");
    }

    const nvSpPr = getChild(firstShape, "p:nvSpPr");
    expect(nvSpPr).toBeDefined();
    const cNvPr = nvSpPr ? getChild(nvSpPr, "p:cNvPr") : undefined;
    const shapeId = cNvPr?.attrs.id;
    expect(shapeId).toBeDefined();

    const newTextBody: TextBody = {
      bodyProperties: {},
      paragraphs: [
        { properties: {}, runs: [{ type: "text", text: "Changed Text", properties: { bold: true } }] },
      ],
    };

    const changes: ShapeChange[] = [
      {
        type: "modified",
        shapeId: shapeId!,
        shapeType: "sp",
        changes: [
          { property: "textBody", oldValue: undefined, newValue: newTextBody },
        ],
      },
    ];

    const patched = patchSlideXml(doc, changes);
    const patchedRoot = patched.children.find(isXmlElement)!;
    const patchedSpTree = getChild(getChild(patchedRoot, "p:cSld")!, "p:spTree")!;
    const patchedShape = patchedSpTree.children.find((c) => {
      if (!isXmlElement(c) || c.name !== "p:sp") {return false;}
      const id = getChild(getChild(c, "p:nvSpPr")!, "p:cNvPr")?.attrs.id;
      return id === shapeId;
    });
    if (!patchedShape || !isXmlElement(patchedShape)) {
      throw new Error("Expected patched shape to be a p:sp element");
    }

    const txBody = getChild(patchedShape, "p:txBody");
    expect(txBody).toBeDefined();

    const paragraphs = txBody ? getChildren(txBody, "a:p") : [];
    expect(paragraphs.length).toBeGreaterThan(0);

    const p0 = paragraphs[0]!;
    const r0 = getChild(p0, "a:r")!;
    expect(getTextContent(getChild(r0, "a:t")!)).toBe("Changed Text");

    const parsed = parseTextBody(txBody!);
    expect(parsed?.paragraphs[0]?.runs[0]?.type).toBe("text");
    if (parsed?.paragraphs[0]?.runs[0]?.type === "text") {
      expect(parsed.paragraphs[0].runs[0].text).toBe("Changed Text");
      expect(parsed.paragraphs[0].runs[0].properties?.bold).toBe(true);
    }
  });
});
