/**
 * Debug tool: Inspect actual XML structure from parsed PPTX
 *
 * Usage: bun run scripts/inspect-xml-structure.ts [pptx-file] [slide-number]
 * Default: fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx slide 1
 */
import * as fs from "node:fs";
import JSZip from "jszip";
import { openPresentation } from "../src/pptx";
import { isXmlElement, getChild, getChildren } from "../src/xml";

async function main() {
  const pptxPath = process.argv[2] || "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx";
  const slideNum = parseInt(process.argv[3] || "1", 10);

  console.log(`Inspecting: ${pptxPath} slide ${slideNum}\n`);

  const pptxBuffer = fs.readFileSync(pptxPath);
  const jszip = await JSZip.loadAsync(pptxBuffer);

  const cache = new Map();
  for (const fp of Object.keys(jszip.files)) {
    const file = jszip.file(fp);
    if (file !== null && !file.dir) {
      const buffer = await file.async("arraybuffer");
      const text = new TextDecoder().decode(buffer);
      cache.set(fp, { text, buffer });
    }
  }

  const presentationFile = {
    readText: (fp: string) => cache.get(fp)?.text ?? null,
    readBinary: (fp: string) => cache.get(fp)?.buffer ?? null,
    exists: (fp: string) => cache.has(fp),
  };

  const presentation = openPresentation(presentationFile);
  const slide = presentation.getSlide(slideNum);
  const doc = slide.content;
  const root = doc.children.find(isXmlElement);
  if (!root) {
    console.log("No root element");
    return;
  }

  const cSld = getChild(root, "p:cSld");
  if (!cSld) {
    console.log("No p:cSld");
    return;
  }

  const spTree = getChild(cSld, "p:spTree");
  if (!spTree) {
    console.log("No p:spTree");
    return;
  }

  // Find first shape with text run
  for (const child of spTree.children) {
    if (!isXmlElement(child) || child.name !== "p:sp") {continue;}
    const txBody = getChild(child, "p:txBody");
    if (!txBody) {continue;}

    const paragraphs = getChildren(txBody, "a:p");
    if (paragraphs.length === 0) {continue;}

    for (const p of paragraphs) {
      const runs = getChildren(p, "a:r");
      if (runs.length > 0) {
        console.log("=== Actual a:r (text run) XmlElement structure ===");
        console.log(JSON.stringify(runs[0], null, 2));
        return;
      }
    }
  }

  console.log("No text runs found");
}

main().catch(console.error);
