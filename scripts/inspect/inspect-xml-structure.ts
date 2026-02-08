/**
 * Debug tool: Inspect actual XML structure from parsed PPTX
 *
 * Usage: bun run scripts/inspect/inspect-xml-structure.ts <pptx-path> <slide-number>
 */
import { openPresentation } from "@aurochs-office/pptx";
import { isXmlElement, getChild, getChildren } from "@aurochs/xml";
import { requireFileExists, requireIntArg, requirePositionalArg } from "../lib/cli";
import { loadPptxFile } from "../lib/pptx-loader";

async function main() {
  const usage = "bun run scripts/inspect/inspect-xml-structure.ts <pptx-path> <slide-number>";
  const args = process.argv.slice(2);
  const pptxPath = requirePositionalArg({ args, index: 0, name: "pptx-path", usage });
  const slideNum = requireIntArg(args[1], "slide-number", usage);
  requireFileExists(pptxPath, usage);

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
    if (!isXmlElement(child) || child.name !== "p:sp") {
      continue;
    }
    const txBody = getChild(child, "p:txBody");
    if (!txBody) {
      continue;
    }

    const paragraphs = getChildren(txBody, "a:p");
    if (paragraphs.length === 0) {
      continue;
    }

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
