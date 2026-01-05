/**
 * Debug line spacing values being used
 */
import { openPresentation, LIBREOFFICE_RENDER_OPTIONS, DEFAULT_RENDER_OPTIONS } from "../src/pptx";
import { getByPath } from "../src/xml";
import { loadPptxFile } from "./lib/pptx-loader";

async function main() {
  const pptxPath = "fixtures/poi-test-data/test-data/slideshow/table_test.pptx";
  const presentationFile = await loadPptxFile(pptxPath);

  console.log("=== Checking for multi-line text in table_test.pptx ===");
  
  const presentation = openPresentation(presentationFile);
  const slide = presentation.getSlide(1);
  
  // Get slide content
  const content = slide.content;
  console.log("Slide content children:", content.children.map((c: any) => c?.name || String(c)));
  
  // Get spTree
  const sld = getByPath(content, ["p:sld"]);
  const cSld = sld ? getByPath(sld, ["p:cSld"]) : undefined;
  const spTree = cSld ? getByPath(cSld, ["p:spTree"]) : undefined;
  
  if (spTree) {
    console.log("\nSpTree children:");
    for (const child of (spTree as any).children) {
      if (child?.name) {
        console.log("  -", child.name);
        // Check for text content
        const txBody = getByPath(child, ["p:txBody"]);
        if (txBody) {
          const paragraphs = (txBody as any).children.filter((c: any) => c?.name === "a:p");
          console.log("    Text paragraphs:", paragraphs.length);
          for (const p of paragraphs) {
            const runs = (p as any).children.filter((c: any) => c?.name === "a:r");
            console.log("      Runs:", runs.length);
            for (const r of runs) {
              const t = getByPath(r, ["a:t"]);
              if (t) {
                console.log("        Text:", (t as any).children?.[0]?.slice(0, 50));
              }
            }
          }
        }
      }
    }
  }
}

main().catch(console.error);
