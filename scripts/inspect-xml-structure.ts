/**
 * Debug tool: Inspect actual XML structure from parsed PPTX
 *
 * Usage: bun run scripts/inspect-xml-structure.ts [pptx-file] [slide-number]
 * Default: fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx slide 1
 */
import { openPresentation } from "../src/pptx";
import { isXmlElement, getChild, getChildren } from "../src/xml";
import { loadPptxFile } from "./lib/pptx-loader";

async function main() {
  const pptxPath = process.argv[2] || "fixtures/poi-test-data/test-data/slideshow/2411-Performance_Up.pptx";
  const slideNum = parseInt(process.argv[3] || "1", 10);

  console.log(`Inspecting: ${pptxPath} slide ${slideNum}\n`);

  const { presentationFile } = await loadPptxFile(pptxPath);

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
